import { CalendarDays, ContactRound, FileText, KeyRound, Landmark, MoreHorizontal, Package, PackagePlus, Receipt, Settings, UsersRound } from "lucide-react";
import Link from "next/link";

import { logoutAction } from "@/lib/actions/auth";
import { ComingSoonCard, PageHeader } from "@/components/layout/page-header";
import { PwaInstallButton } from "@/components/pwa/pwa-install-button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getSession } from "@/lib/actions/auth";

export const metadata = { title: "More" };

const MORE_LINKS = [
  {
    icon: PackagePlus,
    title: "Stock In",
    href: "/stock-in",
    description: "Record incoming stock for one or more products.",
  },
  {
    icon: Package,
    title: "Products",
    href: "/products",
    description: "Manage items, sizes and rates.",
  },
  {
    icon: Receipt,
    title: "Sales",
    href: "/sales",
    description: "View, filter and edit all recorded sales.",
  },
  {
    icon: CalendarDays,
    title: "Daily Staff Report",
    href: "/staff/daily",
    description: "See each day's sales, customers, deliveries and payments by staff member.",
  },
  {
    icon: UsersRound,
    title: "Staff Sales",
    href: "/staff",
    description: "Choose a staff member to see their sales and payment details.",
  },
  {
    icon: ContactRound,
    title: "Customers",
    href: "/customers",
    description: "Customer profiles with complete sales and payment history.",
  },
  {
    icon: FileText,
    title: "Reports",
    href: "/reports",
    description: "Daily and monthly sales & stock reports with CSV export.",
  },
  {
    icon: Landmark,
    title: "Purchases",
    href: "/purchases",
    description: "Supplier purchases, rates and udhaar ledger.",
  },
  {
    icon: Settings,
    title: "Settings",
    href: "/settings",
    description: "Staff list for the Delivered By dropdown.",
  },
  {
    icon: KeyRound,
    title: "Change PIN",
    href: "/change-pin",
    description: "Update your login PIN.",
  },
] as const;

export default async function MorePage() {
  const session = await getSession();
  const isStaff = session?.accountType === "staff" && session.role !== "admin";
  const links = MORE_LINKS.filter((link) =>
    isStaff ? ["/sales", "/customers", "/change-pin"].includes(link.href) : true,
  );
  return (
    <>
      <PageHeader title="More" description={isStaff ? "Customer and sales tools." : "Products, settings and logout."} />

      <div className="mb-6 grid gap-3 sm:grid-cols-2">
        {links.map((link) => (
          <Link key={link.title} href={link.href}>
            <Card className="transition-shadow hover:shadow-float">
              <CardHeader className="flex-row items-center gap-3 pb-2">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-secondary text-secondary-foreground">
                  <link.icon className="h-5 w-5" />
                </div>
                <CardTitle>{link.title}</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                {link.description}
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <Card className="mb-6">
        <CardHeader className="flex-row items-center gap-3 pb-2">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <MoreHorizontal className="h-5 w-5" />
          </div>
          <CardTitle>Install App</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-3 text-sm text-muted-foreground">
            Add an app icon to the home screen with quick launch, full-screen display, and offline support.
          </p>
          <PwaInstallButton />
        </CardContent>
      </Card>

      <form action={logoutAction} className="mb-6">
        <button
          type="submit"
          className="w-full rounded-xl border border-destructive/30 bg-card px-4 py-3 text-sm font-medium text-destructive transition-colors hover:bg-destructive/10"
        >
          Logout
        </button>
      </form>

      <ComingSoonCard
        icon={MoreHorizontal}
        title="More & Extra Tools"
        description="Daily backup, settings and other tools — in upcoming phases."
      />
    </>
  );
}
