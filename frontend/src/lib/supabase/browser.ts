"use client";
/**
 * Supabase client for Client Components (anon key; Row Level Security applies).
 * Customers never query their orders through this client — guests have no
 * table access; it is only used for staff sign-in.
 */
import { createBrowserClient } from "@supabase/ssr";
import { publicEnv } from "@/lib/env.public";
import type { Database } from "@/types/database";

export function createSupabaseBrowserClient() {
  const env = publicEnv();
  return createBrowserClient<Database>(env.supabaseUrl, env.supabaseAnonKey);
}
