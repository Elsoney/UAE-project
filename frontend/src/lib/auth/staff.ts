/**
 * Pure staff-authorization rules (no I/O), used by the Data Access Layer.
 */
import type { Enums } from "@/types/database";

export type StaffRole = Enums<"admin_role">;

export type StaffSession = {
  userId: string;
  email: string | null;
  role: StaffRole;
  fullName: string;
};

export type StaffAccess =
  | { allowed: true; session: StaffSession }
  | { allowed: false; reason: "unauthenticated" | "not_staff" | "inactive" | "forbidden" };

export function evaluateStaffAccess(
  user: { id: string; email?: string | null } | null,
  staffRow: { role: StaffRole; full_name: string; is_active: boolean } | null,
  requiredRoles?: readonly StaffRole[],
): StaffAccess {
  if (!user) return { allowed: false, reason: "unauthenticated" };
  if (!staffRow) return { allowed: false, reason: "not_staff" };
  if (!staffRow.is_active) return { allowed: false, reason: "inactive" };
  if (requiredRoles && requiredRoles.length > 0 && !requiredRoles.includes(staffRow.role)) {
    return { allowed: false, reason: "forbidden" };
  }
  return {
    allowed: true,
    session: { userId: user.id, email: user.email ?? null, role: staffRow.role, fullName: staffRow.full_name },
  };
}

export class AuthorizationError extends Error {
  constructor(readonly reason: Exclude<StaffAccess, { allowed: true }>["reason"]) {
    super(`access denied: ${reason}`);
    this.name = "AuthorizationError";
  }
}
