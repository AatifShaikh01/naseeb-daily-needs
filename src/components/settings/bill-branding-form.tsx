"use client";

import Image from "next/image";
import { useState } from "react";
import { useActionState } from "react";
import { Loader2, Save, Trash2, Upload } from "lucide-react";

import { BillBrandingPreview } from "@/components/settings/bill-branding-preview";
import { Button } from "@/components/ui/button";
import { BILL_TEMPLATES, type BillBranding } from "@/lib/bill-branding";
import { updateBillBrandingAction } from "@/lib/actions/bill-branding";

export function BillBrandingForm({ branding }: { branding: BillBranding }) {
  const [state, formAction, pending] = useActionState(updateBillBrandingAction, null);
  const [draft, setDraft] = useState(branding);
  const [logoError, setLogoError] = useState("");
  const [compressing, setCompressing] = useState(false);
  const updateField = <K extends keyof BillBranding>(key: K, value: BillBranding[K]) => {
    setDraft((current) => ({ ...current, [key]: value }));
  };

  const handleLogoChange = async (file?: File) => {
    setLogoError("");
    if (!file) return;
    if (!["image/png", "image/jpeg"].includes(file.type) || file.size > 4 * 1024 * 1024) {
      setLogoError("Choose a JPG or PNG logo smaller than 4 MB.");
      return;
    }

    setCompressing(true);
    try {
      const objectUrl = URL.createObjectURL(file);
      try {
        const image = new window.Image();
        await new Promise<void>((resolve, reject) => {
          image.onload = () => resolve();
          image.onerror = () => reject(new Error("Could not read the selected logo."));
          image.src = objectUrl;
        });

        const scale = Math.min(1, 420 / Math.max(image.naturalWidth, image.naturalHeight));
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
        canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
        const context = canvas.getContext("2d");
        if (!context) throw new Error("Could not prepare the selected logo.");
        context.fillStyle = "#ffffff";
        context.fillRect(0, 0, canvas.width, canvas.height);
        context.drawImage(image, 0, 0, canvas.width, canvas.height);

        const dataUrl = canvas.toDataURL("image/jpeg", 0.82);
        if (dataUrl.length > 700_000) {
          throw new Error("Logo is still too large. Choose a smaller image.");
        }
        updateField("logoDataUrl", dataUrl);
      } finally {
        URL.revokeObjectURL(objectUrl);
      }
    } catch (error) {
      setLogoError(error instanceof Error ? error.message : "Could not prepare the selected logo.");
    } finally {
      setCompressing(false);
    }
  };

  return (
    <form action={formAction} className="space-y-6">
      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(380px,0.9fr)]">
        <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5 sm:col-span-2">
          <label htmlFor="bill-business-name" className="text-sm font-medium">Business name</label>
          <input
            id="bill-business-name"
            name="businessName"
            required
            maxLength={120}
            value={draft.businessName}
            onChange={(event) => updateField("businessName", event.target.value)}
            className="h-10 w-full rounded-xl border border-border bg-background px-3 text-sm"
          />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="bill-business-phone" className="text-sm font-medium">Phone / contact</label>
          <input
            id="bill-business-phone"
            name="businessPhone"
            maxLength={80}
            value={draft.businessPhone}
            onChange={(event) => updateField("businessPhone", event.target.value)}
            className="h-10 w-full rounded-xl border border-border bg-background px-3 text-sm"
          />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="bill-business-gstin" className="text-sm font-medium">GSTIN / tax ID (optional)</label>
          <input
            id="bill-business-gstin"
            name="gstin"
            maxLength={40}
            value={draft.gstin}
            onChange={(event) => updateField("gstin", event.target.value)}
            className="h-10 w-full rounded-xl border border-border bg-background px-3 text-sm"
          />
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <label htmlFor="bill-business-address" className="text-sm font-medium">Business address</label>
          <textarea
            id="bill-business-address"
            name="businessAddress"
            rows={2}
            maxLength={300}
            value={draft.businessAddress}
            onChange={(event) => updateField("businessAddress", event.target.value)}
            className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
          />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="bill-title" className="text-sm font-medium">Bill title</label>
          <input
            id="bill-title"
            name="billTitle"
            required
            maxLength={40}
            value={draft.billTitle}
            onChange={(event) => updateField("billTitle", event.target.value)}
            placeholder="Invoice / Tax Invoice"
            className="h-10 w-full rounded-xl border border-border bg-background px-3 text-sm"
          />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="bill-number-prefix" className="text-sm font-medium">Bill number prefix</label>
          <input
            id="bill-number-prefix"
            name="billNumberPrefix"
            required
            maxLength={12}
            value={draft.billNumberPrefix}
            onChange={(event) => updateField("billNumberPrefix", event.target.value)}
            placeholder="SALE"
            className="h-10 w-full rounded-xl border border-border bg-background px-3 text-sm"
          />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="bill-footer" className="text-sm font-medium">Bill footer / thank-you message</label>
          <input
            id="bill-footer"
            name="footer"
            maxLength={200}
            value={draft.footer}
            onChange={(event) => updateField("footer", event.target.value)}
            className="h-10 w-full rounded-xl border border-border bg-background px-3 text-sm"
          />
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-sm font-medium">Logo</p>
        <div className="flex flex-wrap items-center gap-3">
          {draft.logoDataUrl ? (
            <Image
              src={draft.logoDataUrl}
              alt="Business logo preview"
              width={56}
              height={56}
              unoptimized
              className="h-14 w-14 rounded-lg border border-border object-contain"
            />
          ) : (
            <div className="flex h-14 w-14 items-center justify-center rounded-lg border border-dashed border-border text-xs text-muted-foreground">
              No logo
            </div>
          )}
          <label className="inline-flex h-9 cursor-pointer items-center gap-2 rounded-xl border border-border px-3 text-sm font-medium hover:bg-muted">
            <Upload className="h-4 w-4" />
            {compressing ? "Preparing..." : "Upload JPG / PNG"}
            <input
              type="file"
              accept="image/png,image/jpeg"
              className="sr-only"
              disabled={compressing || pending}
              onChange={(event) => {
                void handleLogoChange(event.target.files?.[0]);
                event.currentTarget.value = "";
              }}
            />
          </label>
          {draft.logoDataUrl ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => updateField("logoDataUrl", "")}
              disabled={pending || compressing}
            >
              <Trash2 className="h-4 w-4" /> Remove logo
            </Button>
          ) : null}
          <input type="hidden" name="logoDataUrl" value={draft.logoDataUrl} />
        </div>
        <p className="text-xs text-muted-foreground">Logo is resized and stored with your bill settings.</p>
      </div>

      <div className="space-y-3">
        <p className="text-sm font-medium">Choose a bill template</p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {BILL_TEMPLATES.map((template) => (
            <label
              key={template.id}
              className={`cursor-pointer rounded-xl border p-3 transition-colors ${
              draft.template === template.id ? "border-primary bg-primary/5" : "border-border hover:bg-muted/50"
              }`}
            >
              <input
                type="radio"
                name="template"
                value={template.id}
              checked={draft.template === template.id}
              onChange={() => updateField("template", template.id)}
              className="sr-only"
              />
              <div
                className={`mb-2 overflow-hidden rounded-md border bg-background p-2 ${
                  template.id === "modern" ? "border-l-4" : ""
                }`}
                style={{ borderColor: template.id === draft.template ? draft.color : undefined }}
              >
                <div className={`mb-2 flex items-center justify-between gap-2 ${template.id === "minimal" ? "flex-col" : ""}`}>
                  <div className={`flex min-w-0 items-center gap-1.5 ${template.id === "minimal" ? "flex-col" : ""}`}>
                    <div className="h-6 w-6 shrink-0 rounded-sm border bg-white" />
                    <div className={template.id === "minimal" ? "text-center" : "min-w-0"}>
                      <div className="h-1.5 w-16 max-w-full rounded bg-muted-foreground/70" />
                      <div className="mt-1 h-1 w-12 max-w-full rounded bg-muted" />
                    </div>
                  </div>
                  <div
                    className="flex h-7 min-w-12 items-center justify-center rounded px-1.5"
                    style={{ backgroundColor: template.id === "split" || template.id === "bold" ? draft.color : `${draft.color}18` }}
                  >
                    <div className="space-y-1">
                      <div className="h-1 w-6 rounded bg-current opacity-50" />
                      <div className="h-1.5 w-8 rounded bg-current opacity-80" />
                    </div>
                  </div>
                </div>
                <div className="mb-1 grid grid-cols-2 gap-1">
                  <div className="h-4 rounded-sm bg-muted/70" />
                  <div className="h-4 rounded-sm bg-muted/70" />
                </div>
                <div className="space-y-1 border-t pt-1.5">
                  <div className="h-1 w-full rounded bg-muted" />
                  <div className="h-1 w-4/5 rounded bg-muted" />
                </div>
              </div>
              <span className="block text-sm font-semibold">{template.name}</span>
              <span className="mt-0.5 block text-xs text-muted-foreground">{template.description}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <label htmlFor="bill-color" className="text-sm font-medium">Bill accent colour</label>
        <input
          id="bill-color"
          name="color"
          type="color"
          value={draft.color}
          onChange={(event) => updateField("color", event.target.value)}
          className="h-10 w-14 cursor-pointer rounded-lg border border-border bg-background p-1"
        />
        <span className="text-sm text-muted-foreground">Used for template accents and PDF styling.</span>
      </div>
        </div>

        <div className="min-w-0 xl:sticky xl:top-4">
          <BillBrandingPreview branding={draft} />
        </div>
      </div>

      {logoError || state?.error ? (
        <p role="alert" className="rounded-xl bg-destructive/10 px-3 py-2 text-sm font-medium text-destructive">
          {logoError || state?.error}
        </p>
      ) : null}
      {state?.ok ? (
        <p role="status" className="rounded-xl bg-primary/10 px-3 py-2 text-sm font-medium text-primary">
          Bill branding saved.
        </p>
      ) : null}

      <Button type="submit" disabled={pending || compressing}>
        {pending || compressing ? <Loader2 className="animate-spin" /> : <Save />}
        Save bill branding
      </Button>
    </form>
  );
}
