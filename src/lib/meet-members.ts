// Meet the Members: the questions sent to the volunteer being featured each
// month. Communities can change them (teams.meet_members_questions); this is
// the default.
export const MEET_MEMBERS_DEFAULT = `👋 MEET THE MEMBERS 👋

📍 Where are you from?

🧙‍♀️ What's your day job?

⚽️ What are your hobbies?

🎥 What's your favourite movie?

🎵 What music do you like?

🍜 What's your favourite food?

🌱 How long have you been vegan?

💚 What inspired you to go vegan?

✊ What and when was your first activism experience?

💛 What's your favourite activism memory?`;

export type MeetQuestion = { emoji: string; text: string; full: string };

// The questions from the list (one per line; the "MEET THE MEMBERS" heading
// line is skipped). The emoji at the start of a line is kept apart.
export function parseQuestions(list: string): MeetQuestion[] {
  return list
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l && !/meet the members/i.test(l))
    .map((full) => {
      const m = full.match(/^([^\p{L}\p{N}]*)(.*)$/u);
      return {
        emoji: (m?.[1] ?? "").trim(),
        text: (m?.[2] ?? full).trim(),
        full,
      };
    });
}

const norm = (s: string) =>
  s
    .toLowerCase()
    .replace(/[’']/g, "")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();

const tidy = (s: string) =>
  s
    .replace(/^\s*(a|answer)\s*[:\-–]\s*/i, "")
    .replace(/^\s*[-–:•]\s*/, "")
    .trim();

// Splits a member's pasted reply into one answer per question. Looks for each
// question in the reply (answers sit under, or after, their question); if
// most questions can't be found, takes the reply's paragraphs in order.
export function splitAnswers(qs: MeetQuestion[], reply: string): string[] {
  const lines = reply.replace(/\r/g, "").split("\n");
  const at: number[] = qs.map(() => -1);
  const keys = qs.map((q) => norm(q.text));
  lines.forEach((line, i) => {
    const n = norm(line);
    if (!n) return;
    const q = keys.findIndex(
      (k, j) =>
        at[j] === -1 &&
        k &&
        (n.includes(k) || (k.length > 16 && n.includes(k.slice(0, 16)))),
    );
    if (q >= 0) at[q] = i;
  });
  const found = at.filter((i) => i >= 0).length;
  if (found >= Math.ceil(qs.length / 2)) {
    const marks = at
      .map((line, q) => ({ line, q }))
      .filter((m) => m.line >= 0)
      .sort((a, b) => a.line - b.line);
    const out = qs.map(() => "");
    marks.forEach((m, k) => {
      const end = k + 1 < marks.length ? marks[k + 1].line : lines.length;
      const first = lines[m.line];
      const qm = first.lastIndexOf("?");
      const rest = qm >= 0 ? first.slice(qm + 1) : "";
      out[m.q] = tidy(
        [rest, ...lines.slice(m.line + 1, end)].join("\n").trim(),
      );
    });
    return out;
  }
  const blocks = reply
    .replace(/\r/g, "")
    .split(/\n\s*\n/)
    .map((b) => b.trim())
    .filter((b) => b && !/meet the members/i.test(b));
  return qs.map((_, i) => tidy(blocks[i] ?? ""));
}
