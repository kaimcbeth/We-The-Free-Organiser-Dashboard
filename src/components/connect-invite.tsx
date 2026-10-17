"use client";

import { useEffect, useState } from "react";
import { createInvite } from "@/app/actions";
import { ShareLink } from "@/components/share-link";

// Fetches (or makes) a personal connect link for one person and shows it as a QR + link.
export function ConnectInvite({ personId, firstName }: { personId: string; firstName: string }) {
  const [token, setToken] = useState<string | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    createInvite(personId).then((r) => {
      if (cancelled) return;
      if (r.token) setToken(r.token);
      else setError(r.error ?? "Couldn't create an invite.");
    });
    return () => {
      cancelled = true;
    };
  }, [personId]);

  if (error) return <p className="text-sm text-red-700">{error}</p>;
  if (!token) return <p className="py-16 text-center text-sm text-stone-500">Making {firstName}&apos;s QR code…</p>;

  const url = `${window.location.origin}/invite/${token}`;
  return (
    <div>
      <p className="mb-4 text-sm text-stone-600">
        Ask {firstName} to scan this with their phone camera. It connects their account to their name here, so
        their events come with them. Works once, for 30 days.
      </p>
      <ShareLink
        url={url}
        title="Connect to We The Free"
        text={`Hi ${firstName}! Here's your link to connect your We The Free account:`}
        qrLabel={`Connect QR code for ${firstName}`}
      />
    </div>
  );
}
