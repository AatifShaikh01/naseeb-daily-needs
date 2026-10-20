"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

/** Tab switch par top par patli progress bar — delay me bhi app responsive lage. */
export function RouteProgress() {
  const pathname = usePathname();
  // pathname key se har route par fresh mount — purana timer/state auto-reset
  return <RouteProgressInner key={pathname} />;
}

function RouteProgressInner() {
  const [loading, setLoading] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const a = (e.target as HTMLElement).closest("a[href^='/']");
      if (!a) return;
      if (!a.getAttribute("href")) return;
      // 150ms me page na badle to bar dikhao (instant pages par flicker nahi)
      timer.current = setTimeout(() => setLoading(true), 150);
    };
    document.addEventListener("click", onClick);
    return () => {
      document.removeEventListener("click", onClick);
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  if (!loading) return null;
  return (
    <div className="fixed inset-x-0 top-0 z-50 h-1 bg-transparent" aria-hidden>
      <div className="h-full w-1/3 animate-[routeprogress_0.8s_ease-in-out_infinite rounded-full bg-primary" />
      <style>{`@keyframes routeprogress { 0% { margin-left: -33%; } 100% { margin-left: 100%; } }`}</style>
    </div>
  );
}
