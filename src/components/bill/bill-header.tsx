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
    minimal
      ? "mb-8 flex min-w-0 flex-col items-center gap-3 border-b-2 pb-5 text-center"
      : branding.template === "modern"
        ? "mb-8 grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-3 overflow-hidden rounded-xl border border-border/70 border-l-4 bg-muted/40 p-3 sm:gap-5 sm:p-5"
        : bold
          ? "mb-8 grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-3 overflow-hidden rounded-xl p-3 sm:gap-5 sm:p-5"
          : branding.template === "elegant"
            ? "mb-8 grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-y-2 py-4 sm:gap-5"
            : branding.template === "split"
              ? "mb-8 grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-b-2 pb-4 sm:gap-5"
              : "mb-8 grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-b-2 pb-4 sm:gap-5";
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
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg border border-black/5 bg-white p-1.5 shadow-sm">
            <Image
              src={branding.logoDataUrl}
              alt={`${branding.businessName} logo`}
              width={56}
              height={56}
              className="h-full w-full object-contain"
              priority
              unoptimized
            />
          </div>
        ) : null}
        <div className={minimal ? "min-w-0 text-center" : "min-w-0"}>
          <h1 className="break-words text-lg font-extrabold leading-tight sm:text-2xl" style={{ color: textColor }}>
            {branding.businessName || "Business name"}
          </h1>
          <p
            className={`mt-1 whitespace-pre-line break-words text-[11px] leading-relaxed [overflow-wrap:anywhere] sm:text-xs ${bold ? "" : "text-muted-foreground"}`}
            style={bold ? { color: textColor, opacity: 0.85 } : undefined}
          >
            {details.join("\n")}
          </p>
        </div>
      </div>
      <div
        className={`min-w-0 max-w-[38%] text-right ${minimal ? "rounded-lg px-3 py-2" : "rounded-lg px-2 py-2 sm:px-3"} ${split ? "" : bold ? "border border-white/20" : "border border-border/70 bg-white/70"}`}
        style={split ? { backgroundColor: branding.color, color: getBillContrastColor(branding.color) } : undefined}
      >
        <p
          className={`break-words text-[9px] font-semibold uppercase tracking-wide [overflow-wrap:anywhere] sm:text-xs ${bold || split ? "" : "text-muted-foreground"}`}
          style={bold ? { color: textColor, opacity: 0.8 } : undefined}
        >
          {branding.billTitle || "Invoice"}
        </p>
        <p
          className={`break-all text-sm font-bold leading-tight sm:text-xl ${bold || split ? "" : "text-foreground"}`}
          style={bold || split ? { color: split ? getBillContrastColor(branding.color) : textColor } : undefined}
        >
          {branding.billNumberPrefix.toUpperCase()}-{billNumber}
        </p>
      </div>
    </div>
  );
}
