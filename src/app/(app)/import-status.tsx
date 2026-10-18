"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

// "Synced from activism.wtf 2 hrs ago · Import now", with a warning if the import is failing.
export function ImportStatus({ text, warning }: { text: string; warning: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");

  async function importNow() {
    setBusy(true);
    setNote("");
    const { data, error } = await createClient().functions.invoke("import-events");
    setBusy(false);
    if (error) {
      setNote("Import didn't work. Try again in a minute.");
    } else if (data?.skipped) {
      setNote("Already checked a moment ago.");
    } else {
      const r = data?.results?.[0];
      if (r && !r.ok) setNote(`Import failed: ${r.message}`);
      else if (r) setNote(r.added || r.updated ? `${r.added} new, ${r.updated} updated.` : "Everything's up to date.");
    }
    router.refresh();
  }

  return (
    <div
      className={`flex items-center justify-between gap-3 rounded-xl px-3.5 py-2.5 text-sm ${
        warning ? "bg-yellow/30 ring-1 ring-yellow" : "bg-white ring-1 ring-black/5"
      }`}
    >
      <p className="min-w-0 text-stone-600">
        <span className={warning ? "font-semibold text-navy" : ""}>{text}</span>
        {note && <span className="block text-navy">{note}</span>}
      </p>
      <button
        onClick={importNow}
        disabled={busy}
        className="shrink-0 rounded-lg px-2.5 py-1.5 font-semibold text-pink-ink hover:bg-pink/10 disabled:opacity-60"
      >
        {busy ? "Checking…" : "Import now"}
      </button>
    </div>
  );
}
