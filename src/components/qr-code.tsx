"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";

// Renders a QR code for `value` in brand navy on white.
export function QrCode({ value, label }: { value: string; label: string }) {
  const [svg, setSvg] = useState("");

  useEffect(() => {
    let cancelled = false;
    QRCode.toString(value, { type: "svg", margin: 1, errorCorrectionLevel: "M", color: { dark: "#071130", light: "#ffffff" } })
      .then((s) => {
        if (!cancelled) setSvg(s);
      })
      .catch(() => setSvg(""));
    return () => {
      cancelled = true;
    };
  }, [value]);

  return (
    <div
      role="img"
      aria-label={label}
      className="mx-auto aspect-square w-full max-w-64 rounded-2xl bg-white p-3 ring-1 ring-black/10 [&>svg]:h-full [&>svg]:w-full"
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
