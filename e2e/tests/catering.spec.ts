/**
 * Critical journey (owner §4, §10): a guest requests catering without an
 * account, in Arabic or English, and the request is stored as "pending
 * review" — never presented as a confirmed booking.
 */
import { expect, test, type Page } from "@playwright/test";
import { eventDate, query, site, uniqueEmail } from "./support";

type Labels = { date: string; time: string; guests: string; location: string; name: string; phone: string; email: string; submit: string; consent: string };

const ar: Labels = {
  date: "تاريخ المناسبة",
  time: "وقت المناسبة",
  guests: "عدد الضيوف",
  location: "موقع المناسبة",
  name: "الاسم الكامل",
  phone: "رقم الجوال",
  email: "البريد الإلكتروني",
  submit: "أرسل الطلب",
  consent: "أرسلوا لي أخبار",
};

const en: Labels = {
  date: "Event date",
  time: "Event time",
  guests: "Number of guests",
  location: "Event location",
  name: "Full name",
  phone: "Mobile number",
  email: "Email",
  submit: "Send request",
  consent: "Send me occasional news",
};

async function fillRequest(page: Page, l: Labels, values: { email: string; date?: string; name?: string; consent?: boolean }) {
  await page.getByLabel(l.date).fill(values.date ?? eventDate());
  await page.getByLabel(l.time).fill("19:30");
  await page.getByLabel(l.guests).fill("25");
  await page.getByLabel(l.location).fill("Al Rawda 3, Ajman");
  await page.getByLabel(l.name).fill(values.name ?? "Sara Ali");
  await page.getByLabel(l.phone).fill("050 123 4567");
  await page.getByLabel(l.email, { exact: false }).first().fill(values.email);
  if (values.consent) await page.getByLabel(l.consent).check();
}

async function referenceOnPage(page: Page): Promise<string> {
  const text = (await page.getByRole("status").textContent()) ?? "";
  const match = text.match(/UMC-[2-9A-Z]{8}/);
  expect(match, `reference in: ${text}`).not.toBeNull();
  return match![0];
}

test("a guest requests catering in Arabic without an account", async ({ page }) => {
  const email = uniqueEmail("sara");
  await page.goto(`${site()}/ar/catering`);
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  await fillRequest(page, ar, { email });
  await page.getByRole("button", { name: ar.submit }).click();

  const status = page.getByRole("status");
  await expect(status).toContainText("تم استلام طلبك");
  await expect(status).toContainText("هذا ليس تأكيداً للحجز بعد");
  await expect(status).not.toContainText("تم تأكيد الحجز");
  const reference = await referenceOnPage(page);

  const [row] = await query<{ status: string; payment_status: string; locale: string; source: string; contact_phone: string; marketing_consent: boolean }>(
    `select r.status, r.payment_status, r.locale, r.source, r.contact_phone, c.marketing_consent
       from catering_requests r join customers c on c.id = r.customer_id where r.reference = $1`,
    [reference],
  );
  expect(row).toEqual({ status: "pending_review", payment_status: "unpaid", locale: "ar", source: "website", contact_phone: "+971501234567", marketing_consent: false });

  const outbox = await query<{ template: string; locale: string; status: string }>(
    `select o.template, o.locale, o.status from email_outbox o join catering_requests r on r.id = o.entity_id where r.reference = $1`,
    [reference],
  );
  expect(outbox).toEqual([{ template: "catering_request_received", locale: "ar", status: "queued" }]);
});

test("a returning customer is recognised by email and consent is recorded only on opt-in", async ({ page }) => {
  const email = uniqueEmail("omar");
  await page.goto(`${site()}/en/catering`);
  await fillRequest(page, en, { email, name: "Omar Saeed" });
  await page.getByRole("button", { name: en.submit }).click();
  await expect(page.getByRole("status")).toContainText("Request received");
  await expect(page.getByRole("status")).toContainText("not a booking confirmation");

  await page.getByRole("button", { name: "Send another request" }).click();
  await fillRequest(page, en, { email: email.toUpperCase(), name: "Someone Else", consent: true });
  await page.getByRole("button", { name: en.submit }).click();
  await expect(page.getByRole("status")).toContainText("Request received");

  const customers = await query<{ full_name: string; marketing_consent: boolean; requests: string }>(
    `select c.full_name, c.marketing_consent, count(r.id)::text as requests
       from customers c join catering_requests r on r.customer_id = c.id
      where c.email_normalized = lower($1) group by c.id`,
    [email],
  );
  // One customer, both requests linked, profile not overwritten by the second submission.
  expect(customers).toEqual([{ full_name: "Omar Saeed", marketing_consent: true, requests: "2" }]);
  const consent = await query(`select e.source from consent_events e join customers c on c.id = e.customer_id where c.email_normalized = lower($1)`, [email]);
  expect(consent).toEqual([{ source: "catering_form" }]);
});

test("the form explains problems in the visitor's language and keeps what they typed", async ({ page }) => {
  const email = uniqueEmail("blocked");
  const blocked = eventDate(30);
  await query("insert into blocked_dates (blocked_on, reason) values ($1, 'E2E private event') on conflict do nothing", [blocked]);

  // Checked in the browser: missing email.
  await page.goto(`${site()}/ar/catering`);
  await fillRequest(page, ar, { email: "" });
  await page.getByRole("button", { name: ar.submit }).click();
  await expect(page.getByRole("alert").filter({ hasText: "يرجى تصحيح الحقول المحددة" })).toBeVisible();
  await expect(page.getByText("يرجى تعبئة هذا الحقل.")).toBeVisible();

  // Checked by the server: the date is fully booked.
  await page.goto(`${site()}/en/catering`);
  await fillRequest(page, en, { email, date: blocked });
  await page.getByRole("button", { name: en.submit }).click();
  await expect(page.getByText("We are fully booked on this date")).toBeVisible();
  await expect(page.getByLabel(en.name)).toHaveValue("Sara Ali");
  expect(await query("select id from catering_requests where contact_email = $1", [email])).toEqual([]);
});
