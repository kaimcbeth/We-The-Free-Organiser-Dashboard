"use client";

import { useState, useTransition } from "react";
import {
  assignTask,
  completeCheckIn,
  dismissTask,
  setStandingDelegate,
  setTaskDone,
} from "@/app/actions";
import { formatEventDate } from "@/lib/time";
import { Sheet } from "@/components/sheet";
import { Avatar } from "@/components/avatar";
import { PhotoUploader } from "@/components/photo-uploader";
import {
  GraphicMaker,
  type GraphicEvent,
  type GraphicSize,
} from "@/components/graphic-maker";
import { MoveTask } from "@/components/move-task";
import { FbGroupsButton } from "@/components/fb-groups-button";
import { inputClass } from "@/components/form";
import {
  FacebookEventButton,
  type FbEventDetails,
} from "@/components/facebook-event";

export type TaskRow = {
  id: string;
  teamId: string;
  regional: boolean; // a Regional Support Lead task

  kind: string;
  sortOrder: number;
  eventId: string | null;
  eventTypeId: string | null;
  eventTypeName: string | null;
  title: string;
  description: string | null;
  estimateMinutes: number;
  estimateLabel: string; // e.g. "5" or "5–10"
  dueAt: string;
  showFrom: string | null; // moved: hidden until then
  doneAt: string | null;
  eventTitle: string | null;
  eventAt: string | null;
  fbEvent?: FbEventDetails | null; // "Facebook event created" tasks
  graphic?: { size: GraphicSize; event: GraphicEvent } | null; // promo actions
  assignedTo: string | null;
  assigneeName: string | null;
  delegatedBy?: { name: string; photoUrl: string | null } | null; // who handed it to me
};

// "Due today", "Due tomorrow", "2 days overdue"...
function dueLabel(dueAt: string, now: number) {
  // Traffic lights, never "overdue": red = do today, orange = in the next
  // few days, yellow = sometime this week.
  const hours = (Date.parse(dueAt) - now) / 36e5;
  if (hours <= 24)
    return {
      text: "Do today",
      dot: "bg-[#ef4444]",
      tone: "bg-[#ef4444]/10 text-[#b91c1c]",
    };
  if (hours <= 72)
    return {
      text: "Next few days",
      dot: "bg-[#f97316]",
      tone: "bg-[#f97316]/10 text-[#c2410c]",
    };
  return {
    text: "This week",
    dot: "bg-yellow",
    tone: "bg-yellow/25 text-navy",
  };
}

