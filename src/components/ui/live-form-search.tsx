"use client";

import { useEffect, useRef, useState } from "react";
import { Search } from "lucide-react";

export function LiveFormSearch({
  initialValue,
  name,
  placeholder,
  label,
}: {
  initialValue: string;
  name: string;
  placeholder: string;
  label: string;
}) {
  const [value, setValue] = useState(initialValue);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (value === initialValue) return;
    const timer = window.setTimeout(() => inputRef.current?.form?.requestSubmit(), 300);
    return () => window.clearTimeout(timer);
  }, [initialValue, value]);

  return (
    <label className="relative block">
      <span className="sr-only">{label}</span>
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <input
        ref={inputRef}
        type="search"
        name={name}
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder={placeholder}
        aria-label={label}
        className="h-10 w-full rounded-xl border border-border bg-background pl-9 pr-3 text-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring"
      />
    </label>
  );
}
