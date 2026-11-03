"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { db, staff } from "@/db";
import { hashPin, PIN_PATTERN } from "@/lib/pin";
import { requireAdmin } from "@/lib/authorization";

export type ActionResult = { error?: string; ok?: boolean };

/** Naya staff add karo (Delivered By dropdown me dikhega). */
export async function addStaffAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  await requireAdmin();

  const name = String(formData.get("name") ?? "").trim();
  const staffIdInput = String(formData.get("staffId") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const pin = String(formData.get("pin") ?? "").trim();
  if (!name || name.length > 60) return { error: "Staff name is required (max 60 characters)." };
  if (phone.length > 20) return { error: "Phone must be 20 characters or fewer." };
  if (!PIN_PATTERN.test(pin)) return { error: "Staff PIN 4–8 digits ka hona chahiye." };

  const staffId = (staffIdInput || `STF${Date.now().toString(36).toUpperCase()}`).toUpperCase();
  if (!/^[A-Z0-9-]{3,24}$/.test(staffId)) {
    return { error: "Staff ID must be 3–24 letters, numbers, or hyphens." };
  }
  try {
    await db.insert(staff).values({
      name,
      staffId,
      phone: phone || null,
      pinHash: await hashPin(pin),
      mustChangePin: true,
    });
  } catch (error) {
    if (error instanceof Error && error.message.toLowerCase().includes("staff_staff_id_unique")) {
      return { error: "This Staff ID is already in use." };
    }
    throw error;
  }
  revalidatePath("/settings");
  redirect("/settings?added=1");
}

export async function updateStaffAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  await requireAdmin();

  const id = Number(formData.get("id") ?? 0);
  const name = String(formData.get("name") ?? "").trim();
  const staffId = String(formData.get("staffId") ?? "").trim().toUpperCase();
  const phone = String(formData.get("phone") ?? "").trim();
  const pin = String(formData.get("pin") ?? "").trim();
  if (!Number.isSafeInteger(id) || id <= 0) return { error: "Invalid staff account." };
  if (!name || name.length > 60) return { error: "Staff name is required (max 60 characters)." };
  if (!/^[A-Z0-9-]{3,24}$/.test(staffId)) {
    return { error: "Staff ID must be 3–24 letters, numbers, or hyphens." };
  }
  if (phone.length > 20) return { error: "Phone must be 20 characters or fewer." };
  if (pin && !PIN_PATTERN.test(pin)) return { error: "PIN 4–8 digits ka hona chahiye." };

  try {
    await db
      .update(staff)
      .set({
        name,
        staffId,
        phone: phone || null,
        ...(pin ? { pinHash: await hashPin(pin), mustChangePin: true } : {}),
      })
      .where(eq(staff.id, id));
  } catch (error) {
    if (error instanceof Error && error.message.toLowerCase().includes("staff_staff_id_unique")) {
      return { error: "This Staff ID is already in use." };
    }
    throw error;
  }
  revalidatePath("/settings");
  revalidatePath(`/staff/${id}`);
  return { ok: true };
}

/** Staff ko active/inactive toggle karo (deactivate = dropdown me nahi dikhega). */
export async function toggleStaffAction(formData: FormData): Promise<void> {
  await requireAdmin();

  const id = Number(formData.get("id") ?? 0);
  const active = formData.get("active") === "true";
  if (!Number.isSafeInteger(id) || id <= 0) return;

  await db.update(staff).set({ isActive: !active }).where(eq(staff.id, id));
  revalidatePath("/settings");
  revalidatePath(`/staff/${id}`);
}

export async function removeStaffAction(formData: FormData): Promise<void> {
  await requireAdmin();

  const id = Number(formData.get("id") ?? 0);
  if (!Number.isSafeInteger(id) || id <= 0) return;

  await db.update(staff).set({ isActive: false }).where(eq(staff.id, id));
  revalidatePath("/settings");
  revalidatePath(`/staff/${id}`);
}