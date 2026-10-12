"use client";

import { useState } from "react";
import { MessageCircle, Send } from "lucide-react";

import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

/** Phone ko wa.me ke liye normalize karo: digits, leading 0/+91 hatao, 91 prefix lagao. */
export function normalizeWaPhone(raw: string | null | undefined): string {
  let d = (raw ?? "").replace(/\D/g, "");
  if (d.startsWith("0")) d = d.slice(1);
  if (d.length > 10 && d.startsWith("91")) d = d.slice(2);
  if (d.length === 10) d = "91" + d;
  return d;
}

/**
 * WhatsApp reminder preview modal.
 * - Open WhatsApp → wa.me/?text= (contact khud choose kare; mobile pe navigator.share)
 * - Send Directly → wa.me/91<phone>?text= (agar phone ho)
 */
export function WhatsAppDialog({
  open,
  onClose,
  defaultMessage,
  phone,
}: {
  open: boolean;
  onClose: () => void;
  defaultMessage: string;
  phone: string | null;
}) {
  const [message, setMessage] = useState(defaultMessage);

  const waPhone = normalizeWaPhone(phone);

  const openGeneric = () => {
    const url = `https://wa.me/?text=${encodeURIComponent(message)}`;
    if (typeof navigator !== "undefined" && navigator.share) {
      navigator.share({ text: message }).catch(() => window.open(url, "_blank"));
    } else {
      window.open(url, "_blank");
    }
  };

  const openDirect = () => {
    const url = `https://wa.me/${waPhone}?text=${encodeURIComponent(message)}`;
    window.open(url, "_blank");
  };

  return (
    <Dialog open={open} onClose={onClose} title="WhatsApp Reminder">
      <div className="space-y-4">
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={9}
          className="w-full rounded-xl border border-border bg-background p-3 text-sm outline-none transition-colors focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring"
          placeholder="Reminder message..."
        />

        <div className="space-y-2">
          <Button type="button" className="w-full" onClick={openGeneric} disabled={!message.trim()}>
            <MessageCircle /> Open WhatsApp
          </Button>
          {phone && waPhone.length >= 12 ? (
            <Button type="button" variant="outline" className="w-full" onClick={openDirect} disabled={!message.trim()}>
              <Send /> Send Directly to {waPhone}
            </Button>
          ) : null}
        </div>
      </div>
    </Dialog>
  );
}
