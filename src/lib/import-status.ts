export type ImportRun = { ran_at: string; ok: boolean; added: number; updated: number; message: string | null };

function ago(iso: string, now: number) {
  const mins = Math.round((now - Date.parse(iso)) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs} hr${hrs === 1 ? "" : "s"} ago`;
  const days = Math.round(hrs / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

// Summary line for the Events page, worked out on the server.
export function describeImport(lastRun: ImportRun | null, lastOk: ImportRun | null, now = Date.now()) {
  const failing = !!lastRun && !lastRun.ok;
  const stale = !!lastRun && (!lastOk || now - Date.parse(lastOk.ran_at) > 2 * 864e5);
  return {
    warning: failing || stale,
    text: failing || stale
      ? `Event import isn't working.${lastOk ? ` Last worked ${ago(lastOk.ran_at, now)}.` : ""} Add events by hand for now.`
      : lastOk
        ? `Synced from activism.wtf ${ago(lastOk.ran_at, now)}`
        : "Events come from activism.wtf automatically",
  };
}
