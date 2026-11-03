"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { shrink } from "@/components/photo-uploader";
import { PhotoSlot } from "@/components/photo-slot";
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

// One card per product; pack sizes of the same product (Prize.family) share it.
type Entry = { key: string; title: string; options: Prize[] };
const slug = (t: string) =>
  t
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
const entryKey = (p: Prize) => `prize:${slug(p.family ?? p.name)}`;
const best = (e: Entry) => e.options[0];

// The recommended prizes, in the app: what each costs per prize, whether it's
// within the reimbursement, and how many packs to buy for the crowd expected.
// Prizes over the reimbursement are suggested as "premium" when the
// community has funding banked.
export function PrizeGuide({
  banked,
  canEditPhotos = false,
}: {
  banked: number;
  canEditPhotos?: boolean; // Regional Support Leads and God, like equipment
}) {
  const [people, setPeople] = useState(50);
  const [category, setCategory] = useState<string | null>(null);
  const [wrappedOnly, setWrappedOnly] = useState(false);
  const [shelfOnly, setShelfOnly] = useState(false);
  const [photos, setPhotos] = useState<Record<string, string>>({});

  // Uploaded photos (shared by every community), as public links.
  useEffect(() => {
    let live = true;
    const db = createClient();
    db.from("equipment_photos")
      .select("photo_key, path")
      .like("photo_key", "prize:%")
      .then(({ data }) => {
        if (!live) return;
        setPhotos(
          Object.fromEntries(
            (data ?? []).map((r) => [
              r.photo_key as string,
              db.storage.from("equipment").getPublicUrl(r.path as string).data
                .publicUrl,
            ]),
          ),
        );
      });
    return () => {
      live = false;
    };
  }, []);

  async function upload(key: string, file: File) {
    const db = createClient();
    const { blob } = await shrink(file, 800);
    const path = `${key.replace(/[^a-z0-9_-]/g, "-")}/${crypto.randomUUID()}.jpg`;
    const up = await db.storage
      .from("equipment")
      .upload(path, blob, { contentType: "image/jpeg" });
    if (up.error) return false;
    const row = await db
      .from("equipment_photos")
      .upsert({ photo_key: key, path, updated_at: new Date().toISOString() });
    if (row.error) return false;
    setPhotos((p) => ({
      ...p,
      [key]: db.storage.from("equipment").getPublicUrl(path).data.publicUrl,
    }));
    return true;
  }

  const categories = [...new Set(PRIZES.map((p) => p.category))];
  const matching = PRIZES.filter(
    (p) =>
      (!category || p.category === category) &&
      (!wrappedOnly || p.wrapped === true) &&
      (!shelfOnly || p.shelfStable),
  ).sort((a, b) => (perPrize(a) ?? 99) - (perPrize(b) ?? 99));
  const shown: Entry[] = [];
  for (const p of matching) {
    const key = entryKey(p);
    const e = shown.find((x) => x.key === key);
    if (e) e.options.push(p);
    else shown.push({ key, title: p.family ?? p.name, options: [p] });
  }
  const within = shown.filter((e) => overBy(best(e)) === 0);
  const premium = shown.filter((e) => (overBy(best(e)) ?? 0) > 0);
  const unpriced = shown.filter((e) => overBy(best(e)) === null);
  const n = Math.max(1, people || 1);
  // Premium prizes the banked funding could cover for this crowd.
  const affordable = premium.filter(
    (e) => (overBy(best(e)) ?? 0) * n <= banked,
  );
  const card = (e: Entry, recommended = false) => (
    <PrizeCard
      key={e.key}
      e={e}
      people={n}
      recommended={recommended}
      photo={photos[e.key] ?? null}
      onUpload={canEditPhotos ? (f) => upload(e.key, f) : undefined}
    />
  );

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

      <Section
        title="Within the reimbursement"
        count={within.length}
        className="mt-6"
        intro={
          <p className="text-sm text-stone-600">Cheapest per prize first.</p>
        }
      >
        {within.length ? (
          <ul className="mt-3 space-y-3">{within.map((e) => card(e))}</ul>
        ) : (
          <Empty />
        )}
      </Section>

      <Section
        title="Premium prizes"
        count={premium.length}
        className="mt-8"
        intro={
          banked > 0 && affordable.length > 0 ? (
            <p className="mt-1 rounded-xl bg-cyan/15 px-3 py-2 text-sm text-navy">
              <b>Recommended with your funding.</b> Your community has{" "}
              {aud(banked)} banked, so you could treat people to a bigger prize.
              The extra over the reimbursement for {n} people is shown on each.
            </p>
          ) : (
            <p className="text-sm text-stone-600">
              Over the reimbursement, so the difference comes from your
              community&apos;s own funding.
              {banked > 0
                ? ` Your ${aud(banked)} banked doesn't cover the extra for ${n} people.`
                : ""}
            </p>
          )
        }
      >
        {premium.length ? (
          <ul className="mt-3 space-y-3">
            {premium.map((e) => card(e, affordable.includes(e)))}
          </ul>
        ) : (
          <Empty />
        )}
      </Section>

      {unpriced.length > 0 && (
        <Section
          title="Check the shelf price"
          count={unpriced.length}
          className="mt-8"
          intro={
            <p className="text-sm text-stone-600">
              Not priced online, so check in store whether they&apos;re within{" "}
              {cents(REIMBURSE_AUD)} a prize.
            </p>
          }
        >
          <ul className="mt-3 space-y-3">{unpriced.map((e) => card(e))}</ul>
        </Section>
      )}
    </div>
  );
}

