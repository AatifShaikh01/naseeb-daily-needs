"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { db, payments, sales } from "@/db";
import { todayIST } from "@/lib/dates";
import { customerPaymentSchema, firstError, salePaymentSchema } from "@/lib/validation";
import { getSession } from "./auth";

export type ActionResult = { error?: string; ok?: boolean };

const normName = (s: string) => s.trim().toLowerCase();
const normPhone = (s: string | null | undefined) => (s ?? "").replace(/\D/g, "");

/** paid/total se status decide karo. */
function statusFor(paid: number, total: number): "paid" | "pending" | "partial" {
  if (paid >= total - 0.005) return "paid";
  if (paid <= 0.005) return "pending";
  return "partial";
}

/** Sale-level payment — paid_amount aur status auto-update. */
export async function recordSalePaymentAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const session = await getSession();
  if (!session) redirect("/login");

  const parsed = salePaymentSchema.safeParse({
    saleId: formData.get("saleId"),
    amount: formData.get("amount"),
    paidOn: formData.get("paidOn") ?? todayIST(),
    mode: formData.get("mode") ?? "cash",
  });
  if (!parsed.success) return { error: firstError(parsed.error) };

  const { saleId, amount, paidOn, mode } = parsed.data;

  const [sale] = await db.select().from(sales).where(eq(sales.id, saleId));
  if (!sale) return { error: "Sale not found." };

  const total = Number(sale.totalAmount);
  const cur = Number(sale.paidAmount);
  const newPaid = Math.round((cur + amount) * 100) / 100;

  await db
    .insert(payments)
    .values({ saleId, amount: amount.toFixed(2), paidOn, mode });
  await db
    .update(sales)
    .set({ paidAmount: newPaid.toFixed(2), paymentStatus: statusFor(newPaid, total) })
    .where(eq(sales.id, saleId));

  revalidatePath("/pending");
  revalidatePath("/sales");
  revalidatePath("/sale");
  return { ok: true };
}

/**
 * Customer-level payment — same customer_name (case-insensitive, trimmed) + phone.
 * Amount oldest sale se pehle adjust hota hai (FIFO). Leftover newest sale pe overpayment.
 */
export async function recordCustomerPaymentAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const session = await getSession();
  if (!session) redirect("/login");

  const parsed = customerPaymentSchema.safeParse({
    customerName: formData.get("customerName"),
    customerPhone: String(formData.get("customerPhone") ?? "").trim() || null,
    amount: formData.get("amount"),
    paidOn: formData.get("paidOn") ?? todayIST(),
    mode: formData.get("mode") ?? "cash",
    note: String(formData.get("note") ?? "").trim() || null,
  });
  if (!parsed.success) return { error: firstError(parsed.error) };

  const { customerName, customerPhone, amount, paidOn, mode, note } = parsed.data;

  const all = await db.select().from(sales);
  const tn = normName(customerName);
  const tp = normPhone(customerPhone);
  const mine = all
    .filter((s) => normName(s.customerName) === tn && normPhone(s.customerPhone) === tp)
    .sort((a, b) => (a.saleDate < b.saleDate ? -1 : a.saleDate > b.saleDate ? 1 : a.id - b.id));

  if (mine.length === 0) return { error: "No sales found for this customer." };

  let remaining = Math.round(amount * 100) / 100;

  // FIFO — oldest pending sale pehle
  for (const s of mine) {
    if (remaining <= 0.005) break;
    const total = Number(s.totalAmount);
    const cur = Number(s.paidAmount);
    const due = Math.round((total - cur) * 100) / 100;
    if (due <= 0) continue;
    const applied = Math.min(due, remaining);
    const newPaid = Math.round((cur + applied) * 100) / 100;
    await db
      .insert(payments)
      .values({ saleId: s.id, amount: applied.toFixed(2), paidOn, mode, note: note ?? "" });
    await db
      .update(sales)
      .set({ paidAmount: newPaid.toFixed(2), paymentStatus: statusFor(newPaid, total) })
      .where(eq(sales.id, s.id));
    remaining = Math.round((remaining - applied) * 100) / 100;
  }

  // Overpayment (agar sab paid ho gaye) — newest sale pe credit ke roop me record
  if (remaining > 0.005) {
    const last = mine[mine.length - 1];
    const cur = Number(last.paidAmount);
    const newPaid = Math.round((cur + remaining) * 100) / 100;
    await db
      .insert(payments)
      .values({ saleId: last.id, amount: remaining.toFixed(2), paidOn, mode, note: (note ? note + " " : "") + "(advance)" });
    await db
      .update(sales)
      .set({ paidAmount: newPaid.toFixed(2), paymentStatus: statusFor(newPaid, Number(last.totalAmount)) })
      .where(eq(sales.id, last.id));
  }

  revalidatePath("/pending");
  revalidatePath("/sales");
  revalidatePath("/sale");
  return { ok: true };
}
