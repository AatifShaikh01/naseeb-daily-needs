"use client";

import { useMemo, useState } from "react";
import { Pencil } from "lucide-react";

import { ProductDeleteButton } from "@/components/catalog/product-delete-button";
import { LiveSearch } from "@/components/ui/live-search";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { products } from "@/db/schema";

type Product = typeof products.$inferSelect;

export function ProductList({ products }: { products: Product[] }) {
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => {
    const search = query.trim().toLocaleLowerCase();
    if (!search) return products;
    return products.filter((product) =>
      `${product.name} ${product.size} ${product.defaultRatePerBox ?? ""}`
        .toLocaleLowerCase()
        .includes(search),
    );
  }, [products, query]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>All Products ({filtered.length}{query ? ` / ${products.length}` : ""})</CardTitle>
        {products.length > 0 ? (
          <LiveSearch
            value={query}
            onChange={setQuery}
            placeholder="Search products..."
            label="Search products"
          />
        ) : null}
      </CardHeader>
      <CardContent className="p-0">
        {products.length === 0 ? (
          <p className="px-5 pb-5 text-sm text-muted-foreground">
            No products yet — add one using the form.
          </p>
        ) : filtered.length === 0 ? (
          <p className="px-5 pb-5 text-sm text-muted-foreground">No products match your search.</p>
        ) : (
          <ul className="divide-y divide-border">
            {filtered.map((product) => (
              <li key={product.id} className="flex items-center gap-3 px-5 py-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">
                    {product.name}{" "}
                    <span className="text-muted-foreground">· {product.size}</span>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {product.defaultRatePerBox ? `₹${product.defaultRatePerBox}/box` : "—"}
                  </p>
                </div>
                <Badge variant={product.isActive ? "secondary" : "outline"}>
                  {product.isActive ? "Active" : "Inactive"}
                </Badge>
                <div className="flex items-center gap-1">
                  <a
                    href={`/products?edit=${product.id}`}
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                    aria-label={`Edit ${product.name}`}
                  >
                    <Pencil className="h-4 w-4" />
                  </a>
                  <ProductDeleteButton id={product.id} name={product.name} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
