/**
 * Service-role Supabase client. BYPASSES Row Level Security.
 *
 * Only for trusted server code that has already validated input and checked
 * authorization (guest submissions, verified webhooks, staff actions after
 * requireStaff()). Never import from a Client Component: `server-only`
 * enforces that at build time. The key is never sent to the browser.
 */
import "server-only";
import { createClient } from "@supabase/supabase-js";
import { serverEnv } from "@/lib/env";
import { publicEnv } from "@/lib/env.public";
import type { Database } from "@/types/database";

export function createSupabaseServiceClient() {
  return createClient<Database>(publicEnv().supabaseUrl, serverEnv().SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}
