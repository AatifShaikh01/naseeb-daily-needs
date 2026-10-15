import { Metadata } from "next";
import { ShieldCheck } from "lucide-react";

import { LoginForm } from "@/components/auth/login-form";

export const metadata: Metadata = { title: "Login" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-sm">
        {/* Brand */}
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="relative mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary text-3xl font-bold text-primary-foreground shadow-float">
            N
            <span className="absolute -right-1 -top-1 h-4 w-4 rounded-full border-[3px] border-background bg-accent" />
          </div>
          <h1 className="text-xl font-bold tracking-wide">NASEEB</h1>
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
            Daily Needs &amp; Agencies
          </p>
        </div>

        <div className="rounded-2xl border border-border/70 bg-card p-6 shadow-card">
          <LoginForm next={next ?? "/"} />
        </div>

        <p className="mt-6 flex items-center justify-center gap-1.5 text-center text-xs text-muted-foreground">
          <ShieldCheck className="h-3.5 w-3.5" />
          Owner login — username + PIN
        </p>
      </div>
    </div>
  );
}