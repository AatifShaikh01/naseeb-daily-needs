"use server";

import { and, eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { db, staff, users } from "@/db";
import { hashPin, PIN_PATTERN, verifyPin } from "@/lib/pin";
import { recordAttempt, clearAttempts, isLoginAllowed } from "@/lib/rate-limit";
import {
  createSessionToken,
  SESSION_COOKIE,
  SESSION_MAX_AGE,
  verifySessionToken,
  type SessionUser,
} from "@/lib/session";

export type ActionResult = { error?: string; ok?: boolean };

const cookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: SESSION_MAX_AGE,
};

/** Sirf app ke andar hi redirect hone do (open-redirect protection). */
function safeNext(next: string): string {
  return next.startsWith("/") && !next.startsWith("//") ? next : "/";
}

export async function getSession(): Promise<SessionUser | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const session = await verifySessionToken(token);
  if (!session) return null;
  if (session.accountType === "staff") {
    const [staffMember] = await db
      .select({
        staffId: staff.staffId,
        role: staff.role,
        isActive: staff.isActive,
        mustChangePin: staff.mustChangePin,
      })
      .from(staff)
      .where(eq(staff.id, session.uid))
      .limit(1);
    if (
      !staffMember ||
      !staffMember.isActive ||
      staffMember.staffId !== session.username ||
      staffMember.role !== session.role ||
      staffMember.mustChangePin !== session.mustChangePin
    ) {
      return null;
    }
  }
  return session;
}

export async function loginAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const username = String(formData.get("username") ?? "")
    .trim()
    .toLowerCase();
  const pin = String(formData.get("pin") ?? "").trim();
  const next = safeNext(String(formData.get("next") ?? "/"));
  const role = String(formData.get("role") ?? "owner").toLowerCase();

  if (!username || !pin) {
    return { error: "Username/Staff ID aur PIN dono bharein." };
  }

  // ---- Rate limiting ---
  const remoteAddr = "127.0.0.1";
  const allowed = isLoginAllowed(username, remoteAddr);
  if (!allowed) {
    return { error: "Daayre badh gaye. Kuch der baad try karein." };
  }
  recordAttempt(username, remoteAddr);

  let account: SessionUser;

  if (role === "staff") {
    // Staff login via staffId + pinHash
    const [staffMember] = await db
      .select()
      .from(staff)
      .where(eq(staff.staffId, username.toUpperCase()))
      .limit(1);

    if (!staffMember || !staffMember.pinHash) {
      return { error: "Staff ID ya PIN galat hai." };
    }
    if (!staffMember.isActive) {
      return { error: "Staff account deactivate hai. Admin se contact karein." };
    }
    if (!(await verifyPin(pin, staffMember.pinHash))) {
      return { error: "Galat PIN. Dobara try karein." };
    }

    account = {
      uid: staffMember.id,
      username: staffMember.staffId,
      name: staffMember.name,
      role: staffMember.role,
      accountType: "staff",
      mustChangePin: staffMember.mustChangePin,
    };
  } else {
    // Owner/Admin login via users table
    const [owner] = await db
      .select()
      .from(users)
      .where(eq(users.username, username))
      .limit(1);

    if (!owner || !(await verifyPin(pin, owner.pinHash))) {
      return { error: "Galat username ya PIN. Dobara try karein." };
    }

    account = {
      uid: owner.id,
      username: owner.username,
      name: owner.name,
      role: "owner",
      accountType: "owner",
      mustChangePin: owner.mustChangePin,
    };
  }

  // Successful login, reset attempts
  clearAttempts(username, remoteAddr);

  const token = await createSessionToken(account);
  const store = await cookies();
  store.set(SESSION_COOKIE, token, cookieOptions);

  redirect(account.mustChangePin ? "/change-pin" : next);
}

export async function logoutAction(): Promise<void> {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
  redirect("/login");
}

export async function changePinAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const session = await getSession();
  if (!session) redirect("/login");

  const oldPin = String(formData.get("oldPin") ?? "").trim();
  const newPin = String(formData.get("newPin") ?? "").trim();
  const confirmPin = String(formData.get("confirmPin") ?? "").trim();

  if (!oldPin || !newPin || !confirmPin) {
    return { error: "Teeno fields bharein." };
  }
  if (!PIN_PATTERN.test(newPin)) {
    return { error: "Naya PIN 4–8 digits ka hona chahiye." };
  }
  if (newPin !== confirmPin) {
    return { error: "Naya PIN aur confirm PIN match nahi kar rahe." };
  }
  if (newPin === oldPin) {
    return { error: "Naya PIN purane se alag hona chahiye." };
  }

  let refreshedSession: SessionUser;
  if (session.accountType === "staff") {
    const [staffMember] = await db
      .select()
      .from(staff)
      .where(and(eq(staff.id, session.uid), eq(staff.staffId, session.username)))
      .limit(1);
    if (!staffMember || !staffMember.isActive || !staffMember.pinHash) redirect("/login");
    if (!(await verifyPin(oldPin, staffMember.pinHash))) {
      return { error: "Purana PIN galat hai." };
    }

    await db
      .update(staff)
      .set({ pinHash: await hashPin(newPin), mustChangePin: false })
      .where(eq(staff.id, staffMember.id));
    refreshedSession = {
      uid: staffMember.id,
      username: staffMember.staffId,
      name: staffMember.name,
      role: staffMember.role,
      accountType: "staff",
      mustChangePin: false,
    };
  } else {
    const [user] = await db
      .select()
      .from(users)
      .where(and(eq(users.id, session.uid), eq(users.username, session.username)))
      .limit(1);
    if (!user) redirect("/login");
    if (!(await verifyPin(oldPin, user.pinHash))) {
      return { error: "Purana PIN galat hai." };
    }

    await db
      .update(users)
      .set({ pinHash: await hashPin(newPin), mustChangePin: false })
      .where(eq(users.id, user.id));
    refreshedSession = {
      uid: user.id,
      username: user.username,
      name: user.name,
      role: session.role,
      accountType: "owner",
      mustChangePin: false,
    };
  }

  // Token bhi refresh — middleware ko turant naya status mile
  const token = await createSessionToken(refreshedSession);
  const store = await cookies();
  store.set(SESSION_COOKIE, token, cookieOptions);

  redirect("/?pin_changed=1");
}
