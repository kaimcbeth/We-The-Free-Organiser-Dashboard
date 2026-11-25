"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  ASSESSMENT,
  INTRO,
  JOB,
  KIND_INTRO,
  KIND_LABEL,
  OBJECTIVE_STATUS,
  STATUS_LABEL,
  STATUS_STYLE,
  TEAM,
  formatMeeting,
  ratingText,
  type Answers,
  type Notes,
  type Pdr,
  type Rating,
  type RatedRow,
} from "@/lib/pdr";
import { GoalBars } from "../goal-bars";

const box = "rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5 sm:p-5";
const area =
  "mt-1 w-full rounded-xl border border-stone-300 bg-white px-3 py-2 text-sm disabled:border-transparent disabled:bg-stone-50 disabled:text-stone-800";
const field =
  "w-full rounded-lg border border-stone-300 bg-white px-2.5 py-1.5 text-sm disabled:border-transparent disabled:bg-stone-50 disabled:text-stone-800";

const PRIVATE_HINT = "Only you see this until the meeting starts";

type Save = "saved" | "saving" | "waiting" | "error";

export function PdrForm({ initial, myName }: { initial: Pdr; myName: string }) {
  const router = useRouter();
  const [pdr, setPdr] = useState(initial);
  const [answers, setAnswers] = useState<Answers>(initial.answers ?? {});
  const [notes, setNotes] = useState<Notes>(initial.notes ?? {});
  const [save, setSave] = useState<Save>("saved");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const timers = useRef<{
    a?: ReturnType<typeof setTimeout>;
    n?: ReturnType<typeof setTimeout>;
  }>({});
  const dirty = useRef({ a: false, n: false });
  const latest = useRef({ answers, notes });
  const formRef = useRef<HTMLDivElement>(null);

  const reviewer = pdr.role === "reviewer";
  const locked = !!pdr.locked_at;
  const meeting = !!pdr.notes_shared_at;
  // Before the meeting the RSL owns the draft; in the meeting you both edit it.
  const canAnswer = !locked && (!reviewer || meeting);
  const canNote = reviewer && !locked;
  const showNotes = reviewer || meeting;
  const reviewerFirst = (pdr.reviewer_name ?? "Your community manager").split(
    " ",
  )[0];
  const prev = pdr.previous;
  const hint = meeting ? "Add a note" : PRIVATE_HINT;

  const load = useCallback(async () => {
    const { data } = await createClient().rpc("pdr_get", { p_id: initial.id });
    if (!data) return;
    const fresh = data as Pdr;
    setPdr(fresh);
    if (!dirty.current.a) {
      latest.current.answers = fresh.answers ?? {};
      setAnswers(latest.current.answers);
    }
    if (!dirty.current.n && fresh.notes) {
      latest.current.notes = fresh.notes;
      setNotes(fresh.notes);
    }
  }, [initial.id]);

  // Pick up the other person's changes (mainly during the meeting), unless
  // you're typing.
  useEffect(() => {
    const t = setInterval(() => {
      if (document.hidden || locked) return;
      if (dirty.current.a || dirty.current.n) return;
      if (formRef.current?.contains(document.activeElement)) return;
      load();
    }, 20000);
    return () => clearInterval(t);
  }, [load, locked]);

  async function flush(which: "a" | "n") {
    clearTimeout(timers.current[which]);
    if (!dirty.current[which]) return true;
    setSave("saving");
    const db = createClient();
    const { error } =
      which === "a"
        ? await db.rpc("pdr_save", {
            p_id: pdr.id,
            p_answers: latest.current.answers,
          })
        : await db.rpc("pdr_save_notes", {
            p_id: pdr.id,
            p_notes: latest.current.notes,
          });
    if (error) {
      setSave("error");
      setError(error.message);
      return false;
    }
    dirty.current[which] = false;
    setSave(dirty.current.a || dirty.current.n ? "waiting" : "saved");
    if (which === "a")
      setPdr((p) => ({
        ...p,
        reviewee_signed_at: null,
        reviewee_signed_name: null,
        reviewer_signed_at: null,
        reviewer_signed_name: null,
      }));
    return true;
  }

  function queue(which: "a" | "n") {
    dirty.current[which] = true;
    setSave("waiting");
    clearTimeout(timers.current[which]);
    timers.current[which] = setTimeout(() => flush(which), 900);
  }

  function editAnswers(fn: (a: Answers) => Answers) {
    const next = fn(latest.current.answers);
    latest.current.answers = next;
    setAnswers(next);
    queue("a");
  }
  function editNotes(fn: (n: Notes) => Notes) {
    const next = fn(latest.current.notes);
    latest.current.notes = next;
    setNotes(next);
    queue("n");
  }
  const setNote = (key: string, text: string) =>
    editNotes((n) => ({ ...n, text: { ...(n.text ?? {}), [key]: text } }));
  const setNoteRating = (key: string, r: Rating) =>
    editNotes((n) => ({ ...n, rating: { ...(n.rating ?? {}), [key]: r } }));

  async function act(
    fn: () => PromiseLike<{ error: { message: string } | null }>,
  ) {
    setError("");
    setBusy(true);
    const ok = (await flush("a")) && (await flush("n"));
    if (!ok) return setBusy(false);
    const { error } = await fn();
    setBusy(false);
    if (error) return setError(error.message);
    await load();
    router.refresh();
  }
  const db = () => createClient();

  async function remove() {
    if (
      !window.confirm(
        `Delete ${pdr.reviewee_name}'s PDR? This can't be undone.`,
      )
    )
      return;
    const { error } = await db().rpc("pdr_delete", { p_id: pdr.id });
    if (error) return setError(error.message);
    router.push("/pdr");
  }

  async function downloadPdf() {
    await flush("a");
    await flush("n");
    const { pdrPdf } = await import("@/lib/pdr-pdf");
    const bytes = await pdrPdf({
      ...pdr,
      answers,
      notes: showNotes ? notes : null,
    });
    const blob = new Blob([bytes as BlobPart], { type: "application/pdf" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `PDR ${pdr.year} - ${pdr.reviewee_name}${locked ? "" : " (draft)"}.pdf`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  }

  const objectives = answers.objectives ?? [];
  const development = answers.development ?? [];
  const goals = answers.goals ?? [];

  return (
    <div ref={formRef} className="mx-auto max-w-3xl space-y-5">
      <div>
        <Link
          href="/pdr"
          className="text-sm font-medium text-stone-500 hover:text-navy"
        >
          ← PDRs
        </Link>
        <div className="mt-1 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-navy">
              {reviewer ? `${pdr.reviewee_name}'s PDR` : "Your PDR"}
            </h1>
            <p className="text-sm text-stone-600">
              {KIND_LABEL[pdr.kind]} {pdr.year}
              {pdr.region && ` · RSL, ${pdr.region}`} · Reviewer:{" "}
              {pdr.reviewer_name ?? "Community manager"}
            </p>
            <MeetingLine
              pdr={pdr}
              reviewer={reviewer && !locked}
              onSaved={load}
            />
          </div>
          <div className="flex flex-col items-end gap-1.5">
            <span
              className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_STYLE[pdr.status]}`}
            >
              {STATUS_LABEL[pdr.status]}
            </span>
            <span className="text-xs text-stone-500">
              {locked
                ? "Locked"
                : save === "saving"
                  ? "Saving…"
                  : save === "waiting"
                    ? "Typing…"
                    : save === "error"
                      ? "Not saved"
                      : "All changes saved"}
            </span>
          </div>
        </div>
      </div>

      <StepBar
        pdr={pdr}
        reviewer={reviewer}
        busy={busy}
        reviewerFirst={reviewerFirst}
        onSubmit={(on) =>
          act(() => db().rpc("pdr_submit", { p_id: pdr.id, p_on: on }))
        }
        onMeeting={(on) =>
          act(() => db().rpc("pdr_start_meeting", { p_id: pdr.id, p_on: on }))
        }
        onPdf={downloadPdf}
      />
      {error && (
        <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      <div className={box}>
        <p className="text-sm text-stone-700">{INTRO}</p>
        <p className="mt-2 text-sm text-stone-500">{KIND_INTRO[pdr.kind]}</p>
        {pdr.goals.length > 0 && (
          <div className="mt-4 rounded-xl bg-stone-50 p-3">
            <p className="text-xs font-bold uppercase tracking-wider text-stone-500">
              Organisational goals for {pdr.year}
            </p>
            <p className="mt-0.5 text-xs text-stone-500">
              Think about how your work this year adds to these.
            </p>
            <GoalBars goals={pdr.goals} />
          </div>
        )}
      </div>

      {/* 1. Looking back */}
      <SectionHead n="1" title="Looking back" />
      <div className={box}>
        <h3 className="font-semibold text-navy">Objectives</h3>
        <p className="text-sm text-stone-600">
          {prev
            ? `The goals set at your ${KIND_LABEL[prev.kind].toLowerCase()} ${prev.year}. How did each one go, and what helped or got in the way?`
            : "Your objectives for the last period (for a first PDR, think about your role description). How did each one go, and what helped or got in the way?"}
        </p>
        <ul className="mt-3 space-y-3">
          {objectives.map((o, i) => (
            <li key={i} className="rounded-xl bg-stone-50 p-3">
              <div className="flex gap-2">
                <input
                  value={o.text}
                  disabled={!canAnswer}
                  onChange={(e) =>
                    editAnswers((a) => ({
                      ...a,
                      objectives: (a.objectives ?? []).map((x, j) =>
                        j === i ? { ...x, text: e.target.value } : x,
                      ),
                    }))
                  }
                  placeholder="Objective"
                  className={`${field} font-medium`}
                />
                {canAnswer && (
                  <button
                    onClick={() =>
                      editAnswers((a) => ({
                        ...a,
                        objectives: (a.objectives ?? []).filter(
                          (_, j) => j !== i,
                        ),
                      }))
                    }
                    className="px-1 text-stone-400 hover:text-red-700"
                    aria-label="Remove objective"
                  >
                    ×
                  </button>
                )}
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {OBJECTIVE_STATUS.map((s) => (
                  <button
                    key={s.value}
                    disabled={!canAnswer}
                    onClick={() =>
                      editAnswers((a) => ({
                        ...a,
                        objectives: (a.objectives ?? []).map((x, j) =>
                          j === i
                            ? {
                                ...x,
                                status: x.status === s.value ? "" : s.value,
                              }
                            : x,
                        ),
                      }))
                    }
                    className={`rounded-full px-2.5 py-1 text-xs font-semibold ring-1 disabled:cursor-default ${
                      o.status === s.value
                        ? s.value === "achieved"
                          ? "bg-cyan/40 text-navy ring-cyan"
                          : s.value === "partly"
                            ? "bg-yellow/50 text-navy ring-yellow"
                            : "bg-pink/40 text-navy ring-pink"
                        : "bg-white text-stone-600 ring-stone-300"
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
              <textarea
                rows={2}
                value={o.comment}
                disabled={!canAnswer}
                onChange={(e) =>
                  editAnswers((a) => ({
                    ...a,
                    objectives: (a.objectives ?? []).map((x, j) =>
                      j === i ? { ...x, comment: e.target.value } : x,
                    ),
                  }))
                }
                placeholder="Comments on progress"
                className={area}
              />
              <NoteBox
                k={`objective.${i}`}
                notes={notes}
                show={showNotes}
                edit={canNote}
                who={reviewerFirst}
                onChange={setNote}
                hint={hint}
              />
            </li>
          ))}
        </ul>
        {canAnswer && (
          <button
            onClick={() =>
              editAnswers((a) => ({
                ...a,
                objectives: [
                  ...(a.objectives ?? []),
                  { text: "", status: "", comment: "" },
                ],
              }))
            }
            className="mt-3 text-sm font-medium text-pink-ink hover:underline"
          >
            + Add an objective
          </button>
        )}
      </div>

      <div className={box}>
        <h3 className="font-semibold text-navy">General assessment</h3>
        <p className="text-sm text-stone-600">
          What went well and what didn&apos;t, and why. You can mention any
          training or development you did and how you&apos;ve used it.
        </p>
        <div className="mt-3 space-y-3">
          {ASSESSMENT.map((q) => (
            <label key={q.key} className="block">
              <span className="text-sm font-medium text-navy">{q.label}</span>
              <textarea
                rows={3}
                value={answers.assessment?.[q.key] ?? ""}
                disabled={!canAnswer}
                onChange={(e) =>
                  editAnswers((a) => ({
                    ...a,
                    assessment: {
                      ...(a.assessment ?? {}),
                      [q.key]: e.target.value,
                    },
                  }))
                }
                className={area}
              />
            </label>
          ))}
        </div>
        <NoteBox
          k="assessment"
          notes={notes}
          show={showNotes}
          edit={canNote}
          who={reviewerFirst}
          onChange={setNote}
          hint={hint}
        />
      </div>

      {/* 2. Well-being */}
      <SectionHead n="2" title="Well-being" />
      <RatedSection
        title="Your role"
        intro="How much do you agree? 1 = totally disagree, 5 = totally agree. Add a comment wherever it helps explain."
        rows={JOB}
        group="job"
        values={answers.job ?? {}}
        previous={prev?.job ?? null}
        prevLabel={
          prev
            ? `${prev.kind === "mid_year" ? "Mid-year" : "Annual"} ${prev.year}`
            : ""
        }
        extra={answers.jobExtra ?? ""}
        canAnswer={canAnswer}
        notes={notes}
        showNotes={showNotes}
        canNote={canNote}
        who={reviewerFirst}
        onRow={(key, row) =>
          editAnswers((a) => ({ ...a, job: { ...(a.job ?? {}), [key]: row } }))
        }
        onExtra={(v) => editAnswers((a) => ({ ...a, jobExtra: v }))}
        onNote={setNote}
        onNoteRating={setNoteRating}
        hint={hint}
      />
      <RatedSection
        title="Your team"
        intro="Your relationships with peers and the people you support: collaboration, communication, leadership, challenges and wins."
        rows={TEAM}
        group="team"
        values={answers.team ?? {}}
        previous={prev?.team ?? null}
        prevLabel={
          prev
            ? `${prev.kind === "mid_year" ? "Mid-year" : "Annual"} ${prev.year}`
            : ""
        }
        extra={answers.teamExtra ?? ""}
        canAnswer={canAnswer}
        notes={notes}
        showNotes={showNotes}
        canNote={canNote}
        who={reviewerFirst}
        onRow={(key, row) =>
          editAnswers((a) => ({
            ...a,
            team: { ...(a.team ?? {}), [key]: row },
          }))
        }
        onExtra={(v) => editAnswers((a) => ({ ...a, teamExtra: v }))}
        onNote={setNote}
        onNoteRating={setNoteRating}
        hint={hint}
      />

      {/* 3. Looking forward */}
      <SectionHead n="3" title="Looking forward" />
      <div className={box}>
        <h3 className="font-semibold text-navy">Professional development</h3>
        <p className="text-sm text-stone-600">
          Skills or knowledge you&apos;d like to build (e.g. conflict
          management, time management, public speaking, campaigning, a
          language), how, and how you&apos;ll know it worked. Come with ideas;
          we&apos;ll finish this together in the meeting.
        </p>
        <ul className="mt-3 space-y-3">
          {development.map((d, i) => (
            <li
              key={i}
              className="grid gap-2 rounded-xl bg-stone-50 p-3 sm:grid-cols-2"
            >
              {(
                [
                  ["skill", "Skill or knowledge"],
                  ["how", "How (course, shadowing, coaching…)"],
                  ["measure", "How we'll measure success"],
                  ["date", "Done by"],
                ] as const
              ).map(([k, label]) => (
                <label key={k} className="block">
                  <span className="text-xs font-medium text-stone-600">
                    {label}
                  </span>
                  <input
                    value={d[k]}
                    disabled={!canAnswer}
                    onChange={(e) =>
                      editAnswers((a) => ({
                        ...a,
                        development: (a.development ?? []).map((x, j) =>
                          j === i ? { ...x, [k]: e.target.value } : x,
                        ),
                      }))
                    }
                    className={field}
                  />
                </label>
              ))}
              {canAnswer && (
                <button
                  onClick={() =>
                    editAnswers((a) => ({
                      ...a,
                      development: (a.development ?? []).filter(
                        (_, j) => j !== i,
                      ),
                    }))
                  }
                  className="justify-self-start text-xs text-stone-400 hover:text-red-700"
                >
                  Remove
                </button>
              )}
            </li>
          ))}
        </ul>
        {canAnswer && (
          <button
            onClick={() =>
              editAnswers((a) => ({
                ...a,
                development: [
                  ...(a.development ?? []),
                  { skill: "", how: "", measure: "", date: "" },
                ],
              }))
            }
            className="mt-3 text-sm font-medium text-pink-ink hover:underline"
          >
            + Add a skill
          </button>
        )}
        <NoteBox
          k="development"
          notes={notes}
          show={showNotes}
          edit={canNote}
          who={reviewerFirst}
          onChange={setNote}
          hint={hint}
        />
      </div>

      <div className={box}>
        <h3 className="font-semibold text-navy">Goals for the coming months</h3>
        <p className="text-sm text-stone-600">
          Specific, measurable, achievable, relevant and time-bound, and
          inclusive and equitable. These become the objectives we look back on
          at your next PDR.
        </p>
        <ol className="mt-3 space-y-3">
          {goals.map((g, i) => (
            <li key={i} className="rounded-xl bg-stone-50 p-3">
              <div className="flex items-start gap-2">
                <span className="mt-1.5 w-5 shrink-0 text-sm font-bold text-stone-400">
                  {i + 1}.
                </span>
                <div className="flex-1 space-y-1.5">
                  <input
                    value={g.text}
                    disabled={!canAnswer}
                    onChange={(e) =>
                      editAnswers((a) => ({
                        ...a,
                        goals: (a.goals ?? []).map((x, j) =>
                          j === i ? { ...x, text: e.target.value } : x,
                        ),
                      }))
                    }
                    placeholder="Goal"
                    className={`${field} font-medium`}
                  />
                  <textarea
                    rows={2}
                    value={g.steps}
                    disabled={!canAnswer}
                    onChange={(e) =>
                      editAnswers((a) => ({
                        ...a,
                        goals: (a.goals ?? []).map((x, j) =>
                          j === i ? { ...x, steps: e.target.value } : x,
                        ),
                      }))
                    }
                    placeholder="Steps or details (optional)"
                    className={field}
                  />
                </div>
                {canAnswer && (
                  <div className="flex flex-col text-xs text-stone-400">
                    <button
                      disabled={i === 0}
                      onClick={() =>
                        editAnswers((a) => ({
                          ...a,
                          goals: move(a.goals ?? [], i, -1),
                        }))
                      }
                      className="px-1 hover:text-navy disabled:opacity-30"
                      aria-label="Move up"
                    >
                      ↑
                    </button>
                    <button
                      disabled={i === goals.length - 1}
                      onClick={() =>
                        editAnswers((a) => ({
                          ...a,
                          goals: move(a.goals ?? [], i, 1),
                        }))
                      }
                      className="px-1 hover:text-navy disabled:opacity-30"
                      aria-label="Move down"
                    >
                      ↓
                    </button>
                    <button
                      onClick={() =>
                        editAnswers((a) => ({
                          ...a,
                          goals: (a.goals ?? []).filter((_, j) => j !== i),
                        }))
                      }
                      className="px-1 hover:text-red-700"
                      aria-label="Remove goal"
                    >
                      ×
                    </button>
                  </div>
                )}
              </div>
            </li>
          ))}
        </ol>
        {canAnswer && (
          <button
            onClick={() =>
              editAnswers((a) => ({
                ...a,
                goals: [...(a.goals ?? []), { text: "", steps: "" }],
              }))
            }
            className="mt-3 text-sm font-medium text-pink-ink hover:underline"
          >
            + Add a goal
          </button>
        )}
        <NoteBox
          k="goals"
          notes={notes}
          show={showNotes}
          edit={canNote}
          who={reviewerFirst}
          onChange={setNote}
          hint={hint}
        />
      </div>

      {showNotes && (canNote || notes.text?.general) && (
        <div className={box}>
          <h3 className="font-semibold text-navy">
            {reviewer
              ? "Your overall notes"
              : `${reviewerFirst}'s overall notes`}
          </h3>
          <NoteBox
            k="general"
            notes={notes}
            show
            edit={canNote}
            who={reviewerFirst}
            onChange={setNote}
            bare
            hint={hint}
          />
        </div>
      )}

      <SignOff
        pdr={pdr}
        reviewer={reviewer}
        myName={myName}
        busy={busy}
        onSign={(on) =>
          act(() => db().rpc("pdr_sign", { p_id: pdr.id, p_on: on }))
        }
        onReopen={() => act(() => db().rpc("pdr_reopen", { p_id: pdr.id }))}
        onPdf={downloadPdf}
      />

      {reviewer && (
        <p className="pt-2 text-center">
          <button
            onClick={remove}
            className="text-xs text-stone-400 hover:text-red-700 hover:underline"
          >
            Delete this PDR
          </button>
        </p>
      )}
    </div>
  );
}

