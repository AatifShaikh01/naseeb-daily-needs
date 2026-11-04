"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Save } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { updateSettingAction } from "@/lib/actions/settings";

export function StockThresholdForm({ threshold }: { threshold: number }) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(updateSettingAction, null);

  useEffect(() => {
    if (state?.ok) {
      toast.success("Low-stock alert limit saved.");
      router.refresh();
    }
  }, [router, state]);

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="key" value="low_stock_limit" />
      <div className="space-y-1.5">
        <label htmlFor="low-stock-limit" className="text-sm font-medium">
          Alert when stock reaches this many boxes
        </label>
        <input
          id="low-stock-limit"
          name="value"
          type="number"
          inputMode="numeric"
          min={1}
          max={1_000_000}
          step={1}
          required
          defaultValue={threshold}
          className="h-11 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none transition-colors focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring sm:max-w-xs"
        />
        <p className="text-xs text-muted-foreground">
          Products with this many boxes or fewer will be marked low stock.
        </p>
      </div>
      {state?.error ? (
        <p role="alert" className="rounded-xl bg-destructive/10 px-3 py-2 text-sm font-medium text-destructive">
          {state.error}
        </p>
      ) : null}
      <Button type="submit" disabled={pending}>
        {pending ? <Loader2 className="animate-spin" /> : <Save />}
        Save stock alert
      </Button>
    </form>
  );
}
