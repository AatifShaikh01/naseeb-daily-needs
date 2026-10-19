import { getBillData } from "./data";
import { PrintButton } from "./print-button";
import { formatDate } from "@/lib/dates";
import Image from "next/image";
import { notFound } from "next/navigation";
import { SHOP } from "@/lib/shop";



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



  return (

    <div data-bill-sheet className="max-w-[700px] mx-auto p-6 sm:p-10 bg-white">

      <PrintButton bill={{ id: bill.id, saleDate: bill.saleDate, customerName: bill.customerName, customerPhone: bill.customerPhone, paymentMode: bill.paymentMode, totalAmount: bill.totalAmount, paidAmount: bill.paidAmount, items: bill.items }} />

      <div id="bill">

        <div className="flex items-start justify-between mb-8 border-b-2 border-primary pb-4">

          <div className="flex items-center gap-3">

            <Image

              src="/image.png"

              alt="Naseeb Daily Needs & Agencies"

              width={56}

              height={56}

              className="rounded-lg object-contain shrink-0"

              priority

              unoptimized
            />

            <div>

              <h1 className="text-2xl font-extrabold text-foreground tracking-tight">

                Naseeb Daily Needs & Agencies

              </h1>

              <p className="text-xs text-muted-foreground leading-tight">

                {SHOP.contact}<br />

                {SHOP.address}

              </p>

            </div>

          </div>

          <div className="text-right">

            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">

              Bill No.

            </p>

            <p className="text-xl font-bold text-foreground">

              SALE-{String(bill.id).padStart(4, "0")}

            </p>

          </div>
        </div>

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

            <tr className="border-b border-border/60 text-left text-muted-foreground uppercase text-[11px]">

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

            <tr className="border-t-2 border-primary pt-4">

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



        <p className="text-center text-xs text-muted-foreground mt-8">

          Thank you for your business!<br />

          {SHOP.name} · {SHOP.contact} · {SHOP.address}

        </p>

      </div>









    </div>

  );

}


