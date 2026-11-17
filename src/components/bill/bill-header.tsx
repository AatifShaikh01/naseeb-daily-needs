import Image from "next/image";

import {
  getBillContrastColor,
  getBillReadableAccentColor,
  type BillBranding,
} from "@/lib/bill-branding";

export function BillHeader({
  branding,
  billNumber,
  billDate,
}: {
  branding: BillBranding;
  billNumber: string;
  billDate: string;
}) {
  const { template, color } = branding;
  const bold = template === "bold";
  const centered = template === "minimal" || template === "elegant";
  const textColor = bold
    ? getBillContrastColor(color)
    : getBillReadableAccentColor(color);
  const details = [
    branding.businessPhone,
    branding.businessAddress,
    branding.gstin ? `GSTIN: ${branding.gstin}` : "",
  ].filter(Boolean);
  const titleStyle = bold
    ? { backgroundColor: color, color: textColor }
    : template === "modern"
      ? { backgroundColor: `${color}12`, borderLeftColor: color }
      : template === "elegant"
        ? { borderColor: color }
        : undefined;
  const invoiceStyle =
    bold || template === "split"
      ? { backgroundColor: color, color: getBillContrastColor(color) }
      : template === "modern"
        ? { borderColor: color, color: getBillReadableAccentColor(color) }
        : undefined;

  return (
    <header className={`mb-5 ${template === "elegant" ? "border-y-2 py-3" : ""}`}>
      {template === "classic" || template === "split" ? (
        <div className="mb-3 flex h-2 overflow-hidden" aria-hidden="true">
          <span className="w-1/3" style={{ backgroundColor: color }} />
          <span className="w-1/3 bg-cyan-500" />
          <span className="w-1/3 bg-rose-500" />
        </div>
      ) : null}
      <div
        className={`items-start gap-3 pb-3 sm:gap-6 ${
          centered
            ? "flex flex-col"
            : `grid grid-cols-[minmax(0,1fr)_minmax(130px,32%)] ${
                template === "modern"
                  ? "border border-l-4 p-3"
                  : template === "bold"
                    ? "p-3"
                    : "border-b border-gray-400"
              }`
        }`}
        style={titleStyle}
      >
        <div
          className={`flex min-w-0 items-start gap-3 ${
            centered ? "flex-col items-center text-center" : ""
          }`}
        >
          {branding.logoDataUrl ? (
            <div className="flex h-12 w-12 shrink-0 items-center justify-center border border-gray-300 bg-white p-1">
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
          <div className="min-w-0">
            <h1
              className={`break-words text-lg font-bold leading-tight sm:text-2xl ${
                template === "elegant" ? "font-serif tracking-wide" : ""
              }`}
              style={{ color: textColor }}
            >
              {branding.businessName || "Business name"}
            </h1>
            <p
              className="mt-1 whitespace-pre-line break-words text-[10px] leading-relaxed text-gray-600 [overflow-wrap:anywhere] sm:text-xs"
              style={bold ? { color: textColor, opacity: 0.85 } : undefined}
            >
              {details.join("\n")}
            </p>
          </div>
        </div>
        <div
          className={`min-w-0 p-2 text-right ${
            centered ? "text-center" : ""
          } ${
            template === "split"
              ? "border border-gray-300"
              : template === "bold"
                ? "border border-white/30"
                : template === "modern"
                  ? "border bg-white"
                  : ""
          }`}
          style={invoiceStyle}
        >
          <p className="break-words text-xs font-semibold uppercase [overflow-wrap:anywhere] sm:text-sm">
            {branding.billTitle || "Invoice"}
          </p>
          <p className="mt-1 break-all text-sm font-bold leading-tight sm:text-base">
            {branding.billNumberPrefix.toUpperCase()}-{billNumber}
          </p>
          <p className="mt-2 text-[10px] opacity-80 sm:text-xs">Date: {billDate}</p>
        </div>
      </div>
      {template === "bold" ? (
        <div className="h-1" style={{ backgroundColor: color }} aria-hidden="true" />
      ) : template === "elegant" ? (
        <div className="mx-auto mt-2 h-px w-1/3" style={{ backgroundColor: color }} aria-hidden="true" />
      ) : null}
    </header>
  );
}
