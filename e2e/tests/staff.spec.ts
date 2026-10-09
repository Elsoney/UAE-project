/**
 * Staff journeys (owner §2, §4, §5): sign-in, role separation, and reviewing a
 * guest catering request through to a confirmed booking — with the database
 * recording who did what.
 */
import { randomUUID } from "node:crypto";
import { expect, test, type Page } from "@playwright/test";
import { eventDate, query, site, uniqueEmail } from "./support";

const PASSWORD = "Correct-Horse-42";

async function createUser(role: "admin" | "operations_owner" | null, name = "Test Staff") {
  const id = randomUUID();
  const email = uniqueEmail(role ?? "user");
  await query("insert into auth.users (id, email, encrypted_password) values ($1, $2, encode(sha256(convert_to($3, 'UTF8')), 'hex'))", [id, email, PASSWORD]);
  if (role) await query("insert into admin_users (user_id, role, full_name) values ($1, $2, $3)", [id, role, name]);
  return { id, email };
}

async function guestCateringRequest(contactName = "Guest Family") {
  const [row] = await query<{ reference: string }>(
    "select reference from submit_catering_request($1::jsonb)",
    [
      JSON.stringify({
        idempotency_key: `e2e-${randomUUID()}`,
        locale: "en",
        contact: { name: contactName, phone: "+971501234567", email: uniqueEmail("guest") },
        package_slug: "family-gathering",
        event_date: eventDate(21),
        event_time: "19:00",
        guest_count: 30,
        event_location: "Al Rawda 3, Ajman",
        email: { locale: "en", subject: "We received your catering request" },
      }),
    ],
  );
  const [{ id }] = await query<{ id: string }>("select id from catering_requests where reference = $1", [row.reference]);
  return { reference: row.reference, id };
}

async function signIn(page: Page, email: string, locale = "en", password = PASSWORD, expectSuccess = true) {
  await page.goto(`${site()}/${locale}/admin/sign-in`);
  await page.getByLabel(locale === "en" ? "Email" : "البريد الإلكتروني").fill(email);
  await page.getByLabel(locale === "en" ? "Password" : "كلمة المرور").fill(password);
  await page.getByRole("button", { name: locale === "en" ? "Sign in" : "تسجيل الدخول" }).click();
  if (expectSuccess) await page.waitForURL(new RegExp(`/${locale}/admin$`));
}

test("the staff area requires signing in", async ({ page }) => {
  await page.goto(`${site()}/en/admin`);
  await expect(page).toHaveURL(/\/en\/admin\/sign-in$/);
  await page.goto(`${site()}/en/admin/orders`);
  await expect(page).toHaveURL(/\/en\/admin\/sign-in$/);
  const admin = await createUser("admin");
  await signIn(page, admin.email, "en", "wrong-password", false);
  await expect(page.getByRole("alert").filter({ hasText: "The email or password is not correct." })).toBeVisible();
});

test("a signed-in account without a staff role sees no operations data", async ({ page }) => {
  const user = await createUser(null);
  await guestCateringRequest();
  await signIn(page, user.email);
  await expect(page.getByRole("heading", { name: "This account has no staff access" })).toBeVisible();
  await expect(page.getByRole("table")).toHaveCount(0);
});

