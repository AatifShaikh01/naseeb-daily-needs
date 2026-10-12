"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";

/**
 * Inline delete confirmation — server action `<form>` ke andar rakhein.
 * Pehle Delete icon dikhata hai; click par inline "Confirm?" + Delete/Cancel dikhta hai
 * (dialog overlay nahi — server form ke saath sabse reliable).
 */
export function ConfirmDelete({
  title,
  message,
}: {
  title: string;
  message: string;
}) {
  const [confirming, setConfirming] = useState(false);

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
        aria-label={title}
      >
        <Trash2 className="h-4 w-4" />
      </button>
    );
  }

  return (
    <span className="flex items-center gap-1.5 rounded-xl bg-destructive/10 px-2 py-1">
      <span className="text-[11px] font-medium text-destructive">{message}</span>
      <Button
        type="submit"
        size="sm"
        variant="destructive"
        className="h-7 px-2 text-[11px]"
      >
        Delete
      </Button>
      <Button
        type="button"
        size="sm"
        variant="ghost"
        className="h-7 px-2 text-[11px]"
        onClick={() => setConfirming(false)}
      >
        Cancel
      </Button>
    </span>
  );
}

