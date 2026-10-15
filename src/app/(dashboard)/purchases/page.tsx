import { Suspense } from "react";
import { asc } from "drizzle-orm";

import { PageHeader } from "@/components/layout/page-header";
import { PurchaseForm } from "@/components/purchase/purchase-form";
import { SupplierForm } from "@/components/purchase/supplier-form";
import { SupplierLedger } from "@/components/purchase/supplier-ledger";
import { db, products, suppliers } from "@/db";
import { todayIST } from "@/lib/dates";

export const metadata = { title: "Purchases" };

export default async function PurchasesPage() {
  const [productRows, supplierRows] = await Promise.all([
    db.select({ id: products.id, name: products.name, size: products.size }).from(products).orderBy(asc(products.id)),
    db.select({ id: suppliers.id, name: suppliers.name, phone: suppliers.phone }).from(suppliers).orderBy(asc(suppliers.id)),
  ]);
  return (
    <>
      <PageHeader title="Purchases" description="Supplier se maal — rate, payment, udhaar ledger." />
      <SupplierForm />
      <div className="mt-4" />
      <PurchaseForm products={productRows} suppliers={supplierRows} today={todayIST()} />
      <div className="mt-6">
        <Suspense fallback={<p className="text-sm text-muted-foreground">Loading ledger…</p>}>
          <SupplierLedger suppliers={supplierRows} />
        </Suspense>
      </div>
    </>
  );
}
