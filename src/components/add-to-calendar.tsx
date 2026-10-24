"use client";

import { useState } from "react";
import { googleCalendarLink, icsFor, type CalEvent } from "@/lib/ics";

// Subtle "Add to calendar" for one event: Google Calendar, or a .ics file
// for Apple / Outlook.
export function AddToCalendar({ event }: { event: CalEvent }) {
  const [open, setOpen] = useState(false);
  return (
    <span className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="text-xs font-medium text-stone-500 hover:text-stone-800 hover:underline"
      >
        Add to calendar
      </button>
      {open && (
        <span className="absolute left-0 top-6 z-20 flex w-52 flex-col rounded-xl bg-white p-1 text-sm shadow-lg ring-1 ring-black/10">
          <a
            href={googleCalendarLink(event)}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => setOpen(false)}
            className="rounded-lg px-3 py-2 hover:bg-stone-100"
          >
            Google Calendar ↗
          </a>
          <button
            type="button"
            onClick={() => {
              const a = document.createElement("a");
              a.href = URL.createObjectURL(
                new Blob([icsFor([event], event.title)], {
                  type: "text/calendar",
                }),
              );
              a.download = `${event.title.replace(/[^\w ]/g, "")}.ics`;
              a.click();
              setOpen(false);
            }}
            className="rounded-lg px-3 py-2 text-left hover:bg-stone-100"
          >
            Apple / Outlook (.ics)
          </button>
        </span>
      )}
    </span>
  );
}

// Subtle "Calendar" for all of a community's events: subscribe (stays up to
// date) or download once.
export function CalendarFeed({ token }: { token: string }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const feed = () => `${window.location.origin}/calendar/${token}.ics`;
  return (
    <span className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="text-xs font-medium text-stone-500 hover:text-stone-800 hover:underline"
      >
        Add all to calendar
      </button>
      {open && (
        <span className="absolute right-0 top-6 z-20 flex w-64 flex-col rounded-xl bg-white p-1 text-sm shadow-lg ring-1 ring-black/10">
          <a
            href="#"
            onClick={(e) => {
              e.preventDefault();
              const url = feed().replace(/^https?:/, "webcal:");
              window.open(
                `https://calendar.google.com/calendar/r?cid=${encodeURIComponent(url)}`,
                "_blank",
              );
              setOpen(false);
            }}
            className="rounded-lg px-3 py-2 hover:bg-stone-100"
          >
            Subscribe in Google Calendar ↗
            <span className="block text-xs text-stone-500">
              Stays up to date as events change
            </span>
          </a>
          <a
            href={`/calendar/${token}.ics?download=1`}
            onClick={() => setOpen(false)}
            className="rounded-lg px-3 py-2 hover:bg-stone-100"
          >
            Download all (.ics)
          </a>
          <button
            type="button"
            onClick={async () => {
              await navigator.clipboard.writeText(feed());
              setCopied(true);
              setTimeout(() => setCopied(false), 1500);
            }}
            className="rounded-lg px-3 py-2 text-left hover:bg-stone-100"
          >
            {copied ? "Copied ✓" : "Copy feed link (Apple, Outlook)"}
          </button>
        </span>
      )}
    </span>
  );
}
