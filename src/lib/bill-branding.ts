import { SHOP } from "@/lib/shop";

export const BILL_TEMPLATES = [
  { id: "classic", name: "Classic", description: "Clean header with a simple accent line" },
  { id: "modern", name: "Modern", description: "Soft colour panel with a bold side accent" },
  { id: "bold", name: "Bold", description: "High-contrast colour header" },
  { id: "minimal", name: "Minimal", description: "Centered, compact invoice layout" },
  { id: "elegant", name: "Elegant", description: "Centered identity with double accent lines" },
  { id: "split", name: "Split", description: "Business details with a highlighted bill-number panel" },
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
