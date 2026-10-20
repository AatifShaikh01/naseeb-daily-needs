import { asc, desc, eq } from "drizzle-orm";

import { PageHeader } from "@/components/layout/page-header";
import { PurchasesClient } from "@/components/purchase/purchases-client";
import { SupplierForm } from "@/components/purchase/supplier-form";
import { db, products, purchaseItems, purchases, supplierPayments, suppliers } from "@/db";
import { todayIST } from "@/lib/dates";

export const metadata = { title: "Purchases" };

export default async function PurchasesPage() {
  const [productRows, supplierRows, purchRows, itemRows, payRows] = await Promise.all([
    db.select({ id: products.id, name: products.name, size: products.size }).from(products).orderBy(asc(products.id)),
    db.select({ id: suppliers.id, name: suppliers.name, phone: suppliers.phone }).from(suppliers).orderBy(asc(suppliers.id)),
    db
      .select({
        id: purchases.id,
        supplierId: purchases.supplierId,
        entryDate: purchases.entryDate,
        direction: purchases.direction,
        totalAmount: purchases.totalAmount,
        paidAmount: purchases.paidAmount,
        note: purchases.note,
      })
      .from(purchases)
      .orderBy(desc(purchases.entryDate), desc(purchases.id)),
    db
      .select({
        purchaseId: purchaseItems.purchaseId,
        productId: products.id,
        productName: products.name,
        size: products.size,
        boxes: purchaseItems.boxes,
        ratePerBox: purchaseItems.ratePerBox,
      })
      .from(purchaseItems)
      .innerJoin(products, eq(purchaseItems.productId, products.id)),
    db
      .select({
        id: supplierPayments.id,
        supplierId: supplierPayments.supplierId,
        amount: supplierPayments.amount,
        paidOn: supplierPayments.paidOn,
        mode: supplierPayments.mode,
        note: supplierPayments.note,
      })
      .from(supplierPayments)
      .orderBy(asc(supplierPayments.paidOn), asc(supplierPayments.id)),
  ]);

  return (
    <>
      <PageHeader title="Purchases" description="Supplier se maal — rate, payment, udhaar ledger." />
      <SupplierForm />
      <div className="mt-4" />
      <PurchasesClient
        products={productRows}
        suppliers={supplierRows}
        purchases={purchRows}
        purchaseItems={itemRows}
        supplierPayments={payRows}
        today={todayIST()}
      />
    </>
  );
}
