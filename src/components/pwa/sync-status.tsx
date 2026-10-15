"use client";

import { useCallback, useEffect, useState } from "react";
import { CloudOff, Loader2, RefreshCw, Wifi } from "lucide-react";
import { toast } from "sonner";

import { listOutbox, removeOutbox } from "@/lib/outbox";
import { createSaleAction } from "@/lib/actions/sales";
import { createStockEntriesAction } from "@/lib/actions/stock";
import { createPurchaseAction } from "@/lib/actions/purchases";

function toFormData(obj: Record<string, unknown>): FormData {
  const fd = new FormData();
  for (const [k, v] of Object.entries(obj)) {
    fd.set(k, typeof v === "string" ? v : JSON.stringify(v));
  }
  return fd;
}

/** Header me online/offline dot + pending entries ka sync button. */
export function SyncStatus() {
  const [online, setOnline] = useState(true);
  const [count, setCount] = useState(0);
  const [syncing, setSyncing] = useState(false);

  const refresh = useCallback(() => {
    setOnline(navigator.onLine);
    try {
      setCount(listOutbox().length);
    } catch {
      setCount(0);
    }
  }, []);

  useEffect(() => {
    refresh();
    const on = () => refresh();
    window.addEventListener("online", on);
    window.addEventListener("offline", on);
    window.addEventListener("naseeb:outbox", on as EventListener);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", on);
      window.removeEventListener("naseeb:outbox", on as EventListener);
    };
  }, [refresh]);

  const syncNow = async () => {
    const entries = listOutbox();
    if (!entries.length) {
      toast.info("Nothing pending to sync");
      return;
    }
    setSyncing(true);
    let done = 0;
    for (const e of entries) {
      try {
        const fd = toFormData(e.payload);
        const res =
          e.kind === "sale" ? await createSaleAction(null, fd)
          : e.kind === "stock" ? await createStockEntriesAction(null, fd)
          : await createPurchaseAction(null, fd);
        if (res?.ok) {
          removeOutbox(e.id);
          done += 1;
        }
      } catch {
        break; // abhi bhi offline — ruk jao
      }
    }
    setSyncing(false);
    refresh();
    if (done > 0) toast.success(`Synced ${done} entr${done === 1 ? "y" : "ies"}`);
    else toast.error("Sync failed — check connection");
  };

  return (
    <div className="flex items-center gap-1.5">
      <span
        title={online ? "Online" : "Offline"}
        className={`flex h-8 w-8 items-center justify-center rounded-xl border border-border bg-background ${online ? "text-primary" : "text-destructive"}`}
      >
        {online ? <Wifi className="h-4 w-4" /> : <CloudOff className="h-4 w-4" />}
      </span>
      {count > 0 ? (
        <button
          type="button"
          onClick={syncNow}
          disabled={syncing || !online}
          className="flex h-8 items-center gap-1 rounded-xl border border-accent/40 bg-accent/15 px-2.5 text-xs font-bold text-accent-foreground disabled:opacity-50"
          title={`${count} entries pending`}
        >
          {syncing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
          {count}
        </button>
      ) : null}
    </div>
  );
}
