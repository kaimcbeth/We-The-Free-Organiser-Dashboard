import { messengerLink } from "@/lib/messenger";

// Opens a Messenger chat with someone (from their Facebook profile link).
export function MessengerButton({
  facebookUrl,
  small = false,
}: {
  facebookUrl: string | null | undefined;
  small?: boolean;
}) {
  const href = messengerLink(facebookUrl);
  if (!href) return null;
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex items-center rounded-md bg-[#0866FF] font-semibold text-white hover:brightness-110 ${small ? "px-2 py-0.5 text-xs" : "rounded-xl px-3 py-1.5 text-sm"}`}
    >
      Messenger ↗
    </a>
  );
}
