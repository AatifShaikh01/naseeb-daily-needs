import { ChevronDown, ShieldCheck } from "lucide-react";
import { desc } from "drizzle-orm";

import { PageHeader } from "@/components/layout/page-header";
import { StaffForm } from "@/components/settings/staff-form";
import { StaffList } from "@/components/settings/staff-list";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BillBrandingForm } from "@/components/settings/bill-branding-form";
import { StockThresholdForm } from "@/components/settings/stock-threshold-form";
import { getBillBranding } from "@/lib/actions/bill-branding";
import { lowStockThreshold } from "@/lib/config";
import { db, staff } from "@/db";

export const metadata = { title: "Settings" };


export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ added?: string }>;
}) {
  const { added } = await searchParams;
  const rows = await db
    .select({
      id: staff.id,
      name: staff.name,
      staffId: staff.staffId,
      phone: staff.phone,
      isActive: staff.isActive,
    })
    .from(staff)
    .orderBy(desc(staff.id));
  const [billBranding, stockThreshold] = await Promise.all([
    getBillBranding(),
    lowStockThreshold(),
  ]);

  return (
    <>
      <PageHeader
        title="Settings"
        description="Customize bill branding and manage staff names used in the Delivered By dropdown."
      />

      {added ? (
        <p role="alert" className="mb-4 rounded-xl bg-primary/10 px-3 py-2 text-sm font-medium text-primary">
          Staff added.
        </p>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <StaffList rows={rows} />

        <Card className="h-fit">
          <CardHeader>
            <CardTitle>Add Staff</CardTitle>
          </CardHeader>
          <CardContent>
            <StaffForm />
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Stock alert</CardTitle>
          <p className="text-sm text-muted-foreground">
            Set the box count at which products should show a low-stock warning.
          </p>
        </CardHeader>
        <CardContent>
          <StockThresholdForm threshold={stockThreshold} />
        </CardContent>
      </Card>

      <Card className="mt-6">
        <details className="group">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-5">
            <div>
              <CardTitle>Bill branding</CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">
                Business details and template shown on bills, PDFs, and WhatsApp shares.
              </p>
            </div>
            <ChevronDown className="h-5 w-5 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" />
          </summary>
          <CardContent className="border-t border-border pt-5">
            <BillBrandingForm branding={billBranding} />
          </CardContent>
        </details>
      </Card>

      <Card className="mt-6">
        <CardContent className="flex items-center gap-3 p-4 text-sm text-muted-foreground">
          <ShieldCheck className="h-5 w-5 shrink-0 text-primary" />
          Login (username + PIN) can be changed from the Change PIN page under More.
        </CardContent>
      </Card>
    </>
  );
}
