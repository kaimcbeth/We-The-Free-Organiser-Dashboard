// An emoji for any event (Kai, 26 Nov 2026: "every event automatically has
// an emoji"). The listing's own leading emoji wins, then the special event's,
// then a guess from the title, then from the event type. First match wins.

const LEADING =
  /^\s*((?:\p{Extended_Pictographic}|\p{Regional_Indicator})(?:️|‍|\p{Extended_Pictographic}|\p{Emoji_Modifier}|\p{Regional_Indicator})*)/u;

// The emoji a title starts with, if any.
export function leadingEmoji(title: string): string | null {
  return title.match(LEADING)?.[1] ?? null;
}

// The title without its leading emoji.
export function stripEmoji(title: string): string {
  return title.replace(LEADING, "").trim();
}

const BY_TITLE: [RegExp, string][] = [
  [/christmas|xmas/i, "🎄"],
  [/new ?years?/i, "🥂"],
  [/halloween/i, "🎃"],
  [/easter/i, "🐣"],
  [/mother'?s day/i, "💐"],
  [/birthday|anniversary/i, "🎂"],
  [/movie challenge|3\s?mmc|minute movie/i, "🎬"],
  [/movie night|film night|screening/i, "🍿"],
  [/potluck|pot luck/i, "🍲"],
  [/co-?working|\bcowork/i, "💻"],
  [/picnic/i, "🧺"],
  [/dinner|lunch|brunch|breakfast|meal|bbq|barbecue|sizzle/i, "🍽️"],
  [/sanctuary|santuario/i, "🐮"],
  [/beach|swim/i, "🏖️"],
  [/hike|walk|bushwalk/i, "🥾"],
  [/litter|clean ?up/i, "🧹"],
  [/karaoke/i, "🎤"],
  [/trivia|quiz|games?\b/i, "🎲"],
  [/workshop|training|masterclass|skill ?share|bootcamp|intro to/i, "🎓"],
  [/vigil/i, "🕯️"],
  [/demonstration|protest|march|rally|demo\b/i, "✊"],
  [/blood|lifeblood/i, "🩸"],
  [/stall|outreach|cube|diamond|street/i, "📣"],
  [/party|celebration/i, "🎉"],
  [/social|hang ?out|meet ?up|catch ?up|community/i, "🙌"],
];

const BY_TYPE: [RegExp, string][] = [
  [/movie/i, "🎬"],
  [/co-?working/i, "💻"],
  [/workshop|training/i, "🎓"],
  [/outreach/i, "📣"],
  [/community|social/i, "🙌"],
];

export function eventEmoji(
  title: string,
  typeName?: string | null,
  specialEmoji?: string | null,
): string {
  const own = leadingEmoji(title);
  if (own) return own;
  if (specialEmoji) return specialEmoji;
  const hit = BY_TITLE.find(([re]) => re.test(title));
  if (hit) return hit[1];
  const type = typeName ? BY_TYPE.find(([re]) => re.test(typeName)) : null;
  return type ? type[1] : "🌱";
}
