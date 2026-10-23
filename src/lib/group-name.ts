// Guess a Facebook group's name from its link, since Facebook won't show group
// pages to apps. facebook.com/groups/southwestsydneyvegans -> "South West
// Sydney Vegans". Joined-up words are split using a word list (plus the
// communities' place names); anything unknown is kept as it is.

const WORDS =
  `vegan vegans veganism vegetarian vegetarians veg veggie veggies plant plants based
animal animals rights liberation lib activism activist activists action
community communities group groups club society network friends friendly people
local the of and in for on at to a an my our your new old
north south east west northern southern eastern western inner outer central
city metro greater upper lower coast coastal beach beaches bay bays hills hill valley
mountains mountain river island islands harbour harbor shire region regional area areas
side suburbs suburb town village county state
food foods eats eat eating meetup meetups meet social socials events event market markets
potluck potlucks dinner dinners lunch brunch cafe cafes restaurant restaurants
buy sell swap free trade share sharing help support chat talk talks discussion
mums moms dads parents families family kids women men girls guys students uni university
fitness running runners hiking hikers yoga health healthy nutrition recipes cooking cook
bakers baking grocery shopping foodie foodies lovers lover life living
collective crew squad hub page alliance coalition movement
australia australian aussie aus nsw vic qld wa sa tas nt act nz zealand uk usa canada
sydney melbourne brisbane perth adelaide hobart darwin canberra newcastle wollongong
geelong ballarat bendigo cairns townsville gold sunshine central parramatta manly
penrith liverpool campbelltown blacktown hornsby sutherland illawarra hunter
christchurch wellington auckland dunedin hamilton
london manchester bristol leeds glasgow edinburgh birmingham
toronto montreal vancouver calgary ottawa edmonton
`
    .split(/\s+/)
    .filter(Boolean);

// Split "southwestsydneyvegans" into words. Known words are cheap; an
// unknown stretch costs more, so "innerwestveganfoodies" still becomes
// inner/west/vegan/foodies even if "foodies" weren't in the list.
function segment(s: string, dict: Set<string>): string[] {
  const n = s.length;
  const cost: number[] = Array(n + 1).fill(Infinity);
  const back: number[] = Array(n + 1).fill(0);
  cost[0] = 0;
  for (let i = 1; i <= n; i++) {
    for (let j = Math.max(0, i - 24); j < i; j++) {
      const w = s.slice(j, i);
      const c = dict.has(w) || /^\d+$/.test(w) ? 1 : 4 + w.length;
      if (cost[j] + c < cost[i]) {
        cost[i] = cost[j] + c;
        back[i] = j;
      }
    }
  }
  const out: string[] = [];
  for (let i = n; i > 0; i = back[i]) out.unshift(s.slice(back[i], i));
  return out;
}

const SMALL = new Set([
  "of",
  "and",
  "in",
  "for",
  "on",
  "at",
  "to",
  "a",
  "an",
  "the",
]);
const UPPER = new Set([
  "nsw",
  "qld",
  "wa",
  "sa",
  "nt",
  "act",
  "nz",
  "uk",
  "usa",
  "uni",
]);

export function groupNameFromLink(link: string, places: string[] = []) {
  const m = link.match(/facebook\.com\/groups\/([^/?#]+)/i);
  if (!m) return "";
  let slug = m[1];
  try {
    slug = decodeURIComponent(slug);
  } catch {
    /* odd characters: use it as it is */
  }
  if (/^\d+$/.test(slug)) return "";
  const dict = new Set([
    ...WORDS,
    ...places
      .flatMap((p) => p.toLowerCase().split(/[^a-z]+/))
      .filter((w) => w.length > 1),
  ]);
  const words = slug
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .split(/[\s._-]+/)
    .filter(Boolean)
    .flatMap((chunk) => {
      const lower = chunk.toLowerCase();
      return /^[a-z]+$/.test(lower) && !dict.has(lower)
        ? segment(lower, dict)
        : [lower];
    });
  return words
    .map((w, i) =>
      UPPER.has(w)
        ? w.toUpperCase()
        : i > 0 && SMALL.has(w)
          ? w
          : w.charAt(0).toUpperCase() + w.slice(1),
    )
    .join(" ");
}
