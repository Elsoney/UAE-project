/**
 * Public configuration (safe for the browser). Values are inlined at build
 * time by Next.js, so each variable is referenced literally below.
 * Validation is lazy: static pages build without Supabase configured.
 */
import { z } from "zod";

const schema = z.object({
  supabaseUrl: z.url({ error: "NEXT_PUBLIC_SUPABASE_URL must be a URL" }),
  supabaseAnonKey: z
    .string({ error: "NEXT_PUBLIC_SUPABASE_ANON_KEY is missing" })
    .min(20, { error: "NEXT_PUBLIC_SUPABASE_ANON_KEY is missing" }),
});

export type PublicEnv = z.infer<typeof schema>;

export function parsePublicEnv(source: { url?: string; anonKey?: string }): PublicEnv {
  const result = schema.safeParse({ supabaseUrl: source.url, supabaseAnonKey: source.anonKey });
  if (!result.success) {
    throw new Error(`Invalid public configuration: ${result.error.issues.map((i) => i.message).join("; ")}`);
  }
  return result.data;
}

let cached: PublicEnv | undefined;

/** Supabase connection settings; throws a clear error if not configured. */
export function publicEnv(): PublicEnv {
  cached ??= parsePublicEnv({
    url: process.env.NEXT_PUBLIC_SUPABASE_URL,
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  });
  return cached;
}

/** Canonical site URL, used for absolute links (emails, payment redirects, SEO). */
export function siteUrl(): string {
  const raw = process.env.NEXT_PUBLIC_SITE_URL;
  if (!raw) return "http://localhost:3000";
  return raw.replace(/\/+$/, "");
}
