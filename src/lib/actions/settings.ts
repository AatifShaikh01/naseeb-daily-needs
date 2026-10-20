"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { db, settings } from "@/db";
import { getSession } from "./auth";

export type SettingsActionResult = {
  error?: string;
  ok?: boolean;
  lowStockLimit?: string;
  businessName?: string;
  businessPhone?: string;
};

/**
 * Simle key/value based settings.
 * Supported keys:
 *   - low_stock_limit (number as string)
 *   - business_name
 *   - business_phone
 */

async function getSetting(key: string): Promise<string | null> {
  const [row] = await db.select().from(settings).where(eq(settings.key, key));
  return row?.value ?? null;
}

export async function getSettingsAction(): Promise<SettingsActionResult> {
  const session = await getSession();
  if (!session) redirect("/login");

  try {
    const lowStockLimit = (await getSetting("low_stock_limit")) ?? "5";
    const businessName = (await getSetting("business_name")) ?? "NASEEB DAILY NEEDS & AGENCIES";
    const businessPhone = (await getSetting("business_phone")) ?? "";

    return {
      ok: true,
      lowStockLimit,
      businessName,
      businessPhone,
    };
  } catch {
    return { error: "Failed to load settings." };
  }
}

export async function updateSettingAction(
  _prev: SettingsActionResult | null,
  formData: FormData,
): Promise<SettingsActionResult> {
  const session = await getSession();
  if (!session) redirect("/login");

  const key = String(formData.get("key") ?? "").trim();
  const value = String(formData.get("value") ?? "").trim();

  if (!key || !value) {
    return { error: "Key aur value dono zaroor hone chahiye." };
  }

  // Validate allowed keys
  const allowed = ["low_stock_limit", "business_name", "business_phone"];
  if (!allowed.includes(key)) {
    return { error: "Invalid setting key." };
  }

  // For low_stock_limit ensure numeric
  if (key === "low_stock_limit") {
    const num = Number(value);
    if (!Number.isInteger(num) || num < 1) {
      return { error: "Low-stock limit must be a positive integer." };
    }
  }

  try {
    const [existing] = await db.select().from(settings).where(eq(settings.key, key));
    if (existing) {
      await db.update(settings).set({ value }).where(eq(settings.id, existing.id));
    } else {
      await db.insert(settings).values({ key, value });
    }
    revalidatePath("/settings");
    return { ok: true };
  } catch {
    return { error: "Could not update setting." };
  }
}
