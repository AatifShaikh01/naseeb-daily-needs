import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { Toaster } from "sonner";
import type { ReactNode } from "react";

import { ServiceWorkerRegister } from "@/components/pwa/service-worker-register";
import { APP_NAME } from "@/lib/navigation";

import "./globals.css";
import { SplashScreen } from "@/components/splash-screen";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: APP_NAME,
    template: "%s · NASEEB",
  },
  description:
    "Stock, sales aur pending payment tracking for NASEEB DAILY NEEDS AND AGENCIES.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "NASEEB",
    statusBarStyle: "default",
  },
  icons: {
    icon: [
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: "/icon-180.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#0F766E",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-full">
        <SplashScreen />
        {children}
        <ServiceWorkerRegister />
        <Toaster richColors position="top-center" />
      </body>
    </html>
  );
}
