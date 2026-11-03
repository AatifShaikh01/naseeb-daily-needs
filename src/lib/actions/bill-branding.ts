"use server";

import { inArray, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { db, settings } from "@/db";
import {
  BILL_TEMPLATES,
  DEFAULT_BILL_BRANDING,
  type BillBranding,
  type BillTemplateId,
} from "@/lib/bill-branding";
import { getSession } from "@/lib/actions/auth";
import { requireAdmin } from "@/lib/authorization";

const settingKeys = [
  "business_name",
  "business_phone",
  "business_address",
  "business_gstin",
  "bill_title",
  "bill_number_prefix",
  "bill_footer",
  "bill_logo_data",
  "bill_template",
  "bill_color",
] as const;

export async function getBillBranding(): Promise<BillBranding> {
  const session = await getSession();
  if (!session) redirect("/login");

  const rows = await db
    .select({ key: settings.key, value: settings.value })
    .from(settings)
    .where(inArray(settings.key, [...settingKeys]));
  const values = new Map(rows.map((row) => [row.key, row.value]));
  const template = values.get("bill_template");

  return {
    businessName: values.get("business_name") ?? DEFAULT_BILL_BRANDING.businessName,
    businessPhone: values.get("business_phone") ?? DEFAULT_BILL_BRANDING.businessPhone,
    businessAddress: values.get("business_address") ?? DEFAULT_BILL_BRANDING.businessAddress,
    gstin: values.get("business_gstin") ?? DEFAULT_BILL_BRANDING.gstin,
    billTitle: values.get("bill_title") ?? DEFAULT_BILL_BRANDING.billTitle,
    billNumberPrefix: values.get("bill_number_prefix") ?? DEFAULT_BILL_BRANDING.billNumberPrefix,
    footer: values.get("bill_footer") ?? DEFAULT_BILL_BRANDING.footer,
    logoDataUrl: values.get("bill_logo_data") ?? DEFAULT_BILL_BRANDING.logoDataUrl,
    template: BILL_TEMPLATES.some((item) => item.id === template)
      ? (template as BillTemplateId)
      : DEFAULT_BILL_BRANDING.template,
    color: /^#[0-9a-f]{6}$/i.test(values.get("bill_color") ?? "")
      ? values.get("bill_color")!
      : DEFAULT_BILL_BRANDING.color,
  };
}

export type BillBrandingActionResult = { error?: string; ok?: boolean };

export async function updateBillBrandingAction(
  _previous: BillBrandingActionResult | null,
  formData: FormData,
): Promise<BillBrandingActionResult> {
  await requireAdmin();

  const read = (key: string) => String(formData.get(key) ?? "").trim();
  const businessName = read("businessName");
  const businessPhone = read("businessPhone");
  const businessAddress = read("businessAddress");
  const gstin = read("gstin");
  const billTitle = read("billTitle");
  const billNumberPrefix = read("billNumberPrefix");
  const footer = read("footer");
  const logoDataUrl = read("logoDataUrl");
  const template = read("template");
  const color = read("color");

  if (!businessName || businessName.length > 120) {
    return { error: "Business name is required and must be 120 characters or fewer." };
  }
  if (businessPhone.length > 80 || businessAddress.length > 300 || gstin.length > 40) {
    return { error: "Phone, address, or GSTIN is longer than allowed." };
  }
  if (!billTitle || billTitle.length > 40 || footer.length > 200) {
    return { error: "Bill title is required; title and footer must fit within their limits." };
  }
  if (!/^[a-z0-9-]{1,12}$/i.test(billNumberPrefix)) {
    return { error: "Bill number prefix must use up to 12 letters, numbers, or hyphens." };
  }
  if (!BILL_TEMPLATES.some((item) => item.id === template)) {
    return { error: "Choose one of the available bill templates." };
  }
  if (!/^#[0-9a-f]{6}$/i.test(color)) {
    return { error: "Choose a valid bill colour." };
  }
  if (
    logoDataUrl.length > 700_000 ||
    (logoDataUrl !== "" &&
      logoDataUrl !== "/image.png" &&
      !/^data:image\/(?:jpeg|png);base64,[A-Za-z0-9+/]+=*$/.test(logoDataUrl))
  ) {
    return { error: "Upload a smaller JPG or PNG logo." };
  }

  try {
    const values = [
      { key: "business_name", value: businessName },
      { key: "business_phone", value: businessPhone },
      { key: "business_address", value: businessAddress },
      { key: "business_gstin", value: gstin },
      { key: "bill_title", value: billTitle },
      { key: "bill_number_prefix", value: billNumberPrefix },
      { key: "bill_footer", value: footer },
      { key: "bill_logo_data", value: logoDataUrl },
      { key: "bill_template", value: template },
      { key: "bill_color", value: color.toLowerCase() },
    ];
    await db
      .insert(settings)
      .values(values)
      .onConflictDoUpdate({
        target: settings.key,
        set: { value: sql`excluded.value` },
      });

    revalidatePath("/settings");
    revalidatePath("/bill/[saleId]", "page");
    return { ok: true };
  } catch {
    return { error: "Could not save bill branding settings." };
  }
}
