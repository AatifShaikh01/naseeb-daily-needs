"use client";

import { useState } from "react";
import { useActionState } from "react";
import Link from "next/link";
import { Pencil, UserCheck, UserX } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LiveSearch } from "@/components/ui/live-search";
import { removeStaffAction, toggleStaffAction, updateStaffAction } from "@/lib/actions/staff";

type StaffRow = { id: number; name: string; staffId: string; phone: string | null; isActive: boolean };

export function StaffList({ rows }: { rows: StaffRow[] }) {
  const [query, setQuery] = useState("");
  const search = query.trim().toLocaleLowerCase();
  const filtered = search
    ? rows.filter((staff) => staff.name.toLocaleLowerCase().includes(search))
    : rows;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Staff ({filtered.length}{query ? ` / ${rows.length}` : ""})</CardTitle>
        {rows.length > 0 ? (
          <LiveSearch
            value={query}
            onChange={setQuery}
            placeholder="Search staff..."
            label="Search staff"
          />
        ) : null}
      </CardHeader>
      <CardContent className="p-0">
        {rows.length === 0 ? (
          <p className="px-5 pb-5 text-sm text-muted-foreground">No staff yet.</p>
        ) : filtered.length === 0 ? (
          <p className="px-5 pb-5 text-sm text-muted-foreground">No staff match your search.</p>
        ) : (
          <ul className="divide-y divide-border">
            {filtered.map((staff) => (
              <li key={staff.id} className="space-y-3 px-5 py-3">
                <div className="flex items-center gap-3">
                <div className="min-w-0 flex-1">
                  <Link href={`/staff/${staff.id}`} className="truncate text-sm font-medium hover:text-primary">
                    {staff.name}
                  </Link>
                  <p className="text-xs text-muted-foreground">{staff.staffId}</p>
                </div>
                <Badge variant={staff.isActive ? "secondary" : "outline"}>
                  {staff.isActive ? (
                    <><UserCheck className="mr-1 h-3 w-3" />Active</>
                  ) : (
                    <><UserX className="mr-1 h-3 w-3" />Inactive</>
                  )}
                </Badge>
                {staff.isActive ? (
                  <form
                    action={removeStaffAction}
                    onSubmit={(event) => {
                      if (!window.confirm(`Remove ${staff.name}? Their login will be disabled, but their sales and payment history will be kept.`)) {
                        event.preventDefault();
                      }
                    }}
                  >
                    <input type="hidden" name="id" value={staff.id} />
                    <Button type="submit" variant="destructive" size="sm">Remove</Button>
                  </form>
                ) : (
                  <form action={toggleStaffAction}>
                    <input type="hidden" name="id" value={staff.id} />
                    <input type="hidden" name="active" value="false" />
                    <Button type="submit" variant="outline" size="sm">Activate</Button>
                  </form>
                )}
                <details className="relative">
                  <summary className="flex h-9 w-9 cursor-pointer list-none items-center justify-center rounded-xl border border-border text-muted-foreground hover:bg-muted" aria-label={`Edit ${staff.name}`}>
                    <Pencil className="h-4 w-4" />
                  </summary>
                  <StaffEditForm staff={staff} />
                </details>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function StaffEditForm({ staff }: { staff: StaffRow }) {
  const [state, formAction, pending] = useActionState(updateStaffAction, null);

  return (
    <form action={formAction} className="absolute right-0 z-10 mt-2 w-[min(22rem,calc(100vw-3rem))] space-y-3 rounded-xl border border-border bg-card p-4 shadow-float">
      <input type="hidden" name="id" value={staff.id} />
      <div className="space-y-1">
        <label className="text-xs font-medium" htmlFor={`staff-name-${staff.id}`}>Name</label>
        <input id={`staff-name-${staff.id}`} name="name" required maxLength={60} defaultValue={staff.name} className="h-9 w-full rounded-lg border border-border bg-background px-2 text-sm" />
      </div>
      <div className="space-y-1">
        <label className="text-xs font-medium" htmlFor={`staff-id-${staff.id}`}>Staff ID</label>
        <input id={`staff-id-${staff.id}`} name="staffId" required maxLength={24} defaultValue={staff.staffId} className="h-9 w-full rounded-lg border border-border bg-background px-2 text-sm" />
      </div>
      <div className="space-y-1">
        <label className="text-xs font-medium" htmlFor={`staff-phone-${staff.id}`}>Phone</label>
        <input id={`staff-phone-${staff.id}`} name="phone" maxLength={20} defaultValue={staff.phone ?? ""} className="h-9 w-full rounded-lg border border-border bg-background px-2 text-sm" />
      </div>
      <div className="space-y-1">
        <label className="text-xs font-medium" htmlFor={`staff-pin-${staff.id}`}>Reset PIN (optional)</label>
        <input id={`staff-pin-${staff.id}`} name="pin" type="password" inputMode="numeric" pattern="[0-9]{4,8}" maxLength={8} autoComplete="new-password" className="h-9 w-full rounded-lg border border-border bg-background px-2 text-sm tracking-widest" />
      </div>
      {state?.error ? <p role="alert" className="text-xs text-destructive">{state.error}</p> : null}
      {state?.ok ? <p role="status" className="text-xs text-primary">Staff details saved.</p> : null}
      <Button type="submit" size="sm" disabled={pending}>{pending ? "Saving..." : "Save changes"}</Button>
    </form>
  );
}
