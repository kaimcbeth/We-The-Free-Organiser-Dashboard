"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [error, setError] = useState("");

  async function sendLink(e: React.FormEvent) {
    e.preventDefault();
    setStatus("sending");
    setError("");
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: `${window.location.origin}/auth/confirm` },
    });
    if (error) {
      setError(error.message);
      setStatus("error");
    } else {
      setStatus("sent");
    }
  }

  return (
    <main className="flex flex-1 items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <p className="text-sm font-semibold uppercase tracking-wide text-pink-ink">We The Free</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">Organiser login</h1>

        {status === "sent" ? (
          <div className="mt-8 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-black/5">
            <p className="font-medium">Check your email</p>
            <p className="mt-1 text-sm text-stone-600">
              We sent a login link to <span className="font-medium text-stone-900">{email}</span>.
              Open it on this device to sign in.
            </p>
            <button
              type="button"
              onClick={() => setStatus("idle")}
              className="mt-4 text-sm font-medium text-pink-ink"
            >
              Use a different email
            </button>
          </div>
        ) : (
          <form onSubmit={sendLink} className="mt-8 space-y-3">
            <label htmlFor="email" className="block text-sm font-medium text-stone-700">
              Email address
            </label>
            <input
              id="email"
              type="email"
              required
              autoComplete="email"
              inputMode="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl border border-stone-300 bg-white px-4 py-3 text-base outline-none focus:border-navy focus:ring-2 focus:ring-pink/40"
              placeholder="you@example.com"
            />
            <button
              type="submit"
              disabled={status === "sending"}
              className="w-full rounded-xl bg-pink px-4 py-3 text-base font-semibold text-navy hover:bg-pink-strong disabled:opacity-60"
            >
              {status === "sending" ? "Sending…" : "Email me a login link"}
            </button>
            {status === "error" && <p className="text-sm text-red-700">{error}</p>}
            <p className="pt-2 text-sm text-stone-500">No password needed. We&apos;ll email you a link.</p>
          </form>
        )}
      </div>
    </main>
  );
}
