"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { SIDEBAR_ITEMS } from "@/lib/navigation";
import { cn } from "@/lib/utils";

/** Desktop ke liye left sidebar — mobile pe hidden (niche bottom nav). */
export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="sticky top-16 hidden h-[calc(100vh-4rem)] w-64 shrink-0 overflow-y-auto border-r border-border bg-card p-4 md:flex md:flex-col">
      <p className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        Menu
      </p>
      <nav className="flex flex-col gap-1">
        {SIDEBAR_ITEMS.map((item) => {
          const isActive =
            item.href === "/"
              ? pathname === item.href
              : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary text-primary-foreground shadow-soft"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
              aria-current={isActive ? "page" : undefined}
            >
              <item.icon className="h-[18px] w-[18px]" />
              {item.title}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto px-3 pt-4">
        <p className="text-[11px] leading-relaxed text-muted-foreground">
          Stock · Sales · Payments
          <br />
          All in one place.
        </p>
      </div>
    </aside>
  );
}
