"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

// "Is this laptop OK?" in the viewing devices purchasing guide (Kai, 17 Nov
// 2026): paste a listing link, add a screenshot or type a model, and the
// laptop-check Edge Function (Claude + web search) checks Kai's three rules:
// A$150 or under, posts from within the country, 3+ hours of battery.

type Result = {
  device: string;
  verdict: "good" | "not_good" | "check";
  summary: string;
  checks: {
    rule: "price" | "postage" | "battery";
    result: "pass" | "fail" | "unknown";
    detail: string;
  }[];
  notes: string[];
  country: string;
};

const RULE_LABEL = (country: string) => ({
  price: country === "Australia" ? "A$150 or under" : "About A$150 or under",
  postage: `Posts from within ${country}`,
  battery: "Battery lasts 3+ hours",
});

const VERDICT = {
  good: {
    label: "Good for the Movie Challenge",
    cls: "bg-green-50 text-green-900 ring-green-300",
    dot: "bg-green-500",
  },
  check: {
    label: "Looks OK, but check a few things",
    cls: "bg-yellow-50 text-yellow-900 ring-yellow-300",
    dot: "bg-yellow-400",
  },
  not_good: {
    label: "Not a good fit",
    cls: "bg-orange-50 text-orange-900 ring-orange-300",
    dot: "bg-orange-500",
  },
};

