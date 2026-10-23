"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { TaskChooser } from "@/components/task-chooser";
import type { TaskSetup } from "@/lib/task-setup";

// "Choose tasks" on the Tasks page (and a nudge if no one has chosen yet).
export function ChooseTasks({
  setup,
  communityName,
}: {
  setup: TaskSetup;
  communityName: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const onCount = setup.enabled.length;

  return (
    <>
      {!setup.configured ? (
        <div
          data-tour="choose-tasks"
          className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-yellow/40 p-4"
        >
          <p className="text-sm text-navy">
            <span className="font-semibold">Pick your tasks.</span> Tell us how
            much time you have each week and we&apos;ll suggest which follow-up
            tasks to make after each event.
          </p>
          <button
            onClick={() => setOpen(true)}
            className="rounded-xl bg-navy px-4 py-2 text-sm font-semibold text-white hover:bg-navy-2"
          >
            Choose tasks
          </button>
        </div>
      ) : (
        <button
          onClick={() => setOpen(true)}
          data-tour="choose-tasks"
          className="rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-navy ring-1 ring-stone-300 hover:bg-stone-50"
        >
          Choose tasks ({onCount} on)
        </button>
      )}
      {open && (
        <TaskChooser
          setup={setup}
          communityName={communityName}
          startWithTime={!setup.configured}
          onClose={(saved) => {
            setOpen(false);
            if (saved) router.refresh();
          }}
        />
      )}
    </>
  );
}
