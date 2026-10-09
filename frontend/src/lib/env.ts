/**
 * Server-only configuration and secrets (constitution IV, owner §2).
 * `server-only` makes the build fail if this module is ever imported into
 * browser code, so secrets cannot leak into the client bundle.
 */
import "server-only";
import { z } from "zod";

const schema = z.object({
  APP_ENV: z.enum(["development", "test", "staging", "production"]).default("development"),
  SUPABASE_SERVICE_ROLE_KEY: z
    .string({ error: "SUPABASE_SERVICE_ROLE_KEY is missing" })
    .min(20, { error: "SUPABASE_SERVICE_ROLE_KEY is missing" }),
  // Only the mock provider exists until the owner approves a real gateway.
  PAYMENT_PROVIDER: z.enum(["mock"]).default("mock"),
  PAYMENT_WEBHOOK_SECRET: z
    .string({ error: "PAYMENT_WEBHOOK_SECRET is missing" })
    .min(16, { error: "PAYMENT_WEBHOOK_SECRET must be at least 16 characters" }),
  // "log" records emails instead of sending them until a provider is approved.
  EMAIL_PROVIDER: z.enum(["log"]).default("log"),
  EMAIL_FROM: z.string().optional(),
});

export type ServerEnv = z.infer<typeof schema>;

export function parseServerEnv(source: Record<string, string | undefined>): ServerEnv {
  const result = schema.safeParse(source);
  if (!result.success) {
    throw new Error(`Invalid server configuration: ${result.error.issues.map((i) => i.message).join("; ")}`);
  }
  const env = result.data;
  if (env.APP_ENV === "production" && env.PAYMENT_PROVIDER === "mock") {
    throw new Error("The mock payment provider must never run in production (owner instructions §6).");
  }
  if (env.APP_ENV === "production" && env.EMAIL_PROVIDER === "log") {
    throw new Error("A real email provider must be configured in production.");
  }
  return env;
}

let cached: ServerEnv | undefined;

export function serverEnv(): ServerEnv {
  cached ??= parseServerEnv(process.env);
  return cached;
}
