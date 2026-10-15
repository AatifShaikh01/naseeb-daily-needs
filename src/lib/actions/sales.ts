"use server";

import { and, eq, ilike, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { db, payments, saleItems, sales } from "@/db";
import { todayIST } from "@/lib/dates";
import { getSession } from "./auth";
import { firstError, saleSchema } from "@/lib/validation";

export type ActionResult = { error?: string; ok?: boolean };

type ParsedItem = {
  productId: number;
  boxes: number;
  ratePerBox: number;
};

function parseItems(raw: FormDataEntryValue | null): ParsedItem[] {
  if (typeof raw !== "string" || !raw.trim()) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/** Compute total from items and resolve paidAmount by status. */
function resolveAmounts(
  items: ParsedItem[],
  status: "paid" | "pending" | "partial",
  paidInput: number,
) {
  const total = items.reduce((s, it) => s + it.boxes * it.ratePerBox, 0);
  const totalRounded = Math.round(total * 100) / 100;
  if (status === "paid") return { totalRounded, paid: totalRounded };
  if (status === "pending") return { totalRounded, paid: 0 };
  const paid = Math.round(Math.min(Math.max(paidInput, 0), totalRounded) * 100) / 100;
  return { totalRounded, paid };
}

/** New sale create — sale + items (+ a payment row if partial/paid). */
export async function createSaleAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const session = await getSession();
  if (!session) redirect("/login");

  const items = parseItems(formData.get("items"));
  const parsed = saleSchema.safeParse({
    saleDate: formData.get("saleDate") ?? todayIST(),
    customerName: formData.get("customerName"),
    customerPhone: String(formData.get("customerPhone") ?? "").trim() || null,
    deliveredBy: formData.get("deliveredBy"),
    paymentStatus: formData.get("paymentStatus"),
    paidAmount: formData.get("paidAmount") ?? 0,
    note: String(formData.get("note") ?? "").trim() || null,
    items,
  });
  if (!parsed.success) return { error: firstError(parsed.error) };

  const { saleDate, customerName, customerPhone, deliveredBy, paymentStatus, paidAmount, note } =
    parsed.data;
  const { totalRounded, paid } = resolveAmounts(items, paymentStatus, Number(paidAmount));

  const [row] = await db
    .insert(sales)
    .values({
      saleDate,
      customerName,
      customerPhone,
      deliveredBy,
      paymentStatus,
      totalAmount: totalRounded.toFixed(2),
      paidAmount: paid.toFixed(2),
      note: note ?? "",
    })
    .returning({ id: sales.id });

  await db.insert(saleItems).values(
    items.map((it) => ({
      saleId: row.id,
      productId: it.productId,
      boxes: it.boxes,
      ratePerBox: it.ratePerBox.toFixed(2),
    })),
  );

  if (paid > 0) {
    await db.insert(payments).values({
      saleId: row.id,
      amount: paid.toFixed(2),
      paidOn: saleDate,
      mode: "cash",
      note: paymentStatus === "paid" ? "Paid in full" : "Part payment",
    });
  }

  revalidatePath("/sale");
  revalidatePath("/sales");
  revalidatePath("/pending");
  revalidatePath("/stock");
  return { ok: true };
}


/** Sale edit — sale fields update + items replace. */
export async function updateSaleAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const session = await getSession();
  if (!session) redirect("/login");

  const id = Number(formData.get("id") ?? 0);
  if (!id) return { error: "Sale not found." };

  const items = parseItems(formData.get("items"));
  const parsed = saleSchema.safeParse({
    saleDate: formData.get("saleDate") ?? todayIST(),
    customerName: formData.get("customerName"),
    customerPhone: String(formData.get("customerPhone") ?? "").trim() || null,
    deliveredBy: formData.get("deliveredBy"),
    paymentStatus: formData.get("paymentStatus"),
    paidAmount: formData.get("paidAmount") ?? 0,
    note: String(formData.get("note") ?? "").trim() || null,
    items,
  });
  if (!parsed.success) return { error: firstError(parsed.error) };

  const { saleDate, customerName, customerPhone, deliveredBy, paymentStatus, paidAmount, note } =
    parsed.data;
  const { totalRounded, paid } = resolveAmounts(items, paymentStatus, Number(paidAmount));

  await db
    .update(sales)
    .set({
      saleDate,
      customerName,
      customerPhone,
      deliveredBy,
      paymentStatus,
      totalAmount: totalRounded.toFixed(2),
      paidAmount: paid.toFixed(2),
      note: note ?? "",
    })
    .where(eq(sales.id, id));

  await db.delete(saleItems).where(eq(saleItems.saleId, id));
  await db.insert(saleItems).values(
    items.map((it) => ({
      saleId: id,
      productId: it.productId,
      boxes: it.boxes,
      ratePerBox: it.ratePerBox.toFixed(2),
    })),
  );

  revalidatePath("/sale");
  revalidatePath("/sales");
  revalidatePath("/pending");
  revalidatePath("/stock");
  return { ok: true };
}

export async function deleteSaleAction(formData: FormData): Promise<ActionResult> {
  const session = await getSession();
  if (!session) redirect("/login");

  const id = Number(formData.get("id") ?? 0);
  if (!id) return { error: "Sale not found." };

  await db.delete(sales).where(eq(sales.id, id));

  revalidatePath("/sales");
  revalidatePath("/sale");
  revalidatePath("/pending");
  revalidatePath("/stock");
  return { ok: true };
}

/** Customer autosuggest — DISTINCT customer_name + phone, partial match. */
export async function getCustomerSuggestions(
  query: string,
): Promise<{ name: string; phone: string | null }[]> {
  const session = await getSession();
  if (!session) return [];

  const q = query.trim();
  if (!q) return [];

  const rows = await db
    .selectDistinct({ name: sales.customerName, phone: sales.customerPhone })
    .from(sales)
    .where(ilike(sales.customerName, `%${q}%`))
    .limit(8);

  return rows.map((r) => ({ name: r.name, phone: r.phone }));
}

/** Rate history — us customer ko us product ka last rate kya diya tha. */
export async function getLastRate(
  customerName: string,
  productId: number,
): Promise<{ rate: number; date: string } | null> {
  const session = await getSession();
  if (!session) return null;

  const name = customerName.trim();
  if (!name || !productId) return null;

  const rows = await db
    .select({ rate: saleItems.ratePerBox, date: sales.saleDate })
    .from(saleItems)
    .innerJoin(sales, eq(saleItems.saleId, sales.id))
    .where(
      and(
        sql`lower(trim(${sales.customerName})) = lower(trim(${name}))`,
        eq(saleItems.productId, productId),
      ),
    )
    .orderBy(sql`${sales.saleDate} desc, ${sales.id} desc`)
    .limit(1);

  if (!rows[0]) return null;
  return { rate: Number(rows[0].rate), date: rows[0].date };
}
