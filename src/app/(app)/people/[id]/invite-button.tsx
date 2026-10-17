"use client";

import { useState } from "react";
import { Sheet } from "@/components/sheet";
import { ConnectInvite } from "@/components/connect-invite";

export function InviteButton({ personId, firstName }: { personId: string; firstName: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="shrink-0 rounded-xl bg-pink px-3.5 py-2 text-sm font-semibold text-navy hover:bg-pink-strong"
      >
        Connect QR
      </button>
      {open && (
        <Sheet title={`Connect ${firstName}`} onClose={() => setOpen(false)}>
          <ConnectInvite personId={personId} firstName={firstName} />
        </Sheet>
      )}
    </>
  );
}
