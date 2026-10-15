"use server";

import { eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { db, purchases, purchaseItems, supplierPayments, suppliers } from "@/db";
import { todayIST } from "@/lib/dates";
import { getSession } from "./auth";
import { firstError, purchaseSchema, supplierPaymentSchema, supplierSchema } from "@/lib/validation";

export type ActionResult = { error?: string; ok?: boolean };

/** Supplier add — naam + optional phone. */
export async function createSupplierAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const session = await getSession();
  if (!session) redirect("/login");

  const parsed = supplierSchema.safeParse({
    name: formData.get("name"),
    phone: String(formData.get("phone") ?? "").trim() || null,
  });
  if (!parsed.success) return { error: firstError(parsed.error) };

  await db.insert(suppliers).values({
    name: parsed.data.name.trim(),
    phone: parsed.data.phone ?? null,
  });

  revalidatePath("/purchases");
  return { ok: true };
}

type ParsedPItem = { productId: number; boxes: number; ratePerBox: number };

function parseItems(raw: FormDataEntryValue | null): ParsedPItem[] {
  if (typeof raw !== "string" || !raw.trim()) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/** Purchase create — purchase + items (+ supplier payment agar paid/partial). */
export async function createPurchaseAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const session = await getSession();
  if (!session) redirect("/login");

  const items = parseItems(formData.get("items"));
  const parsed = purchaseSchema.safeParse({
    entryDate: formData.get("entryDate") ?? todayIST(),
    supplierId: formData.get("supplierId"),
    direction: formData.get("direction") ?? "in",
    paymentStatus: formData.get("paymentStatus") ?? "pending",
    paidAmount: formData.get("paidAmount") ?? 0,
    note: String(formData.get("note") ?? "").trim() || null,
    items,
  });
  if (!parsed.success) return { error: firstError(parsed.error) };

  const { entryDate, supplierId, direction, paymentStatus, paidAmount, note } = parsed.data;
  const sign = direction === "return" ? -1 : 1;
  const total = items.reduce((s, it) => s + it.boxes * it.ratePerBox, 0);
  const totalRounded = sign * (Math.round(total * 100) / 100);
  const paid =
    paymentStatus === "paid" ? totalRounded
    : paymentStatus === "pending" ? 0
    : Math.round(Math.min(Math.max(Number(paidAmount), 0), Math.abs(totalRounded)) * 100) / 100 * Math.sign(totalRounded || 1);

  const [row] = await db
    .insert(purchases)
    .values({
      entryDate,
      supplierId,
      direction,
      totalAmount: totalRounded.toFixed(2),
      paidAmount: paid.toFixed(2),
      note: note ?? "",
    })
    .returning({ id: purchases.id });

  await db.insert(purchaseItems).values(
    items.map((it) => ({
      purchaseId: row.id,
      productId: it.productId,
      boxes: sign * it.boxes,
      ratePerBox: it.ratePerBox.toFixed(2),
    })),
  );

  if (paid !== 0) {
    await db.insert(supplierPayments).values({
      purchaseId: row.id,
      supplierId,
      amount: Math.abs(paid).toFixed(2),
      paidOn: entryDate,
      mode: "cash",
      note: direction === "return" ? "Return adjustment" : paymentStatus === "paid" ? "Paid in full" : "Part payment",
    });
  }

  revalidatePath("/purchases");
  revalidatePath("/stock");
  return { ok: true };
}

/** Supplier ko payment — sabse purani pending purchase pehle (FIFO). */
export async function recordSupplierPaymentAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const session = await getSession();
  if (!session) redirect("/login");

  const parsed = supplierPaymentSchema.safeParse({
    supplierId: formData.get("supplierId"),
    amount: formData.get("amount"),
    paidOn: formData.get("paidOn") ?? todayIST(),
    mode: formData.get("mode") ?? "cash",
    note: String(formData.get("note") ?? "").trim() || null,
  });
  if (!parsed.success) return { error: firstError(parsed.error) };

  const { supplierId, amount, paidOn, mode, note } = parsed.data;
  let left = Math.round(amount * 100) / 100;

  const pendingRows = await db
    .select({
      id: purchases.id,
      total: purchases.totalAmount,
      paid: purchases.paidAmount,
    })
    .from(purchases)
    .where(
      sql`${purchases.supplierId} = ${supplierId} AND (${purchases.totalAmount} - ${purchases.paidAmount}) > 0`,
    )
    .orderBy(sql`${purchases.entryDate} asc, ${purchases.id} asc`);

  for (const p of pendingRows) {
    if (left <= 0) break;
    const due = Math.round((Number(p.total) - Number(p.paid)) * 100) / 100;
    if (due <= 0) continue;
    const use = Math.min(due, left);
    left = Math.round((left - use) * 100) / 100;
    await db
      .update(purchases)
      .set({ paidAmount: (Math.round((Number(p.paid) + use) * 100) / 100).toFixed(2) })
      .where(eq(purchases.id, p.id));
  }

  const applied = Math.round((amount - left) * 100) / 100;
  await db.insert(supplierPayments).values({
    supplierId,
    amount: applied.toFixed(2),
    paidOn,
    mode,
    note: note ?? "",
  });

  revalidatePath("/purchases");
  return { ok: true };
}