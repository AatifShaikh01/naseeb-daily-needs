"use client";

import { useActionState } from "react";
import { Loader2, Plus } from "lucide-react";

import { addStaffAction, type ActionResult } from "@/lib/actions/staff";
import { Button } from "@/components/ui/button";

export function StaffForm() {
  const [state, formAction, pending] = useActionState<ActionResult | null, FormData>(
    addStaffAction,
    null,
  );

  return (
    <form action={formAction} className="space-y-3">
      <div className="space-y-1.5">
        <label htmlFor="staff-name" className="text-sm font-medium">Staff Name</label>
        <input
          id="staff-name"
          name="name"
          required
          placeholder="e.g. Shahbaz"
          className="h-10 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none transition-colors focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring"
        />
      </div>

      {state?.error ? (
        <p role="alert" className="rounded-xl bg-destructive/10 px-3 py-2 text-sm font-medium text-destructive">
          {state.error}
        </p>
      ) : null}

      <Button type="submit" disabled={pending} className="w-full">
        {pending ? <Loader2 className="animate-spin" /> : <Plus />}
        Add Staff
      </Button>
    </form>
  );
}
