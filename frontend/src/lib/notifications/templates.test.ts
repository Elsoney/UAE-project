import { describe, expect, it } from "vitest";
import { LogEmailSender } from "./email";
import { escapeHtml, renderEmail, type Brand, type EmailTemplate } from "./templates";

const brand: Brand = { nameEn: "Umodai", nameAr: "أمودي", phone: "+971 6 000 0000", siteUrl: "https://umodai.example" };

const cateringReceived: EmailTemplate = {
  template: "catering_request_received",
  data: {
    reference: "UMC-7K4Q2XRM",
    customerName: "Sara <b>Ali</b>",
    eventDate: "2026-10-15",
    eventTime: "19:30",
    guestCount: 25,
    eventLocation: "Al Nuaimiya, Ajman",
    packageName: "Family Gathering",
    customRequest: null,
    status: "pending_review",
  },
};

const orderReceived: EmailTemplate = {
  template: "order_received",
  data: {
    reference: "UMD-7K4Q2XRM",
    customerName: "Omar",
    orderType: "delivery",
    items: [{ nameEn: "Chicken Machboos", nameAr: "مجبوس دجاج", quantity: 2, totalPriceFils: 8400 }],
    subtotalFils: 8400,
    discountFils: 400,
    deliveryFeeFils: 1000,
    totalFils: 9000,
    orderStatus: "new",
    paymentStatus: "unpaid",
  },
};

describe("confirmation emails", () => {
  it("include the reference, submitted details and current status in both languages", () => {
    const en = renderEmail(orderReceived, "en", brand);
    expect(en.subject).toContain("UMD-7K4Q2XRM");
    expect(en.text).toContain("2 × Chicken Machboos");
    expect(en.text).toContain("Delivery");
    expect(en.text).toMatch(/Status: New/);
    expect(en.text).toMatch(/Payment status: Unpaid/);
    expect(en.text).toContain("90.00");

    const ar = renderEmail(orderReceived, "ar", brand);
    expect(ar.subject).toContain("UMD-7K4Q2XRM");
    expect(ar.text).toContain("مجبوس دجاج");
    expect(ar.html).toContain('dir="rtl"');
    expect(ar.html).toContain('lang="ar"');
    expect(ar.text).toContain("أمودي");
  });

  it("say a catering request is received and NOT yet confirmed (owner §3.8, §4)", () => {
    const en = renderEmail(cateringReceived, "en", brand);
    expect(en.subject).toMatch(/received/i);
    expect(en.subject).not.toMatch(/confirm/i);
    expect(en.text).toContain("your booking is not yet confirmed");
    expect(en.text).toContain("Status: Pending review");

    const ar = renderEmail(cateringReceived, "ar", brand);
    expect(ar.subject).not.toMatch(/تأكيد|مؤكد/);
    expect(ar.text).toContain("لم يتم تأكيد الحجز بعد");
    expect(ar.text).toContain("قيد المراجعة");
  });

  it("escape customer-supplied text in HTML", () => {
    const { html, text } = renderEmail(cateringReceived, "en", brand);
    expect(html).toContain("Sara &lt;b&gt;Ali&lt;/b&gt;");
    expect(html).not.toContain("<b>Ali</b>");
    expect(text).toContain("Sara <b>Ali</b>"); // plain text is not HTML
    expect(escapeHtml(`"'&<>`)).toBe("&quot;&#39;&amp;&lt;&gt;");
  });

  it("render the payment request with a secure payment link and expiry", () => {
    const email = renderEmail(
      {
        template: "payment_requested",
        data: {
          reference: "UMC-7K4Q2XRM",
          customerName: "Sara",
          amountFils: 75_000,
          totalFils: 300_000,
          payUrl: "https://pay.example/session?x=1&y=2",
          expiresAt: new Date("2026-10-12T16:00:00Z"),
          paymentStatus: "payment_requested",
        },
      },
      "en",
      brand,
    );
    expect(email.text).toContain("750.00");
    expect(email.text).toContain("3,000.00");
    expect(email.text).toContain("https://pay.example/session?x=1&y=2");
    expect(email.html).toContain('href="https://pay.example/session?x=1&amp;y=2"');
    expect(email.text).toMatch(/expires/);
  });

  it("render payment received and booking confirmed", () => {
    const received = renderEmail(
      { template: "payment_received", data: { reference: "UMC-1", customerName: "S", amountFils: 75_000, remainingFils: 225_000, paymentStatus: "deposit_paid" } },
      "ar",
      brand,
    );
    expect(received.text).toContain("تم دفع العربون");
    const confirmed = renderEmail(
      {
        template: "catering_confirmed",
        data: {
          reference: "UMC-1",
          customerName: "S",
          eventDate: "2026-10-15",
          eventTime: "19:30",
          guestCount: 25,
          eventLocation: "Ajman",
          totalFils: 300_000,
          paidFils: 75_000,
          remainingFils: 225_000,
          status: "confirmed",
          paymentStatus: "deposit_paid",
        },
      },
      "en",
      brand,
    );
    expect(confirmed.subject).toMatch(/confirmed/i);
    expect(confirmed.text).toContain("Booking confirmed");
    expect(confirmed.text).toContain("2,250.00");
  });

  it("omit empty optional rows", () => {
    const pickup = renderEmail({ ...orderReceived, data: { ...orderReceived.data, orderType: "pickup", discountFils: 0, deliveryFeeFils: 0, totalFils: 8400 } }, "en", brand);
    expect(pickup.text).not.toContain("Discount");
    expect(pickup.text).not.toContain("Delivery fee");
    expect(pickup.text).toContain("Pickup");
    const custom = renderEmail({ ...cateringReceived, data: { ...cateringReceived.data, packageName: null, customRequest: "Vegan" } }, "en", brand);
    expect(custom.text).not.toContain("Package");
    expect(custom.text).toContain("Your request: Vegan");
    const noExpiry = renderEmail(
      { template: "payment_requested", data: { reference: "R", customerName: "S", amountFils: 1, totalFils: 1, payUrl: "https://x", expiresAt: null, paymentStatus: "payment_requested" } },
      "ar",
      brand,
    );
    expect(noExpiry.text).not.toContain("ينتهي");
  });
});

describe("log email sender", () => {
  it("records messages instead of sending them", async () => {
    const lines: string[] = [];
    const sender = new LogEmailSender((l) => lines.push(l));
    const result = await sender.send({ to: "a@example.com", subject: "Hi", text: "t", html: "h", locale: "en" });
    expect(result.providerMessageId).toBe("log-1");
    expect(sender.sent).toHaveLength(1);
    expect(lines[0]).toContain("a@example.com");
    await new LogEmailSender().send({ to: "b@example.com", subject: "x", text: "", html: "", locale: "ar" });
  });
});