// A list that folds up from its heading (Kai, 4 Nov 2026). Open at first.
function Section({
  title,
  count,
  intro,
  className,
  children,
}: {
  title: string;
  count: number;
  intro: React.ReactNode;
  className: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(true);
  return (
    <section className={className}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="group flex w-full items-center gap-2 text-left"
      >
        <span
          aria-hidden
          className={`inline-block text-stone-400 transition-transform group-hover:text-navy ${open ? "rotate-90" : ""}`}
        >
          ▸
        </span>
        <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
        <span className="text-sm text-stone-400">{count}</span>
      </button>
      {open && (
        <>
          {intro}
          {children}
        </>
      )}
    </section>
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
  e,
  people,
  recommended = false,
  photo,
  onUpload,
}: {
  e: Entry;
  people: number;
  recommended?: boolean;
  photo: string | null;
  onUpload?: (file: File) => Promise<boolean>;
}) {
  const [open, setOpen] = useState(false);
  const p = best(e);
  const many = e.options.length > 1;
  const each = perPrize(p);
  const over = overBy(p);
  return (
    <li
      className={`rounded-2xl bg-white p-4 shadow-sm ring-1 ${
        recommended ? "ring-2 ring-cyan" : "ring-black/5"
      }`}
    >
      <div className="flex gap-3">
        <PhotoSlot
          photo={photo}
          alt={e.title}
          href={p.url ?? undefined}
          onUpload={onUpload}
        />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start gap-x-3 gap-y-1">
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-navy">{e.title}</p>
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
                    {many && (
                      <span className="text-xs font-normal text-stone-500">
                        from{" "}
                      </span>
                    )}
                    {cents(each)}
                    <span className="text-xs font-normal text-stone-500">
                      {" "}
                      each
                    </span>
                  </p>
                  {!many && (
                    <p className="text-xs text-stone-500">
                      {cents(p.price!)} for {p.perPack}
                    </p>
                  )}
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
            {!many && p.vegan === "Check label" && (
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-amber-800">
                Check label
              </span>
            )}
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

          {many ? (
            <ul className="mt-2 divide-y divide-black/5 rounded-xl bg-stone-50 text-sm">
              {e.options.map((o) => (
                <li key={o.name} className="px-3 py-2">
                  <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                    <span className="font-medium text-navy">
                      {o.variant ?? o.name}
                      {o.vegan === "Check label" && (
                        <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
                          Check label
                        </span>
                      )}
                    </span>
                    <span className="tabular-nums text-stone-600">
                      {perPrize(o) === null ? (
                        "Price not online"
                      ) : (
                        <>
                          <b className="text-navy">{cents(perPrize(o)!)}</b>{" "}
                          each · {cents(o.price!)} for {o.perPack}
                        </>
                      )}
                    </span>
                  </div>
                  <ForPeople p={o} people={people} />
                  <Where p={o} />
                </li>
              ))}
            </ul>
          ) : (
            <>
              <ForPeople p={p} people={people} />
              <Where p={p} />
            </>
          )}
          <p className="mt-1 text-xs text-stone-500">
            Allergens: {p.allergens}
          </p>

          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            className="mt-2 text-xs font-medium text-stone-500 hover:text-stone-800 hover:underline"
          >
            {open ? "Less" : "Tips and buying notes"}
          </button>
          {open && (
            <div className="mt-2 space-y-3 rounded-xl bg-stone-50 p-3 text-sm text-stone-700">
              {e.options.map((o) => (
                <div key={o.name} className="space-y-1.5">
                  {many && (
                    <p className="font-semibold text-navy">
                      {o.variant ?? o.name}
                    </p>
                  )}
                  {o.notes.map((t, i) => (
                    <p key={i}>
                      <Caution text={t} />
                    </p>
                  ))}
                  <p className="whitespace-pre-line text-stone-600">
                    <span className="font-medium">Buying: </span>
                    {o.shipping}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </li>
  );
}

function ForPeople({ p, people }: { p: Prize; people: number }) {
  const packs = Math.ceil(people / p.perPack);
  const over = overBy(p);
  return (
    <p className="mt-1 text-sm text-stone-700">
      {p.price === null ? (
        <>
          For {people}: {packs} {packs === 1 ? "pack" : "packs"} (check the
          shelf price)
        </>
      ) : (
        <>
          For {people}: {packs} {packs === 1 ? "pack" : "packs"},{" "}
          <b>{cents(packs * p.price)}</b>
          {over! > 0 && (
            <span className="text-pink-ink">
              {" "}
              ({cents(over! * people)} over the reimbursement)
            </span>
          )}
        </>
      )}
    </p>
  );
}

function Where({ p }: { p: Prize }) {
  const shops = p.where.split("|").map((s) => s.trim());
  return (
    <p className="mt-0.5 text-sm text-stone-600">
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
