"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { TaskDoneBox } from "@/components/task-done-box";
import { ago } from "@/lib/beeper";

// The Organiser chats page: sort Beeper chats into organiser chats and the
// rest, see who's waiting on a reply, read and reply with the community's
// context beside the chat. Replies go into beeper_outbox; the Mac helper
// sends them through Beeper within about 30 seconds (0231).

export type ChatTeam = {
  id: string;
  name: string;
  last: string | null; // "Movie Challenge, Sat 18 Oct · 14 came"
  next: string | null;
  quiet: boolean;
  checkIn: { id: string; dueAt: string } | null; // open "Organisers checked in with"
};

type LinkState = {
  lastSeenAt: string | null;
  beeperOk: boolean | null;
  beeperError: string | null;
} | null;

type Chat = {
  chat_id: string;
  network: string | null;
  title: string;
  chat_type: string | null;
  last_activity: string | null;
  unread: number;
  last_mine_at: string | null;
  last_theirs_at: string | null;
  preview: string | null;
  preview_mine: boolean | null;
  tag: "organiser" | "other" | null;
  team_id: string | null;
};

type Msg = {
  message_id: string;
  sender_name: string | null;
  is_mine: boolean;
  body: string | null;
  has_attachment: boolean;
  sent_at: string;
};

type Out = {
  id: string;
  body: string;
  status: "queued" | "sending" | "sent" | "failed";
  error: string | null;
  created_at: string;
  sent_at: string | null;
};

type Tab = "organiser" | "sort" | "other";

const HELPER_LINE = (code: string) =>
  `curl -fsSL https://wtf-movement-hub.vercel.app/beeper/install.sh | bash -s ${code}`;

const waiting = (c: Chat) =>
  !!c.last_theirs_at && (!c.last_mine_at || c.last_theirs_at > c.last_mine_at);

