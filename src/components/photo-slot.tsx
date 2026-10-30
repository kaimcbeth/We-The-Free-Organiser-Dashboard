"use client";

import { useEffect, useRef, useState } from "react";

// A small photo square (equipment guide items, gear). Whoever may change it
// gets onUpload: tap to choose a file, right-click for Paste photo, or hover and
// press Ctrl+V / Cmd+V. Everyone else just sees it (or nothing).
// Double-click (double-tap) shows the photo large, for everyone.
export function PhotoSlot({
  photo,
  alt,
  href,
  onUpload,
}: {
  photo: string | null;
  alt: string;
  href?: string; // tapping the photo opens this (when they can't change it)
  onUpload?: (file: File) => Promise<boolean>;
}) {
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState(""); // error, shown on the square
  const [menu, setMenu] = useState<{ x: number; y: number } | null>(null);
  const [hover, setHover] = useState(false);
  const [big, setBig] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const menuBox = useRef<HTMLDivElement>(null);
  // A single click waits a moment, so a double-click doesn't also do it.
  const clickTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const single = (fn: () => void) => {
    if (clickTimer.current) clearTimeout(clickTimer.current);
    clickTimer.current = setTimeout(fn, 250);
  };
  const double = () => {
    if (clickTimer.current) clearTimeout(clickTimer.current);
    if (photo) setBig(true);
  };

  // The large view closes on Escape.
  useEffect(() => {
    if (!big) return;
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setBig(false);
    document.addEventListener("keydown", esc);
    return () => document.removeEventListener("keydown", esc);
  }, [big]);

  async function send(file: File) {
    if (!onUpload) return;
    setNote("");
    setBusy(true);
    const ok = await onUpload(file);
    setBusy(false);
    if (!ok) setNote("Didn't work, try again");
  }

  // Ctrl+V / Cmd+V while the pointer is over the square.
  useEffect(() => {
    if (!hover || !onUpload) return;
    const paste = (e: ClipboardEvent) => {
      const f = [...(e.clipboardData?.files ?? [])].find((x) =>
        x.type.startsWith("image/"),
      );
      if (!f) return;
      e.preventDefault();
      send(f);
    };
    window.addEventListener("paste", paste);
    return () => window.removeEventListener("paste", paste);
  });

  // The right-click menu closes on a tap elsewhere or Escape.
  useEffect(() => {
    if (!menu) return;
    const away = (e: PointerEvent) => {
      if (!menuBox.current?.contains(e.target as Node)) setMenu(null);
    };
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setMenu(null);
    document.addEventListener("pointerdown", away);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("pointerdown", away);
      document.removeEventListener("keydown", esc);
    };
  }, [menu]);

  async function pasteFromMenu() {
    setMenu(null);
    try {
      for (const item of await navigator.clipboard.read()) {
        const type = item.types.find((t) => t.startsWith("image/"));
        if (type) {
          const blob = await item.getType(type);
          return send(new File([blob], "pasted", { type }));
        }
      }
      setNote("No photo copied");
    } catch {
      setNote("Use Ctrl+V / ⌘V");
    }
  }

  const box =
    "relative flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white ring-1 ring-black/10";
  // eslint-disable-next-line @next/next/no-img-element -- product photo
  const img = photo && (
    <img src={photo} alt={alt} className="h-full w-full object-contain" />
  );
  const large = big && photo && (
    <div
      role="dialog"
      aria-label={alt}
      onClick={() => setBig(false)}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-6"
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- product photo */}
      <img
        src={photo}
        alt={alt}
        className="max-h-[85vh] max-w-[90vw] rounded-2xl bg-white object-contain p-4 shadow-xl"
      />
      <button
        type="button"
        aria-label="Close"
        className="absolute right-4 top-4 rounded-full bg-white/90 px-3 py-1 text-lg text-navy"
      >
        ×
      </button>
    </div>
  );
  if (!onUpload)
    return photo ? (
      <>
        {href ? (
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => {
              e.preventDefault();
              single(() => window.open(href, "_blank", "noopener,noreferrer"));
            }}
            onDoubleClick={double}
            className={box}
          >
            {img}
          </a>
        ) : (
          <span onDoubleClick={double} className={`${box} cursor-zoom-in`}>
            {img}
          </span>
        )}
        {large}
      </>
    ) : null;
  const menuItem =
    "block w-full rounded-lg px-3 py-1.5 text-left text-sm hover:bg-stone-100";
  return (
    <>
      <button
        type="button"
        onClick={() => single(() => input.current?.click())}
        onDoubleClick={double}
        onContextMenu={(e) => {
          e.preventDefault();
          setMenu({ x: e.clientX, y: e.clientY });
        }}
        onPointerEnter={() => setHover(true)}
        onPointerLeave={() => setHover(false)}
        className={`${box} ${photo ? "" : "border border-dashed border-stone-300 ring-0"}`}
        title={`${photo ? "Change photo: click to choose a file, right-click to paste, double-click to see it large" : "Add photo: click to choose a file, right-click to paste"}`}
      >
        <input
          ref={input}
          type="file"
          accept="image/*"
          hidden
          onChange={(e) => {
            const f = e.target.files?.[0];
            e.target.value = "";
            if (f) send(f);
          }}
        />
        {img}
        {(!photo || busy || note) && (
          <span
            className={`absolute inset-0 flex items-center justify-center px-1 text-center text-[10px] font-semibold ${photo ? "bg-white/80" : ""} ${note ? "text-red-700" : "text-stone-500"}`}
          >
            {busy ? "Uploading…" : note || "Add photo"}
          </span>
        )}
      </button>
      {large}
      {menu && (
        <div
          ref={menuBox}
          role="menu"
          className="fixed z-50 w-40 rounded-xl bg-white p-1 shadow-lg ring-1 ring-black/10"
          style={{ left: menu.x, top: menu.y }}
        >
          <button
            type="button"
            role="menuitem"
            onClick={pasteFromMenu}
            className={menuItem}
          >
            Paste photo
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setMenu(null);
              input.current?.click();
            }}
            className={menuItem}
          >
            Choose file…
          </button>
        </div>
      )}
    </>
  );
}
