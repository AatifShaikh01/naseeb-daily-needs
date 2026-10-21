"use client";

import { useEffect, useRef, useState } from "react";

export function SplashScreen() {
  const [show, setShow] = useState(true);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // Cleanup timeout on unmount
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const handleLoadStart = () => {
    // If video hasn't ended within 3 seconds, hide
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      setShow(false);
    }, 3000);
  };

  const handleEnded = () => {
    setShow(false);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
  };

  const handleError = () => {
    setShow(false);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
  };

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0f766e] overflow-hidden">
      <video
        id="naseeb-splash-video"
        className="max-h-full max-w-full object-contain"
        autoPlay
        muted
        playsInline
        loop={false}
        preload="auto"
        poster="/icon-192.png"
        onLoadStart={handleLoadStart}
        onEnded={handleEnded}
        onError={handleError}
      />
    </div>
  );
}