test("an admin reviews a catering request through to a confirmed booking", async ({ page }) => {
  const admin = await createUser("admin", "Mariam (Admin)");
  const request = await guestCateringRequest("Al Mansoori Family");
  await signIn(page, admin.email);
  await page.getByRole("link", { name: request.reference }).click();
  await expect(page.getByRole("heading", { name: request.reference })).toBeVisible();
  await expect(page.getByRole("region", { name: "Contact" }).getByText("Al Mansoori Family")).toBeVisible();

  await page.getByRole("button", { name: "Mark customer contacted" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Saved." })).toBeVisible();
  await expect(page.getByText("Customer contacted").first()).toBeVisible();

  await page.getByLabel("Agreed total (AED)").fill("3000");
  await page.getByLabel("No deposit").check();
  await expect(page.getByText("Required before confirmation: AED 0.00")).toBeVisible();
  await page.getByRole("button", { name: "Save price and payment" }).click();
  await expect(page.getByRole("button", { name: "Confirm booking" })).toBeVisible();
  await page.getByRole("button", { name: "Confirm booking" }).click();
  await expect(page.getByRole("button", { name: "Start preparing" })).toBeVisible();

  const [row] = await query<{ status: string; quoted_total_fils: string; deposit_type: string; reviewed_by: string; confirmed: boolean }>(
    "select status, quoted_total_fils, deposit_type, reviewed_by, confirmed_at is not null as confirmed from catering_requests where id = $1",
    [request.id],
  );
  expect(row).toEqual({ status: "confirmed", quoted_total_fils: "300000", deposit_type: "none", reviewed_by: admin.id, confirmed: true });
  const history = await query<{ new_value: string; changed_by: string }>(
    "select new_value, changed_by from status_history where entity_id = $1 and field = 'status' order by id",
    [request.id],
  );
  expect(history.map((h) => h.new_value)).toEqual(["pending_review", "customer_contacted", "quoted", "confirmed"]);
  expect(history.slice(1).every((h) => h.changed_by === admin.id)).toBe(true);
});

test("a booking that needs a deposit cannot be confirmed before payment", async ({ page }) => {
  const admin = await createUser("admin");
  const request = await guestCateringRequest();
  await signIn(page, admin.email);
  await page.goto(`${site()}/en/admin/catering/${request.id}`);
  await page.getByLabel("Agreed total (AED)").fill("3000");
  await page.getByLabel("Percentage deposit").check();
  await page.getByLabel("Deposit percentage").fill("25");
  await expect(page.getByText("Required before confirmation: AED 750.00")).toBeVisible();
  await expect(page.getByText("Remaining after that: AED 2,250.00")).toBeVisible();
  await page.getByRole("button", { name: "Save price and payment" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Saved." })).toBeVisible();
  await expect(page.getByRole("button", { name: "Confirm booking" })).toHaveCount(0);
  await expect(page.getByText("Payment links will be available")).toBeVisible();

  // A deposit larger than the total is refused with a clear message.
  await page.getByLabel("Fixed deposit (AED)").check();
  await page.getByLabel("Deposit amount (AED)").fill("5000");
  await page.getByRole("button", { name: "Save price and payment" }).click();
  await expect(page.getByRole("alert").filter({ hasText: "The deposit cannot be more than the agreed total." })).toBeVisible();
  const [row] = await query<{ deposit_type: string; deposit_percentage: string }>(
    "select deposit_type, deposit_percentage from catering_requests where id = $1",
    [request.id],
  );
  expect(row).toEqual({ deposit_type: "percentage", deposit_percentage: "25.00" });
});

test("the operations owner can review but not change operations", async ({ page }) => {
  const owner = await createUser("operations_owner", "Website Owner");
  const request = await guestCateringRequest();
  await signIn(page, owner.email);
  await expect(page.getByText("You have read-only access to operations.")).toBeVisible();
  await page.goto(`${site()}/en/admin/catering/${request.id}`);
  await expect(page.getByRole("heading", { name: request.reference })).toBeVisible();
  await expect(page.getByRole("button", { name: "Save price and payment" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Mark customer contacted" })).toHaveCount(0);
});

test("an admin moves a guest order forward and can cancel with a reason", async ({ page }) => {
  const admin = await createUser("admin");
  const [order] = await query<{ reference: string }>("select reference from submit_guest_order($1::jsonb)", [
    JSON.stringify({
      idempotency_key: `e2e-${randomUUID()}`,
      locale: "en",
      contact: { name: "Walk-up Customer", phone: "+971551234567", email: uniqueEmail("order") },
      order_type: "pickup",
      items: [{ slug: "chicken-machboos", quantity: 2 }],
      expected_subtotal_fils: 8400,
      email: { locale: "en", subject: "We received your order" },
    }),
  ]);
  await signIn(page, admin.email);
  await page.getByRole("link", { name: "Orders" }).click();
  const row = page.getByRole("row").filter({ hasText: order.reference });
  await row.getByRole("button", { name: "Confirm order" }).click();
  await expect(row.getByRole("button", { name: "Start preparing" })).toBeVisible();
  await row.getByRole("button", { name: "Cancel order" }).click();
  await row.getByLabel("Reason (shared with the customer)").fill("Customer called to cancel");
  await row.getByRole("button", { name: "Cancel order" }).click();
  await expect(row.getByText("Cancelled")).toBeVisible();
  const [db] = await query<{ order_status: string; cancellation_reason: string; cancelled: boolean }>(
    "select order_status, cancellation_reason, cancelled_at is not null as cancelled from orders where reference = $1",
    [order.reference],
  );
  expect(db).toEqual({ order_status: "cancelled", cancellation_reason: "Customer called to cancel", cancelled: true });
});

test("the staff area works in Arabic, right to left", async ({ page }) => {
  const admin = await createUser("admin", "مريم");
  await guestCateringRequest();
  await signIn(page, admin.email, "ar");
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  await expect(page.getByRole("heading", { name: "طلبات الضيافة" })).toBeVisible();
  await expect(page.getByText("قيد المراجعة").first()).toBeVisible();
  await page.getByRole("button", { name: "تسجيل الخروج" }).click();
  await expect(page).toHaveURL(/\/ar\/admin\/sign-in$/);
});
