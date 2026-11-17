import { SHOP } from "@/lib/shop";

export const BILL_TEMPLATES = [
  { id: "classic", name: "Classic", description: "Traditional multicolour printed-paper header" },
  { id: "modern", name: "Modern", description: "Soft accent panel with a bold side rule" },
  { id: "bold", name: "Bold", description: "Full-colour business header and table heading" },
  { id: "minimal", name: "Minimal", description: "Centered, compact invoice with fine rules" },
  { id: "elegant", name: "Elegant", description: "Centered serif heading with double rules" },
  { id: "split", name: "Split", description: "Accent bill-number panel and coloured table heading" },
] as const;

export type BillTemplateId = (typeof BILL_TEMPLATES)[number]["id"];

export type BillBranding = {
  businessName: string;
  businessPhone: string;
  businessAddress: string;
  gstin: string;
  billTitle: string;
  billNumberPrefix: string;
  footer: string;
  logoDataUrl: string;
  template: BillTemplateId;
  color: string;
};

export const DEFAULT_BILL_BRANDING: BillBranding = {
  businessName: SHOP.name,
  businessPhone: SHOP.contact,
  businessAddress: SHOP.address,
  gstin: "",
  billTitle: "Invoice",
  billNumberPrefix: "SALE",
  footer: "Thank you for your business!",
  logoDataUrl: "/image.png",
  template: "classic",
  color: "#0f766e",
};

function isLightColor(hex: string): boolean {
  const value = hex.slice(1);
  const channels = [0, 2, 4].map((offset) => {
    const channel = parseInt(value.slice(offset, offset + 2), 16) / 255;
    return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  });
  return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722 > 0.42;
}

export function getBillReadableAccentColor(hex: string): string {
  return isLightColor(hex) ? "#111827" : hex;
}

export function getBillContrastColor(hex: string): string {
  return isLightColor(hex) ? "#111827" : "#ffffff";
}
