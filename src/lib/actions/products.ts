"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { db, products } from "@/db";
import { firstError, productSchema } from "@/lib/validation";
import { getSession } from "./auth";

export type ActionResult = { error?: string; ok?: boolean };

/** Add/update product. Success par toast client dikhayega (koi redirect nahi). */
export async function saveProductAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const session = await getSession();
  if (!session) redirect("/login");

  const id = Number(formData.get("id") ?? 0);
  const parsed = productSchema.safeParse({
    name: formData.get("name"),
    size: formData.get("size"),
    defaultRatePerBox:
      String(formData.get("defaultRatePerBox") ?? "").trim() === ""
        ? null
        : formData.get("defaultRatePerBox"),
    isActive: formData.get("isActive") === "on",
  });
  if (!parsed.success) return { error: firstError(parsed.error) };

  const { name, size, defaultRatePerBox, isActive } = parsed.data;
  const rateStr =
    defaultRatePerBox === null || defaultRatePerBox === undefined
      ? null
      : defaultRatePerBox.toFixed(2);

  if (id) {
    await db
      .update(products)
      .set({ name, size, defaultRatePerBox: rateStr, isActive })
      .where(eq(products.id, id));
  } else {
    await db.insert(products).values({ name, size, defaultRatePerBox: rateStr });
  }

  revalidatePath("/products");
  return { ok: true };
}

export async function deleteProductAction(formData: FormData): Promise<ActionResult> {
  const session = await getSession();
  if (!session) redirect("/login");

  const id = Number(formData.get("id") ?? 0);
  if (!id) return { error: "Invalid product." };

  try {
    await db.delete(products).where(eq(products.id, id));
  } catch {
    return { error: "This product is used in stock or sales and cannot be deleted." };
  }

  revalidatePath("/products");
  return { ok: true };
}
