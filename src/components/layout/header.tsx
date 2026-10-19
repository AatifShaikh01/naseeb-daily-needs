import { LogOut, User } from "lucide-react";

import { getSession, logoutAction } from "@/lib/actions/auth";
import { APP_NAME } from "@/lib/navigation";
import { Logo } from "@/components/layout/logo";

/**
 * Top header — brand + logged-in user + logout.
 * Bigger, bolder: tall bar, large logo mark, clear brand text.
 */
export async function Header() {
  const session = await getSession();

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-card/95 shadow-soft backdrop-blur supports-[backdrop-filter]:bg-card/85">
      <div className="flex min-h-20 items-center justify-between gap-3 px-4 py-3 md:px-6">
        <div className="flex min-w-0 items-center gap-3.5">
          <Logo height={44} className="shrink-0" />
          <div className="min-w-0 leading-tight">
            <p className="truncate text-lg font-extrabold tracking-wide text-foreground sm:text-xl">
              NASEEB
            </p>
            <p className="truncate text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground sm:text-[13px]">
              Daily Needs &amp; Agencies
            </p>
          </div>
        </div>

        {session ? (
          <div className="flex shrink-0 items-center gap-2.5">
            <div className="flex items-center gap-2.5 rounded-2xl border border-border bg-background p-1.5 shadow-soft md:py-1.5 md:pl-1.5 md:pr-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary text-secondary-foreground">
                <User className="h-5 w-5" />
              </div>
              <div className="hidden leading-tight md:block">
                <p className="text-sm font-bold">{session.name}</p>
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                  @{session.username}
                </p>
              </div>
            </div>
            <form action={logoutAction}>
              <button
                type="submit"
                className="flex h-11 w-11 items-center justify-center rounded-2xl border border-border bg-background text-muted-foreground shadow-soft transition-colors hover:bg-destructive/10 hover:text-destructive"
                title="Logout"
                aria-label="Logout"
              >
                <LogOut className="h-5 w-5" />
              </button>
            </form>
          </div>
        ) : null}
      </div>
      <p className="sr-only">{APP_NAME}</p>
    </header>
  );
}
