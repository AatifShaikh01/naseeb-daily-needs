import { redirect } from "next/navigation";

import { getSession } from "@/lib/actions/auth";
import type { SessionUser } from "@/lib/session";

export function isStaffSession(session: SessionUser): boolean {
  return session.accountType === "staff";
}

export function isAdminSession(session: SessionUser): boolean {
  return session.accountType !== "staff" || session.role === "admin";
}

export function isSaleRelatedToStaff(
  sale: { staffId: number | null; deliveredBy: number },
  session: SessionUser,
): boolean {
  return !isStaffSession(session) || sale.staffId === session.uid || sale.deliveredBy === session.uid;
}

export async function requireAdmin(): Promise<SessionUser> {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!isAdminSession(session)) redirect("/");
  return session;
}
