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

        <div className="grid grid-cols-2 gap-4 mb-6">

          <div>

            <p className="text-xs font-semibold text-muted-foreground uppercase">

              Date

            </p>

            <p className="text-sm text-foreground">{formatDate(bill.saleDate)}</p>

          </div>

          <div>

            <p className="text-xs font-semibold text-muted-foreground uppercase">

              Payment

            </p>

            <p className="text-sm text-foreground capitalize">

              {bill.paymentMode}

            </p>

          </div>

        </div>



        <div className="grid grid-cols-2 gap-4 mb-6">

          <div>

            <p className="text-xs font-semibold text-muted-foreground uppercase">

              Customer

            </p>

            <p className="text-sm font-medium text-foreground">

              {bill.customerName}

            </p>

          </div>

          <div>

            <p className="text-xs font-semibold text-muted-foreground uppercase">

              Phone

            </p>

            <p className="text-sm text-foreground">

              {bill.customerPhone ?? "—"}

            </p>

          </div>

        </div>



        <table className="w-full text-sm border-collapse mb-6">

          <thead>

            <tr
              className="border-b text-left text-muted-foreground uppercase text-[11px]"
              style={{ borderColor: branding.color }}
            >

              <th className="py-3 pr-2 font-medium">Item</th>

              <th className="py-3 pr-2 font-medium text-right">Boxes</th>

              <th className="py-3 pr-2 font-medium text-right">Rate (₹)</th>

              <th className="py-3 pr-2 font-medium text-right">Amount (₹)</th>

            </tr>

          </thead>

          <tbody className="divide-y divide-border/40">

            {bill.items.map((it) => (

              <tr key={`${it.productName}-${it.productSize}`} className="text-left">

                <td className="py-3 pr-2 text-foreground">

                  {it.productName}{it.productSize ? ` (${it.productSize})` : ""}

                </td>

                <td className="py-3 pr-2 text-right tabular-nums">{it.boxes}</td>

                <td className="py-3 pr-2 text-right tabular-nums text-muted-foreground">

                  {money(it.ratePerBox)}

                </td>

                <td className="py-3 pr-2 text-right tabular-nums font-medium">

                  {money(it.amount)}

                </td>

              </tr>

            ))}

            <tr className="border-t-2 pt-4" style={{ borderColor: branding.color }}>

              <td className="py-2 pr-2 text-right font-bold text-foreground" colSpan={3}>

                Total

              </td>

              <td className="py-2 pr-2 text-right tabular-nums font-bold text-foreground">

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
