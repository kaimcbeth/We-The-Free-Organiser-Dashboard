import Link from "next/link";
import { SignSplitter } from "@/components/sign-splitter";

export default function MemberSignsPage() {
  return (
    <>
      <Link
        href="/me/resources"
        className="text-sm font-medium text-stone-500 hover:text-stone-800 hover:underline"
      >
        ← Resources
      </Link>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight">
        Sign splitter
      </h1>
      <p className="mt-1 text-stone-600">
        Print a big sign or the table banner on A4 or A3 sheets at home, then
        tape them together.
      </p>
      <div className="mt-5">
        <SignSplitter />
      </div>
    </>
  );
}
