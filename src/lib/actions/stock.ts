"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { db, stockIn } from "@/db";
import { todayIST } from "@/lib/dates";
import { getSession } from "./auth";
import { firstError, stockBatchSchema, stockEntrySchema } from "@/lib/validation";

export type ActionResult = { error?: string; ok?: boolean };

/** Multi-row Stock In: ek baar me multiple products. Success par toast (no redirect). */
export async function createStockEntriesAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const session = await getSession();
  if (!session) redirect("/login");

  const raw = formData.get("entries");
  let entries: unknown = [];
  if (typeof raw === "string" && raw.trim()) {
    try {
      entries = JSON.parse(raw);
    } catch {
      return { error: "Invalid entry data." };
    }
  }

  const parsed = stockBatchSchema.safeParse({
    entryDate: formData.get("entryDate") ?? todayIST(),
    note: String(formData.get("note") ?? "").trim() || null,
    entries,
  });
  if (!parsed.success) return { error: firstError(parsed.error) };

  const { entryDate, note, entries: rows } = parsed.data;
  await db.insert(stockIn).values(
    rows.map((r) => ({
      entryDate,
      productId: r.productId,
      boxes: r.boxes,
      note: note ?? "",
    })),
  );

  revalidatePath("/stock");
  revalidatePath("/stock-in");
  return { ok: true };
}

/** Single entry edit (dialog se). */
export async function updateStockEntryAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const session = await getSession();
  if (!session) redirect("/login");

  const id = Number(formData.get("id") ?? 0);
  if (!id) return { error: "Entry not found." };

  const parsed = stockEntrySchema.safeParse({
    entryDate: formData.get("entryDate"),
    productId: formData.get("productId"),
    boxes: formData.get("boxes"),
    note: String(formData.get("note") ?? "").trim() || null,
  });
  if (!parsed.success) return { error: firstError(parsed.error) };

  const { entryDate, productId, boxes, note } = parsed.data;
  await db
    .update(stockIn)
    .set({ entryDate, productId, boxes, note: note ?? "" })
    .where(eq(stockIn.id, id));

  revalidatePath("/stock");
  revalidatePath("/stock-in");
  return { ok: true };
}

export async function deleteStockEntryAction(formData: FormData): Promise<ActionResult> {
  const session = await getSession();
  if (!session) redirect("/login");

  const id = Number(formData.get("id") ?? 0);
  if (!id) return { error: "Invalid entry." };

  await db.delete(stockIn).where(eq(stockIn.id, id));

  revalidatePath("/stock");
  revalidatePath("/stock-in");
  return { ok: true };
}