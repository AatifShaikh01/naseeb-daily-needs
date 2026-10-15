"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { recordSupplierPaymentAction } from "@/lib/actions/purchases";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { todayIST } from "@/lib/dates";

const inputCls =
  "h-11 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring";

export function SupplierPayDialog({ supplierId, supplierName, due }: { supplierId: number; supplierName: string; due: number }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);

  const submit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    fd.set("supplierId", String(supplierId));
    startTransition(async () => {
      const res = await recordSupplierPaymentAction(null, fd);
      if (res?.ok) {
        toast.success("Payment recorded");
        setOpen(false);
        router.refresh();
      } else if (res?.error) {
        toast.error(res.error);
      }
    });
  };

  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)} className="w-full">Pay Supplier</Button>
      <Dialog open={open} onClose={() => setOpen(false)} title={`Pay ${supplierName}`}>
        <form onSubmit={submit} className="space-y-3">
          {due > 0 ? <p className="text-sm text-muted-foreground">Due: ₹{due.toLocaleString("en-IN")}</p> : null}
          <div className="grid grid-cols-2 gap-2">
            <input name="amount" type="number" min={0.01} step="0.01" className={inputCls} required placeholder={due > 0 ? String(due) : "0.00"} />
            <input name="paidOn" type="date" defaultValue={todayIST()} className={inputCls} />
          </div>
          <div className="grid grid-cols-3 gap-2">
            {(["cash", "upi", "bank"] as const).map((m) => (
              <label key={m} className="flex cursor-pointer items-center justify-center gap-1.5 rounded-xl border border-border py-2.5 text-sm font-medium capitalize has-checked:border-primary has-checked:bg-primary has-checked:text-primary-foreground">
                <input type="radio" name="mode" value={m} defaultChecked={m === "cash"} className="sr-only" />{m}
              </label>
            ))}
          </div>
          <input name="note" className={inputCls} placeholder="Note (optional)" maxLength={200} />
          <Button type="submit" disabled={pending} className="w-full">
            {pending ? <Loader2 className="animate-spin" /> : null} Save Payment
          </Button>
        </form>
      </Dialog>
    </>
  );
}
