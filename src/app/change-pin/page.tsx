import type { Metadata } from "next";
import { KeyRound } from "lucide-react";

import { ChangePinForm } from "@/components/auth/change-pin-form";
import { getSession } from "@/lib/actions/auth";

export const metadata: Metadata = { title: "Change PIN" };

export default async function ChangePinPage() {
  const session = await getSession();

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-float">
            <KeyRound className="h-7 w-7" />
          </div>
          <h1 className="text-xl font-bold">Apna PIN badlein</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {session ? `Welcome, ${session.name}! ` : ""}
            Security ke liye default PIN zaroor badlein.
          </p>
        </div>

        <div className="rounded-2xl border border-border/70 bg-card p-6 shadow-card">
          <ChangePinForm />
        </div>
      </div>
    </div>
  );
}