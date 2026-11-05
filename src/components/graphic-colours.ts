// Colour choices for the template styles in the graphic maker (Coming soon,
// Big photo, Photo + details). "Warm" is the look of Kai's Canva templates;
// the rest use the We The Free brand colours.

const NAVY = "#071130";
const PINK = "#ff47b9";
const CYAN = "#2fd9df";
const YELLOW = "#ffd90f";

export type Colours = "warm" | "mix" | "pink" | "cyan" | "yellow" | "pinkbg";

export type Palette = {
  label: string;
  swatch: [string, string]; // for the chip
  bg: string; // background
  ink: string; // Coming soon's words
  text: string; // Photo + details' main words
  accent: string; // Photo + details' coloured lines
  head: string; // Big photo's heading
  // Glows round the edges: [x, y, radius (share of width/height), colour]
  glows: [number, number, number, string][];
};

export const PALETTES: Record<Colours, Palette> = {
  warm: {
    label: "Warm",
    swatch: ["#29292b", "#c0461f"],
    bg: "#29292b",
    ink: "#ffe1cc",
    text: "#ffffff",
    accent: "#f2853a",
    head: "#ffffff",
    glows: [
      [0, 0.12, 0.5, "rgba(176,128,24,0.95)"],
      [0, 0.55, 0.62, "rgba(178,62,28,0.9)"],
      [0.12, 1, 0.55, "rgba(150,44,26,0.85)"],
      [1, 1, 0.42, "rgba(196,92,24,0.9)"],
      [1, 0.66, 0.32, "rgba(160,48,30,0.75)"],
    ],
  },
  mix: {
    label: "Pink + yellow",
    swatch: [PINK, YELLOW],
    bg: NAVY,
    ink: "#fff3fa",
    text: "#ffffff",
    accent: PINK,
    head: YELLOW,
    glows: [
      [0, 0.12, 0.5, "rgba(255,217,15,0.55)"],
      [0, 0.55, 0.62, "rgba(255,71,185,0.7)"],
      [0.12, 1, 0.55, "rgba(255,71,185,0.55)"],
      [1, 1, 0.42, "rgba(255,217,15,0.5)"],
      [1, 0.66, 0.32, "rgba(255,71,185,0.45)"],
    ],
  },
  pink: {
    label: "Pink",
    swatch: [NAVY, PINK],
    bg: NAVY,
    ink: "#ffffff",
    text: "#ffffff",
    accent: PINK,
    head: PINK,
    glows: [
      [0, 0.12, 0.5, "rgba(255,71,185,0.55)"],
      [0, 0.55, 0.62, "rgba(255,71,185,0.75)"],
      [0.12, 1, 0.55, "rgba(255,71,185,0.6)"],
      [1, 1, 0.42, "rgba(255,71,185,0.55)"],
      [1, 0.66, 0.32, "rgba(255,71,185,0.4)"],
    ],
  },
  cyan: {
    label: "Cyan",
    swatch: [NAVY, CYAN],
    bg: NAVY,
    ink: "#ffffff",
    text: "#ffffff",
    accent: CYAN,
    head: CYAN,
    glows: [
      [0, 0.12, 0.5, "rgba(47,217,223,0.45)"],
      [0, 0.55, 0.62, "rgba(47,217,223,0.6)"],
      [0.12, 1, 0.55, "rgba(47,217,223,0.5)"],
      [1, 1, 0.42, "rgba(47,217,223,0.45)"],
      [1, 0.66, 0.32, "rgba(47,217,223,0.35)"],
    ],
  },
  yellow: {
    label: "Yellow",
    swatch: [NAVY, YELLOW],
    bg: NAVY,
    ink: "#ffffff",
    text: "#ffffff",
    accent: YELLOW,
    head: YELLOW,
    glows: [
      [0, 0.12, 0.5, "rgba(255,217,15,0.5)"],
      [0, 0.55, 0.62, "rgba(255,217,15,0.55)"],
      [0.12, 1, 0.55, "rgba(255,217,15,0.45)"],
      [1, 1, 0.42, "rgba(255,217,15,0.45)"],
      [1, 0.66, 0.32, "rgba(255,217,15,0.35)"],
    ],
  },
  pinkbg: {
    label: "Pink background",
    swatch: [PINK, NAVY],
    bg: PINK,
    ink: NAVY,
    text: NAVY,
    accent: NAVY,
    head: "#ffffff",
    glows: [
      [0, 0.12, 0.5, "rgba(255,217,15,0.55)"],
      [0, 0.55, 0.62, "rgba(255,120,210,0.6)"],
      [0.12, 1, 0.55, "rgba(47,217,223,0.4)"],
      [1, 1, 0.42, "rgba(255,217,15,0.5)"],
      [1, 0.66, 0.32, "rgba(255,255,255,0.25)"],
    ],
  },
};
