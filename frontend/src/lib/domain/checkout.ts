/**
 * Guest checkout validation for regular orders (owner instructions §3, PRD P0-F004).
 * Item prices are NOT part of the input: the server prices the cart itself.
 */
import { z } from "zod";
import { MAX_LINES, MAX_QUANTITY_PER_LINE } from "./cart";
import { contactSchema } from "./customer";

export const checkoutSchema = contactSchema
  .extend({
    orderType: z.enum(["pickup", "delivery"], { error: "errors.required" }),
    deliveryAddress: z
      .string()
      .trim()
      .max(500, { error: "errors.tooLong" })
      .optional()
      .transform((v) => (v ? v : null)),
    notes: z
      .string()
      .trim()
      .max(1000, { error: "errors.tooLong" })
      .optional()
      .transform((v) => (v ? v : null)),
    items: z
      .array(
        z.object({
          menuItemId: z.string().trim().min(1, { error: "errors.cartEmpty" }),
          quantity: z.coerce
            .number({ error: "errors.quantity" })
            .int({ error: "errors.quantity" })
            .min(1, { error: "errors.quantity" })
            .max(MAX_QUANTITY_PER_LINE, { error: "errors.quantity" }),
        }),
        { error: "errors.cartEmpty" },
      )
      .min(1, { error: "errors.cartEmpty" })
      .max(MAX_LINES, { error: "errors.quantity" }),
    /** Generated once per checkout attempt in the browser; prevents duplicate orders on retry. */
    idempotencyKey: z.string({ error: "errors.generic" }).min(8, { error: "errors.generic" }).max(100),
  })
  .superRefine((value, issue) => {
    if (value.orderType === "delivery" && !value.deliveryAddress) {
      issue.addIssue({ code: "custom", path: ["deliveryAddress"], message: "errors.deliveryAddress" });
    }
  });

export type CheckoutInput = z.input<typeof checkoutSchema>;
export type Checkout = z.output<typeof checkoutSchema>;
