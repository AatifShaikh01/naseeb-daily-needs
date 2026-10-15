import type { ReactNode } from "react";
import { Suspense } from "react";

import { BottomNav } from "@/components/layout/bottom-nav";
import { Header } from "@/components/layout/header";
import { Sidebar } from "@/components/layout/sidebar";

// Note: Header session ke liye cookies() padhta hai,
// isliye use Suspense me wrap kiya hai taaki cacheComponents
// mode me prerender crash na ho.

/**
 * App shell: top header + desktop sidebar + mobile bottom nav.
 * Saare app pages isi route group `(dashboard)` ke under aayenge.
 */
export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Suspense
        fallback={
          <div className="sticky top-0 z-30 border-b border-border bg-card">
            <div className="flex min-h-20 animate-pulse items-center gap-3.5 px-4 py-3 md:px-6">
              <div className="h-12 w-12 rounded-2xl bg-muted" />
              <div className="space-y-2">
                <div className="h-4 w-28 rounded bg-muted" />
                <div className="h-3 w-40 rounded bg-muted" />
              </div>
            </div>
          </div>
        }
      >
        <Header />
      </Suspense>
      <div className="flex w-full flex-1">
        <Sidebar />
        <main className="min-w-0 flex-1 px-4 py-6 pb-28 md:px-8 md:pb-10">
          <div className="mx-auto w-full max-w-5xl">
            <Suspense
              fallback={
                <div className="animate-pulse space-y-3">
                  <div className="h-8 w-48 rounded-xl bg-muted" />
                  <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                    {[0, 1, 2, 3].map((i) => (
                      <div key={i} className="h-20 rounded-2xl bg-muted" />
                    ))}
                  </div>
                  <div className="h-48 rounded-2xl bg-muted" />
                </div>
              }
            >
              {children}
            </Suspense>
          </div>
        </main>
      </div>
      <BottomNav />
    </div>
  );
}
