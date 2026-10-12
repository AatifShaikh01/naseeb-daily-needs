"use client";

import { useEffect } from "react";

/** PWA service worker ko production build me register karta hai. */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (
      process.env.NODE_ENV !== "production" ||
      typeof window === "undefined" ||
      !("serviceWorker" in navigator)
    ) {
      return;
    }

    navigator.serviceWorker.register("/sw.js").catch(() => {
      // SW optional hai — installability ke liye best-effort.
    });
  }, []);

  return null;
}
