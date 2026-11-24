import type { Metadata } from "next";
import { SignSplitter } from "@/components/sign-splitter";
import { DemoHeader } from "../demo-header";

export const metadata: Metadata = {
  title: "DIY signs (demo) · We The Free Movement Hub",
  description:
    "Make your own Movie Challenge signs and table banner: print on A3, tape together and back with foam board.",
};

// Public demo of the DIY signs purchasing guide (Kai, 25 Nov 2026: "Make me
// a demo link for the diy sign purchasing guide"). In the Hub, the DIY
// handheld signs and DIY table banner guides open the sign splitter; this is
// the same tool with no login. ?sign=table-banner opens on the banner.
export default function DiySignsDemo() {
  return (
    <div className="flex flex-1 flex-col">
      <DemoHeader />
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 pb-16 pt-6">
        <h1 className="text-2xl font-semibold tracking-tight">DIY signs</h1>
        <p className="mt-1 text-stone-600">
          Make your own handheld signs and table banner for the 3 Minute Movie
          Challenge. Pick a sign, download it split into A3 sheets, print them
          on plain paper, tape them together and back them with foam board. The
          What to buy box shows what you need and roughly what it costs.
        </p>
        <div className="mt-5">
          <SignSplitter />
        </div>
      </main>
    </div>
  );
}
