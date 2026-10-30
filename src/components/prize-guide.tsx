"use client";

import { useState } from "react";
import {
  PRIZES,
  REIMBURSE_AUD,
  REIMBURSE_USD,
  overBy,
  perPrize,
  type Prize,
} from "@/lib/prizes";

const aud = (n: number) =>
  n % 1 === 0 ? `A$${n.toLocaleString("en-AU")}` : `A$${n.toFixed(2)}`;
const cents = (n: number) => `A$${n.toFixed(2)}`;

const VEGAN_TONE: Record<Prize["vegan"], string> = {
  "Labelled vegan": "bg-emerald-100 text-emerald-800",
  "Accidentally vegan": "bg-emerald-50 text-emerald-700",
  "Check label": "bg-amber-100 text-amber-800",
};

// The recommended prizes, in the app: what each costs per prize, whether it's
// within the reimbursement, and how many packs to buy for the crowd expected.
// Prizes over the reimbursement are suggested as "premium" when the
// community has funding banked.
export function PrizeGuide({ banked }: { banked: number }) {
  const [people, setPeople] = useState(50);
  const [category, setCategory] = useState<string | null>(null);
  const [wrappedOnly, setWrappedOnly] = useState(false);
  const [shelfOnly, setShelfOnly] = useState(false);

  const categories = [...new Set(PRIZES.map((p) => p.category))];
  const shown = PRIZES.filter(
    (p) =>
      (!category || p.category === category) &&
      (!wrappedOnly || p.wrapped === true) &&
      (!shelfOnly || p.shelfStable),
  ).sort((a, b) => (perPrize(a) ?? 99) - (perPrize(b) ?? 99));
  const within = shown.filter((p) => overBy(p) === 0);
  const premium = shown.filter((p) => (overBy(p) ?? 0) > 0);
  const unpriced = shown.filter((p) => overBy(p) === null);
  const n = Math.max(1, people || 1);
  // Premium prizes the banked funding could cover for this crowd.
  const affordable = premium.filter((p) => (overBy(p) ?? 0) * n <= banked);

  return (
    <div>
      <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5">
        <p className="text-sm text-stone-700">
          We The Free reimburses up to{" "}
          <b>
            US${REIMBURSE_USD.toFixed(2)} per prize (about{" "}
            {cents(REIMBURSE_AUD)})
          </b>
          . Every prize here is vegan (check the flavour where it says so), and
          most are individually wrapped.
        </p>
        <label className="mt-3 flex flex-wrap items-center gap-2 text-sm text-stone-700">
          Expecting about
          <input
            type="number"
            min={1}
            value={people}
            onChange={(e) => setPeople(Number(e.target.value))}
            className="w-20 rounded-lg bg-white px-2 py-1 text-center ring-1 ring-black/15 focus:outline-none focus:ring-2 focus:ring-cyan"
          />
          people
          <span className="text-xs text-stone-500">
            (packs and cost below are worked out for this many)
          </span>
        </label>
        <div className="mt-3 flex flex-wrap gap-2">
          <Chip on={!category} onClick={() => setCategory(null)}>
            All
          </Chip>
          {categories.map((c) => (
            <Chip
              key={c}
              on={category === c}
              onClick={() => setCategory(category === c ? null : c)}
            >
              {c === "Other" ? "Ice blocks" : c}
            </Chip>
          ))}
          <span className="mx-1 w-px bg-stone-200" aria-hidden />
          <Chip on={wrappedOnly} onClick={() => setWrappedOnly((x) => !x)}>
            Individually wrapped
          </Chip>
          <Chip on={shelfOnly} onClick={() => setShelfOnly((x) => !x)}>
            Shelf-stable
          </Chip>
        </div>
      </div>

      <h2 className="mt-6 text-lg font-semibold tracking-tight">
        Within the reimbursement
      </h2>
      <p className="text-sm text-stone-600">Cheapest per prize first.</p>
      {within.length ? (
        <ul className="mt-3 space-y-3">
          {within.map((p) => (
            <PrizeCard key={p.name} p={p} people={n} />
          ))}
        </ul>
      ) : (
        <Empty />
      )}

      <h2 className="mt-8 text-lg font-semibold tracking-tight">
        Premium prizes
      </h2>
      {banked > 0 && affordable.length > 0 ? (
        <p className="mt-1 rounded-xl bg-cyan/15 px-3 py-2 text-sm text-navy">
          <b>Recommended with your funding.</b> Your community has {aud(banked)}{" "}
          banked, so you could treat people to a bigger prize. The extra over
          the reimbursement for {n} people is shown on each.
        </p>
      ) : (
        <p className="text-sm text-stone-600">
          Over the reimbursement, so the difference comes from your
          community&apos;s own funding.
          {banked > 0
            ? ` Your ${aud(banked)} banked doesn't cover the extra for ${n} people.`
            : ""}
        </p>
      )}
      {premium.length ? (
        <ul className="mt-3 space-y-3">
          {premium.map((p) => (
            <PrizeCard
              key={p.name}
              p={p}
              people={n}
              recommended={affordable.includes(p)}
            />
          ))}
        </ul>
      ) : (
        <Empty />
      )}

      {unpriced.length > 0 && (
        <>
          <h2 className="mt-8 text-lg font-semibold tracking-tight">
            Check the shelf price
          </h2>
          <p className="text-sm text-stone-600">
            Not priced online, so check in store whether they&apos;re within{" "}
            {cents(REIMBURSE_AUD)} a prize.
          </p>
          <ul className="mt-3 space-y-3">
            {unpriced.map((p) => (
              <PrizeCard key={p.name} p={p} people={n} />
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

function Chip({
  on,
  onClick,
  children,
}: {
  on: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={on}
      className={`rounded-full px-3 py-1 text-xs font-medium ring-1 ${
        on
          ? "bg-navy text-white ring-navy"
          : "bg-white text-stone-600 ring-black/10 hover:ring-pink"
      }`}
    >
      {children}
    </button>
  );
}

function Empty() {
  return (
    <p className="mt-3 rounded-2xl border border-dashed border-stone-300 px-4 py-5 text-center text-sm text-stone-500">
      Nothing matches these filters.
    </p>
  );
}

function PrizeCard({
  p,
  people,
  recommended = false,
}: {
  p: Prize;
  people: number;
  recommended?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const each = perPrize(p);
  const over = overBy(p);
  const packs = Math.ceil(people / p.perPack);
  const shops = p.where.split("|").map((s) => s.trim());
  return (
    <li
      className={`rounded-2xl bg-white p-4 shadow-sm ring-1 ${
        recommended ? "ring-2 ring-cyan" : "ring-black/5"
      }`}
    >
      <div className="flex flex-wrap items-start gap-x-3 gap-y-1">
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-navy">{p.name}</p>
          <p className="text-xs text-stone-500">
            {p.brand} · {p.category === "Other" ? "Ice blocks" : p.category}
          </p>
        </div>
        <div className="text-right">
          {each === null ? (
            <p className="text-sm font-medium text-stone-500">
              Price not online
            </p>
          ) : (
            <>
              <p className="text-lg font-semibold tabular-nums text-navy">
                {cents(each)}
                <span className="text-xs font-normal text-stone-500">
                  {" "}
                  each
                </span>
              </p>
              <p className="text-xs text-stone-500">
                {cents(p.price!)} for {p.perPack}
              </p>
            </>
          )}
        </div>
      </div>

      <div className="mt-2 flex flex-wrap gap-1.5 text-xs font-medium">
        {over !== null &&
          (over > 0 ? (
            <span className="rounded-full bg-pink/15 px-2 py-0.5 text-pink-ink">
              {cents(over)} over per prize
            </span>
          ) : (
            <span className="rounded-full bg-cyan/20 px-2 py-0.5 text-navy">
              Within reimbursement
            </span>
          ))}
        {recommended && (
          <span className="rounded-full bg-cyan px-2 py-0.5 text-navy">
            Recommended with your funding
          </span>
        )}
        <span className={`rounded-full px-2 py-0.5 ${VEGAN_TONE[p.vegan]}`}>
          {p.vegan}
        </span>
        {p.wrapped === false && (
          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-amber-800">
            Not individually wrapped
          </span>
        )}
        {p.wrapped === null && (
          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-amber-800">
            Check if wrapped
          </span>
        )}
        {!p.shelfStable && (
          <span className="rounded-full bg-stone-100 px-2 py-0.5 text-stone-600">
            Not shelf-stable
          </span>
        )}
        {p.season && (
          <span className="rounded-full bg-yellow/60 px-2 py-0.5 text-navy">
            {p.season} only
          </span>
        )}
      </div>

      <p className="mt-2 text-sm text-stone-700">
        {each === null ? (
          <>
            For {people}: {packs} {packs === 1 ? "pack" : "packs"} (check the
            shelf price)
          </>
        ) : (
          <>
            For {people}: {packs} {packs === 1 ? "pack" : "packs"},{" "}
            <b>{cents(packs * p.price!)}</b>
            {over! > 0 && (
              <span className="text-pink-ink">
                {" "}
                ({cents(over! * people)} over the reimbursement)
              </span>
            )}
          </>
        )}
      </p>
      <p className="mt-1 text-sm text-stone-600">
        <span className="text-stone-500">Where: </span>
        {p.url ? (
          <a
            href={p.url}
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-pink-ink hover:underline"
          >
            {shops.join(", ")} ↗
          </a>
        ) : (
          shops.join(", ")
        )}
      </p>
      <p className="mt-0.5 text-xs text-stone-500">Allergens: {p.allergens}</p>

      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="mt-2 text-xs font-medium text-stone-500 hover:text-stone-800 hover:underline"
      >
        {open ? "Less" : "Tips and buying notes"}
      </button>
      {open && (
        <div className="mt-2 space-y-1.5 rounded-xl bg-stone-50 p-3 text-sm text-stone-700">
          {p.notes.map((t, i) => (
            <p key={i}>
              <Caution text={t} />
            </p>
          ))}
          <p className="text-stone-600">
            <span className="font-medium">Buying: </span>
            {p.shipping}
          </p>
        </div>
      )}
    </li>
  );
}

// Make the sheet's capitalised warnings (CAUTION:, NOT INDIVIDUALLY WRAPPED,
// MUST BE KEPT FROZEN...) and leads (BULK:, ALSO:) stand out in the notes.
const LOUD =
  /(CAUTION:|BULK:|ALSO:|\b[A-Z][A-Z'’&]+(?:[ –-]+[A-Z][A-Z'’&]+)+\b:?)/g;
function Caution({ text }: { text: string }) {
  const parts = text.split(LOUD);
  return (
    <>
      {parts.map((t, i) =>
        i % 2 ? (
          <b
            key={i}
            className={/^(BULK|ALSO)/.test(t) ? "text-navy" : "text-pink-ink"}
          >
            {t}
          </b>
        ) : (
          t
        ),
      )}
    </>
  );
}
