"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus } from "lucide-react";
import { toast } from "sonner";

import { createSupplierAction } from "@/lib/actions/purchases";
import { Button } from "@/components/ui/button";

const inputCls =
  "h-11 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring";

export function SupplierForm() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <Button variant="outline" onClick={() => setOpen(true)} className="w-full">
        <Plus className="h-4 w-4" /> Add Supplier
      </Button>
    );
  }

  const submit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const res = await createSupplierAction(null, fd);
      if (res?.ok) {
        toast.success("Supplier added");
        setOpen(false);
        router.refresh();
      } else if (res?.error) {
        toast.error(res.error);
      }
    });
  };

  return (
    <form onSubmit={submit} className="space-y-2 rounded-2xl border border-border/70 bg-card p-4 shadow-card">
      <div className="grid grid-cols-2 gap-2">
        <input name="name" className={inputCls} placeholder="Supplier name" required maxLength={100} />
        <input name="phone" className={inputCls} placeholder="Phone (optional)" maxLength={15} />
      </div>
      <div className="flex gap-2">
        <Button type="submit" disabled={pending} className="flex-1">
          {pending ? <Loader2 className="animate-spin" /> : null} Save
        </Button>
        <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
      </div>
    </form>
  );
}
