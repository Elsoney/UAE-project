/** Arabic and English experience (owner §8). */
import { expect, test } from "@playwright/test";
import { site } from "./support";

test("arrives in Arabic by default and in English for English browsers", async ({ browser }) => {
  const arabic = await browser.newContext({ locale: "fr-FR" });
  const p1 = await arabic.newPage();
  await p1.goto(`${site()}/`);
  await expect(p1).toHaveURL(/\/ar$/);
  await expect(p1.locator("html")).toHaveAttribute("dir", "rtl");
  await arabic.close();

  const english = await browser.newContext({ locale: "en-GB" });
  const p2 = await english.newPage();
  await p2.goto(`${site()}/menu`);
  await expect(p2).toHaveURL(/\/en\/menu$/);
  await expect(p2.locator("html")).toHaveAttribute("dir", "ltr");
  await english.close();
});

test("switching language keeps the page and is remembered", async ({ page }) => {
  await page.goto(`${site()}/ar/catering`);
  await page.getByRole("link", { name: "Read this page in English" }).click();
  await expect(page).toHaveURL(/\/en\/catering$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Catering");
  await page.goto(`${site()}/contact`);
  await expect(page).toHaveURL(/\/en\/contact$/);
});

test("the menu can be searched in Arabic", async ({ page }) => {
  await page.goto(`${site()}/ar/menu`);
  await page.getByLabel("ابحث في القائمة").fill("مجبوس");
  await expect(page.getByRole("heading", { name: "مجبوس دجاج" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "لقيمات" })).toHaveCount(0);
});

test("unknown pages return a bilingual 404", async ({ request }) => {
  const res = await request.get(`${site()}/ar/does-not-exist`);
  expect(res.status()).toBe(404);
  const html = await res.text();
  expect(html).toContain("لم نجد هذه الصفحة");
  expect(html).toContain("We could not find that page");
});
