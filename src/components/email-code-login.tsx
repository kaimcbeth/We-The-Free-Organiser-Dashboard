"use client";

import { useState } from "react";
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
