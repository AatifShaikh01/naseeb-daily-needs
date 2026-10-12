import { LogOut, User } from "lucide-react";

import { getSession, logoutAction } from "@/lib/actions/auth";
import { APP_NAME } from "@/lib/navigation";

/**
 * Top header — brand + logged-in user + logout.
 */
export async function Header() {
  const session = await getSession();

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
      <div className="flex h-16 items-center justify-between gap-3 px-4 md:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <div className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary font-bold text-primary-foreground shadow-soft">
            N
            <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full border-2 border-card bg-accent" />
          </div>
          <div className="min-w-0 leading-tight">
            <p className="truncate text-sm font-bold tracking-wide text-foreground sm:text-base">
              NASEEB
            </p>
            <p className="truncate text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground sm:text-[11px]">
              Daily Needs &amp; Agencies
            </p>
          </div>
        </div>

        {session ? (
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 rounded-full border border-border bg-background py-1 pl-1 pr-3">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-secondary text-secondary-foreground">
                <User className="h-4 w-4" />
              </div>
              <div className="hidden leading-tight sm:block">
                <p className="text-xs font-semibold">{session.name}</p>
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                  @{session.username}
                </p>
              </div>
            </div>
            <form action={logoutAction}>
              <button
                type="submit"
                className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-background text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                title="Logout"
                aria-label="Logout"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </form>
          </div>
        ) : null}
      </div>
      <p className="sr-only">{APP_NAME}</p>
    </header>
  );
}
