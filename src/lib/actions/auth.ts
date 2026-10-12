"use server";

import { and, eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { db, users } from "@/db";
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
  return verifySessionToken(token);
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

  if (!username || !pin) {
    return { error: "Username aur PIN dono bharein." };
  }

  // ---- Rate limiting (simple in‑memory token bucket) ----
  const remoteAddr = "127.0.0.1"; // In real app, extract from request headers or ip middleware
  const allowed = isLoginAllowed(username, remoteAddr);
  if (!allowed) {
    return { error: "Daayre badh gaye. Kuch din ke liye lock ho gaya. Pehle login karein." };
  }
  recordAttempt(username, remoteAddr);

  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.username, username))
    .limit(1);

  if (!user || !(await verifyPin(pin, user.pinHash))) {
    return { error: "Galat username ya PIN. Dobara try karein." };
  }

  // Successful login, reset attempts for this user
  clearAttempts(username, remoteAddr);

  const token = await createSessionToken({
    uid: user.id,
    username: user.username,
    name: user.name,
    mustChangePin: user.mustChangePin,
  });
  const store = await cookies();
  store.set(SESSION_COOKIE, token, cookieOptions);

  redirect(user.mustChangePin ? "/change-pin" : next);
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

  // Token bhi refresh — middleware ko turant naya status mile
  const token = await createSessionToken({
    uid: user.id,
    username: user.username,
    name: user.name,
    mustChangePin: false,
  });
  const store = await cookies();
  store.set(SESSION_COOKIE, token, cookieOptions);

  redirect("/?pin_changed=1");
}
