import Image from "next/image";

import {
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
  const textColor = getBillReadableAccentColor(branding.color);
  const detailsClass = branding.template === "minimal" ? "text-center" : "";
  const details = [
    branding.businessPhone,
    branding.businessAddress,
    branding.gstin ? `GSTIN: ${branding.gstin}` : "",
  ].filter(Boolean);

  return (
    <header className="mb-5">
      <div className="mb-4 flex h-2 overflow-hidden" aria-hidden="true">
        <span className="w-1/3" style={{ backgroundColor: branding.color }} />
        <span className="w-1/3 bg-cyan-500" />
        <span className="w-1/3 bg-rose-500" />
      </div>
      <div className="grid grid-cols-[minmax(0,1fr)_minmax(130px,32%)] items-start gap-3 border-b border-gray-400 pb-3 sm:gap-6">
        <div className={`flex min-w-0 items-start gap-3 ${detailsClass}`}>
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
            <h1 className="break-words text-lg font-bold leading-tight sm:text-2xl" style={{ color: textColor }}>
              {branding.businessName || "Business name"}
            </h1>
            <p className="mt-1 whitespace-pre-line break-words text-[10px] leading-relaxed text-gray-600 [overflow-wrap:anywhere] sm:text-xs">
              {details.join("\n")}
            </p>
          </div>
        </div>
        <div className="min-w-0 pt-1 text-right">
          <p className="break-words text-xs font-semibold uppercase text-gray-600 [overflow-wrap:anywhere] sm:text-sm">
            {branding.billTitle || "Invoice"}
          </p>
          <p className="mt-1 break-all text-sm font-bold leading-tight text-gray-900 sm:text-base">
            {branding.billNumberPrefix.toUpperCase()}-{billNumber}
          </p>
          <p className="mt-2 text-[10px] text-gray-600 sm:text-xs">Date: {billDate}</p>
        </div>
      </div>
    </header>
  );
}
