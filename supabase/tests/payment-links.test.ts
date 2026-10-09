/** Payment links for catering deposits and webhook helpers (server-only). */
import { describe, expect, it } from "vitest";
import { createAuthUser, createCatering, createStaff, useTestDb, type TestDb } from "./helpers";

const db = useTestDb();
const inThreeDays = () => new Date(Date.now() + 3 * 86_400_000).toISOString();

async function quoted(t: TestDb, deposit: string) {
  const request = await createCatering(t);
  await t.query(`update public.catering_requests set status = 'quoted', quoted_total_fils = 333333, ${deposit} where id = $1`, [request.id]);
  return request;
}

async function requestPayment(t: TestDb, requestId: string, staffId: string) {
  await t.as("service_role");
  const [row] = await t.rows<{ payment_request_id: string; requested_amount_fils: string; total_fils: string; reference: string }>(
    "select * from public.request_catering_payment($1, $2, 'mock', true, $3)",
    [requestId, staffId, inThreeDays()],
  );
  await t.asOwner();
  return row;
}

describe("request_catering_payment", () => {
  it("computes the deposit in the database and moves the booking to awaiting payment", async () => {
    const admin = await createStaff(db(), "admin");
    const request = await quoted(db(), "deposit_type = 'percentage', deposit_percentage = 12.5");
    const row = await requestPayment(db(), request.id, admin.id);
    // 333333 * 12.5% = 41666.625 -> 41667 (half up)
    expect(row).toMatchObject({ requested_amount_fils: "41667", total_fils: "333333", reference: request.reference });
    const [c] = await db().rows("select status, payment_status from public.catering_requests where id = $1", [request.id]);
    expect(c).toEqual({ status: "awaiting_payment", payment_status: "payment_requested" });
    const [pr] = await db().rows("select kind, status, is_test, created_by from public.payment_requests where id = $1", [row.payment_request_id]);
    expect(pr).toEqual({ kind: "deposit", status: "pending", is_test: true, created_by: admin.id });
  });

  it.each([
    ["fixed", "deposit_type = 'fixed', deposit_fixed_fils = 50000", "50000", "deposit"],
    ["full", "deposit_type = 'full'", "333333", "full"],
  ])("handles a %s requirement", async (_label, deposit, amount, kind) => {
    const admin = await createStaff(db(), "admin");
    const request = await quoted(db(), deposit);
    const row = await requestPayment(db(), request.id, admin.id);
    expect(row.requested_amount_fils).toBe(amount);
    const [pr] = await db().rows<{ kind: string }>("select kind from public.payment_requests where id = $1", [row.payment_request_id]);
    expect(pr.kind).toBe(kind);
  });

  it("supersedes the open link when a new one is sent", async () => {
    const admin = await createStaff(db(), "admin");
    const request = await quoted(db(), "deposit_type = 'fixed', deposit_fixed_fils = 50000");
    const first = await requestPayment(db(), request.id, admin.id);
    const second = await requestPayment(db(), request.id, admin.id);
    await db().checkDeferred();
    const rows = await db().rows("select id, status, superseded_by from public.payment_requests order by created_at, status desc");
    expect(rows).toEqual(
      expect.arrayContaining([
        { id: first.payment_request_id, status: "superseded", superseded_by: second.payment_request_id },
        { id: second.payment_request_id, status: "pending", superseded_by: null },
      ]),
    );
  });

  it("refuses when nothing is due, when not quoted, or for non-admins", async () => {
    const admin = await createStaff(db(), "admin");
    const owner = await createStaff(db(), "operations_owner");
    const none = await quoted(db(), "deposit_type = 'none'");
    const fresh = await createCatering(db());
    const deposit = await quoted(db(), "deposit_type = 'full'");
    await db().as("service_role");
    const call = "select * from public.request_catering_payment($1, $2, 'mock', true, $3)";
    await db().expectError(call, [none.id, admin.id, inThreeDays()], /no_payment_required/);
    await db().expectError(call, [fresh.id, admin.id, inThreeDays()], /invalid_transition/);
    await db().expectError(call, [deposit.id, owner.id, inThreeDays()], /forbidden/);
    await db().expectError(call, [deposit.id, admin.id, new Date(Date.now() - 1000).toISOString()], /invalid expiry/);
  });

  it("cannot be called by browsers", async () => {
    const user = await createAuthUser(db());
    await db().as("authenticated", user.id);
    await db().expectError("select * from public.request_catering_payment(gen_random_uuid(), gen_random_uuid(), 'mock', true, now())", [], /permission denied/);
    await db().expectError("select public.claim_payment_event('mock', 'e', 't', '{}')", [], /permission denied/);
    await db().as("anon");
    await db().expectError("select * from public.payment_summary('order', gen_random_uuid(), true)", [], /permission denied/);
  });
});

