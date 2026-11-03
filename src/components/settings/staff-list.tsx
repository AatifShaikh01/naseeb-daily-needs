"use client";

import { useState } from "react";
import { UserCheck, UserX } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LiveSearch } from "@/components/ui/live-search";
import { toggleStaffAction } from "@/lib/actions/staff";

type StaffRow = { id: number; name: string; isActive: boolean };

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
              <li key={staff.id} className="flex items-center gap-3 px-5 py-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{staff.name}</p>
                </div>
                <Badge variant={staff.isActive ? "secondary" : "outline"}>
                  {staff.isActive ? (
                    <><UserCheck className="mr-1 h-3 w-3" />Active</>
                  ) : (
                    <><UserX className="mr-1 h-3 w-3" />Inactive</>
                  )}
                </Badge>
                <form action={toggleStaffAction}>
                  <input type="hidden" name="id" value={staff.id} />
                  <input type="hidden" name="active" value={String(staff.isActive)} />
                  <Button type="submit" variant="outline" size="sm">
                    {staff.isActive ? "Deactivate" : "Activate"}
                  </Button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
