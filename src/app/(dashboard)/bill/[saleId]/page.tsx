import { getBillData } from "./data";
import { PrintButton, ShareBillButton } from "./print-button";
import { formatDate } from "@/lib/dates";
import { notFound } from "next/navigation";
import { BillHeader } from "@/components/bill/bill-header";
import { getBillReadableAccentColor } from "@/lib/bill-branding";



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



  return (

    <div data-bill-sheet className="mx-auto max-w-[700px] bg-white p-6 sm:p-10" style={billStyle}>

      <PrintButton bill={{ id: bill.id, saleDate: bill.saleDate, customerName: bill.customerName, customerPhone: bill.customerPhone, paymentMode: bill.paymentMode, totalAmount: bill.totalAmount, paidAmount: bill.paidAmount, items: bill.items, payments: bill.payments, branding }} />

      <div id="bill">
        <BillHeader
          branding={branding}
          billNumber={String(bill.id).padStart(4, "0")}
        />

        <div className="mb-6 grid grid-cols-2 gap-2 sm:gap-3">
          {[
            ["Date", formatDate(bill.saleDate)],
            ["Payment", bill.paymentMode],
            ["Customer", bill.customerName],
            ["Phone", bill.customerPhone ?? "—"],
          ].map(([label, value]) => (
            <div
              key={label}
              className="min-w-0 rounded-md border border-border/70 border-t-2 bg-muted/30 px-2.5 py-2 sm:px-3"
              style={{ borderTopColor: branding.color }}
            >
              <p className="text-[10px] font-semibold uppercase text-muted-foreground">{label}</p>
              <p className="break-words text-xs font-medium capitalize text-foreground sm:text-sm">{value}</p>
            </div>
          ))}
        </div>



        <table className="mb-6 w-full table-fixed border-collapse text-sm">

          <thead>

            <tr
              className="border-b text-left text-muted-foreground uppercase text-[10px] sm:text-[11px]"
              style={{ borderColor: branding.color, backgroundColor: `${branding.color}14` }}
            >

              <th className="w-[42%] py-3 pl-2 pr-1 font-medium">Item</th>

              <th className="w-[15%] px-1 py-3 text-right font-medium">Boxes</th>

              <th className="w-[20%] px-1 py-3 text-right font-medium">Rate (₹)</th>

              <th className="w-[23%] py-3 pl-1 pr-2 text-right font-medium">Amount (₹)</th>

            </tr>

          </thead>

          <tbody className="divide-y divide-border/40">

            {bill.items.map((it) => (

              <tr key={`${it.productName}-${it.productSize}`} className="text-left even:bg-muted/20">

                <td className="break-words py-3 pl-2 pr-1 text-foreground">

                  {it.productName}{it.productSize ? ` (${it.productSize})` : ""}

                </td>

                <td className="px-1 py-3 text-right tabular-nums">{it.boxes}</td>

                <td className="px-1 py-3 text-right tabular-nums text-muted-foreground">

                  {money(it.ratePerBox)}

                </td>

                <td className="py-3 pl-1 pr-2 text-right tabular-nums font-medium">

                  {money(it.amount)}

                </td>

              </tr>

            ))}

            <tr className="border-t-2 bg-muted/40" style={{ borderColor: branding.color }}>

              <td className="py-2 pl-2 pr-1 text-right font-bold text-foreground" colSpan={3}>

                Total

              </td>

              <td className="py-2 pl-1 pr-2 text-right tabular-nums font-bold text-foreground">

                {money(bill.totalAmount)}

              </td>

            </tr>

            <tr className="text-left">

              <td className="py-2 pr-2 text-right font-medium text-muted-foreground" colSpan={3}>

                Paid

              </td>

              <td className="py-2 pr-2 text-right tabular-nums font-medium text-emerald-700">

                {money(bill.paidAmount)}

              </td>

            </tr>

            <tr className="text-left">

              <td className="py-2 pr-2 text-right font-medium text-muted-foreground" colSpan={3}>

                Pending

              </td>

              <td className="py-2 pr-2 text-right tabular-nums font-medium text-red-700">

                {money(pending)}

              </td>

            </tr>

          </tbody>

        </table>

        <div className="mb-6">
          <h2
            className="mb-2 text-xs font-semibold uppercase tracking-wide"
            style={{ color: getBillReadableAccentColor(branding.color) }}
          >
            Payment History
          </h2>
          {bill.payments.length ? (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/60 text-left text-xs text-muted-foreground">
                  <th className="py-2 pr-2 font-medium">Date</th>
                  <th className="py-2 pr-2 font-medium">Mode</th>
                  <th className="py-2 text-right font-medium">Amount (₹)</th>
                </tr>
              </thead>
              <tbody>
                {bill.payments.map((payment) => (
                  <tr key={payment.id} className="border-b border-border/40">
                    <td className="py-2 pr-2">{formatDate(payment.paidOn)}</td>
                    <td className="py-2 pr-2 capitalize">{payment.mode}</td>
                    <td className="py-2 text-right font-medium">{money(payment.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="text-sm text-muted-foreground">No payment entries recorded.</p>
          )}
        </div>



        <p className="mt-8 text-center text-xs text-muted-foreground">

          {branding.footer}<br />

          {[branding.businessName, branding.businessPhone, branding.businessAddress].filter(Boolean).join(" · ")}

        </p>

      </div>

      <ShareBillButton bill={{ id: bill.id, saleDate: bill.saleDate, customerName: bill.customerName, customerPhone: bill.customerPhone, paymentMode: bill.paymentMode, totalAmount: bill.totalAmount, paidAmount: bill.paidAmount, items: bill.items, payments: bill.payments, branding }} />









    </div>

  );

}
