/**
 * Deposit payment journey (owner §5–§6): staff send a payment link, the
 * customer pays on the (test) hosted page, the signed webhook marks the
 * deposit paid, and only then can staff confirm the booking.
 */
import { randomUUID } from "node:crypto";
import { expect, test, type Page } from "@playwright/test";
import { eventDate, query, site, uniqueEmail } from "./support";

const PASSWORD = "Correct-Horse-42";

async function setup(page: Page) {
  const staffId = randomUUID();
  const staffEmail = uniqueEmail("admin");
  await query("insert into auth.users (id, email, encrypted_password) values ($1, $2, encode(sha256(convert_to($3, 'UTF8')), 'hex'))", [staffId, staffEmail, PASSWORD]);
  await query("insert into admin_users (user_id, role, full_name) values ($1, 'admin', 'Payments Admin')", [staffId]);
  const [row] = await query<{ reference: string }>("select reference from submit_catering_request($1::jsonb)", [
    JSON.stringify({
      idempotency_key: `e2e-${randomUUID()}`,
      locale: "en",
      contact: { name: "Deposit Family", phone: "+971501234567", email: uniqueEmail("guest") },
      package_slug: "family-gathering",
      event_date: eventDate(28),
      event_time: "19:00",
      guest_count: 30,
      event_location: "Ajman",
      email: { locale: "en", subject: "S" },
    }),
  ]);
  const [{ id }] = await query<{ id: string }>("select id from catering_requests where reference = $1", [row.reference]);
  await page.goto(`${site()}/en/admin/sign-in`);
  await page.getByLabel("Email").fill(staffEmail);
  await page.getByLabel("Password").fill(PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL(/\/en\/admin$/);
  await page.goto(`${site()}/en/admin/catering/${id}`);
  await page.getByLabel("Agreed total (AED)").fill("3000");
  await page.getByLabel("Percentage deposit").check();
  await page.getByLabel("Deposit percentage").fill("25");
  await page.getByRole("button", { name: "Save price and payment" }).click();
  await expect(page.getByRole("button", { name: "Send payment link" })).toBeVisible();
  return { id, reference: row.reference };
}

test("staff send a deposit link; the customer pays; staff confirm the booking", async ({ page, context }) => {
  const booking = await setup(page);
  await page.getByRole("button", { name: "Send payment link" }).click();
  await expect(page.getByText("Payment link sent: AED 750.00")).toBeVisible();
  const [state] = await query("select status, payment_status from catering_requests where id = $1", [booking.id]);
  expect(state).toEqual({ status: "awaiting_payment", payment_status: "payment_requested" });
  expect(await query("select template from email_outbox where template = 'payment_requested' and entity_id in (select id from payment_requests where catering_request_id = $1)", [booking.id])).toEqual([
    { template: "payment_requested" },
  ]);
  await expect(page.getByRole("button", { name: "Confirm booking" })).toHaveCount(0);

  // The customer opens the link (in their own browser tab).
  const link = await page.getByRole("link", { name: "Open payment link" }).getAttribute("href");
  const customer = await context.newPage();
  await customer.goto(link!);
  await expect(customer.getByText("TEST PAYMENT PAGE")).toBeVisible();
  await expect(customer.getByText(booking.reference)).toBeVisible();

  // A declined card leaves the booking unpaid and the link usable.
  await customer.getByRole("button", { name: "Simulate a declined card" }).click();
  await expect(customer.getByRole("alert").filter({ hasText: "did not go through" })).toBeVisible();
  const [afterFail] = await query("select payment_status from catering_requests where id = $1", [booking.id]);
  expect(afterFail).toEqual({ payment_status: "payment_failed" });

  await customer.getByRole("button", { name: "Pay AED 750.00 (test)" }).click();
  await expect(customer.getByRole("status")).toContainText("Payment received");
  await expect(customer.getByRole("status")).not.toContainText("confirmed your booking");

  const [paid] = await query<{ payment_status: string; amount_fils: string; is_test: boolean; request_status: string }>(
    `select c.payment_status, p.amount_fils, p.is_test, pr.status as request_status
       from catering_requests c
       join payments p on p.catering_request_id = c.id and p.status = 'succeeded'
       join payment_requests pr on pr.id = p.payment_request_id
      where c.id = $1`,
    [booking.id],
  );
  expect(paid).toEqual({ payment_status: "deposit_paid", amount_fils: "75000", is_test: true, request_status: "paid" });
  expect(await query("select template from email_outbox where template = 'payment_received' and entity_id = $1", [booking.id])).toEqual([
    { template: "payment_received" },
  ]);

  // The same link cannot be paid twice.
  await customer.reload();
  await expect(customer.getByRole("status")).toContainText("Payment received");
  await expect(customer.getByRole("button", { name: /Pay AED/ })).toHaveCount(0);

  // Staff can now confirm.
  await page.reload();
  await expect(page.getByText("Payments received")).toBeVisible();
  await page.getByRole("button", { name: "Confirm booking" }).click();
  await expect(page.getByRole("button", { name: "Start preparing" })).toBeVisible();
  const [done] = await query("select status, payment_status from catering_requests where id = $1", [booking.id]);
  expect(done).toEqual({ status: "confirmed", payment_status: "deposit_paid" });
});

test("sending a new link invalidates the previous one", async ({ page, context }) => {
  await setup(page);
  await page.getByRole("button", { name: "Send payment link" }).click();
  const first = await page.getByRole("link", { name: "Open payment link" }).getAttribute("href");
  await page.getByRole("button", { name: "Send a new link" }).click();
  await expect.poll(async () => page.getByRole("link", { name: "Open payment link" }).getAttribute("href")).not.toBe(first);
  const old = await context.newPage();
  await old.goto(first!);
  await expect(old.getByRole("alert").filter({ hasText: "no longer valid" })).toBeVisible();
});

test("the payment webhook rejects unsigned or forged events", async ({ request }) => {
  const body = JSON.stringify({ id: "evt_forged", type: "payment.succeeded", created: Math.floor(Date.now() / 1000), data: {} });
  const unsigned = await request.post(`${site()}/api/webhooks/payments`, { data: body, headers: { "content-type": "application/json" } });
  expect(unsigned.status()).toBe(401);
  const forged = await request.post(`${site()}/api/webhooks/payments`, {
    data: body,
    headers: { "content-type": "application/json", "x-mock-signature": `t=${Math.floor(Date.now() / 1000)},v1=${"0".repeat(64)}` },
  });
  expect(forged.status()).toBe(401);
  expect(await query("select id from payment_events where provider_event_id = 'evt_forged'")).toEqual([]);
});
