"use client";

import "leaflet/dist/leaflet.css";
import { useEffect, useRef, useState } from "react";
import type { Map as LeafletMap, Marker, TileLayer } from "leaflet";
import { tileUrl, type MapLook } from "@/components/meeting-point-graphic";

export type Spot = { lat: number; lng: number };

// The map you pick the meeting point on: tap (or drag the pin) to set it.
// Zooming here sets how close in the graphic is.
export function MeetingPointMap({
  centre,
  spot,
  zoom,
  look,
  onPick,
  onZoom,
}: {
  centre: Spot;
  spot: Spot | null;
  zoom: number;
  look: MapLook;
  onPick: (s: Spot) => void;
  onZoom: (z: number) => void;
}) {
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<LeafletMap | null>(null);
  const marker = useRef<Marker | null>(null);
  const tiles = useRef<TileLayer | null>(null);
  const L = useRef<typeof import("leaflet") | null>(null);
  const [ready, setReady] = useState(false);
  // Latest callbacks, without re-creating the map.
  const pick = useRef(onPick);
  const zoomed = useRef(onZoom);
  useEffect(() => {
    pick.current = onPick;
    zoomed.current = onZoom;
  });

  // Create the map once.
  useEffect(() => {
    let cancelled = false;
    import("leaflet").then((leaflet) => {
      if (cancelled || !el.current || map.current) return;
      L.current = leaflet;
      const m = leaflet
        .map(el.current, { zoomControl: true, attributionControl: true })
        .setView([spot?.lat ?? centre.lat, spot?.lng ?? centre.lng], zoom);
      tiles.current = leaflet
        .tileLayer(tileUrl(look), {
          attribution:
            '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; CARTO',
          subdomains: "abcd",
          maxZoom: 19,
        })
        .addTo(m);
      m.on("click", (e) =>
        pick.current({ lat: e.latlng.lat, lng: e.latlng.lng }),
      );
      m.on("zoomend", () => zoomed.current(m.getZoom()));
      map.current = m;
      setReady(true);
      // The sheet animates in: measure again once it has.
      setTimeout(() => m.invalidateSize(), 250);
    });
    return () => {
      cancelled = true;
      map.current?.remove();
      map.current = null;
      marker.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Map look.
  useEffect(() => {
    tiles.current?.setUrl(tileUrl(look));
  }, [look]);

  // Re-centre when a new place is searched for (centre changes).
  useEffect(() => {
    map.current?.setView([centre.lat, centre.lng], map.current.getZoom());
  }, [centre.lat, centre.lng]);

  // Zoom changed outside the map (the slider).
  useEffect(() => {
    const m = map.current;
    if (m && m.getZoom() !== zoom) m.setZoom(zoom);
  }, [zoom]);

  // The pin.
  useEffect(() => {
    const leaflet = L.current;
    const m = map.current;
    if (!leaflet || !m) return;
    if (!spot) {
      marker.current?.remove();
      marker.current = null;
      return;
    }
    if (!marker.current) {
      marker.current = leaflet
        .marker([spot.lat, spot.lng], {
          draggable: true,
          icon: leaflet.divIcon({
            className: "",
            html: '<div style="width:26px;height:26px;border-radius:50%;background:#ff47b9;border:4px solid #fff;box-shadow:0 2px 8px rgba(7,17,48,.5)"></div>',
            iconSize: [26, 26],
            iconAnchor: [13, 13],
          }),
        })
        .addTo(m);
      marker.current.on("dragend", () => {
        const p = marker.current!.getLatLng();
        pick.current({ lat: p.lat, lng: p.lng });
      });
    } else marker.current.setLatLng([spot.lat, spot.lng]);
  }, [spot, ready]);

  return (
    <div
      ref={el}
      className="relative z-0 h-64 w-full cursor-crosshair overflow-hidden rounded-xl ring-1 ring-black/5 sm:h-72"
    />
  );
}
