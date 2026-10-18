"use client";

import { useState } from "react";
import { QrCode } from "@/components/qr-code";

// A QR code plus copy / share buttons for a link.
export function ShareLink({
  url,
  title,
  text,
  qrLabel,
}: {
  url: string;
  title: string;
  text: string;
  qrLabel: string;
}) {
  const [copied, setCopied] = useState(false);
  const canShare = typeof navigator !== "undefined" && "share" in navigator;

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt("Copy this link:", url);
    }
  }

  return (
    <div className="space-y-4">
      <QrCode value={url} label={qrLabel} />
      <p className="break-all text-center text-xs text-stone-500">{url}</p>
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={copy}
          className="rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-navy ring-1 ring-stone-300 hover:bg-stone-50"
        >
          {copied ? "Copied" : "Copy link"}
        </button>
        <button
          type="button"
          onClick={() =>
            canShare
              ? navigator.share({ title, text, url }).catch(() => {})
              : copy()
          }
          className="rounded-xl bg-pink px-4 py-2.5 text-sm font-semibold text-navy hover:bg-pink-strong"
        >
          Send link…
        </button>
      </div>
    </div>
  );
}
