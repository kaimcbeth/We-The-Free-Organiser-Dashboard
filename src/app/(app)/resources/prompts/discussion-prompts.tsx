"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  DISCUSSION_PROMPTS,
  PROMPT_TYPES,
  type DiscussionPrompt,
  type PromptType,
} from "@/lib/discussion-prompts";

const fmt = (iso: string) =>
  new Date(iso).toLocaleDateString("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

export function DiscussionPrompts({
  teamId,
  posted: initial,
}: {
  teamId: string | null;
  posted: Record<string, string>;
}) {
  const [posted, setPosted] = useState(initial);
  const [type, setType] = useState<PromptType | null>(null);
  const [showPosted, setShowPosted] = useState(false);
  const [query, setQuery] = useState("");
  const [copied, setCopied] = useState<string | null>(null);
  const [picked, setPicked] = useState<string | null>(null);
  const q = query.trim().toLowerCase();

  const list = DISCUSSION_PROMPTS.filter(
    (p) =>
      (!type || p.type === type) &&
      (showPosted || !posted[p.id] || p.id === picked) &&
      (!q || p.text.toLowerCase().includes(q)),
  );
  const notPosted = DISCUSSION_PROMPTS.filter((p) => !posted[p.id]).length;

  const copy = async (p: DiscussionPrompt) => {
    try {
      await navigator.clipboard.writeText(p.text);
      setCopied(p.id);
      setTimeout(() => setCopied((c) => (c === p.id ? null : c)), 1500);
    } catch {
      // clipboard blocked: nothing to do
    }
  };
  const toggle = (p: DiscussionPrompt) => {
    const was = posted[p.id];
    const next = { ...posted };
    if (was) delete next[p.id];
    else next[p.id] = new Date().toISOString();
    setPosted(next);
    if (!teamId) return;
    const t = createClient().from("discussion_prompt_posts");
    void (was
      ? t.delete().eq("team_id", teamId).eq("prompt_id", p.id)
      : t.upsert({ team_id: teamId, prompt_id: p.id }));
  };
  const pick = () => {
    const pool = DISCUSSION_PROMPTS.filter(
      (p) => !posted[p.id] && (!type || p.type === type),
    );
    if (!pool.length) return;
    const p = pool[Math.floor(Math.random() * pool.length)];
    setPicked(p.id);
    setQuery("");
    requestAnimationFrame(() =>
      document
        .getElementById(`prompt-${p.id}`)
        ?.scrollIntoView({ block: "center", behavior: "smooth" }),
    );
  };

  const chip = (on: boolean) =>
    `rounded-full px-3 py-1 text-sm font-medium ring-1 ${on ? "bg-navy text-white ring-navy" : "bg-white text-stone-600 ring-stone-300"}`;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search prompts"
          aria-label="Search prompts"
          className="min-w-0 flex-1 rounded-xl bg-white px-3 py-2 text-sm ring-1 ring-black/10 focus:outline-none focus:ring-2 focus:ring-cyan"
        />
        <button
          type="button"
          onClick={pick}
          className="rounded-xl bg-pink px-4 py-2 text-sm font-semibold text-navy hover:bg-pink-strong"
        >
          Pick one for me
        </button>
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        <button
          type="button"
          onClick={() => setType(null)}
          className={chip(type === null)}
        >
          All
        </button>
        {PROMPT_TYPES.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setType(t)}
            className={chip(type === t)}
          >
            {t}{" "}
            <span className="opacity-60">
              {DISCUSSION_PROMPTS.filter((p) => p.type === t).length}
            </span>
          </button>
        ))}
        <label className="ml-auto flex items-center gap-1.5 text-xs text-stone-500">
          <input
            type="checkbox"
            checked={showPosted}
            onChange={(e) => setShowPosted(e.target.checked)}
          />
          Show posted ({DISCUSSION_PROMPTS.length - notPosted})
        </label>
      </div>
      <p className="text-xs text-stone-400">
        {notPosted} of {DISCUSSION_PROMPTS.length} not posted yet
        {!teamId && " · pick a community to save what's been posted"}
      </p>

      {list.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-stone-300 px-4 py-6 text-center text-sm text-stone-500">
          {q ? "No prompts match that." : "You've posted them all here."}
        </p>
      ) : (
        <ul className="space-y-2">
          {list.map((p) => (
            <li
              key={p.id}
              id={`prompt-${p.id}`}
              className={`rounded-2xl bg-white p-4 shadow-sm ring-1 ${
                p.id === picked ? "ring-2 ring-pink" : "ring-black/5"
              } ${posted[p.id] ? "opacity-60" : ""}`}
            >
              <p className="text-navy">{p.text}</p>
              <div className="mt-2 flex flex-wrap items-center gap-3 text-sm">
                <span className="rounded-full bg-stone-100 px-2 py-0.5 text-xs text-stone-500">
                  {p.type}
                </span>
                <button
                  type="button"
                  onClick={() => copy(p)}
                  className="font-semibold text-pink-ink hover:underline"
                >
                  {copied === p.id ? "Copied" : "Copy"}
                </button>
                <label className="ml-auto flex items-center gap-1.5 text-xs text-stone-500">
                  <input
                    type="checkbox"
                    checked={!!posted[p.id]}
                    onChange={() => toggle(p)}
                  />
                  {posted[p.id] ? `Posted ${fmt(posted[p.id])}` : "Posted"}
                </label>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
