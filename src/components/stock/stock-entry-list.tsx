"use client";

import { useState } from "react";

import { LiveSearch } from "@/components/ui/live-search";
import { StockEntryRow } from "@/components/stock/stock-entry-row";

type ProductOption = { id: number; name: string; size: string };
type StockEntry = { id: number; entryDate: string; productId: number; boxes: number; note: string };

export function StockEntryList({
  entries,
  products,
  emptyMessage,
  showDate,
}: {
  entries: StockEntry[];
  products: ProductOption[];
  emptyMessage: string;
  showDate: boolean;
}) {
  const [query, setQuery] = useState("");
  const search = query.trim().toLocaleLowerCase();
  const filtered = search
    ? entries.filter((entry) => {
        const product = products.find((item) => item.id === entry.productId);
        return `${product?.name ?? ""} ${product?.size ?? ""} ${entry.note} ${entry.entryDate}`
          .toLocaleLowerCase()
          .includes(search);
      })
    : entries;

  return (
    <div>
      {entries.length > 0 ? (
        <LiveSearch
          value={query}
          onChange={setQuery}
          placeholder="Search product or note..."
          label="Search stock entries"
        />
      ) : null}
      {filtered.length === 0 ? (
        <p className="py-3 text-sm text-muted-foreground">
          {entries.length === 0 ? emptyMessage : "No stock entries match your search."}
        </p>
      ) : (
        <ul className="divide-y divide-border">
          {filtered.map((entry) => (
            <StockEntryRow key={entry.id} entry={entry} products={products} showDate={showDate} />
          ))}
        </ul>
      )}
    </div>
  );
}
