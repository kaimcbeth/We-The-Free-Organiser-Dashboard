import Link from "next/link";
import { requireOrganiser } from "@/lib/organiser";
import { MOCK_BANKED } from "@/lib/funding";
import { PrizeGuide } from "@/components/prize-guide";

export default async function PrizesPage() {
  await requireOrganiser();
  return (
    <>
      <Link
        href="/resources"
        className="text-sm font-medium text-stone-500 hover:text-stone-800 hover:underline"
      >
        ← Resources &amp; Training
      </Link>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight">
        Recommended prizes
      </h1>
      <p className="mt-1 text-stone-600">
        Vegan treats for people who take the Movie Challenge: what they cost,
        where to buy them, and how many to get.
      </p>
      <div className="mt-5">
        <PrizeGuide banked={MOCK_BANKED} />
      </div>
    </>
  );
}
