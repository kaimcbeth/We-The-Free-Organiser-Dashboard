import { requireOrganiser } from "@/lib/organiser";

// Funding: a home for reimbursements, grants and fundraising. For now a mock
// with example numbers, until funding comes in from the main website.
const MOCK_MONTHLY = 400;
const MOCK_SPENT = 250; // each month
const MOCK_MONTHS = 4;

export default async function FundingPage() {
  const { organiser } = await requireOrganiser();
  const community = organiser.team.name.replace(
    /, (Australia|New Zealand)$/,
    "",
  );
  // eslint-disable-next-line react-hooks/purity -- server component
  const now = new Date();
  const next = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const nextLabel = next.toLocaleDateString("en-AU", {
    day: "numeric",
    month: "long",
  });
  const months = Array.from({ length: MOCK_MONTHS }, (_, i) =>
    new Date(
      now.getFullYear(),
      now.getMonth() - MOCK_MONTHS + i,
      1,
    ).toLocaleDateString("en-AU", { month: "long" }),
  );
  const banked = MOCK_MONTHS * (MOCK_MONTHLY - MOCK_SPENT);

  return (
    <div className="space-y-6">
      <div className="flex items-baseline justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">Funding</h1>
        <span className="rounded-full bg-stone-100 px-2 py-0.5 text-xs text-stone-500">
          Preview: example numbers
        </span>
      </div>

      <section className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl bg-navy p-5 text-white shadow-sm">
          <p className="text-sm text-cyan">{community} has banked</p>
          <p className="mt-1 text-4xl font-semibold tracking-tight">
            ${banked}
          </p>
          <p className="mt-2 text-sm text-white/70">
            Unspent funding carries over, so you can save for bigger things.
          </p>
        </div>
        <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-black/5">
          <p className="text-sm text-stone-500">Bringing in</p>
          <p className="mt-1 text-4xl font-semibold tracking-tight">
            ${MOCK_MONTHLY}
            <span className="ml-1 text-base font-normal text-stone-500">
              per month
            </span>
          </p>
          <p className="mt-2 text-sm text-stone-500">
            From We The Free. Next payment {nextLabel}.
          </p>
        </div>
      </section>

      <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5">
        <h2 className="text-sm font-semibold">Last {MOCK_MONTHS} months</h2>
        <ul className="mt-2 divide-y divide-black/5 text-sm">
          {months.map((m) => (
            <li key={m} className="flex items-center justify-between py-2">
              <span>{m}</span>
              <span className="tabular-nums text-stone-500">
                +${MOCK_MONTHLY} in · −${MOCK_SPENT} spent ·{" "}
                <span className="font-medium text-navy">
                  +${MOCK_MONTHLY - MOCK_SPENT} banked
                </span>
              </span>
            </li>
          ))}
        </ul>
      </section>

      <p className="rounded-2xl border border-dashed border-stone-300 px-4 py-6 text-center text-sm text-stone-500">
        Spending, receipts and fundraising will show here once funding is
        connected to the We The Free website.
      </p>
    </div>
  );
}
