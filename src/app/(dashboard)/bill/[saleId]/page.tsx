import { getBillData } from "./data";
import { PrintButton, ShareBillButton } from "./print-button";
import { formatDate } from "@/lib/dates";
import { notFound } from "next/navigation";
import { BillHeader } from "@/components/bill/bill-header";
import { getBillContrastColor } from "@/lib/bill-branding";



const money = (v: number) => `₹${v.toLocaleString("en-IN")}`;



export default async function BillPage({

  params,

}: {

  params: Promise<{ saleId: string }>;

}) {

  const { saleId } = await params;

  const id = Number(saleId);

  const bill = await getBillData(id);

  if (!bill) notFound();



  const pending = Math.round((bill.totalAmount - bill.paidAmount) * 100) / 100;
  const { branding } = bill;
  const billStyle = { "--bill-accent": branding.color } as React.CSSProperties;
  const coloredTableHeader = branding.template === "bold" || branding.template === "split";
  const tableHeaderStyle = coloredTableHeader
    ? { backgroundColor: branding.color, color: getBillContrastColor(branding.color) }
    : branding.template === "modern"
      ? { backgroundColor: `${branding.color}14`, borderColor: branding.color }
      : branding.template === "elegant"
        ? { borderColor: branding.color }
        : undefined;
  const tableBorderStyle =
    branding.template === "bold" || branding.template === "split"
      ? { borderColor: branding.color }
      : undefined;



  return (

    <div data-bill-sheet className="mx-auto max-w-[794px] border border-gray-200 bg-white p-4 text-gray-900 shadow-sm sm:p-10" style={billStyle}>
      <PrintButton bill={{ id: bill.id, saleDate: bill.saleDate, customerName: bill.customerName, customerPhone: bill.customerPhone, paymentMode: bill.paymentMode, totalAmount: bill.totalAmount, paidAmount: bill.paidAmount, items: bill.items, payments: bill.payments, branding }} />
      <div id="bill">
        <BillHeader
          branding={branding}
          billNumber={String(bill.id).padStart(4, "0")}
          billDate={formatDate(bill.saleDate)}
        />

        <div className="mb-4 grid grid-cols-2 border-l border-t border-gray-400 text-xs sm:grid-cols-3">
          {[
            ["Customer", bill.customerName],
            ["Phone", bill.customerPhone ?? "—"],
            ["Payment", bill.paymentMode],
          ].map(([label, value]) => (
            <div
              key={label}
              className="min-w-0 border-b border-r border-gray-400 px-2 py-2"
            >
              <p className="text-[9px] font-semibold uppercase text-gray-500">{label}</p>
              <p className="break-words font-medium capitalize text-gray-900">{value}</p>
            </div>
          ))}
        </div>

        <table
          className={`mb-4 w-full table-fixed border-collapse ${
            branding.template === "minimal" ? "text-[11px]" : "text-xs sm:text-sm"
          } ${branding.template === "elegant" ? "font-serif" : ""}`}
        >
          <thead>
            <tr
              className={`text-left text-[10px] uppercase sm:text-xs ${
                coloredTableHeader || branding.template === "modern" || branding.template === "elegant"
                  ? ""
                  : "bg-gray-100"
              }`}
              style={tableHeaderStyle}
            >
              <th className="w-[9%] border border-gray-500 px-1 py-2 text-center font-semibold" style={tableBorderStyle}>Sr.</th>
              <th className="w-[43%] border border-gray-500 px-2 py-2 font-semibold" style={tableBorderStyle}>Description</th>
              <th className="w-[13%] border border-gray-500 px-1 py-2 text-right font-semibold" style={tableBorderStyle}>Qty</th>
              <th className="w-[16%] border border-gray-500 px-1 py-2 text-right font-semibold" style={tableBorderStyle}>Rate</th>
              <th className="w-[19%] border border-gray-500 px-1 py-2 text-right font-semibold" style={tableBorderStyle}>Amount</th>
            </tr>
          </thead>
          <tbody>
            {bill.items.map((it, index) => (
              <tr
                key={`${it.productName}-${it.productSize}-${index}`}
                className={`${
                  branding.template === "modern" || branding.template === "split" ? "even:bg-gray-50" : ""
                } ${branding.template === "elegant" ? "font-serif" : ""}`}
              >
                <td className={`${branding.template === "minimal" ? "h-7" : "h-9"} border border-gray-400 px-1 text-center tabular-nums`} style={tableBorderStyle}>{index + 1}</td>
                <td className={`${branding.template === "minimal" ? "h-7" : "h-9"} break-words border border-gray-400 px-2`} style={tableBorderStyle}>{it.productName}{it.productSize ? ` (${it.productSize})` : ""}</td>
                <td className={`${branding.template === "minimal" ? "h-7" : "h-9"} border border-gray-400 px-1 text-right tabular-nums`} style={tableBorderStyle}>{it.boxes}</td>
                <td className={`${branding.template === "minimal" ? "h-7" : "h-9"} border border-gray-400 px-1 text-right tabular-nums`} style={tableBorderStyle}>{money(it.ratePerBox)}</td>
                <td className={`${branding.template === "minimal" ? "h-7" : "h-9"} border border-gray-400 px-1 text-right tabular-nums`} style={tableBorderStyle}>{money(it.amount)}</td>
              </tr>
            ))}
            {Array.from({ length: Math.max(0, 5 - bill.items.length) }, (_, index) => (
              <tr key={`blank-${index}`} aria-hidden="true">
                <td className={`${branding.template === "minimal" ? "h-7" : "h-9"} border border-gray-400`} />
                <td className={`${branding.template === "minimal" ? "h-7" : "h-9"} border border-gray-400`} />
                <td className={`${branding.template === "minimal" ? "h-7" : "h-9"} border border-gray-400`} />
                <td className={`${branding.template === "minimal" ? "h-7" : "h-9"} border border-gray-400`} />
                <td className={`${branding.template === "minimal" ? "h-7" : "h-9"} border border-gray-400`} />
              </tr>
            ))}
            <tr>
              <td colSpan={4} className="border border-gray-500 px-2 py-2 text-right font-bold">Total</td>
              <td className="border border-gray-500 px-1 py-2 text-right font-bold tabular-nums">{money(bill.totalAmount)}</td>
            </tr>
            <tr>
              <td colSpan={4} className="border border-gray-400 px-2 py-1.5 text-right text-gray-600">Paid</td>
              <td className="border border-gray-400 px-1 py-1.5 text-right tabular-nums">{money(bill.paidAmount)}</td>
            </tr>
            <tr>
              <td colSpan={4} className="border border-gray-400 px-2 py-1.5 text-right text-gray-600">Balance Due</td>
              <td className="border border-gray-400 px-1 py-1.5 text-right tabular-nums">{money(pending)}</td>
            </tr>
          </tbody>
        </table>

        <div className="mb-5">
          <h2 className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-gray-600">Payment History</h2>
          {bill.payments.length ? (
            <table className="w-full border-collapse text-xs">
              <thead>
                <tr className="text-left text-gray-600">
                  <th className="border border-gray-400 px-2 py-1 font-medium">Date</th>
                  <th className="border border-gray-400 px-2 py-1 font-medium">Mode</th>
                  <th className="border border-gray-400 px-2 py-1 text-right font-medium">Amount</th>
                </tr>
              </thead>
              <tbody>
                {bill.payments.map((payment) => (
                  <tr key={payment.id}>
                    <td className="border border-gray-400 px-2 py-1">{formatDate(payment.paidOn)}</td>
                    <td className="border border-gray-400 px-2 py-1 capitalize">{payment.mode}</td>
                    <td className="border border-gray-400 px-2 py-1 text-right">{money(payment.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="text-xs text-gray-500">No payment entries recorded.</p>
          )}
        </div>

        <div className="mt-8 flex items-end justify-between gap-6 border-t border-gray-400 pt-3 text-xs">
          <p className="max-w-[65%] whitespace-pre-line text-gray-600">{branding.footer}</p>
          <div className="w-36 border-t border-gray-500 pt-1 text-center text-[10px] text-gray-600">Authorized Signature</div>
        </div>
        <p className="mt-3 border-t border-gray-200 pt-2 text-center text-[9px] text-gray-500">
          {[branding.businessName, branding.businessPhone, branding.businessAddress].filter(Boolean).join(" · ")}
        </p>
        <div className="mt-3 flex h-1.5 overflow-hidden" aria-hidden="true">
          <span className="w-1/3" style={{ backgroundColor: branding.color }} />
          <span className="w-1/3 bg-cyan-500" />
          <span className="w-1/3 bg-rose-500" />
        </div>
      </div>

      <ShareBillButton bill={{ id: bill.id, saleDate: bill.saleDate, customerName: bill.customerName, customerPhone: bill.customerPhone, paymentMode: bill.paymentMode, totalAmount: bill.totalAmount, paidAmount: bill.paidAmount, items: bill.items, payments: bill.payments, branding }} />









    </div>

  );

}
