"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowRight, UserRound } from "lucide-react";

import { LiveSearch } from "@/components/ui/live-search";
import { Card, CardContent } from "@/components/ui/card";

export type CustomerSummary = {
  profileSaleId: number;
  name: string;
  phone: string | null;
  saleCount: number;
  firstSaleDate: string;
  lastSaleDate: string;
  totalSales: number;
  totalPaid: number;
  pending: number;
  advance: number;
};

const money = (amount: number) =>
  `₹${amount.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;

function dateLabel(date: string) {
  return new Date(`${date}T00:00:00Z`).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

export function CustomerDirectory({ customers }: { customers: CustomerSummary[] }) {
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => {
    const search = query.trim().toLocaleLowerCase();
    if (!search) return customers;
    return customers.filter((customer) =>
      `${customer.name} ${customer.phone ?? ""}`.toLocaleLowerCase().includes(search),
    );
  }, [customers, query]);

  return (
    <div className="space-y-4">
      {customers.length > 0 ? (
        <LiveSearch
          value={query}
          onChange={setQuery}
          placeholder="Search customer or phone..."
          label="Search customers"
        />
      ) : null}
      {filtered.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-sm text-muted-foreground">
            {customers.length === 0
              ? "No customers yet. Customers appear here after you record a sale."
              : "No customers match your search."}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((customer) => (
            <Link
              key={customer.profileSaleId}
              href={`/customers/${customer.profileSaleId}`}
              className="block rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Card className="transition-colors hover:border-primary/40">
                <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
                  <div className="flex min-w-0 flex-1 items-center gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                      <UserRound className="h-5 w-5" />
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate font-semibold">{customer.name}</span>
                      <span className="block text-sm text-muted-foreground">
                        {customer.phone || "No phone"} · {customer.saleCount} sale{customer.saleCount === 1 ? "" : "s"}
                      </span>
                    </span>
                  </div>
                  <span className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm sm:min-w-64">
                    <span className="text-muted-foreground">Customer since</span>
                    <span className="text-right">{dateLabel(customer.firstSaleDate)}</span>
                    <span className="text-muted-foreground">Last sale</span>
                    <span className="text-right">{dateLabel(customer.lastSaleDate)}</span>
                    <span className="text-muted-foreground">Total sales</span>
                    <span className="text-right font-medium">{money(customer.totalSales)}</span>
                    <span className="text-muted-foreground">Pending</span>
                    <span className={`text-right font-semibold ${customer.pending > 0.005 ? "text-destructive" : "text-primary"}`}>
                      {money(customer.pending)}
                    </span>
                    {customer.advance > 0.005 ? (
                      <>
                        <span className="text-muted-foreground">Advance</span>
                        <span className="text-right font-semibold text-primary">{money(customer.advance)}</span>
                      </>
                    ) : null}
                  </span>
                  <ArrowRight className="hidden h-5 w-5 shrink-0 text-muted-foreground sm:block" />
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
