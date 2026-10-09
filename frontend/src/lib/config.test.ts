import { describe, expect, it, vi } from "vitest";
import { evaluateStaffAccess, AuthorizationError } from "./auth/staff";
import { parseServerEnv } from "./env";
import { parsePublicEnv, siteUrl } from "./env.public";

const secrets = {
  SUPABASE_SERVICE_ROLE_KEY: "service-role-key-0123456789",
  PAYMENT_WEBHOOK_SECRET: "webhook-secret-0123456789",
};

describe("server configuration", () => {
  it("defaults to development with the mock payment provider and log email", () => {
    expect(parseServerEnv(secrets)).toMatchObject({ APP_ENV: "development", PAYMENT_PROVIDER: "mock", EMAIL_PROVIDER: "log" });
  });

  it("refuses to run mock payments in production (owner §6)", () => {
    expect(() => parseServerEnv({ ...secrets, APP_ENV: "production" })).toThrow(/mock payment provider must never run in production/);
  });

  it("fails fast with a clear message when secrets are missing", () => {
    expect(() => parseServerEnv({})).toThrow(/SUPABASE_SERVICE_ROLE_KEY is missing/);
    expect(() => parseServerEnv({ ...secrets, PAYMENT_WEBHOOK_SECRET: "short" })).toThrow(/at least 16/);
  });

  it("only accepts approved providers", () => {
    expect(() => parseServerEnv({ ...secrets, PAYMENT_PROVIDER: "stripe" })).toThrow();
  });

  it("allows staging with test providers, but production needs approved real providers", () => {
    expect(() => parseServerEnv({ ...secrets, APP_ENV: "staging" })).not.toThrow();
    // Until the owner approves a real gateway and email provider, production cannot start.
    expect(() => parseServerEnv({ ...secrets, APP_ENV: "production" })).toThrow();
  });
});

describe("public configuration", () => {
  it("validates Supabase settings", () => {
    expect(parsePublicEnv({ url: "https://abc.supabase.co", anonKey: "anon-key-0123456789abcdef" })).toEqual({
      supabaseUrl: "https://abc.supabase.co",
      supabaseAnonKey: "anon-key-0123456789abcdef",
    });
    expect(() => parsePublicEnv({ url: "not a url", anonKey: "" })).toThrow(/Invalid public configuration/);
  });

  it("derives the site URL without a trailing slash", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://umodai.ae/");
    expect(siteUrl()).toBe("https://umodai.ae");
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "");
    expect(siteUrl()).toBe("http://localhost:3000");
  });
});

describe("staff authorization rules", () => {
  const user = { id: "u1", email: "admin@umodai.ae" };
  const row = { role: "admin" as const, full_name: "Admin", is_active: true };

  it("denies anonymous users, non-staff and inactive staff", () => {
    expect(evaluateStaffAccess(null, null)).toEqual({ allowed: false, reason: "unauthenticated" });
    expect(evaluateStaffAccess(user, null)).toEqual({ allowed: false, reason: "not_staff" });
    expect(evaluateStaffAccess(user, { ...row, is_active: false })).toEqual({ allowed: false, reason: "inactive" });
  });

  it("separates restaurant admin and operations owner permissions", () => {
    expect(evaluateStaffAccess(user, row, ["operations_owner"])).toEqual({ allowed: false, reason: "forbidden" });
    expect(evaluateStaffAccess(user, row, ["admin"])).toMatchObject({ allowed: true, session: { role: "admin", userId: "u1" } });
    expect(evaluateStaffAccess({ id: "u2" }, { ...row, role: "operations_owner" }, [])).toMatchObject({
      allowed: true,
      session: { role: "operations_owner", email: null },
    });
  });

  it("produces a typed authorization error", () => {
    const error = new AuthorizationError("forbidden");
    expect(error.reason).toBe("forbidden");
    expect(error.message).toContain("access denied");
  });
});

describe("configuration from the process environment", () => {
  it("reads and caches server and public settings", async () => {
    vi.resetModules();
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", secrets.SUPABASE_SERVICE_ROLE_KEY);
    vi.stubEnv("PAYMENT_WEBHOOK_SECRET", secrets.PAYMENT_WEBHOOK_SECRET);
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://abc.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "anon-key-0123456789abcdef");
    const { serverEnv } = await import("./env");
    const { publicEnv } = await import("./env.public");
    expect(serverEnv()).toBe(serverEnv());
    expect(publicEnv().supabaseUrl).toBe("https://abc.supabase.co");
    expect(publicEnv()).toBe(publicEnv());
  });
});
