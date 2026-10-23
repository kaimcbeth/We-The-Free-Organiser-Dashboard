"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// Core Team: Attendance and their own tasks.
export function CoreTabs({ openTasks }: { openTasks: number }) {
  const path = usePathname();
  const tasks = path.startsWith("/attendance/tasks");
  const cls = (active: boolean) =>
    `border-b-2 px-3 pb-2.5 pt-1 text-sm font-medium ${
      active
        ? "border-pink text-white"
        : "border-transparent text-white/65 hover:text-white"
    }`;
  return (
    <nav className="mx-auto flex max-w-2xl gap-1 px-4">
      <Link href="/attendance" className={cls(!tasks)}>
        Attendance
      </Link>
      <Link href="/attendance/tasks" className={cls(tasks)}>
        My actions
        {openTasks > 0 && (
          <span className="ml-1.5 rounded-full bg-pink px-1.5 py-0.5 text-[10px] font-bold text-navy">
            {openTasks}
          </span>
        )}
      </Link>
    </nav>
  );
}
