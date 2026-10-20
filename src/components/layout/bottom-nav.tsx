"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";

import { NAV_ITEMS } from "@/lib/navigation";
import { cn } from "@/lib/utils";

/** Mobile ke liye bottom navigation bar — desktop pe hidden.
 * Ref-style floating pill: rounded bar + beech me utha hua center (Sale) button.
 * prefetch: aas-paas wale tabs pehle se load, taaki switch instant lage.
 */
export function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  // Idle time me baki tabs prefetch — tab switch turant lagega
  useEffect(() => {
    const idle = (fn: () => void) =>
      "requestIdleCallback" in window
        ? (window as unknown as { requestIdleCallback: (f: () => void) => void }).requestIdleCallback(fn)
        : setTimeout(fn, 1500);
    idle(() => {
      for (const item of NAV_ITEMS) router.prefetch(item.href);
    });
  }, [router]);
  // Bill page par bottom nav nahi dikhna chahiye — full page bill view
  if (pathname.startsWith("/bill/")) return null;

  const left = NAV_ITEMS.slice(0, 2);
  const center = NAV_ITEMS[2];
  const right = NAV_ITEMS.slice(3);

  const renderItem = (item: (typeof NAV_ITEMS)[number]) => {
    const isActive =
      item.href === "/"
        ? pathname === item.href
        : pathname.startsWith(item.href);
    return (
      <Link
        key={item.href}
        href={item.href}
        className={cn(
          "flex min-h-[4.25rem] flex-1 flex-col items-center justify-center gap-1 rounded-2xl text-xs font-semibold transition-colors",
          isActive
            ? "text-primary"
            : "text-muted-foreground hover:text-foreground",
        )}
        aria-current={isActive ? "page" : undefined}
      >
        <item.icon className="h-6 w-6" strokeWidth={isActive ? 2.5 : 2} />
        {item.shortLabel ?? item.title}
        <span
          className={cn(
            "h-1 w-6 rounded-full transition-colors",
            isActive ? "bg-primary" : "bg-transparent",
          )}
        />
      </Link>
    );
  };

  const isCenterActive =
    center.href === "/"
      ? pathname === center.href
      : pathname.startsWith(center.href);
  const CenterIcon = center.icon;

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-30 px-4 pb-[max(0.9rem,env(safe-area-inset-bottom))] md:hidden"
      aria-label="Bottom navigation"
    >
      <div className="relative flex items-stretch rounded-[1.75rem] border border-border bg-card/95 px-2 py-1.5 shadow-float backdrop-blur supports-[backdrop-filter]:bg-card/90">
        {left.map(renderItem)}
        {/* Center — utha hua round button (notch effect ke saath) */}
        <div className="relative flex flex-1 items-stretch justify-center">
          <span
            aria-hidden
            className="absolute -top-7 h-20 w-20 rounded-full bg-background"
          />
          <Link
            href={center.href}
            aria-current={isCenterActive ? "page" : undefined}
            aria-label={center.title}
            className={cn(
              "relative -top-5 flex h-16 w-16 items-center justify-center self-start rounded-full text-primary-foreground shadow-float ring-4 ring-background transition-transform active:scale-95",
              isCenterActive
                ? "bg-primary"
                : "bg-gradient-to-br from-primary to-primary/70",
            )}
          >
            <CenterIcon className="h-7 w-7" strokeWidth={2.5} />
          </Link>
        </div>
        {right.map(renderItem)}
      </div>
    </nav>
  );
}
