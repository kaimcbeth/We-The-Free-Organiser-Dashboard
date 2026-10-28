import { requireOrganiser } from "@/lib/organiser";

// Funding: a home for reimbursements, grants and fundraising. Blank for now.
export default async function FundingPage() {
  await requireOrganiser();
  return (
    <>
      <h1 className="text-2xl font-semibold tracking-tight">Funding</h1>
      <p className="mt-6 rounded-2xl border border-dashed border-stone-300 px-4 py-6 text-center text-sm text-stone-500">
        Coming soon.
      </p>
    </>
  );
}
