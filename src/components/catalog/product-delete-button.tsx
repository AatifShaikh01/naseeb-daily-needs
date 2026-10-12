"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { deleteProductAction } from "@/lib/actions/products";
import { Button } from "@/components/ui/button";

/** Delete with inline confirm + toast (list row ke andar). */
export function ProductDeleteButton({ id, name }: { id: number; name: string }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [pending, startTransition] = useTransition();

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
        aria-label={`Delete ${name}`}
      >
        <Trash2 className="h-4 w-4" />
      </button>
    );
  }

  return (
    <span className="flex items-center gap-1.5 rounded-xl bg-destructive/10 px-2 py-1">
      <span className="text-[11px] font-medium text-destructive">Delete?</span>
      <Button
        type="button"
        size="sm"
        variant="destructive"
        className="h-7 px-2 text-[11px]"
        disabled={pending}
        onClick={() => {
          const fd = new FormData();
          fd.set("id", String(id));
          startTransition(async () => {
            const res = await deleteProductAction(fd);
            if (res?.ok) {
              toast.success("Product deleted");
              router.refresh();
            } else {
              toast.error(res?.error ?? "Could not delete product");
              setConfirming(false);
            }
          });
        }}
      >
        {pending ? <Loader2 className="h-3 w-3 animate-spin" /> : "Delete"}
      </Button>
      <Button
        type="button"
        size="sm"
        variant="ghost"
        className="h-7 px-2 text-[11px]"
        onClick={() => setConfirming(false)}
      >
        Cancel
      </Button>
    </span>
  );
}