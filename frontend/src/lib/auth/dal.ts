/**
 * Data Access Layer for staff authorization (owner §2: "server-side
 * authorization for privileged operations").
 *
 * Every Server Action and Route Handler that touches staff data calls
 * requireStaff() itself — hiding UI or a proxy redirect is never relied on.
 * The session is verified with Supabase Auth (getUser contacts the auth server;
 * it does not trust the cookie alone), then the role is read from admin_users.
 */
import "server-only";
import { cache } from "react";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { AuthorizationError, evaluateStaffAccess, type StaffAccess, type StaffRole, type StaffSession } from "./staff";

export const getStaffAccess = cache(async (): Promise<StaffAccess> => {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return evaluateStaffAccess(null, null);
  const { data: row } = await supabase
    .from("admin_users")
    .select("role, full_name, is_active")
    .eq("user_id", user.id)
    .maybeSingle();
  return evaluateStaffAccess(user, row ?? null);
});

/** Returns the staff session or throws AuthorizationError. */
export async function requireStaff(roles?: readonly StaffRole[]): Promise<StaffSession> {
  const access = await getStaffAccess();
  if (!access.allowed) throw new AuthorizationError(access.reason);
  if (roles && roles.length > 0 && !roles.includes(access.session.role)) {
    throw new AuthorizationError("forbidden");
  }
  return access.session;
}
