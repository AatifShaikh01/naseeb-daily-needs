import { ShieldCheck, UserCheck, UserX } from "lucide-react";
import { desc } from "drizzle-orm";

import { PageHeader } from "@/components/layout/page-header";
import { StaffForm } from "@/components/settings/staff-form";
import { toggleStaffAction } from "@/lib/actions/staff";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { db, staff } from "@/db";

export const metadata = { title: "Settings" };


export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ added?: string }>;
}) {
  const { added } = await searchParams;
  const rows = await db.select().from(staff).orderBy(desc(staff.id));

  return (
    <>
      <PageHeader
        title="Settings"
        description="Staff names that appear in the Delivered By dropdown. Deactivated staff are hidden from new sales."
      />

      {added ? (
        <p role="alert" className="mb-4 rounded-xl bg-primary/10 px-3 py-2 text-sm font-medium text-primary">
          Staff added.
        </p>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <Card>
          <CardHeader>
            <CardTitle>Staff ({rows.length})</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {rows.length === 0 ? (
              <p className="px-5 pb-5 text-sm text-muted-foreground">No staff yet.</p>
            ) : (
              <ul className="divide-y divide-border">
                {rows.map((s) => (
                  <li key={s.id} className="flex items-center gap-3 px-5 py-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{s.name}</p>
                    </div>
                    <Badge variant={s.isActive ? "secondary" : "outline"}>
                      {s.isActive ? (
                        <><UserCheck className="mr-1 h-3 w-3" />Active</>
                      ) : (
                        <><UserX className="mr-1 h-3 w-3" />Inactive</>
                      )}
                    </Badge>
                    <form action={toggleStaffAction}>
                      <input type="hidden" name="id" value={s.id} />
                      <input type="hidden" name="active" value={String(s.isActive)} />
                      <Button type="submit" variant="outline" size="sm">
                        {s.isActive ? "Deactivate" : "Activate"}
                      </Button>
                    </form>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

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
