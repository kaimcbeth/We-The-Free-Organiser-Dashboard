import Link from "next/link";

// "Chats" (was Organiser chats) beside Add an action / Plan RSL actions (0231), with how
// many organisers are waiting on a reply.
export function OrganiserChatsLink({ waiting }: { waiting: number }) {
  return (
    <Link
      href="/chats"
      className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-navy ring-1 ring-stone-300 hover:bg-stone-50"
    >
      Chats
      {waiting > 0 && (
        <span className="rounded-full bg-pink px-1.5 text-xs font-bold text-navy">
          {waiting}
        </span>
      )}
    </Link>
  );
}