function move<T>(list: T[], i: number, by: number): T[] {
  const j = i + by;
  if (j < 0 || j >= list.length) return list;
  const next = [...list];
  [next[i], next[j]] = [next[j], next[i]];
  return next;
}

function SectionHead({ n, title }: { n: string; title: string }) {
  return (
    <h2 className="flex items-center gap-2 pt-2 text-lg font-bold text-navy">
      <span className="grid h-7 w-7 place-items-center rounded-full bg-navy text-sm text-white">
        {n}
      </span>
      {title}
    </h2>
  );
}

function MeetingLine({
  pdr,
  reviewer,
  onSaved,
}: {
  pdr: Pdr;
  reviewer: boolean;
  onSaved: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState("");
  const [error, setError] = useState("");
  function open() {
    if (pdr.meeting_at) {
      const d = new Date(pdr.meeting_at);
      const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
      setValue(local.toISOString().slice(0, 16));
    }
    setEditing(true);
  }
  async function saveIt() {
    const { error } = await createClient().rpc("pdr_update", {
      p_id: pdr.id,
      p_kind: pdr.kind,
      p_year: pdr.year,
      p_meeting: value ? new Date(value).toISOString() : null,
    });
    if (error) return setError(error.message);
    setEditing(false);
    onSaved();
  }
  if (editing)
    return (
      <div className="mt-1 flex flex-wrap items-center gap-2">
        <input
          type="datetime-local"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="rounded-lg border border-stone-300 px-2 py-1 text-sm"
        />
        <button
          onClick={saveIt}
          className="rounded-lg bg-navy px-2.5 py-1 text-xs font-semibold text-white"
        >
          Save
        </button>
        <button
          onClick={() => setEditing(false)}
          className="text-xs text-stone-500"
        >
          Cancel
        </button>
        {error && <span className="text-xs text-red-700">{error}</span>}
      </div>
    );
  return (
    <p className="text-sm text-stone-600">
      Meeting: {formatMeeting(pdr.meeting_at, pdr.timezone)}
      {reviewer && (
        <button
          onClick={open}
          className="ml-2 text-xs font-medium text-pink-ink hover:underline"
        >
          Change
        </button>
      )}
    </p>
  );
}

function StepBar({
  pdr,
  reviewer,
  busy,
  reviewerFirst,
  onSubmit,
  onMeeting,
  onPdf,
}: {
  pdr: Pdr;
  reviewer: boolean;
  busy: boolean;
  reviewerFirst: string;
  onSubmit: (on: boolean) => void;
  onMeeting: (on: boolean) => void;
  onPdf: () => void;
}) {
  const btn =
    "rounded-xl px-3.5 py-2 text-sm font-semibold disabled:opacity-60";
  let text: string;
  let action: React.ReactNode = null;
  if (pdr.locked_at) {
    text = "Signed off by you both. This is the agreed record.";
    action = (
      <button
        onClick={onPdf}
        className={`${btn} bg-pink text-navy hover:bg-pink-strong`}
      >
        Download PDF
      </button>
    );
  } else if (pdr.notes_shared_at) {
    text = reviewer
      ? `Meeting mode: ${pdr.reviewee_name.split(" ")[0]} can now see your notes, and you can both edit everything. Finish with the sign-off at the bottom.`
      : `Meeting mode: you can now see ${reviewerFirst}'s notes beside your answers. Finish with the sign-off at the bottom.`;
    if (reviewer)
      action = (
        <button
          disabled={busy}
          onClick={() => onMeeting(false)}
          className={`${btn} bg-white text-navy ring-1 ring-stone-300`}
        >
          Hide my notes again
        </button>
      );
  } else if (reviewer) {
    text =
      pdr.status === "invited"
        ? `Waiting for ${pdr.reviewee_name.split(" ")[0]} to accept the invite. You can add your notes now; only you see them until the meeting.`
        : pdr.submitted_at
          ? `${pdr.reviewee_name.split(" ")[0]}'s draft is ready. Add your notes (only you see them), then start the meeting.`
          : `${pdr.reviewee_name.split(" ")[0]} is still drafting. Your notes stay private until you start the meeting.`;
    action = (
      <button
        disabled={busy}
        onClick={() => onMeeting(true)}
        className={`${btn} bg-pink text-navy hover:bg-pink-strong`}
      >
        Start the meeting
      </button>
    );
  } else if (pdr.submitted_at) {
    text = `Your draft is marked ready. You can still change it before the meeting.`;
    action = (
      <button
        disabled={busy}
        onClick={() => onSubmit(false)}
        className={`${btn} bg-white text-navy ring-1 ring-stone-300`}
      >
        I&apos;m still working on it
      </button>
    );
  } else {
    text = `Fill in your draft before the meeting. Everything saves as you type. When you're done, let ${reviewerFirst} know.`;
    action = (
      <button
        disabled={busy}
        onClick={() => onSubmit(true)}
        className={`${btn} bg-pink text-navy hover:bg-pink-strong`}
      >
        My draft is ready
      </button>
    );
  }
  return (
    <div className="sticky top-16 z-10 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-navy px-4 py-3 text-white shadow-md">
      <p className="max-w-lg text-sm">{text}</p>
      {action}
    </div>
  );
}

function NoteBox({
  k,
  notes,
  show,
  edit,
  who,
  onChange,
  bare,
  hint = PRIVATE_HINT,
}: {
  hint?: string;
  k: string;
  notes: Notes;
  show: boolean;
  edit: boolean;
  who: string;
  onChange: (k: string, v: string) => void;
  bare?: boolean;
}) {
  const text = notes.text?.[k] ?? "";
  if (!show || (!edit && !text)) return null;
  return (
    <div
      className={
        bare
          ? "mt-1"
          : "mt-2 rounded-xl border-l-4 border-yellow bg-yellow/15 px-3 py-2"
      }
    >
      {!bare && (
        <p className="text-xs font-semibold text-navy/80">
          {edit ? "Your notes" : `${who}'s notes`}
        </p>
      )}
      {edit ? (
        <textarea
          rows={2}
          value={text}
          onChange={(e) => onChange(k, e.target.value)}
          placeholder={hint}
          className="mt-1 w-full rounded-lg border border-yellow/60 bg-white/80 px-2.5 py-1.5 text-sm"
        />
      ) : (
        <p className="mt-0.5 whitespace-pre-wrap text-sm text-stone-800">
          {text}
        </p>
      )}
    </div>
  );
}

function RatingChips({
  value,
  disabled,
  onPick,
  small,
}: {
  value: Rating | undefined;
  disabled: boolean;
  onPick: (r: Rating) => void;
  small?: boolean;
}) {
  const opts: Rating[] = [1, 2, 3, 4, 5, "na"];
  return (
    <div className="flex flex-wrap gap-1">
      {opts.map((r) => (
        <button
          key={String(r)}
          type="button"
          disabled={disabled}
          onClick={() => onPick(value === r ? null : r)}
          className={`${small ? "h-6 min-w-6 px-1 text-[11px]" : "h-8 min-w-8 px-1.5 text-sm"} rounded-lg font-semibold ring-1 disabled:cursor-default ${
            value === r
              ? small
                ? "bg-yellow text-navy ring-yellow"
                : "bg-navy text-white ring-navy"
              : "bg-white text-stone-600 ring-stone-300 enabled:hover:bg-stone-50"
          }`}
        >
          {ratingText(r)}
        </button>
      ))}
    </div>
  );
}

function RatedSection({
  title,
  intro,
  rows,
  group,
  values,
  previous,
  prevLabel,
  extra,
  canAnswer,
  notes,
  showNotes,
  canNote,
  who,
  onRow,
  onExtra,
  onNote,
  onNoteRating,
  hint,
}: {
  hint: string;
  title: string;
  intro: string;
  rows: { key: string; label: string }[];
  group: string;
  values: Record<string, RatedRow>;
  previous: Record<string, RatedRow> | null;
  prevLabel: string;
  extra: string;
  canAnswer: boolean;
  notes: Notes;
  showNotes: boolean;
  canNote: boolean;
  who: string;
  onRow: (key: string, row: RatedRow) => void;
  onExtra: (v: string) => void;
  onNote: (k: string, v: string) => void;
  onNoteRating: (k: string, r: Rating) => void;
}) {
  return (
    <div className={box}>
      <h3 className="font-semibold text-navy">{title}</h3>
      <p className="text-sm text-stone-600">{intro}</p>
      <ul className="mt-3 divide-y divide-stone-100">
        {rows.map((r) => {
          const v = values[r.key] ?? { rating: null, comment: "" };
          const key = `${group}.${r.key}`;
          const theirs = notes.rating?.[key];
          return (
            <li key={r.key} className="py-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <p className="max-w-md text-sm font-medium text-navy">
                  {r.label}
                </p>
                <RatingChips
                  value={v.rating}
                  disabled={!canAnswer}
                  onPick={(rating) => onRow(r.key, { ...v, rating })}
                />
              </div>
              {previous?.[r.key]?.rating != null && (
                <p className="mt-1 text-xs text-stone-500">
                  {prevLabel}: {ratingText(previous[r.key].rating)}
                </p>
              )}
              {(canAnswer || v.comment) && (
                <input
                  value={v.comment}
                  disabled={!canAnswer}
                  onChange={(e) =>
                    onRow(r.key, { ...v, comment: e.target.value })
                  }
                  placeholder="Comment (optional)"
                  className={`mt-2 ${field}`}
                />
              )}
              {showNotes &&
                (canNote || theirs != null || notes.text?.[key]) && (
                  <div className="mt-2 rounded-xl border-l-4 border-yellow bg-yellow/15 px-3 py-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-xs font-semibold text-navy/80">
                        {canNote
                          ? "Your rating and notes"
                          : `${who}'s rating and notes`}
                      </p>
                      {canNote ? (
                        <RatingChips
                          small
                          value={theirs}
                          disabled={false}
                          onPick={(x) => onNoteRating(key, x)}
                        />
                      ) : (
                        theirs != null && (
                          <span className="text-xs font-semibold text-navy">
                            {ratingText(theirs)}
                          </span>
                        )
                      )}
                    </div>
                    {canNote ? (
                      <input
                        value={notes.text?.[key] ?? ""}
                        onChange={(e) => onNote(key, e.target.value)}
                        placeholder={hint}
                        className="mt-1 w-full rounded-lg border border-yellow/60 bg-white/80 px-2.5 py-1 text-sm"
                      />
                    ) : (
                      notes.text?.[key] && (
                        <p className="mt-0.5 text-sm text-stone-800">
                          {notes.text[key]}
                        </p>
                      )
                    )}
                  </div>
                )}
            </li>
          );
        })}
      </ul>
      <label className="mt-2 block">
        <span className="text-sm font-medium text-navy">Anything else?</span>
        <textarea
          rows={2}
          value={extra}
          disabled={!canAnswer}
          onChange={(e) => onExtra(e.target.value)}
          className={area}
        />
      </label>
      <NoteBox
        k={`${group}Extra`}
        notes={notes}
        show={showNotes}
        edit={canNote}
        who={who}
        onChange={onNote}
      />
    </div>
  );
}

function SignOff({
  pdr,
  reviewer,
  myName,
  busy,
  onSign,
  onReopen,
  onPdf,
}: {
  pdr: Pdr;
  reviewer: boolean;
  myName: string;
  busy: boolean;
  onSign: (on: boolean) => void;
  onReopen: () => void;
  onPdf: () => void;
}) {
  const ready = !!pdr.notes_shared_at || !!pdr.locked_at;
  const when = (iso: string | null) =>
    iso
      ? new Date(iso).toLocaleDateString("en-AU", {
          day: "numeric",
          month: "long",
          year: "numeric",
        })
      : "";
  const sides = [
    {
      label: "Reviewee",
      name: pdr.reviewee_signed_name ?? pdr.reviewee_name,
      at: pdr.reviewee_signed_at,
      mine: !reviewer,
    },
    {
      label: "Reviewer",
      name:
        pdr.reviewer_signed_name ??
        (reviewer ? myName : (pdr.reviewer_name ?? "Community manager")),
      at: pdr.reviewer_signed_at,
      mine: reviewer,
    },
  ];
  return (
    <div className={box}>
      <h3 className="font-semibold text-navy">Sign-off</h3>
      <p className="text-sm text-stone-600">
        Tick to confirm this PDR is agreed and is an accurate record of the
        review and areas for development. When you&apos;ve both ticked, it
        locks. Changing anything after a tick clears both ticks.
      </p>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        {sides.map((s) => (
          <label
            key={s.label}
            className={`flex items-start gap-3 rounded-xl p-3 ring-1 ${s.at ? "bg-cyan/15 ring-cyan" : "bg-stone-50 ring-stone-200"}`}
          >
            <input
              type="checkbox"
              checked={!!s.at}
              disabled={!s.mine || !ready || busy || !!pdr.locked_at}
              onChange={(e) => onSign(e.target.checked)}
              className="mt-1 h-5 w-5 accent-navy"
            />
            <span className="text-sm">
              <span className="block text-xs font-bold uppercase tracking-wider text-stone-500">
                {s.label}
              </span>
              <span className="font-medium text-navy">{s.name}</span>
              <span className="block text-stone-600">
                {s.at
                  ? `Agreed ${when(s.at)}`
                  : s.mine
                    ? "This is an accurate record"
                    : "Not ticked yet"}
              </span>
            </span>
          </label>
        ))}
      </div>
      {!ready && (
        <p className="mt-2 text-xs text-stone-500">
          Sign-off opens once the meeting starts.
        </p>
      )}
      {pdr.locked_at && (
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <button
            onClick={onPdf}
            className="rounded-xl bg-pink px-4 py-2 text-sm font-semibold text-navy hover:bg-pink-strong"
          >
            Download PDF
          </button>
          {reviewer && (
            <button
              onClick={onReopen}
              disabled={busy}
              className="text-xs text-stone-500 hover:underline"
            >
              Reopen to make changes
            </button>
          )}
        </div>
      )}
    </div>
  );
}