// Shrinks a screenshot to at most 1600 px and returns base64 JPEG.
async function shrink(
  file: File,
): Promise<{ data: string; media_type: string }> {
  const img = await createImageBitmap(file);
  const scale = Math.min(1, 1600 / Math.max(img.width, img.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(img.width * scale);
  canvas.height = Math.round(img.height * scale);
  canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
  const url = canvas.toDataURL("image/jpeg", 0.85);
  return { data: url.split(",")[1], media_type: "image/jpeg" };
}

export function LaptopChecker() {
  const [text, setText] = useState("");
  const [shot, setShot] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<Result | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  // Paste a screenshot anywhere while the guide is open (Kai, 17 Nov 2026:
  // "let me just paste in screenshot").
  useEffect(() => {
    function onPaste(e: ClipboardEvent) {
      const file = [...(e.clipboardData?.files ?? [])].find((f) =>
        f.type.startsWith("image/"),
      );
      if (!file) return;
      e.preventDefault();
      addShot(file);
      if (!busy) check(file); // pasting starts the check straight away
    }
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  });

  function addShot(file: File | null | undefined) {
    if (!file || !file.type.startsWith("image/")) return;
    if (preview) URL.revokeObjectURL(preview);
    setShot(file);
    setPreview(URL.createObjectURL(file));
  }
  function clearShot() {
    if (preview) URL.revokeObjectURL(preview);
    setShot(null);
    setPreview(null);
    if (fileInput.current) fileInput.current.value = "";
  }

  async function check(pasted?: File) {
    const t = text.trim();
    const file = pasted ?? shot;
    if (!t && !file)
      return setError("Add a link, a screenshot or a model name.");
    setError("");
    setResult(null);
    setBusy(true);
    const isLink = /^https?:\/\//i.test(t);
    let image: { data: string; media_type: string } | undefined;
    try {
      if (file) image = await shrink(file);
    } catch {
      setBusy(false);
      return setError("Couldn't read that screenshot. Try another one.");
    }
    const { data, error: e } = await createClient().functions.invoke(
      "laptop-check",
      {
        body: {
          link: isLink ? t : undefined,
          model: isLink ? undefined : t || undefined,
          image,
        },
      },
    );
    setBusy(false);
    let msg = data?.error as string | undefined;
    if (!msg && e && "context" in e) {
      try {
        msg = (await (e.context as Response).json()).error;
      } catch {}
    }
    if (e || msg || !data)
      return setError(msg ?? "Couldn't check that right now. Try again.");
    setResult(data as Result);
  }

  const labels = result ? RULE_LABEL(result.country) : null;

  return (
    <div className="mb-3 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5">
      <p className="font-semibold text-navy">Is this laptop OK?</p>
      <p className="mt-0.5 text-sm text-stone-600">
        Paste a screenshot of the listing, a link to it, or type the model.
        We&apos;ll check it&apos;s A$150 or under, posts from within the country
        and has a battery that lasts at least 3 hours.
      </p>
      <form
        className="mt-3 space-y-2"
        onSubmit={(e) => {
          e.preventDefault();
          check();
        }}
      >
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Link, or a model like Lenovo ThinkPad T480"
          aria-label="Link to the listing or the laptop model"
          className="w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-sm"
        />
        <div className="flex flex-wrap items-center gap-2">
          {preview ? (
            <span className="flex items-center gap-2 text-sm text-stone-600">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={preview}
                alt="Your screenshot"
                className="h-10 w-10 rounded-lg object-cover ring-1 ring-black/10"
              />
              Screenshot added
              <button
                type="button"
                onClick={clearShot}
                className="text-xs text-stone-500 hover:text-navy hover:underline"
              >
                Remove
              </button>
            </span>
          ) : (
            <button
              type="button"
              onClick={() => fileInput.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                addShot(e.dataTransfer.files?.[0]);
              }}
              className="rounded-xl border-2 border-dashed border-stone-300 px-3 py-2 text-left text-sm text-stone-600 hover:border-navy hover:text-navy"
            >
              <span className="font-medium">Paste a screenshot</span>
              <span className="block text-xs text-stone-500">
                Ctrl+V or ⌘V anywhere here and it checks it straight away. Or
                drop it in, or tap to choose one
              </span>
            </button>
          )}
          <input
            ref={fileInput}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => addShot(e.target.files?.[0])}
          />
          <button
            type="submit"
            disabled={busy}
            className="ml-auto rounded-full bg-navy px-4 py-1.5 text-sm font-semibold text-white disabled:opacity-60"
          >
            {busy ? "Checking…" : "Check it"}
          </button>
        </div>
      </form>
      {busy && (
        <p className="mt-2 text-xs text-stone-500">
          Looking it up. This can take up to a minute.
        </p>
      )}
      {error && <p className="mt-2 text-sm text-red-700">{error}</p>}

      {result && labels && (
        <div className="mt-3 space-y-2">
          <div
            className={`rounded-xl px-3 py-2 ring-1 ${VERDICT[result.verdict].cls}`}
          >
            <p className="flex items-center gap-2 text-sm font-semibold">
              <span
                aria-hidden
                className={`h-3 w-3 shrink-0 rounded-full ${VERDICT[result.verdict].dot}`}
              />
              {VERDICT[result.verdict].label}
            </p>
            <p className="text-sm">{result.device}</p>
          </div>
          {result.summary && (
            <p className="text-sm text-stone-700">{result.summary}</p>
          )}
          <ul className="space-y-1.5">
            {result.checks.map((c) => (
              <li key={c.rule} className="flex gap-2 text-sm">
                <span
                  aria-label={c.result}
                  className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                    c.result === "pass"
                      ? "bg-green-500 text-white"
                      : c.result === "fail"
                        ? "bg-orange-500 text-white"
                        : "bg-yellow-400 text-yellow-950"
                  }`}
                >
                  {c.result === "pass" ? "✓" : c.result === "fail" ? "✕" : "?"}
                </span>
                <span>
                  <span className="font-medium text-navy">
                    {labels[c.rule]}
                  </span>
                  {c.detail && (
                    <span className="text-stone-600"> · {c.detail}</span>
                  )}
                </span>
              </li>
            ))}
          </ul>
          {result.notes.length > 0 && (
            <p className="pt-1 text-xs font-semibold text-stone-500">
              Also worth knowing
            </p>
          )}
          {result.notes.length > 0 && (
            <ul className="list-disc space-y-0.5 pl-5 text-sm text-stone-600">
              {result.notes.map((n) => (
                <li key={n}>{n}</li>
              ))}
            </ul>
          )}
          <p className="text-xs text-stone-400">
            Checked with a web search, so double-check the price and battery
            with the seller before you buy.
          </p>
        </div>
      )}
    </div>
  );
}
