"use client";

import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { useEffect, useMemo, useRef, useState } from "react";
import type { MapTeam } from "./scope-map";

// The map only runs in the browser.
const ScopeMap = dynamic(() => import("./scope-map").then((m) => m.ScopeMap), {
  ssr: false,
  loading: () => (
    <div className="h-48 w-full animate-pulse rounded-xl bg-stone-100 sm:h-56" />
  ),
});

export type Nearby = {
  teams: {
    id: string;
    name: string;
    km: number | null;
    in_region: boolean;
    lat: number | null;
    lng: number | null;
  }[];
  mode: "team" | "region" | "all" | "km";
  km: number | null;
  regionName: string;
};

// Slider positions 0–100:
//   0        just your team
//   1–49     10 km … your furthest team in the region (grows exponentially)
//   50       your region
//   51–99    your region's edge … the furthest team anywhere (exponentially)
//   100      everywhere
const MIN_KM = 10;

function kmAt(pos: number, regionKm: number, maxKm: number) {
  if (pos <= 49) return MIN_KM * Math.pow(regionKm / MIN_KM, (pos - 1) / 49);
  return regionKm * Math.pow(maxKm / regionKm, (pos - 50) / 50);
}

function posFor(nearby: Nearby, regionKm: number, maxKm: number) {
  if (nearby.mode === "team") return 0;
  if (nearby.mode === "region") return 50;
  if (nearby.mode === "all") return 100;
  const km = nearby.km ?? MIN_KM;
  if (km <= regionKm)
    return Math.max(
      1,
      Math.min(
        49,
        Math.round(
          1 + 49 * (Math.log(km / MIN_KM) / Math.log(regionKm / MIN_KM)),
        ),
      ),
    );
  if (maxKm <= regionKm) return 100;
  return Math.max(
    51,
    Math.min(
      99,
      Math.round(
        50 + 50 * (Math.log(km / regionKm) / Math.log(maxKm / regionKm)),
      ),
    ),
  );
}

const roundKm = (km: number) =>
  km < 100
    ? Math.round(km / 5) * 5 || 5
    : km < 1000
      ? Math.round(km / 25) * 25
      : Math.round(km / 100) * 100;

export function DistanceSlider({
  nearby,
  month,
}: {
  nearby: Nearby;
  month: string;
}) {
  const router = useRouter();
  const known = nearby.teams.filter((t) => t.km !== null && t.km > 0);
  const regionKm = Math.max(
    MIN_KM * 2,
    ...known.filter((t) => t.in_region).map((t) => t.km!),
  );
  const maxKm = Math.max(regionKm, ...known.map((t) => t.km!));

  const [pos, setPos] = useState(() => posFor(nearby, regionKm, maxKm));
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const view = useMemo(() => {
    const radiusAt = (p: number) =>
      p === 0
        ? 5
        : p === 50
          ? regionKm
          : p === 100
            ? maxKm
            : roundKm(kmAt(p, regionKm, maxKm));
    const radius = radiusAt(pos);
    const include = (t: Nearby["teams"][number]) =>
      t.km !== 0 &&
      (pos === 100 ||
        (pos === 50 && t.in_region) ||
        (pos > 0 && pos !== 50 && t.km !== null && t.km <= radius));
    const count = nearby.teams.filter(include).length;
    const label =
      pos === 0
        ? "Just your team"
        : pos === 50
          ? `Your region (${nearby.regionName})`
          : pos === 100
            ? "Everywhere"
            : `Within ${radius.toLocaleString("en-AU")} km`;
    const mapTeams: MapTeam[] = nearby.teams
      .filter((t) => t.lat !== null && t.lng !== null)
      .map((t) => ({
        id: t.id,
        name: t.name,
        lat: t.lat!,
        lng: t.lng!,
        isMe: t.km === 0,
        included: include(t),
      }));
    return { label, count, radius, mapTeams };
  }, [pos, nearby, regionKm, maxKm]);
  const me = nearby.teams.find((t) => t.km === 0 && t.lat !== null);

  function change(next: number) {
    setPos(next);
    if (timer.current) clearTimeout(timer.current);
    // Load once they stop dragging for a moment.
    timer.current = setTimeout(() => {
      const near =
        next === 0
          ? "team"
          : next === 50
            ? "region"
            : next === 100
              ? "all"
              : String(roundKm(kmAt(next, regionKm, maxKm)));
      // Remember it for next time.
      document.cookie = `calendar_near=${near}; path=/; max-age=31536000; samesite=lax`;
      router.replace(`/calendar?m=${month}&near=${near}`, { scroll: false });
    }, 350);
  }

  return (
    <div className="mt-4 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-sm font-semibold">See other teams&apos; events</p>
        <p className="text-sm">
          <span className="font-semibold text-navy">{view.label}</span>
          {pos > 0 && (
            <span className="text-stone-500">
              {" "}
              · {view.count} other {view.count === 1 ? "team" : "teams"}
            </span>
          )}
        </p>
      </div>
      <input
        type="range"
        min={0}
        max={100}
        step={1}
        value={pos}
        onChange={(e) => {
          let v = Number(e.target.value);
          if (Math.abs(v - 50) <= 2) v = 50; // snap to "your region"
          change(v);
        }}
        aria-label="How far away to show other teams' events"
        aria-valuetext={view.label}
        className="mt-3 w-full accent-pink"
      />
      <div className="mt-1 flex justify-between text-xs text-stone-500">
        <span>Your team</span>
        <span>{nearby.regionName}</span>
        <span>Everywhere</span>
      </div>
      {me && (
        <div className="mt-3">
          <ScopeMap
            centre={{ lat: me.lat!, lng: me.lng! }}
            radiusKm={view.radius}
            teams={view.mapTeams}
          />
        </div>
      )}
    </div>
  );
}