export function TaskCard({
  task,
  tz,
  now,
  people,
  whatsappUrl,
  hideEvent = false,
  standing = {},
  extra,
  removable = false,
  moveEvents,
}: {
  task: TaskRow;
  tz: string;
  now: number;
  people?: { id: string; name: string }[]; // organisers: who it can be assigned to
  whatsappUrl: string | null;
  hideEvent?: boolean; // when shown under the event's own heading
  standing?: Record<string, string>; // kind -> standing delegate (person id)
  extra?: React.ReactNode; // shown under the description (e.g. check-in ideas)
  removable?: boolean; // show the × even without delegating (Regional Support Lead tasks)
  moveEvents?: { title: string; at: string }[]; // events "Move" can line up with
}) {
  const [done, setDone] = useState(!!task.doneAt);
  const [assignee, setAssignee] = useState(task.assignedTo ?? "");
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  const [removed, setRemoved] = useState(false);
  // "Every time" delegation is per kind of task and per event type.
  const standingKey = `${task.kind}|${task.eventTypeId ?? ""}`;
  const [delegating, setDelegating] = useState(false);
  const [search, setSearch] = useState("");
  const [always, setAlways] = useState(standing[standingKey] ?? "");
  const [everyTime, setEveryTime] = useState(!!standing[standingKey]);

  function delegate(personId: string, clearStanding = false) {
    setDelegating(false);
    setSearch("");
    const before = assignee;
    const beforeAlways = always;
    setAssignee(personId);
    // "Every time" sets the standing delegate for this kind of task;
    // "Take it back" clears it. "Just this once" leaves it alone.
    const standingChange =
      everyTime && personId ? personId : clearStanding ? "" : null;
    if (standingChange !== null) setAlways(standingChange);
    start(async () => {
      if (standingChange !== null) {
        const s = await setStandingDelegate(
          task.kind,
          task.eventTypeId,
          standingChange || null,
        );
        if (s.error) {
          setAlways(beforeAlways);
          setError(s.error);
          return;
        }
      }
      const r = await assignTask(task.id, personId || null);
      if (r.error) {
        setAssignee(before);
        setError(r.error);
      } else setError("");
    });
  }
  const due = dueLabel(task.dueAt, now);
  if (removed) return null;

  return (
    <li
      data-tour={`task-${task.kind}`}
      className={`relative rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5 transition ${done ? "opacity-60" : ""}`}
    >
      {(people || removable) && (
        <button
          type="button"
          aria-label="Remove action"
          title="Remove action"
          disabled={pending}
          onClick={() =>
            start(async () => {
              setRemoved(true);
              const r = await dismissTask(task.id);
              if (r.error) {
                setRemoved(false);
                setError(r.error);
              }
            })
          }
          className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full text-stone-300 hover:bg-stone-100 hover:text-stone-600"
        >
          <svg
            viewBox="0 0 20 20"
            className="h-3.5 w-3.5"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            aria-hidden
          >
            <path d="M6 6l8 8M14 6l-8 8" strokeLinecap="round" />
          </svg>
        </button>
      )}
      <div className="flex items-start gap-3 pr-6">
        <button
          type="button"
          role="checkbox"
          aria-checked={done}
          aria-label={done ? "Mark as not done" : "Mark as done"}
          disabled={pending}
          onClick={() => {
            // Check-ins: ticking means they replied (the usual case).
            if (task.regional && !done) {
              start(async () => {
                setDone(true);
                const r = await completeCheckIn(task.id, "replied");
                if (r.error) {
                  setDone(false);
                  setError(r.error);
                }
              });
              return;
            }
            start(async () => {
              const next = !done;
              setDone(next);
              const r = await setTaskDone(task.id, next);
              if (r.error) {
                setDone(!next);
                setError(r.error);
              } else setError("");
            });
          }}
          className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 ${
            done
              ? "border-cyan bg-cyan text-navy"
              : "border-stone-300 hover:border-cyan"
          }`}
        >
          {done && (
            <svg
              viewBox="0 0 20 20"
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              aria-hidden
            >
              <path
                d="M4 10.5l4 4 8-9"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          )}
        </button>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className={`font-semibold ${done ? "line-through" : ""}`}>
              {task.title}
            </p>
            <span className="rounded-full bg-navy/5 px-2 py-0.5 text-xs font-semibold text-navy">
              ~{task.estimateLabel} min
            </span>
            {!done && (
              <span
                className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-semibold ${due.tone}`}
              >
                <span
                  aria-hidden
                  className={`h-2 w-2 rounded-full ${due.dot}`}
                />
                {due.text}
              </span>
            )}
          </div>
          {task.eventTitle && !hideEvent && (
            <p className="text-sm text-stone-500">
              {task.eventTitle}
              {task.eventAt ? `, ${formatEventDate(task.eventAt, tz)}` : ""}
            </p>
          )}
          {task.description && !done && (
            <p className="mt-1 text-sm text-stone-600">{task.description}</p>
          )}
          {extra && !done && <div className="mt-3">{extra}</div>}

          {!done && (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {task.kind === "take_attendance" && task.eventId && (
                <a
                  href={`/events/${task.eventId}`}
                  className="rounded-xl bg-pink px-3 py-1.5 text-sm font-semibold text-navy hover:bg-pink-strong"
                >
                  Take attendance →
                </a>
              )}
              {(task.kind === "promote_facebook_groups" ||
                task.kind === "promote_fb_groups_weekly") && (
                <FbGroupsButton teamId={task.teamId} canEdit={!!people} />
              )}
              {task.kind === "approval_submitted" && task.eventId && (
                <a
                  href={`/approvals/${task.eventId}`}
                  className="rounded-xl bg-pink px-3 py-1.5 text-sm font-semibold text-navy hover:bg-pink-strong"
                >
                  Fill in &amp; send
                </a>
              )}
              {task.kind === "personal_invites" && task.eventId && (
                <a
                  href={`/invites/${task.eventId}`}
                  target="_blank"
                  rel="noopener"
                  className="rounded-xl bg-pink px-3 py-1.5 text-sm font-semibold text-navy hover:bg-pink-strong"
                >
                  Open invite list ↗
                </a>
              )}
              {task.kind === "take_photos" && task.eventId && (
                <PhotoUploader
                  teamId={task.teamId}
                  eventId={task.eventId}
                  label="Upload photos"
                  className="rounded-xl bg-navy/5 px-3 py-1.5 text-sm font-semibold text-navy hover:bg-navy/10"
                />
              )}
              {task.graphic && (
                <GraphicMaker
                  event={task.graphic.event}
                  tz={tz}
                  initialSize={task.graphic.size}
                  // Posting a set of photos: a carousel suits it best.
                  carousel={
                    task.kind === "post_photos_instagram" ||
                    task.kind === "post_photos_facebook"
                  }
                  label={
                    task.kind === "post_photos_instagram" ||
                    task.kind === "post_photos_facebook"
                      ? "Make carousel"
                      : "Get graphic"
                  }
                  className="rounded-xl bg-navy/5 px-3 py-1.5 text-sm font-semibold text-navy hover:bg-navy/10"
                />
              )}
              {task.fbEvent && (
                <FacebookEventButton event={task.fbEvent} tz={tz} />
              )}
              {whatsappUrl &&
                (task.kind === "post_photos" ||
                  task.kind === "promote_whatsapp") && (
                  <a
                    href={whatsappUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-xl bg-[#25D366] px-3 py-1.5 text-sm font-semibold text-navy hover:brightness-95"
                  >
                    Open WhatsApp ↗
                  </a>
                )}
              {people &&
                (assignee ? (
                  <span className="flex items-center gap-1.5 rounded-xl bg-navy/5 py-1.5 pl-3 pr-1.5 text-sm">
                    {always === assignee
                      ? "Always delegated to"
                      : "Delegated to"}{" "}
                    <span className="font-semibold text-navy">
                      {people.find((p) => p.id === assignee)?.name ?? "someone"}
                    </span>
                    <button
                      onClick={() => setDelegating(true)}
                      className="rounded-lg px-1.5 py-0.5 text-xs font-medium text-pink-ink hover:bg-white"
                    >
                      Change
                    </button>
                  </span>
                ) : (
                  <button
                    onClick={() => setDelegating(true)}
                    data-tour="delegate-button"
                    className="rounded px-1 py-0.5 text-xs text-stone-400 hover:text-stone-700 hover:underline"
                  >
                    Delegate
                  </button>
                ))}
              <MoveTask
                taskId={task.id}
                tz={tz}
                eventAt={
                  task.eventAt && Date.parse(task.eventAt) > now
                    ? task.eventAt
                    : null
                }
                events={moveEvents}
                onMoved={() => setRemoved(true)}
              />
              {task.regional && (
                <button
                  disabled={pending}
                  onClick={() =>
                    start(async () => {
                      setDone(true);
                      const r = await completeCheckIn(task.id, "no_reply");
                      if (r.error) {
                        setDone(false);
                        setError(r.error);
                      }
                    })
                  }
                  title="Tick off, and no more monthly check-ins for them until they reply"
                  className="rounded px-1 py-0.5 text-xs text-stone-400 hover:text-stone-700 hover:underline"
                >
                  No reply yet
                </button>
              )}
              {!people && task.assigneeName && (
                <span className="ml-auto flex items-center gap-1.5 text-xs text-stone-400">
                  Delegated to you
                  {task.delegatedBy && (
                    <>
                      {" "}
                      by {task.delegatedBy.name.split(" ")[0]}
                      <Avatar
                        name={task.delegatedBy.name}
                        url={task.delegatedBy.photoUrl}
                        size={22}
                      />
                    </>
                  )}
                </span>
              )}
            </div>
          )}
          {error && <p className="mt-1 text-sm text-red-700">{error}</p>}
        </div>
      </div>
      {delegating && people && (
        <Sheet
          title="Delegate this action"
          onClose={() => setDelegating(false)}
        >
          <p className="mb-3 text-sm text-stone-600">
            <span className="font-medium text-stone-900">{task.title}</span>
            {task.eventTitle ? ` for ${task.eventTitle}` : ""}. They&apos;ll get
            a notification and see it on their page.
          </p>
          <div
            className="mb-3 grid grid-cols-2 gap-2"
            role="radiogroup"
            aria-label="How often"
          >
            {[
              { v: false, label: "Just this once", hint: "Only this action" },
              {
                v: true,
                label: "Every time",
                hint: `All future “${task.title}” actions${task.eventTypeName ? ` for ${task.eventTypeName} events` : ""}`,
              },
            ].map((o) => (
              <button
                key={String(o.v)}
                role="radio"
                aria-checked={everyTime === o.v}
                onClick={() => setEveryTime(o.v)}
                className={`rounded-xl p-3 text-left ring-1 ${
                  everyTime === o.v
                    ? "bg-navy text-white ring-navy"
                    : "bg-white text-navy ring-stone-300"
                }`}
              >
                <span className="block text-sm font-semibold">{o.label}</span>
                <span
                  className={`block text-xs ${everyTime === o.v ? "text-white/70" : "text-stone-500"}`}
                >
                  {o.hint}
                </span>
              </button>
            ))}
          </div>
          <input
            type="search"
            autoFocus
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search members"
            aria-label="Search members"
            className={inputClass}
          />
          <ul className="mt-3 max-h-72 divide-y divide-black/5 overflow-y-auto rounded-2xl bg-white ring-1 ring-black/5">
            {people
              .filter((p) =>
                p.name.toLowerCase().includes(search.trim().toLowerCase()),
              )
              .map((p) => (
                <li key={p.id}>
                  <button
                    onClick={() => delegate(p.id)}
                    className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-stone-50"
                  >
                    <span className="font-medium">{p.name}</span>
                    {p.id === assignee && (
                      <span className="text-xs text-stone-500">Current</span>
                    )}
                  </button>
                </li>
              ))}
          </ul>
          {people.length === 0 && (
            <p className="mt-3 text-sm text-stone-500">
              No members yet. People can be delegated actions once they&apos;ve
              made an account.
            </p>
          )}
          {assignee && (
            <button
              onClick={() => {
                setEveryTime(false);
                delegate("", !!always);
              }}
              className="mt-3 w-full rounded-xl px-4 py-2.5 text-sm font-semibold text-stone-600 ring-1 ring-stone-300 hover:bg-stone-50"
            >
              {always
                ? "Take it back and stop delegating every time"
                : "Take it back (any organiser)"}
            </button>
          )}
        </Sheet>
      )}
    </li>
  );
}
