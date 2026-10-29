import { requireOrganiser } from "@/lib/organiser";

// Funding: a home for reimbursements, grants and fundraising. For now a mock
// with example numbers, until funding comes in from the main website.
const MOCK_MONTHLY = 400;

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

  return (
    <div className="space-y-6">
      <div className="flex items-baseline justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">Funding</h1>
        <span className="rounded-full bg-stone-100 px-2 py-0.5 text-xs text-stone-500">
          Preview: example numbers
        </span>
      </div>

      <section className="rounded-2xl bg-navy p-5 text-white shadow-sm">
        <p className="text-sm text-cyan">{community} gets</p>
        <p className="mt-1 text-4xl font-semibold tracking-tight">
          ${MOCK_MONTHLY}
          <span className="ml-1 text-base font-normal text-white/70">
            per month
          </span>
        </p>
        <p className="mt-3 text-sm text-white/70">
          From We The Free, for equipment, printing and event costs. Next
          payment {nextLabel}.
        </p>
      </section>

      <p className="rounded-2xl border border-dashed border-stone-300 px-4 py-6 text-center text-sm text-stone-500">
        Spending, receipts and fundraising will show here once funding is
        connected to the We The Free website.
      </p>
    </div>
  );
}
