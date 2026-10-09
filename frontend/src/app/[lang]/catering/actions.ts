"use server";

/**
 * Server action for guest catering requests (owner §3–§4).
 * Validates again on the server, stores the request as "pending review" in one
 * transaction and queues the confirmation email. Returns only the new
 * reference — never any other data.
 */
import type { ValidationMessageKey } from "@/lib/domain/validation";
import { emailBrand, isDatabaseConfigured } from "@/lib/services/brand";
import { submitCateringRequest } from "@/lib/services/submissions";
import { createSupabasePorts } from "@/lib/services/supabase-ports";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

export type CateringActionResult =
  | { status: "received"; reference: string }
  | { status: "invalid"; errors: Record<string, ValidationMessageKey> }
  | { status: "rate_limited" }
  | { status: "offline" }
  | { status: "error" };

export async function submitCateringAction(input: Record<string, unknown>): Promise<CateringActionResult> {
  // Server actions are public endpoints: never trust the argument's shape.
  if (!input || typeof input !== "object" || Array.isArray(input)) return { status: "error" };
  // Simple bot trap: real visitors never see or fill the "website" field.
  if (typeof input.website === "string" && input.website.trim() !== "") return { status: "error" };

  if (!isDatabaseConfigured()) return { status: "offline" };

  try {
    const ports = createSupabasePorts(createSupabaseServiceClient());
    const result = await submitCateringRequest(
      { catalog: ports, customers: ports, submissions: ports, clock: { now: () => new Date() }, brand: emailBrand() },
      { ...input, website: undefined },
    );
    if (result.ok) return { status: "received", reference: result.reference };
    if (result.kind === "rate_limited") return { status: "rate_limited" };
    return { status: "invalid", errors: result.errors };
  } catch (error) {
    // Log the failure without customer data.
    console.error("catering submission failed", error instanceof Error ? error.message : "unknown error");
    return { status: "error" };
  }
}
