import type { Metadata } from "next";
import { Equipment } from "@/components/equipment-guide";

export const metadata: Metadata = {
  title: "Build Your Kit (demo) · We The Free Movement Hub",
  description:
    "Try the Movement Hub's Build Your Kit tool for new organisers. Nothing is saved.",
};

// Public demo of Build Your Kit (Kai, 11 Nov 2026: a link for his operations
// director to try it). No login; the guide runs as a new organiser with no
// community, so nothing is saved.
export default function BuildYourKitDemo() {
  return (
    <div className="flex flex-1 flex-col">
      <header className="bg-navy text-white">
        <div className="mx-auto flex max-w-2xl items-center gap-3 px-4 py-3">
          {/* eslint-disable-next-line @next/next/no-img-element -- small static logo */}
          <img
            src="/brand/wtf-mark.png"
            alt="We The Free"
            className="h-9 w-auto"
          />
          <span className="leading-tight">
            <span className="block text-xs font-bold uppercase tracking-wider text-pink">
              Movement Hub
            </span>
            <span className="block text-sm font-medium">Demo</span>
          </span>
        </div>
      </header>
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 pb-16 pt-6">
        <h1 className="text-2xl font-semibold tracking-tight">
          Build Your Kit
        </h1>
        <p className="mt-1 text-stone-600">
          This is what a new organiser sees when setting up their Movie
          Challenge kit. Switch between Budget, DIY and Best, change the
          numbers, and watch the total and the $500 equipment grant update.
          It&apos;s a demo, so nothing is saved.
        </p>
        <div className="mt-5">
          <Equipment teamId={null} newOrganiser />
        </div>
      </main>
    </div>
  );
}
