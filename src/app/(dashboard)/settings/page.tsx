import { ShieldCheck } from "lucide-react";
import { desc } from "drizzle-orm";

import { PageHeader } from "@/components/layout/page-header";
import { StaffForm } from "@/components/settings/staff-form";
import { StaffList } from "@/components/settings/staff-list";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BillBrandingForm } from "@/components/settings/bill-branding-form";
import { getBillBranding } from "@/lib/actions/bill-branding";
import { db, staff } from "@/db";

export const metadata = { title: "Settings" };


export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ added?: string }>;
}) {
  const { added } = await searchParams;
  const rows = await db
    .select({ id: staff.id, name: staff.name, isActive: staff.isActive })
    .from(staff)
    .orderBy(desc(staff.id));
  const billBranding = await getBillBranding();

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

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Bill branding</CardTitle>
          <p className="text-sm text-muted-foreground">
            Choose a template and set the business details shown on bills, PDFs, and WhatsApp shares.
          </p>
        </CardHeader>
        <CardContent>
          <BillBrandingForm branding={billBranding} />
        </CardContent>
      </Card>

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
        <CardContent className="flex items-center gap-3 p-4 text-sm text-muted-foreground">
          <ShieldCheck className="h-5 w-5 shrink-0 text-primary" />
          Login (username + PIN) can be changed from the Change PIN page under More.
        </CardContent>
      </Card>
    </>
  );
}
