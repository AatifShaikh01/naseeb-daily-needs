"use client";

import { useActionState } from "react";
import { Loader2 } from "lucide-react";

import { changePinAction, type ActionResult } from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";

const fields = [
  { id: "oldPin", label: "Current PIN", placeholder: "••••" },
  { id: "newPin", label: "New PIN (4–8 digits)", placeholder: "••••" },
  { id: "confirmPin", label: "Confirm New PIN", placeholder: "••••" },
] as const;

export function ChangePinForm() {
  const [state, formAction, pending] = useActionState<ActionResult | null, FormData>(
    changePinAction,
    null,
  );

  return (
    <form action={formAction} className="space-y-4">
      {fields.map((f) => (
        <div key={f.id} className="space-y-1.5">
          <label htmlFor={f.id} className="text-sm font-medium">
            {f.label}
          </label>
          <input
            id={f.id}
            name={f.id}
            type="password"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={8}
            required
            placeholder={f.placeholder}
            className="h-11 w-full rounded-xl border border-border bg-background px-3 text-base tracking-[0.4em] outline-none transition-colors focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>
      ))}

      {state?.error ? (
        <p
          role="alert"
          className="rounded-xl bg-destructive/10 px-3 py-2 text-sm font-medium text-destructive"
        >
          {state.error}
        </p>
      ) : null}

      <Button type="submit" disabled={pending} className="h-11 w-full">
        {pending ? (
          <>
            <Loader2 className="animate-spin" /> Saving…
          </>
        ) : (
          "Update PIN"
        )}
      </Button>
    </form>
  );
}
