import { desc } from "drizzle-orm";
import { Pencil } from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
import { ProductForm } from "@/components/catalog/product-form";
import { ProductDeleteButton } from "@/components/catalog/product-delete-button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { db, products } from "@/db";

export const metadata = { title: "Products" };


export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ edit?: string }>;
}) {
  const { edit } = await searchParams;

  const rows = await db.select().from(products).orderBy(desc(products.id));
  const editing = edit ? rows.find((p) => p.id === Number(edit)) : undefined;

  return (
    <>
      <PageHeader
        title="Products"
        description="Bisleri, Maaza and more — manage sizes and rates."
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <Card>
          <CardHeader>
            <CardTitle>All Products ({rows.length})</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {rows.length === 0 ? (
              <p className="px-5 pb-5 text-sm text-muted-foreground">
                No products yet — add one using the form.
              </p>
            ) : (
              <ul className="divide-y divide-border">
                {rows.map((p) => (
                  <li key={p.id} className="flex items-center gap-3 px-5 py-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">
                        {p.name}{" "}
                        <span className="text-muted-foreground">· {p.size}</span>
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {p.defaultRatePerBox ? `₹${p.defaultRatePerBox}/box` : "—"}
                      </p>
                    </div>
                    <Badge variant={p.isActive ? "secondary" : "outline"}>
                      {p.isActive ? "Active" : "Inactive"}
                    </Badge>
                    <div className="flex items-center gap-1">
                      <a
                        href={`/products?edit=${p.id}`}
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                        aria-label={`Edit ${p.name}`}
                      >
                        <Pencil className="h-4 w-4" />
                      </a>
                      <ProductDeleteButton id={p.id} name={p.name} />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card className="h-fit">
          <CardHeader>
            <CardTitle>{editing ? `Edit: ${editing.name}` : "New Product"}</CardTitle>
          </CardHeader>
          <CardContent>
            <ProductForm product={editing} />
          </CardContent>
        </Card>
      </div>
    </>
  );
}

