import type { ReactNode } from "react";
import { cookies } from "next/headers";

import { BottomNav } from "@/components/layout/bottom-nav";
import { Header } from "@/components/layout/header";
import { Sidebar } from "@/components/layout/sidebar";

// Note: Header session ke liye cookies() padhta hai,
// isliye ye layout cacheComponents mode me bhi request-time par render hota hai.

/**
 * App shell: top header + desktop sidebar + mobile bottom nav.
 * Saare app pages isi route group `(dashboard)` ke under aayenge.
 */
export default async function DashboardLayout({ children }: { children: ReactNode }) {
  await cookies();

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />
      <div className="flex w-full flex-1">
        <Sidebar />
        <main className="min-w-0 flex-1 px-4 py-6 pb-28 md:px-8 md:pb-10">
          <div className="mx-auto w-full max-w-5xl">{children}</div>
        </main>
      </div>
      <BottomNav />
    </div>
  );
}
