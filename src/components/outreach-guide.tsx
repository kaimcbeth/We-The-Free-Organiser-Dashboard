"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  ATTITUDE,
  FOCUSES,
  FOUNDATIONS_URL,
  OBJECTIONS,
  OBJECTION_MOVES,
  OUTCOMES,
  QUESTIONS,
  REFRESHERS,
  STAGES,
  STUCK_OPTIONS,
  type Outcome,
  type Stage,
} from "@/lib/outreach-guide";

export type Reflection = {
  id: string;
  outcome: Outcome;
  stuck: Stage | "objection" | "none" | null;
  objection: string | null;
  created_at: string;
};

type Tab = "after" | "sheet" | "objections";
type Step = "outcome" | "stuck" | "objection" | "refresh";

const big =
  "w-full rounded-2xl px-4 py-4 text-left text-lg font-semibold ring-1 ring-black/10 bg-white text-navy hover:bg-stone-50 active:scale-[0.99] transition";

// Between conversations: a 10-second reflection, the bit of the method that
// helps, and one thing to focus on next time. Plus a cheat sheet and
// objections to glance at.
export function OutreachGuide({
  personId,
  teamId,
  eventId,
  today,
}: {
  personId: string | null; // null: no member profile, so nothing is saved
  teamId: string | null;
  eventId: string | null; // today's outreach event, if there is one
  today: Reflection[];
}) {
  const [tab, setTab] = useState<Tab>("after");
  const [step, setStep] = useState<Step>("outcome");
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [stuck, setStuck] = useState<Reflection["stuck"]>(null);
  const [objection, setObjection] = useState<string | null>(null);
  const [log, setLog] = useState(today);
  const [error, setError] = useState("");

  async function save(s: Reflection["stuck"], o: string | null) {
    setStep("refresh");
    if (!personId || !teamId || !outcome) return;
    const { data, error: err } = await createClient()
      .from("outreach_reflections")
      .insert({
        person_id: personId,
        team_id: teamId,
        event_id: eventId,
        outcome,
        stuck: s,
        objection: o,
      })
      .select("id, outcome, stuck, objection, created_at")
      .single();
    if (err) setError("Couldn't save that one, but carry on.");
    else setLog((l) => [data as Reflection, ...l]);
  }

  function next() {
    setStep("outcome");
    setOutcome(null);
    setStuck(null);
    setObjection(null);
    setError("");
  }

  const focus = FOCUSES[log.length % FOCUSES.length];
  const committed = log.filter((r) => r.outcome === "committed").length;
  const stuckCounts = new Map<string, number>();
  for (const r of log)
    if (r.stuck && r.stuck !== "none") {
      const key =
        r.stuck === "objection"
          ? (OBJECTIONS.find((o) => o.id === r.objection)?.label ??
            "Objections")
          : (STAGES.find((s) => s.id === r.stuck)?.label ?? r.stuck);
      stuckCounts.set(key, (stuckCounts.get(key) ?? 0) + 1);
    }
  const topStuck = [...stuckCounts.entries()].sort((a, b) => b[1] - a[1])[0];

  return (
    <div>
      <div className="flex gap-1.5" role="tablist">
        {(
          [
            ["after", "After a chat"],
            ["sheet", "Cheat sheet"],
            ["objections", "Objections"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={tab === id}
            onClick={() => setTab(id)}
            className={`rounded-full px-3.5 py-1.5 text-sm font-semibold ring-1 ${
              tab === id
                ? "bg-navy text-white ring-navy"
                : "bg-white text-navy ring-stone-300"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "after" && (
        <div className="mt-5">
          {step === "outcome" && (
            <>
              <h2 className="text-xl font-semibold">How did that one go?</h2>
              <div className="mt-3 space-y-2">
                {OUTCOMES.map((o) => (
                  <button
                    key={o.id}
                    type="button"
                    onClick={() => {
                      setOutcome(o.id);
                      setStep("stuck");
                    }}
                    className={big}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
            </>
          )}

          {step === "stuck" && (
            <>
              <h2 className="text-xl font-semibold">Where did it get stuck?</h2>
              <div className="mt-3 space-y-2">
                {STUCK_OPTIONS.map((o) => (
                  <button
                    key={o.id}
                    type="button"
                    onClick={() => {
                      setStuck(o.id);
                      if (o.id === "objection") setStep("objection");
                      else void save(o.id, null);
                    }}
                    className={big}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
            </>
          )}

          {step === "objection" && (
            <>
              <h2 className="text-xl font-semibold">Which objection?</h2>
              <div className="mt-3 grid grid-cols-2 gap-2">
                {OBJECTIONS.map((o) => (
                  <button
                    key={o.id}
                    type="button"
                    onClick={() => {
                      setObjection(o.id);
                      void save("objection", o.id);
                    }}
                    className="rounded-2xl bg-white px-3 py-3 text-left text-sm font-semibold text-navy ring-1 ring-black/10 hover:bg-stone-50"
                  >
                    {o.label}
                  </button>
                ))}
              </div>
            </>
          )}

          {step === "refresh" && (
            <>
              {stuck === "objection" ? (
                <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5">
                  <h2 className="text-lg font-semibold text-navy">
                    {OBJECTIONS.find((o) => o.id === objection)?.label}
                  </h2>
                  <p className="mt-1 text-stone-700">
                    {OBJECTIONS.find((o) => o.id === objection)?.tip}
                  </p>
                  <ol className="mt-3 space-y-1.5 text-sm text-stone-600">
                    {OBJECTION_MOVES.map((m, i) => (
                      <li key={m.title}>
                        <span className="font-semibold text-navy">
                          {i + 1}. {m.title}.
                        </span>{" "}
                        {m.text}
                      </li>
                    ))}
                  </ol>
                </section>
              ) : (
                <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5">
                  <h2 className="text-lg font-semibold text-navy">
                    {REFRESHERS[(stuck as Stage | "none") ?? "none"].title}
                  </h2>
                  <ul className="mt-2 space-y-1.5 text-stone-700">
                    {REFRESHERS[(stuck as Stage | "none") ?? "none"].points.map(
                      (p) => (
                        <li key={p} className="flex gap-2">
                          <span aria-hidden className="text-pink-ink">
                            •
                          </span>
                          {p}
                        </li>
                      ),
                    )}
                  </ul>
                </section>
              )}
              <section className="mt-3 rounded-2xl bg-yellow/60 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-navy/70">
                  Focus for the next one
                </p>
                <p className="mt-1 text-lg font-semibold text-navy">{focus}</p>
              </section>
              {error && <p className="mt-2 text-sm text-red-700">{error}</p>}
              <button
                type="button"
                onClick={next}
                className="mt-4 w-full rounded-2xl bg-pink px-4 py-4 text-lg font-semibold text-navy hover:bg-pink-strong"
              >
                Ready for the next one
              </button>
            </>
          )}

          {log.length > 0 && (
            <section className="mt-8 rounded-2xl bg-navy p-4 text-white">
              <p className="text-xs font-semibold uppercase tracking-wide text-white/70">
                Today
              </p>
              <p className="mt-1 text-lg font-semibold">
                {log.length} conversation{log.length === 1 ? "" : "s"}
                {committed ? `, ${committed} committed` : ""}
              </p>
              {topStuck && (
                <p className="text-sm text-white/80">
                  Most common sticking point: {topStuck[0]}
                </p>
              )}
            </section>
          )}
          {!personId && (
            <p className="mt-6 text-xs text-stone-500">
              You don&apos;t have a member profile, so these aren&apos;t saved.
            </p>
          )}
        </div>
      )}

      {tab === "sheet" && (
        <div className="mt-5 space-y-4">
          <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5">
            <h2 className="font-semibold text-navy">Attitude</h2>
            <ul className="mt-1.5 space-y-1 text-stone-700">
              {ATTITUDE.map((a) => (
                <li key={a}>{a}</li>
              ))}
            </ul>
          </section>
          {STAGES.map((s) => (
            <section
              key={s.id}
              className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5"
            >
              <h2 className="font-semibold text-navy">{s.label}</h2>
              <p className="text-sm text-stone-500">{s.about}</p>
              <ol className="mt-2 space-y-1.5">
                {QUESTIONS.filter((q) => q.stage === s.id).map((q) => (
                  <li key={q.n} className="text-stone-800">
                    <span className="mr-1.5 font-semibold text-pink-ink">
                      {q.n}
                    </span>
                    {q.q}
                    {q.note && (
                      <span className="block pl-5 text-sm text-stone-500">
                        {q.note}
                      </span>
                    )}
                  </li>
                ))}
              </ol>
            </section>
          ))}
          <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5">
            <h2 className="font-semibold text-navy">Objections</h2>
            <ol className="mt-1.5 space-y-1 text-stone-700">
              {OBJECTION_MOVES.map((m, i) => (
                <li key={m.title}>
                  {i + 1}. {m.title}
                </li>
              ))}
            </ol>
          </section>
          <a
            href={FOUNDATIONS_URL}
            target="_blank"
            rel="noopener"
            className="block text-center text-sm text-stone-500 hover:text-stone-800 hover:underline"
          >
            The full IBC Foundations ↗
          </a>
        </div>
      )}

      {tab === "objections" && (
        <div className="mt-5 space-y-2">
          <p className="text-sm text-stone-600">
            Guidance, not scripts. Empathise, then help them solve it
            themselves.
          </p>
          {OBJECTIONS.map((o) => (
            <details
              key={o.id}
              className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5"
            >
              <summary className="cursor-pointer font-semibold text-navy">
                {o.label}
              </summary>
              <p className="mt-2 text-stone-700">{o.tip}</p>
            </details>
          ))}
        </div>
      )}
    </div>
  );
}