describe("attach_checkout", () => {
  it("stores the hosted checkout and queues one payment email", async () => {
    const admin = await createStaff(db(), "admin");
    const request = await quoted(db(), "deposit_type = 'full'");
    const row = await requestPayment(db(), request.id, admin.id);
    await db().as("service_role");
    await db().query("select public.attach_checkout($1, 'mock_cs_1', 'https://pay.example/1', 'Payment requested')", [row.payment_request_id]);
    await db().query("select public.attach_checkout($1, 'mock_cs_1', 'https://pay.example/1', 'Payment requested')", [row.payment_request_id]);
    await db().asOwner();
    const [pr] = await db().rows("select provider_checkout_id, checkout_url from public.payment_requests where id = $1", [row.payment_request_id]);
    expect(pr).toEqual({ provider_checkout_id: "mock_cs_1", checkout_url: "https://pay.example/1" });
    expect(await db().rows("select template, entity_type from public.email_outbox where entity_id = $1", [row.payment_request_id])).toEqual([
      { template: "payment_requested", entity_type: "payment_request" },
    ]);
  });
});

describe("claim_payment_event", () => {
  it("claims new events, reports busy while processing and duplicate once processed", async () => {
    await db().as("service_role");
    const claim = () => db().rows<{ r: string }>("select public.claim_payment_event('mock', 'evt-1', 'payment.succeeded', '{}') as r");
    expect(await claim()).toEqual([{ r: "new" }]);
    expect(await claim()).toEqual([{ r: "busy" }]);
    await db().asOwner();
    await db().query("update public.payment_events set processing_started_at = now() - interval '5 minutes'");
    await db().as("service_role");
    expect(await claim()).toEqual([{ r: "new" }]); // stale lease: retry processes it
    await db().query("update public.payment_events set processed_at = now()");
    expect(await claim()).toEqual([{ r: "duplicate" }]);
  });
});

describe("payment_summary", () => {
  it("adds up live or test money for a booking", async () => {
    const admin = await createStaff(db(), "admin");
    const request = await quoted(db(), "deposit_type = 'percentage', deposit_percentage = 25");
    const row = await requestPayment(db(), request.id, admin.id);
    await db().query(
      `insert into public.payments (catering_request_id, payment_request_id, provider, provider_reference, amount_fils, status, is_test, paid_at)
       values ($1, $2, 'mock', 'txn-1', 83333, 'succeeded', true, now())`,
      [request.id, row.payment_request_id],
    );
    await db().as("service_role");
    const summary = (isTest: boolean) => db().rows("select * from public.payment_summary('catering_request', $1, $2)", [request.id, isTest]);
    expect(await summary(true)).toEqual([
      { total_fils: "333333", paid_fils: "83333", refunded_fils: "0", required_deposit_fils: "83333", has_open_request: true, last_attempt_failed: false },
    ]);
    expect((await summary(false))[0]).toMatchObject({ paid_fils: "0" });
  });
});
