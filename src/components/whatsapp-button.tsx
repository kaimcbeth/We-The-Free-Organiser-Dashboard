import { waLink } from "@/lib/whatsapp-link";

// Opens a WhatsApp chat with someone from their phone number. tz is the
// community's time zone, used to add the country code to local numbers.
export function WhatsAppButton({
  phone,
  tz,
  small = false,
}: {
  phone: string | null | undefined;
  tz: string;
  small?: boolean;
}) {
  const href = waLink(phone ?? null, tz);
  if (!href) return null;
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex items-center bg-[#25D366] font-semibold text-navy hover:brightness-95 ${small ? "rounded-md px-2 py-0.5 text-xs" : "rounded-xl px-3 py-1.5 text-sm"}`}
    >
      WhatsApp ↗
    </a>
  );
}
