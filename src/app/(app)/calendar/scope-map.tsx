"use client";

import "leaflet/dist/leaflet.css";
import { useCallback, useEffect, useRef } from "react";
import type { Circle, LayerGroup, Map as LeafletMap } from "leaflet";

export type MapTeam = {
  id: string;
  name: string;
  lat: number;
  lng: number;
  included: boolean;
  isMe: boolean;
};

// A small map: your team in the middle, a circle showing how far out you're
// looking, and every other team as a dot (pink = included, grey = not).
export function ScopeMap({
  centre,
  radiusKm,
  teams,
}: {
  centre: { lat: number; lng: number };
  radiusKm: number;
  teams: MapTeam[];
}) {
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<LeafletMap | null>(null);
  const circle = useRef<Circle | null>(null);
  const dots = useRef<LayerGroup | null>(null);
  const L = useRef<typeof import("leaflet") | null>(null);

  const draw = useCallback(() => {
    const leaflet = L.current;
    const m = map.current;
    if (!leaflet || !m || !circle.current || !dots.current) return;
    circle.current.setLatLng([centre.lat, centre.lng]);
    circle.current.setRadius(Math.max(radiusKm, 3) * 1000);
    dots.current.clearLayers();
    // Draw your own team last so it sits on top.
    for (const t of [...teams].sort(
      (a, b) => Number(a.isMe) - Number(b.isMe),
    )) {
      leaflet
        .circleMarker([t.lat, t.lng], {
          radius: t.isMe ? 7 : 5,
          color: "#ffffff",
          weight: 2,
          fillColor: t.isMe ? "#071130" : t.included ? "#ff47b9" : "#8a91a8",
          fillOpacity: 1,
        })
        .bindTooltip(t.name, { direction: "top", offset: [0, -6] })
        .addTo(dots.current);
    }
    // Keep the whole circle in view (with a little room around it).
    m.fitBounds(circle.current.getBounds(), {
      padding: [12, 12],
      animate: true,
      maxZoom: 11,
    });
  }, [centre.lat, centre.lng, radiusKm, teams]);

  // Create the map once.
  useEffect(() => {
    let cancelled = false;
    import("leaflet").then((leaflet) => {
      if (cancelled || !el.current || map.current) return;
      L.current = leaflet;
      const m = leaflet
        .map(el.current, {
          zoomControl: false,
          attributionControl: true,
          scrollWheelZoom: false,
          dragging: true,
        })
        .setView([centre.lat, centre.lng], 9);
      leaflet
        .tileLayer(
          "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
          {
            attribution:
              '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; CARTO',
            subdomains: "abcd",
            maxZoom: 12,
          },
        )
        .addTo(m);
      circle.current = leaflet
        .circle([centre.lat, centre.lng], {
          radius: Math.max(radiusKm, 3) * 1000,
          color: "#ff47b9",
          weight: 2,
          fillColor: "#ff47b9",
          fillOpacity: 0.12,
        })
        .addTo(m);
      dots.current = leaflet.layerGroup().addTo(m);
      map.current = m;
      draw();
    });
    return () => {
      cancelled = true;
      map.current?.remove();
      map.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Redraw when the slider moves.
  useEffect(() => {
    draw();
  }, [draw]);

  return (
    <div
      ref={el}
      className="relative z-0 h-48 w-full overflow-hidden rounded-xl ring-1 ring-black/5 sm:h-56"
    />
  );
}
