"use client";

import { useEffect, useState } from "react";
import { Download } from "lucide-react";

import { Button } from "@/components/ui/button";

type BIPEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

/** PWA install button — Chrome/Edge me beforeinstallprompt pakadta hai,
 *  iOS Safari me manual steps dikhata hai. Installed hone par chhup jata hai. */
export function PwaInstallButton() {
  const [deferred, setDeferred] = useState<BIPEvent | null>(null);
  const [installed, setInstalled] = useState(
    () => typeof window !== "undefined" && window.matchMedia("(display-mode: standalone)").matches,
  );
  const [isIos] = useState(
    () =>
      typeof window !== "undefined" &&
      /iphone|ipad|ipod/i.test(window.navigator.userAgent) &&
      !(window as unknown as { MSStream?: unknown }).MSStream,
  );
  const [showIosHelp, setShowIosHelp] = useState(false);

  useEffect(() => {
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BIPEvent);
    };
    const onInstalled = () => {
      setInstalled(true);
      setDeferred(null);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (installed) return null;

  // Android/desktop Chrome: native install prompt
  if (deferred) {
    return (
      <Button
        size="sm"
        onClick={async () => {
          await deferred.prompt();
          const { outcome } = await deferred.userChoice;
          if (outcome === "accepted") setDeferred(null);
        }}
      >
        <Download className="mr-2 h-4 w-4" />
        App Install Karo
      </Button>
    );
  }

  // iOS Safari: manual steps
  if (isIos) {
    return (
      <div>
        <Button size="sm" variant="outline" onClick={() => setShowIosHelp((v) => !v)}>
          <Download className="mr-2 h-4 w-4" />
          App Install Karo
        </Button>
        {showIosHelp ? (
          <p className="mt-2 text-xs text-muted-foreground">
            Safari me neeche <b>Share</b> dabao → <b>&ldquo;Add to Home Screen&rdquo;</b> → <b>Add</b>.
          </p>
        ) : null}
      </div>
    );
  }

  return null;
}
