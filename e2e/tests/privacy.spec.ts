/**
 * Customer privacy through the public API (owner §2, §3.12): the anon key that
 * every browser has cannot read customers, orders or requests, cannot call
 * the server-only submission functions, and a signed-in non-staff user sees
 * nothing either — even when filtering by a known email.
 */
import { expect, test } from "@playwright/test";
import { anonKey, signJwt } from "../stack";
import { api, query, site } from "./support";

const headers = (key: string) => ({ apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" });

test.describe("public API", () => {
  test.beforeAll(async () => {
    // Make sure there is at least one customer to try to read.
    await query(
      `insert into customers (full_name, phone, email) values ('Private Person', '+971501234567', 'private@example.com')
       on conflict (email_normalized) do nothing`,
    );
  });

  test("visitors can read the menu", async ({ request }) => {
    const res = await request.get(`${api()}/rest/v1/menu_items?select=slug,price_fils`, { headers: headers(anonKey) });
    expect(res.status()).toBe(200);
    expect((await res.json()).length).toBe(12);
  });

  for (const table of ["customers", "orders", "catering_requests", "payments", "commissions", "audit_log", "email_outbox", "admin_users"]) {
    test(`visitors cannot read ${table}`, async ({ request }) => {
      const res = await request.get(`${api()}/rest/v1/${table}?select=*`, { headers: headers(anonKey) });
      expect(res.status()).toBeGreaterThanOrEqual(400);
    });
  }

  test("knowing an email address reveals nothing", async ({ request }) => {
    const anon = await request.get(`${api()}/rest/v1/customers?email_normalized=eq.private@example.com`, { headers: headers(anonKey) });
    expect(anon.status()).toBeGreaterThanOrEqual(400);
    const user = signJwt({ role: "authenticated", sub: "00000000-0000-4000-8000-000000000001", email: "private@example.com" });
    const signedIn = await request.get(`${api()}/rest/v1/customers?email_normalized=eq.private@example.com`, { headers: headers(user) });
    expect(signedIn.status()).toBe(200);
    expect(await signedIn.json()).toEqual([]);
  });

  test("the submission functions cannot be called from a browser", async ({ request }) => {
    const res = await request.post(`${api()}/rest/v1/rpc/submit_catering_request`, { headers: headers(anonKey), data: { p: {} } });
    expect(res.status()).toBeGreaterThanOrEqual(400);
  });

  test("signed-in users cannot make themselves staff", async ({ request }) => {
    const sub = "00000000-0000-4000-8000-000000000002";
    await query("insert into auth.users (id, email) values ($1, 'climber@example.com') on conflict do nothing", [sub]);
    const user = signJwt({ role: "authenticated", sub });
    const res = await request.post(`${api()}/rest/v1/admin_users`, {
      headers: headers(user),
      data: { user_id: sub, role: "operations_owner", full_name: "Climber" },
    });
    expect(res.status()).toBeGreaterThanOrEqual(400);
    expect(await query("select * from admin_users where user_id = $1", [sub])).toEqual([]);
  });
});

test("the server never sends the service-role key to the browser", async ({ page }) => {
  const scripts: string[] = [];
  page.on("response", async (res) => {
    if (res.url().endsWith(".js")) scripts.push(await res.text());
  });
  await page.goto(`${site()}/ar/catering`);
  await page.waitForLoadState("networkidle");
  const { serviceKey } = await import("../stack");
  expect(scripts.length).toBeGreaterThan(0);
  for (const js of scripts) expect(js).not.toContain(serviceKey);
});
