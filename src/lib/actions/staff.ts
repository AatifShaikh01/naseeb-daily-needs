"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { db, staff } from "@/db";
import { firstError, staffSchema } from "@/lib/validation";
import { getSession } from "./auth";

export type ActionResult = { error?: string; ok?: boolean };

/** Naya staff add karo (Delivered By dropdown me dikhega). */
export async function addStaffAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const session = await getSession();
  if (!session) redirect("/login");

  const parsed = staffSchema.safeParse({ name: formData.get("name") });
  if (!parsed.success) return { error: firstError(parsed.error) };

  await db.insert(staff).values({ name: parsed.data.name });
  revalidatePath("/settings");
  redirect("/settings?added=1");
}

/** Staff ko active/inactive toggle karo (deactivate = dropdown me nahi dikhega). */
export async function toggleStaffAction(formData: FormData): Promise<void> {
  const session = await getSession();
  if (!session) redirect("/login");

  const id = Number(formData.get("id") ?? 0);
  const active = formData.get("active") === "true";
  if (!id) return;

  await db.update(staff).set({ isActive: !active }).where(eq(staff.id, id));
  revalidatePath("/settings");
}