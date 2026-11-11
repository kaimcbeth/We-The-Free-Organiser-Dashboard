"use client";

import "maplibre-gl/dist/maplibre-gl.css";
import { useEffect, useRef, useState } from "react";
import type { Map as MlMap, Marker } from "maplibre-gl";
import {
  MAP_STYLE,
  MAX_ZOOM,
  type MapLook,
} from "@/components/meeting-point-graphic";

export type Spot = { lat: number; lng: number };

// The map you pick the meeting point on: tap (or drag the pin) to set it.
// Zooming here sets how close in the graphic is. MapLibre with OpenFreeMap's
// clean styles (Kai, 12 Nov 2026: the plain OpenStreetMap look was
// "pretty unpleasant"). Our zoom numbers are one more than MapLibre's, from
// when this used Leaflet; `zoom - 1` gives the same view.
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
  const map = useRef<MlMap | null>(null);
  const marker = useRef<Marker | null>(null);
  const ml = useRef<typeof import("maplibre-gl") | null>(null);
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
    import("maplibre-gl").then((lib) => {
      if (cancelled || !el.current || map.current) return;
      ml.current = lib;
      const m = new lib.Map({
        container: el.current,
        style: MAP_STYLE[look],
        center: [spot?.lng ?? centre.lng, spot?.lat ?? centre.lat],
        zoom: zoom - 1,
        maxZoom: MAX_ZOOM - 1,
        attributionControl: { compact: true },
        dragRotate: false,
        pitchWithRotate: false,
      });
      m.touchZoomRotate.disableRotation();
      m.addControl(
        new lib.NavigationControl({ showCompass: false }),
        "top-left",
      );
      m.on("click", (e) =>
        pick.current({ lat: e.lngLat.lat, lng: e.lngLat.lng }),
      );
      m.on("zoomend", () => zoomed.current(Math.round(m.getZoom() + 1)));
      map.current = m;
      setReady(true);
      // The sheet animates in: measure again once it has.
      setTimeout(() => m.resize(), 250);
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
  const shown = useRef(look);
  useEffect(() => {
    if (!map.current || shown.current === look) return;
    shown.current = look;
    map.current.setStyle(MAP_STYLE[look]);
  }, [look, ready]);

  // Re-centre when a new place is searched for (centre changes).
  useEffect(() => {
    map.current?.jumpTo({ center: [centre.lng, centre.lat] });
  }, [centre.lat, centre.lng]);

  // Zoom changed outside the map (the slider).
  useEffect(() => {
    const m = map.current;
    if (m && Math.round(m.getZoom() + 1) !== zoom) m.easeTo({ zoom: zoom - 1 });
  }, [zoom]);

  // The pin.
  useEffect(() => {
    const lib = ml.current;
    const m = map.current;
    if (!lib || !m) return;
    if (!spot) {
      marker.current?.remove();
      marker.current = null;
      return;
    }
    if (!marker.current) {
      const dot = document.createElement("div");
      dot.style.cssText =
        "width:26px;height:26px;border-radius:50%;background:#ff47b9;border:4px solid #fff;box-shadow:0 2px 8px rgba(7,17,48,.5);cursor:grab";
      marker.current = new lib.Marker({ element: dot, draggable: true })
        .setLngLat([spot.lng, spot.lat])
        .addTo(m);
      marker.current.on("dragend", () => {
        const p = marker.current!.getLngLat();
        pick.current({ lat: p.lat, lng: p.lng });
      });
    } else marker.current.setLngLat([spot.lng, spot.lat]);
  }, [spot, ready]);

  return (
    <div
      ref={el}
      className="relative z-0 h-64 w-full cursor-crosshair overflow-hidden rounded-xl ring-1 ring-black/5 sm:h-72"
    />
  );
}
