"use client";

import { useEffect, useState } from "react";
import { Minus, Plus } from "lucide-react";

/** Number input with big +/- buttons (tap-friendly).
 *  Typing wala text local state me rakhta hai taaki beech wali value
 *  (jaise khali box ya "0") turant clamp hokar gayab na ho — commit
 *  blur ya valid number par hota hai. */
export function NumberStepper({
  value,
  onChange,
  min = 0,
  max = 100000,
  step = 1,
  name,
  id,
}: {
  value: number;
  onChange: (n: number) => void;
  min?: number;
  max?: number;
  step?: number;
  name?: string;
  id?: string;
}) {
  const clamp = (n: number) => Math.min(max, Math.max(min, n));
  // null = parent value dikhao; string = user jo type kar raha hai wahi dikhao
  const [text, setText] = useState<string | null>(null);

  // +/- dabane ya bahar se value badalne par typed text hatao
  useEffect(() => {
    setText(null);
  }, [value]);

  return (
    <div className="flex min-w-0 items-center gap-1.5">
      <button
        type="button"
        onClick={() => onChange(clamp(value - step))}
        className="flex h-10 w-9 shrink-0 items-center justify-center rounded-xl border border-border bg-card text-foreground transition-colors hover:bg-muted disabled:opacity-40"
        disabled={value <= min}
        aria-label="Decrease"
      >
        <Minus className="h-4 w-4" />
      </button>
      <input
        id={id}
        name={name}
        type="number"
        inputMode="numeric"
        value={text ?? (Number.isFinite(value) ? value : "")}
        min={min}
        max={max}
        onChange={(e) => {
          const t = e.target.value;
          setText(t);
          // Khali box me kuch mat karo — blur par wapas sahi value aa jayegi
          if (t === "") return;
          const n = Number(t);
          if (Number.isFinite(n)) onChange(clamp(n));
        }}
        onBlur={() => setText(null)}
        className="no-spinner h-10 w-full min-w-0 flex-1 rounded-xl border border-border bg-background px-2 text-center text-sm font-semibold outline-none transition-colors focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring"
      />
      <button
        type="button"
        onClick={() => onChange(clamp(value + step))}
        className="flex h-10 w-9 shrink-0 items-center justify-center rounded-xl border border-border bg-card text-foreground transition-colors hover:bg-muted disabled:opacity-40"
        disabled={value >= max}
        aria-label="Increase"
      >
        <Plus className="h-4 w-4" />
      </button>
    </div>
  );
}
