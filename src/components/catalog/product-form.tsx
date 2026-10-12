"use client";

import { useEffect } from "react";
import { useActionState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { saveProductAction, type ActionResult } from "@/lib/actions/products";
import { Button } from "@/components/ui/button";
import type { Product } from "@/db";

const inputCls =
  "h-11 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none transition-colors focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring";

export function ProductForm({ product }: { product?: Product }) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState<ActionResult | null, FormData>(
    saveProductAction,
    null,
  );

  useEffect(() => {
    if (!state) return;
    if (state.ok) {
      toast.success(product ? "Product updated" : "Product added");
      if (product) router.replace("/products"); // edit param clear → panel wapas "New Product"
      router.refresh();
    } else if (state.error) {
      toast.error(state.error);
    }
  }, [state, product, router]);

  return (
    <form action={formAction} className="space-y-3">
      {product ? <input type="hidden" name="id" value={product.id} /> : null}

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <label htmlFor="name" className="text-sm font-medium">Name</label>
          <input id="name" name="name" required defaultValue={product?.name}
            placeholder="Bisleri" className={inputCls} />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="size" className="text-sm font-medium">Size</label>
          <input id="size" name="size" required defaultValue={product?.size}
            placeholder="500ml / 1 ltr" className={inputCls} />
        </div>
        <div className="col-span-2 space-y-1.5">
          <label htmlFor="defaultRatePerBox" className="text-sm font-medium">Default Rate / Box (₹)</label>
          <input id="defaultRatePerBox" name="defaultRatePerBox" type="number" min={0} step="0.01"
            defaultValue={product?.defaultRatePerBox ?? ""} placeholder="optional"
            className={inputCls} />
        </div>
      </div>

      {product ? (
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="isActive" defaultChecked={product.isActive}
            className="h-4 w-4 rounded border-border accent-[#0F766E]" />
          Active (shows in sales dropdowns)
        </label>
      ) : null}

      <Button type="submit" disabled={pending} className="w-full" size="lg">
        {pending ? <Loader2 className="animate-spin" /> : null}
        {product ? "Update Product" : "Add Product"}
      </Button>
    </form>
  );
}