export function OrganiserChats({
  now: serverNow,
  teams,
  link: initialLink,
  initialChat,
}: {
  now: number;
  teams: ChatTeam[];
  link: LinkState;
  initialChat: string | null;
}) {
  const supabase = useMemo(() => createClient(), []);
  const [now, setNow] = useState(serverNow);
  const [link, setLink] = useState<LinkState>(initialLink);
  const [chats, setChats] = useState<Chat[] | null>(null);
  const [tab, setTab] = useState<Tab>("organiser");
  const [open, setOpen] = useState<string | null>(initialChat);
  const [setup, setSetup] = useState(false);
  const [search, setSearch] = useState("");

  const load = useCallback(async () => {
    const [{ data: rows }, { data: l }] = await Promise.all([
      supabase
        .from("beeper_chats")
        .select(
          "chat_id, network, title, chat_type, last_activity, unread, last_mine_at, last_theirs_at, preview, preview_mine, tag, team_id",
        )
        .order("last_activity", { ascending: false, nullsFirst: false })
        .limit(400),
      supabase
        .from("beeper_links")
        .select("last_seen_at, beeper_ok, beeper_error")
        .maybeSingle(),
    ]);
    setChats((rows ?? []) as Chat[]);
    setLink(
      l
        ? {
            lastSeenAt: l.last_seen_at,
            beeperOk: l.beeper_ok,
            beeperError: l.beeper_error,
          }
        : null,
    );
    setNow(Date.now());
  }, [supabase]);

  useEffect(() => {
    const first = setTimeout(load, 0);
    const t = setInterval(() => {
      if (document.visibilityState === "visible") load();
    }, 15000);
    return () => {
      clearTimeout(first);
      clearInterval(t);
    };
  }, [load]);

  const teamById = useMemo(
    () => Object.fromEntries(teams.map((t) => [t.id, t])),
    [teams],
  );
  const list = chats ?? [];
  const counts = {
    organiser: list.filter((c) => c.tag === "organiser").length,
    sort: list.filter((c) => !c.tag).length,
    other: list.filter((c) => c.tag === "other").length,
  };
  const waitingCount = list.filter(
    (c) => c.tag === "organiser" && waiting(c),
  ).length;
  const q = search.trim().toLowerCase();
  const shown = list
    .filter((c) =>
      tab === "organiser"
        ? c.tag === "organiser"
        : tab === "other"
          ? c.tag === "other"
          : !c.tag,
    )
    .filter(
      (c) =>
        !q ||
        c.title.toLowerCase().includes(q) ||
        (c.team_id && teamById[c.team_id]?.name.toLowerCase().includes(q)),
    )
    .sort((a, b) =>
      tab === "organiser" && waiting(a) !== waiting(b)
        ? waiting(a)
          ? -1
          : 1
        : (b.last_activity ?? "").localeCompare(a.last_activity ?? ""),
    );
  const current = list.find((c) => c.chat_id === open) ?? null;

  async function tag(chat: Chat, t: Chat["tag"], team: string | null) {
    setChats((cs) =>
      (cs ?? []).map((c) =>
        c.chat_id === chat.chat_id ? { ...c, tag: t, team_id: team } : c,
      ),
    );
    await supabase.rpc("beeper_tag_chat", {
      p_chat: chat.chat_id,
      p_tag: t,
      p_team: team,
    });
    load();
  }

  const connected = !!link?.lastSeenAt;
  if (chats && !connected && !setup)
    return (
      <div className="space-y-4">
        <Header />
        <Setup onDone={load} />
      </div>
    );

  return (
    <div className="space-y-4">
      <Header>
        <Status link={link} now={now} onSetup={() => setSetup(!setup)} />
      </Header>
      {setup && <Setup onDone={load} reconnect />}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]">
        <section className={current ? "hidden lg:block" : ""}>
          <div className="flex gap-1 rounded-xl bg-stone-100 p-1 text-sm">
            {(
              [
                ["organiser", "Organisers", counts.organiser],
                ["sort", "To sort", counts.sort],
                ["other", "Others", counts.other],
              ] as [Tab, string, number][]
            ).map(([k, label, n]) => (
              <button
                key={k}
                type="button"
                onClick={() => setTab(k)}
                className={`flex-1 rounded-lg px-2 py-1.5 font-medium whitespace-nowrap ${tab === k ? "bg-white text-navy shadow-sm" : "text-stone-500"}`}
              >
                {label} <span className="text-xs text-stone-400">{n}</span>
              </button>
            ))}
          </div>
          {tab === "organiser" && waitingCount > 0 && (
            <p className="mt-2 text-xs font-medium text-pink-ink">
              {waitingCount} waiting on a reply from you
            </p>
          )}
          {tab === "sort" && counts.sort > 0 && (
            <p className="mt-2 text-xs text-stone-500">
              Mark the chats with organisers. Others only keep their name here,
              never their messages.
            </p>
          )}
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search chats or communities"
            className="mt-2 w-full rounded-xl border border-stone-300 px-3 py-2 text-sm"
          />
          {chats === null ? (
            <p className="mt-4 text-sm text-stone-500">Loading…</p>
          ) : shown.length === 0 ? (
            <p className="mt-4 rounded-2xl border border-dashed border-stone-300 px-4 py-6 text-center text-sm text-stone-500">
              {tab === "organiser"
                ? "No organiser chats yet. Mark them in To sort."
                : tab === "sort"
                  ? "Nothing to sort. New chats show up here."
                  : "No chats marked as not organisers."}
            </p>
          ) : (
            <ul className="mt-2 divide-y divide-stone-100 rounded-2xl bg-white shadow-sm ring-1 ring-black/5">
              {shown.slice(0, 150).map((c) => (
                <ChatRow
                  key={c.chat_id}
                  chat={c}
                  team={c.team_id ? teamById[c.team_id] : undefined}
                  teams={teams}
                  now={now}
                  active={c.chat_id === open}
                  onOpen={() => setOpen(c.chat_id)}
                  onTag={(t, team) => tag(c, t, team)}
                />
              ))}
            </ul>
          )}
        </section>

        <section className={current ? "" : "hidden lg:block"}>
          {current ? (
            <Thread
              key={current.chat_id}
              chat={current}
              team={current.team_id ? teamById[current.team_id] : undefined}
              teams={teams}
              now={now}
              onBack={() => setOpen(null)}
              onTag={(t, team) => tag(current, t, team)}
            />
          ) : (
            <div className="rounded-2xl border border-dashed border-stone-300 px-4 py-16 text-center text-sm text-stone-500">
              Pick an organiser chat to read and reply.
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function Header({ children }: { children?: React.ReactNode }) {
  return (
    <div>
      <Link href="/tasks" className="text-xs text-stone-500 hover:underline">
        ← Actions
      </Link>
      <h1 className="mt-1 text-2xl font-bold">Organiser chats</h1>
      {children}
    </div>
  );
}

function Status({
  link,
  now,
  onSetup,
}: {
  link: LinkState;
  now: number;
  onSetup: () => void;
}) {
  const seen = link?.lastSeenAt ? Date.parse(link.lastSeenAt) : 0;
  const stale = now - seen > 5 * 60000;
  const [dot, text] = stale
    ? [
        "bg-yellow",
        `Your Mac last checked in ${ago(link?.lastSeenAt ?? null, now)}. It may be asleep or off; chats and replies wait until it's back.`,
      ]
    : link?.beeperOk === false
      ? [
          "bg-yellow",
          link.beeperError ?? "The helper can't reach Beeper on your Mac.",
        ]
      : [
          "bg-[#22c55e]",
          `Connected to Beeper · ${ago(link?.lastSeenAt ?? null, now)}`,
        ];
  return (
    <p className="mt-1 flex flex-wrap items-center gap-x-2 text-sm text-stone-600">
      <span className={`inline-block h-2 w-2 rounded-full ${dot}`} />
      <span>{text}</span>
      <button
        type="button"
        onClick={onSetup}
        className="text-xs text-stone-400 underline-offset-2 hover:underline"
      >
        Set up
      </button>
    </p>
  );
}

function Setup({
  onDone,
  reconnect,
}: {
  onDone: () => void;
  reconnect?: boolean;
}) {
  const supabase = useMemo(() => createClient(), []);
  const [code, setCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function makeCode() {
    setBusy(true);
    setError("");
    const { data, error } = await supabase.rpc("beeper_new_link");
    setBusy(false);
    if (error) return setError("Couldn't make the line. Try again.");
    setCode(data as string);
  }
  async function disconnect() {
    if (
      !confirm(
        "Disconnect? This forgets your chats and messages in the Hub. To stop the helper on your Mac too, run the removal line.",
      )
    )
      return;
    await supabase.rpc("beeper_unlink");
    onDone();
  }

  const step = "flex gap-3";
  const num =
    "flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-navy text-xs font-bold text-white";
  return (
    <div className="space-y-4 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-black/5">
      <div>
        <h2 className="font-semibold text-navy">
          {reconnect ? "Set up again" : "Link your chats through Beeper"}
        </h2>
        <p className="mt-1 text-sm text-stone-600">
          Beeper brings WhatsApp, Instagram, Messenger and more into one app. A
          small helper on your Mac passes your organiser chats to the Hub and
          sends the replies you write here. It only works while your Mac is on
          with Beeper open.
        </p>
      </div>
      <ol className="space-y-3 text-sm text-stone-700">
        <li className={step}>
          <span className={num}>1</span>
          <span>
            Install{" "}
            <a
              href="https://www.beeper.com/download"
              target="_blank"
              rel="noreferrer"
              className="font-medium text-pink-ink underline"
            >
              Beeper Desktop
            </a>{" "}
            on your Mac and add the chat apps you use with organisers.
          </span>
        </li>
        <li className={step}>
          <span className={num}>2</span>
          <span>
            In Beeper: <b>Settings → Integrations</b>, turn on{" "}
            <b>Allow connections</b>.
          </span>
        </li>
        <li className={step}>
          <span className={num}>3</span>
          <span>
            Still there, press <b>+</b> next to <b>Approved connections</b> to
            make a token. Turn on <b>Allow sensitive actions</b> (needed to send
            replies) and copy the token.
          </span>
        </li>
        <li className={step}>
          <span className={num}>4</span>
          <div className="min-w-0 flex-1 space-y-2">
            <span>
              Open <b>Terminal</b> (press ⌘ + Space, type Terminal), paste this
              line and press Enter. A pop-up asks for the Beeper token.
            </span>
            {code ? (
              <div className="space-y-2">
                <code className="block overflow-x-auto rounded-lg bg-navy px-3 py-2 text-xs whitespace-nowrap text-white">
                  {HELPER_LINE(code)}
                </code>
                <button
                  type="button"
                  onClick={async () => {
                    await navigator.clipboard.writeText(HELPER_LINE(code));
                    setCopied(true);
                  }}
                  className="rounded-xl bg-pink px-4 py-2 text-sm font-semibold text-navy hover:bg-pink-strong"
                >
                  {copied ? "Copied" : "Copy the line"}
                </button>
                <p className="text-xs text-stone-500">
                  The line is just for you: it links your Mac to your account.
                  Making a new one stops the old one working.
                </p>
              </div>
            ) : (
              <button
                type="button"
                disabled={busy}
                onClick={makeCode}
                className="block rounded-xl bg-pink px-4 py-2 text-sm font-semibold text-navy hover:bg-pink-strong disabled:opacity-50"
              >
                {busy ? "Making it…" : "Get my install line"}
              </button>
            )}
            {error && <p className="text-xs text-[#b91c1c]">{error}</p>}
          </div>
        </li>
        <li className={step}>
          <span className={num}>5</span>
          <span>
            Come back here. Your chats show up within a minute, under{" "}
            <b>To sort</b>.
          </span>
        </li>
      </ol>
      <p className="text-xs text-stone-500">
        For chats you mark as organiser chats, the Hub keeps the last 40
        messages. For every other chat it keeps only the name. Your Beeper token
        stays in your Mac&apos;s Keychain.
      </p>
      {reconnect && (
        <div className="space-y-1 border-t border-stone-100 pt-3 text-xs text-stone-500">
          <p>To remove the helper from your Mac, run this in Terminal:</p>
          <code className="block overflow-x-auto rounded-lg bg-stone-100 px-3 py-2 whitespace-nowrap text-stone-700">
            curl -fsSL https://wtf-movement-hub.vercel.app/beeper/install.sh |
            bash -s uninstall
          </code>
          <button
            type="button"
            onClick={disconnect}
            className="text-[#b91c1c] underline-offset-2 hover:underline"
          >
            Disconnect and forget my chats
          </button>
        </div>
      )}
    </div>
  );
}

function TeamPicker({
  teams,
  value,
  onPick,
}: {
  teams: ChatTeam[];
  value: string | null;
  onPick: (team: string | null) => void;
}) {
  return (
    <select
      value={value ?? ""}
      onChange={(e) => onPick(e.target.value || null)}
      onClick={(e) => e.stopPropagation()}
      className="rounded-lg border border-stone-300 bg-white px-2 py-1 text-xs"
    >
      <option value="">Which community?</option>
      {teams.map((t) => (
        <option key={t.id} value={t.id}>
          {t.name}
        </option>
      ))}
    </select>
  );
}

function ChatRow({
  chat,
  team,
  teams,
  now,
  active,
  onOpen,
  onTag,
}: {
  chat: Chat;
  team: ChatTeam | undefined;
  teams: ChatTeam[];
  now: number;
  active: boolean;
  onOpen: () => void;
  onTag: (t: Chat["tag"], team: string | null) => void;
}) {
  const [picking, setPicking] = useState(false);
  const meta = [
    chat.network,
    chat.chat_type === "group" ? "Group" : null,
    ago(chat.last_activity, now),
  ]
    .filter(Boolean)
    .join(" · ");

  if (!chat.tag)
    return (
      <li className="space-y-2 px-4 py-3">
        <div>
          <p className="truncate font-medium text-navy">
            {chat.title || "Untitled chat"}
          </p>
          <p className="text-xs text-stone-500">{meta}</p>
        </div>
        {picking ? (
          <div className="flex flex-wrap items-center gap-2">
            <TeamPicker
              teams={teams}
              value={null}
              onPick={(t) => onTag("organiser", t)}
            />
            <button
              type="button"
              onClick={() => onTag("organiser", null)}
              className="text-xs text-stone-500 underline-offset-2 hover:underline"
            >
              Not sure
            </button>
          </div>
        ) : (
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setPicking(true)}
              className="rounded-lg bg-navy px-3 py-1 text-xs font-semibold text-white"
            >
              Organiser
            </button>
            <button
              type="button"
              onClick={() => onTag("other", null)}
              className="rounded-lg bg-stone-100 px-3 py-1 text-xs font-medium text-stone-600"
            >
              Not an organiser
            </button>
          </div>
        )}
      </li>
    );

  if (chat.tag === "other")
    return (
      <li className="flex items-center justify-between gap-3 px-4 py-3">
        <div className="min-w-0">
          <p className="truncate text-sm text-stone-700">{chat.title}</p>
          <p className="text-xs text-stone-500">{meta}</p>
        </div>
        <button
          type="button"
          onClick={() => onTag(null, null)}
          className="shrink-0 text-xs text-stone-400 underline-offset-2 hover:underline"
        >
          Undo
        </button>
      </li>
    );

  const wait = waiting(chat);
  return (
    <li>
      <button
        type="button"
        onClick={onOpen}
        className={`block w-full px-4 py-3 text-left hover:bg-stone-50 ${active ? "bg-stone-50" : ""}`}
      >
        <div className="flex items-baseline justify-between gap-2">
          <p className="truncate font-medium text-navy">{chat.title}</p>
          <span className="shrink-0 text-xs text-stone-400">
            {ago(chat.last_activity, now)}
          </span>
        </div>
        <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs">
          {team && (
            <span className="rounded-full bg-cyan/20 px-2 py-0.5 font-medium text-navy">
              {team.name}
            </span>
          )}
          {wait ? (
            <span className="rounded-full bg-pink/15 px-2 py-0.5 font-medium text-pink-ink">
              Waiting on you · {ago(chat.last_theirs_at, now)}
            </span>
          ) : chat.last_mine_at ? (
            <span className="text-stone-500">
              You messaged {ago(chat.last_mine_at, now)}
            </span>
          ) : null}
          {chat.unread > 0 && (
            <span className="rounded-full bg-navy px-1.5 text-[10px] font-bold text-white">
              {chat.unread}
            </span>
          )}
        </div>
        {chat.preview && (
          <p className="mt-1 truncate text-xs text-stone-500">
            {chat.preview_mine ? "You: " : ""}
            {chat.preview}
          </p>
        )}
      </button>
    </li>
  );
}

const timeFmt = new Intl.DateTimeFormat("en-AU", {
  weekday: "short",
  day: "numeric",
  month: "short",
  hour: "numeric",
  minute: "2-digit",
});

function Thread({
  chat,
  team,
  teams,
  now,
  onBack,
  onTag,
}: {
  chat: Chat;
  team: ChatTeam | undefined;
  teams: ChatTeam[];
  now: number;
  onBack: () => void;
  onTag: (t: Chat["tag"], team: string | null) => void;
}) {
  const supabase = useMemo(() => createClient(), []);
  const [msgs, setMsgs] = useState<Msg[] | null>(null);
  const [outbox, setOutbox] = useState<Out[]>([]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [checkedIn, setCheckedIn] = useState(false);
  const bottom = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    const [{ data: m }, { data: o }] = await Promise.all([
      supabase
        .from("beeper_messages")
        .select(
          "message_id, sender_name, is_mine, body, has_attachment, sent_at",
        )
        .eq("chat_id", chat.chat_id)
        .order("sent_at", { ascending: true }),
      supabase
        .from("beeper_outbox")
        .select("id, body, status, error, created_at, sent_at")
        .eq("chat_id", chat.chat_id)
        .gte("created_at", new Date(Date.now() - 864e5).toISOString())
        .order("created_at", { ascending: true }),
    ]);
    setMsgs((m ?? []) as Msg[]);
    setOutbox((o ?? []) as Out[]);
  }, [supabase, chat.chat_id]);

  useEffect(() => {
    const first = setTimeout(load, 0);
    const t = setInterval(() => {
      if (document.visibilityState === "visible") load();
    }, 8000);
    return () => {
      clearTimeout(first);
      clearInterval(t);
    };
  }, [load]);

  const count = msgs?.length ?? 0;
  useEffect(() => {
    bottom.current?.scrollIntoView({ block: "end" });
  }, [count, outbox.length]);

  // Sent replies show until the helper brings them back as messages.
  const pending = outbox.filter(
    (o) =>
      o.status !== "sent" ||
      !(msgs ?? []).some((m) => m.is_mine && m.body?.trim() === o.body.trim()),
  );

  async function send() {
    const body = text.trim();
    if (!body) return;
    setBusy(true);
    setError("");
    const { error } = await supabase.rpc("beeper_send", {
      p_chat: chat.chat_id,
      p_body: body,
    });
    setBusy(false);
    if (error) return setError("Couldn't queue that. Try again.");
    setText("");
    if (team?.checkIn) setCheckedIn(true);
    load();
  }

  return (
    <div className="flex flex-col rounded-2xl bg-white shadow-sm ring-1 ring-black/5">
      <div className="space-y-2 border-b border-stone-100 p-4">
        <button
          type="button"
          onClick={onBack}
          className="text-xs text-stone-500 hover:underline lg:hidden"
        >
          ← All chats
        </button>
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-lg font-semibold text-navy">{chat.title}</h2>
          <span className="text-xs text-stone-400">
            {[chat.network, chat.chat_type === "group" ? "Group" : null]
              .filter(Boolean)
              .join(" · ")}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <TeamPicker
            teams={teams}
            value={chat.team_id}
            onPick={(t) => onTag("organiser", t)}
          />
          <button
            type="button"
            onClick={() => {
              onTag("other", null);
              onBack();
            }}
            className="text-stone-400 underline-offset-2 hover:underline"
          >
            Not an organiser chat
          </button>
        </div>
        {team && (
          <div className="rounded-xl bg-stone-50 px-3 py-2 text-xs text-stone-600">
            <p className="font-semibold text-navy">{team.name}</p>
            {team.quiet ? (
              <p className="text-[#b45309]">
                Nothing in the last month and nothing coming up
              </p>
            ) : (
              <>
                {team.last && <p>Last: {team.last}</p>}
                {team.next && <p>Next: {team.next}</p>}
              </>
            )}
            {team.checkIn && (
              <div className="mt-1.5 flex items-center gap-2">
                <TaskDoneBox
                  taskId={team.checkIn.id}
                  initialDone={checkedIn}
                  key={String(checkedIn)}
                />
                <span>
                  {checkedIn
                    ? "Checked in this month"
                    : "Check-in due. Replying here ticks it."}
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="max-h-[55vh] min-h-48 space-y-2 overflow-y-auto bg-stone-50/50 p-4">
        {msgs === null ? (
          <p className="text-sm text-stone-500">Loading…</p>
        ) : msgs.length === 0 && pending.length === 0 ? (
          <p className="text-center text-sm text-stone-500">
            Messages come through within a minute of marking the chat.
          </p>
        ) : (
          msgs.map((m) => (
            <Bubble
              key={m.message_id}
              mine={m.is_mine}
              who={
                chat.chat_type === "group" && !m.is_mine ? m.sender_name : null
              }
              body={m.body ?? (m.has_attachment ? "📎 Attachment" : "")}
              note={timeFmt.format(new Date(m.sent_at))}
            />
          ))
        )}
        {pending.map((o) => (
          <Bubble
            key={o.id}
            mine
            who={null}
            body={o.body}
            faded={o.status !== "sent"}
            note={
              o.status === "failed"
                ? `Didn't send: ${o.error ?? "try again"}`
                : o.status === "sent"
                  ? `Sent ${ago(o.sent_at, now)}`
                  : "Sending through your Mac…"
            }
            warn={o.status === "failed"}
          />
        ))}
        <div ref={bottom} />
      </div>

      <div className="space-y-2 border-t border-stone-100 p-3">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) send();
          }}
          rows={3}
          placeholder={`Reply to ${chat.title}`}
          className="w-full resize-y rounded-xl border border-stone-300 px-3 py-2 text-sm"
        />
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs text-stone-400">
            {error || "⌘ + Enter to send"}
          </span>
          <button
            type="button"
            disabled={busy || !text.trim()}
            onClick={send}
            className="rounded-xl bg-pink px-4 py-2 text-sm font-semibold text-navy hover:bg-pink-strong disabled:opacity-50"
          >
            {busy ? "Sending…" : "Send"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Bubble({
  mine,
  who,
  body,
  note,
  faded,
  warn,
}: {
  mine: boolean;
  who: string | null;
  body: string;
  note: string;
  faded?: boolean;
  warn?: boolean;
}) {
  return (
    <div className={`flex ${mine ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${mine ? "bg-navy text-white" : "bg-white text-stone-800 ring-1 ring-black/5"} ${faded ? "opacity-60" : ""}`}
      >
        {who && <p className="text-xs font-semibold text-pink-ink">{who}</p>}
        <p className="break-words whitespace-pre-wrap">{body}</p>
        <p
          className={`mt-0.5 text-[10px] ${warn ? "font-semibold text-[#fca5a5]" : mine ? "text-white/60" : "text-stone-400"}`}
        >
          {note}
        </p>
      </div>
    </div>
  );
}
