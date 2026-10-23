"use client";

import { useEffect, useRef, useState } from "react";

const PIECES = ["🎉", "✨", "👃", "🎊", "💖", "⭐"];

// "Movement Hub" label with a secret: tap it 7 times quickly.
export function EasterEggLogo({ className }: { className?: string }) {
  const taps = useRef<number[]>([]);
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!show) return;
    const t = setTimeout(() => setShow(false), 5000);
    return () => clearTimeout(t);
  }, [show]);

  return (
    <>
      <span
        className={`${className ?? ""} cursor-default select-none`}
        onClick={(e) => {
          // The label doesn't navigate (the community name below still does).
          e.preventDefault();
          e.stopPropagation();
          const now = Date.now();
          taps.current = [...taps.current.filter((t) => now - t < 2500), now];
          if (taps.current.length >= 7) {
            taps.current = [];
            setShow(true);
          }
        }}
      >
        Movement Hub
      </span>
      {show && (
        <div
          className="pointer-events-none fixed inset-0 z-[100] overflow-hidden"
          aria-live="polite"
        >
          <div className="relative z-10 animate-[egg-drop_0.5s_ease-out] bg-pink px-4 py-4 text-center text-xl font-bold text-navy shadow-lg sm:text-2xl">
            Crystal has a flat nose
          </div>
          {Array.from({ length: 40 }, (_, i) => (
            <span
              key={i}
              className="absolute top-0 animate-[egg-fall_3s_linear_forwards] text-2xl"
              style={{
                left: `${(i * 37) % 100}%`,
                animationDelay: `${(i % 10) * 0.12}s`,
              }}
            >
              {PIECES[i % PIECES.length]}
            </span>
          ))}
        </div>
      )}
    </>
  );
}
