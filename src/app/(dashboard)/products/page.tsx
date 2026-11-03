import { desc } from "drizzle-orm";

import { PageHeader } from "@/components/layout/page-header";
import { ProductForm } from "@/components/catalog/product-form";
import { ProductList } from "@/components/catalog/product-list";
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

      <div className="grid grid-cols-1 gap-6">
        <ProductList products={rows} />

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
