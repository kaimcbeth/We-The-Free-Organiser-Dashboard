import { QUESTIONS, STAGES } from "@/lib/outreach-guide";

// The conversation questions, stage by stage. Nothing else.
export function QuestionSheet() {
  return (
    <div className="space-y-4">
      {STAGES.map((s) => (
        <section
          key={s.id}
          className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5"
        >
          <h2 className="font-semibold text-navy">{s.label}</h2>
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
    </div>
  );
}
