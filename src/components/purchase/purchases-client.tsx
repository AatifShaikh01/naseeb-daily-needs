"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { PurchaseForm } from "@/components/purchase/purchase-form";
import { SupplierLedger } from "@/components/purchase/supplier-ledger";

type ProductRow = { id: number; name: string; size: string };
type SupplierRow = { id: number; name: string; phone: string | null };
type PurchaseRow = {
  id: number;
  supplierId: number;
  entryDate: string;
  direction: "in" | "return";
  totalAmount: string;
  paidAmount: string;
  note: string | null;
};
type PurchaseItemRow = {
  purchaseId: number;
  productId: number;
  productName: string;
  size: string;
  boxes: number;
  ratePerBox: string;
};
type PaymentRow = {
  id: number;
  supplierId: number;
  amount: string;
  paidOn: string;
  mode: string;
  note: string | null;
};

/** paid 0 -> pending, paid >= total -> paid, otherwise partial. */
function paymentStatus(total: string, paid: string): "paid" | "pending" | "partial" {
  const t = Number(total);
  const p = Number(paid);
  if (p <= 0) return "pending";
  if (p >= t) return "paid";
  return "partial";
}

export function PurchasesClient({
  products,
  suppliers,
  purchases,
  purchaseItems,
  supplierPayments,
  today,
}: {
  products: ProductRow[];
  suppliers: SupplierRow[];
  purchases: PurchaseRow[];
  purchaseItems: PurchaseItemRow[];
  supplierPayments: PaymentRow[];
  today: string;
}) {
  const router = useRouter();
  const [editingId, setEditingId] = useState<number | null>(null);

  /* The ledger dispatches "purchases-changed" after a delete — refresh the
   * server data so the ledger and dues reflect the new state. */
  useEffect(() => {
    const onChanged = () => router.refresh();
    window.addEventListener("purchases-changed", onChanged);
    return () => window.removeEventListener("purchases-changed", onChanged);
  }, [router]);

  const editPurchase = purchases.find((p) => p.id === editingId);
  const editItems = editPurchase
    ? purchaseItems
        .filter((it) => it.purchaseId === editPurchase.id)
        .map((it) => ({
          productId: it.productId,
          boxes: Math.abs(it.boxes),
          ratePerBox: Number(it.ratePerBox),
        }))
    : [];
  const editSupplier = editPurchase
    ? suppliers.find((s) => s.id === editPurchase.supplierId)
    : undefined;

  return (
    <>
      <PurchaseForm products={products} suppliers={suppliers} today={today} />
      <div className="mt-6">
        <SupplierLedger
          suppliers={suppliers}
          purchases={purchases}
          purchaseItems={purchaseItems}
          supplierPayments={supplierPayments}
          editingId={editingId}
          setEditingId={setEditingId}
        />
      </div>
      {editPurchase && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:justify-center">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setEditingId(null)}
            aria-hidden
          />
          <div className="relative z-10 max-h-[92vh] w-full overflow-y-auto rounded-t-2xl bg-background p-4 shadow-float sm:max-w-lg sm:rounded-2xl sm:p-6">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="text-lg font-bold">
                Edit Purchase #{editPurchase.id}
                {editSupplier ? ` · ${editSupplier.name}` : ""}
              </h2>
              <button
                type="button"
                onClick={() => setEditingId(null)}
                aria-label="Close"
                className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <span className="h-4 w-4">✕</span>
              </button>
            </div>
            <PurchaseForm
              key={editPurchase.id}
              products={products}
              suppliers={suppliers}
              today={editPurchase.entryDate || today}
              purchase={{
                id: editPurchase.id,
                entryDate: editPurchase.entryDate,
                supplierId: editPurchase.supplierId,
                direction: editPurchase.direction,
                paymentStatus: paymentStatus(editPurchase.totalAmount, editPurchase.paidAmount),
                paidAmount: Number(editPurchase.paidAmount),
                note: editPurchase.note,
                items: editItems,
              }}
              onSaved={() => setEditingId(null)}
            />
          </div>
        </div>
      )}
    </>
  );
}
