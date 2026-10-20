"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { inputClass } from "@/components/form";

// Log in with an emailed 6-digit code (the email also has a link as a backup).
// `next` is where to go once signed in.
export function EmailCodeLogin({
  next,
  buttonLabel = "Email me a code",
}: {
  next: string;
  buttonLabel?: string;
}) {
  const router = useRouter();
  const [step, setStep] = useState<"email" | "code">("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [google, setGoogle] = useState(false);

  // Show "Continue with Google" only once Google sign-in is switched on in Supabase.
  useEffect(() => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    if (!url || !key) return;
    fetch(`${url}/auth/v1/settings`, { headers: { apikey: key } })
      .then((r) => (r.ok ? r.json() : null))
      .then((s) => setGoogle(!!s?.external?.google))
      .catch(() => {});
  }, []);

  async function signInWithGoogle() {
    setBusy(true);
    setError("");
    document.cookie = `after_login=${encodeURIComponent(next)}; path=/; max-age=3600; samesite=lax`;
    const { error } = await createClient().auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/confirm` },
    });
    if (error) {
      setBusy(false);
      setError("Couldn't open Google sign-in. Try the email code instead.");
    }
  }

  async function sendCode(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    // Remember where to go if they use the link instead of the code.
    document.cookie = `after_login=${encodeURIComponent(next)}; path=/; max-age=3600; samesite=lax`;
    const { error } = await createClient().auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: `${window.location.origin}/auth/confirm` },
    });
    setBusy(false);
    if (error) {
      setError(
        error.status === 429
          ? "Too many attempts. Please wait a minute and try again."
          : "Couldn't send the email. Check the address and try again.",
      );
    } else {
      setStep("code");
    }
  }

  async function verify(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const { error } = await createClient().auth.verifyOtp({
      email: email.trim(),
      token: code.replace(/\s/g, ""),
      type: "email",
    });
    if (error) {
      setBusy(false);
      setError("That code didn't work. Check it, or send a new one.");
      return;
    }
    router.replace(next);
    router.refresh();
  }

  if (step === "code") {
    return (
      <form onSubmit={verify} className="space-y-3">
        <p className="text-sm text-stone-600">
          We emailed a code to{" "}
          <span className="font-medium text-stone-900">{email}</span>. Enter it
          below, or tap the link in the email.
        </p>
        <label
          htmlFor="code"
          className="block text-sm font-medium text-stone-700"
        >
          Code
        </label>
        <input
          id="code"
          required
          autoFocus
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="[0-9 ]*"
          maxLength={12}
          value={code}
          onChange={(e) => setCode(e.target.value)}
          className={`${inputClass} text-center text-2xl font-semibold tracking-[0.3em]`}
          placeholder="••••••"
        />
        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-xl bg-pink px-4 py-3 text-base font-semibold text-navy hover:bg-pink-strong disabled:opacity-60"
        >
          {busy ? "Checking…" : "Log in"}
        </button>
        {error && <p className="text-sm text-red-700">{error}</p>}
        <button
          type="button"
          onClick={() => {
            setStep("email");
            setCode("");
            setError("");
          }}
          className="text-sm font-medium text-pink-ink"
        >
          Use a different email or send a new code
        </button>
      </form>
    );
  }

  return (
    <form onSubmit={sendCode} className="space-y-3">
      {google && (
        <>
          <button
            type="button"
            onClick={signInWithGoogle}
            disabled={busy}
            className="flex w-full items-center justify-center gap-3 rounded-xl bg-white px-4 py-3 text-base font-semibold text-navy ring-1 ring-stone-300 hover:bg-stone-50 disabled:opacity-60"
          >
            <svg viewBox="0 0 48 48" className="h-5 w-5" aria-hidden>
              <path
                fill="#FFC107"
                d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"
              />
              <path
                fill="#FF3D00"
                d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"
              />
              <path
                fill="#4CAF50"
                d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.3 0-9.7-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"
              />
              <path
                fill="#1976D2"
                d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C36.9 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"
              />
            </svg>
            Continue with Google
          </button>
          <div className="flex items-center gap-3 py-1 text-xs uppercase tracking-wide text-stone-400">
            <span className="h-px flex-1 bg-stone-300" />
            or use your email
            <span className="h-px flex-1 bg-stone-300" />
          </div>
        </>
      )}
      <label
        htmlFor="email"
        className="block text-sm font-medium text-stone-700"
      >
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
        className={inputClass}
        placeholder="you@example.com"
      />
      <button
        type="submit"
        disabled={busy}
        className="w-full rounded-xl bg-pink px-4 py-3 text-base font-semibold text-navy hover:bg-pink-strong disabled:opacity-60"
      >
        {busy ? "Sending…" : buttonLabel}
      </button>
      {error && <p className="text-sm text-red-700">{error}</p>}
      <p className="pt-1 text-sm text-stone-500">
        No password needed. We&apos;ll email you a login code.
      </p>
    </form>
  );
}
