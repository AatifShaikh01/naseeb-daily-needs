"use client";

import { useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { LiveSearch } from "@/components/ui/live-search";
import type { products } from "@/db/schema";

type Balance = {
  product: typeof products.$inferSelect;
  inB: number;
  soldB: number;
  balance: number;
};

export function StockBalanceList({
  balances,
  threshold,
}: {
  balances: Balance[];
  threshold: number;
}) {
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => {
    const search = query.trim().toLocaleLowerCase();
    if (!search) return balances;
    return balances.filter((item) =>
      `${item.product.name} ${item.product.size}`.toLocaleLowerCase().includes(search),
    );
  }, [balances, query]);

  if (!balances.length) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-sm text-muted-foreground">
          No products yet — add some from Products.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <LiveSearch
        value={query}
        onChange={setQuery}
        placeholder="Search stock..."
        label="Search stock"
      />
      {filtered.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border bg-card p-6 text-center text-sm text-muted-foreground">
          No stock matches your search.
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
          {filtered.map((item) => (
            <Card key={item.product.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{item.product.name}</p>
                    <p className="text-xs text-muted-foreground">{item.product.size}</p>
                  </div>
                  {item.balance <= threshold ? <Badge variant="destructive">Low</Badge> : null}
                </div>
                <p className="mt-3 text-3xl font-bold leading-none">{item.balance}</p>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  boxes · in {item.inB} − sold {item.soldB}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
