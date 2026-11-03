import Image from "next/image";

import {
  getBillContrastColor,
  getBillReadableAccentColor,
  type BillBranding,
} from "@/lib/bill-branding";

export function BillHeader({
  branding,
  billNumber,
}: {
  branding: BillBranding;
  billNumber: string;
}) {
  const bold = branding.template === "bold";
  const minimal = branding.template === "minimal";
  const split = branding.template === "split";
  const textColor = bold
    ? getBillContrastColor(branding.color)
    : getBillReadableAccentColor(branding.color);
  const headerClass =
    branding.template === "modern"
      ? "mb-8 flex items-start justify-between gap-3 rounded-xl border-l-4 bg-muted/40 px-4 py-3"
      : bold
        ? "mb-8 flex items-start justify-between gap-3 rounded-xl px-4 py-4"
        : minimal
          ? "mb-8 flex flex-col items-center border-b pb-4 text-center"
          : branding.template === "elegant"
            ? "mb-8 flex items-start justify-between gap-3 border-y-2 py-4"
            : "mb-8 flex items-start justify-between gap-3 border-b-2 pb-4";
  const details = [
    branding.businessPhone,
    branding.businessAddress,
    branding.gstin ? `GSTIN: ${branding.gstin}` : "",
  ].filter(Boolean);

  return (
    <div
      className={headerClass}
      style={{
        borderColor: branding.color,
        ...(bold ? { backgroundColor: branding.color } : {}),
      }}
    >
      <div className={`flex min-w-0 items-center gap-3 ${minimal ? "flex-col" : ""}`}>
        {branding.logoDataUrl ? (
          <Image
            src={branding.logoDataUrl}
            alt={`${branding.businessName} logo`}
            width={56}
            height={56}
            className="shrink-0 rounded-lg object-contain"
            priority
            unoptimized
          />
        ) : null}
        <div className={minimal ? "text-center" : "min-w-0"}>
          <h1 className="break-words text-xl font-extrabold tracking-tight sm:text-2xl" style={{ color: textColor }}>
            {branding.businessName || "Business name"}
          </h1>
          <p
            className={`whitespace-pre-line text-xs leading-tight ${bold ? "" : "text-muted-foreground"}`}
            style={bold ? { color: textColor, opacity: 0.85 } : undefined}
          >
            {details.join("\n")}
          </p>
        </div>
      </div>
      <div
        className={`shrink-0 text-right ${split ? "rounded-lg px-3 py-2" : ""}`}
        style={split ? { backgroundColor: branding.color, color: getBillContrastColor(branding.color) } : undefined}
      >
        <p
          className={`text-xs font-semibold uppercase tracking-wider ${bold || split ? "" : "text-muted-foreground"}`}
          style={bold ? { color: textColor, opacity: 0.8 } : undefined}
        >
          {branding.billTitle || "Invoice"}
        </p>
        <p
          className={`text-lg font-bold sm:text-xl ${bold || split ? "" : "text-foreground"}`}
          style={bold || split ? { color: split ? getBillContrastColor(branding.color) : textColor } : undefined}
        >
          {branding.billNumberPrefix.toUpperCase()}-{billNumber}
        </p>
      </div>
    </div>
  );
}
