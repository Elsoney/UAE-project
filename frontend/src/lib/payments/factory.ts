/**
 * The configured payment provider. Only the test-only mock exists until the
 * owner approves a UAE gateway; env.ts refuses the mock in production.
 */
import "server-only";
import { serverEnv } from "@/lib/env";
import { siteUrl } from "@/lib/env.public";
import { MockPaymentProvider } from "./mock-provider";
import type { PaymentProvider } from "./provider";

export function getPaymentProvider(): PaymentProvider {
  const env = serverEnv();
  switch (env.PAYMENT_PROVIDER) {
    case "mock":
      return new MockPaymentProvider({ webhookSecret: env.PAYMENT_WEBHOOK_SECRET, siteUrl: siteUrl() });
  }
}
