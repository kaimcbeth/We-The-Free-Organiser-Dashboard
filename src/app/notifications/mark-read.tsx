"use client";

import { useEffect, useTransition } from "react";
import { markAllNotificationsRead } from "@/app/buddy-actions";

// Opening the page marks everything as read (the pink dots stay for this visit).
export function MarkRead() {
  const [, start] = useTransition();
  useEffect(() => {
    start(() => markAllNotificationsRead());
  }, []);
  return null;
}
