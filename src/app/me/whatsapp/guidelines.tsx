import { WhatsAppAgree } from "@/components/whatsapp";

// Join the WhatsApp community (Kai, 4 Nov 2026): opened from "Join WhatsApp"
// in the members' top bar. A basic code of conduct for the chats (from the
// WTF Code of Conduct v1.0, sections 3 and 5), then "I agree, join the group".
const RULES: { title: string; text: string }[] = [
  {
    title: "Be kind and respectful",
    text: "No bullying, harassment, threats or discrimination, towards anyone in the group or outside it.",
  },
  {
    title: "Use the right chat",
    text: "Our community has a few smaller chats (events, photos, food and more). Post where it fits, so nobody gets flooded.",
  },
  {
    title: "Keep people's details private",
    text: "Don't share anyone's phone number, photos of them or screenshots of the chat without their OK.",
  },
  {
    title: "Only share what's true",
    text: "Check news, studies and footage before you pass them on.",
  },
  {
    title: "Focus on what unites us",
    text: "Steer clear of divisive topics outside animal rights, like vaccines or family planning. They pull people apart and push some out.",
  },
  {
    title: "No unwanted advances",
    text: "No unwanted or sexual comments or messages, in the group or in private messages to members.",
  },
  {
    title: "Warn before graphic footage",
    text: "Add a content warning before posting anything graphic, and never share it where under 15s could see it.",
  },
  {
    title: "No selling or spam",
    text: "Ask an organiser before promoting a business, fundraiser or another group.",
  },
];

export function WhatsAppGuidelines({
  community,
  url,
}: {
  community: string;
  url: string | null;
}) {
  return (
    <>
      <h1 className="text-2xl font-semibold tracking-tight text-navy">
        Join our WhatsApp community
      </h1>
      <p className="mt-2 text-stone-600">
        Most of the chat for We The Free{community ? ` ${community}` : ""}{" "}
        happens on WhatsApp: event updates, photos, food, and getting to know
        everyone. Before you join, here&apos;s how we look after each other in
        there.
      </p>

      <section className="mt-6 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-black/5">
        <h2 className="font-semibold text-navy">Community guidelines</h2>
        <ol className="mt-3 space-y-3">
          {RULES.map((r, i) => (
            <li key={r.title} className="flex gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-cyan text-xs font-bold text-navy">
                {i + 1}
              </span>
              <span className="text-sm text-stone-700">
                <span className="font-semibold text-navy">{r.title}.</span>{" "}
                {r.text}
              </span>
            </li>
          ))}
        </ol>
        <p className="mt-4 border-t border-stone-100 pt-3 text-sm text-stone-500">
          Something not right? Message an organiser privately. Organisers may
          remove anyone who doesn&apos;t follow these guidelines.
        </p>
      </section>

      {url ? (
        <WhatsAppAgree url={url} />
      ) : (
        <p className="mt-6 rounded-2xl border border-dashed border-stone-300 px-4 py-5 text-center text-sm text-stone-500">
          Your community hasn&apos;t added its WhatsApp link yet. Ask an
          organiser.
        </p>
      )}
    </>
  );
}
