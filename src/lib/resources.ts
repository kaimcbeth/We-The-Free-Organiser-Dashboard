// Resources and training for organisers and the Core Team. Add new ones here
// (files go in public/resources/).
export type Resource = {
  title: string;
  emoji?: string; // shown before the title
  about: string;
  file: string; // under /resources, or a link
  members?: string; // also on members' Resources tab, under this heading
  area?: string; // e.g. "NSW" when it only applies there
  tip?: string;
  organisersOnly?: boolean; // not on the Core Team's Resources
};

// We The Free's incident report form (Google Form).
export const INCIDENT_FORM_URL =
  "https://docs.google.com/forms/d/e/1FAIpQLSeTH5tQQFNhgtFqllx_uMjCaO7JhGKwKjXQiiNvnF8RfXExQw/viewform";

export const RESOURCE_SECTIONS: { title: string; items: Resource[] }[] = [
  {
    title: "At outreach events",
    items: [
      {
        title: "Notice of legal protections",
        emoji: "⚖️",
        area: "NSW",
        about:
          "For police who come by: explains the right to peaceful protest, the limits on move-on directions (LEPRA s 200) and the test for “offensive” conduct.",
        file: "/resources/notice-of-legal-protections-nsw.pdf",
        members: "Legal",
      },
      {
        title: "Incident report form",
        emoji: "📝",
        about:
          "Something happened at an event (harassment, an injury, trouble with the public or police)? Report it here so it can be followed up.",
        file: INCIDENT_FORM_URL,
        members: "Incidents",
      },
    ],
  },
  {
    title: "Fundraising",
    items: [
      {
        title: "Team fundraising guide",
        emoji: "💰",
        about:
          "How your community can raise money: WTF equipment grants, funding platforms, grant applications and crowdfunding tips.",
        file: "/resources/team-fundraising-guide-2025.pdf",
        tip: "December 2025 · PDF",
        organisersOnly: true,
      },
    ],
  },
];

// Shown under "Coming soon" on the Resources page.
export const RESOURCES_COMING_SOON: {
  title: string;
  about: string;
  organisersOnly?: boolean; // not on the Core Team's Resources
}[] = [
  {
    title: "Our theory of change",
    about: "How our outreach leads to change, and where each event fits in.",
  },
  {
    title: "Outreach training framework",
    about: "A step-by-step training path for new outreach members.",
  },
  {
    title: "Equipment set-up and pack-down",
    about: "How to set up the Movie Challenge gear and pack it away.",
  },
  {
    title: "Code of conduct",
    about: "How we look after each other at events and online.",
  },
  {
    title: "Brief and debrief guides",
    about:
      "Full guides for running the member briefing before outreach and the debrief after.",
  },
];

// The equipment guide: the basic kit recommended for every team, with where
// to buy it. Australia only for now (add other countries as their own lists).
// How a piece of gear is holding up.
export type Condition = "good" | "fair" | "needs_replacing";
export const CONDITIONS: { id: Condition; label: string }[] = [
  { id: "good", label: "Good" },
  { id: "fair", label: "Fair" },
  { id: "needs_replacing", label: "Needs replacing" },
];

// When the prices in the guide were taken from the shops' listings.
export const PRICES_CHECKED = "29 October 2026";

// Upgrades: the price once local fundraising is matched 2 for 1 (Kai,
// 11 Nov 2026), i.e. every dollar amount halved. "$132.44 with 2 signs"
// -> "$66.22 with 2 signs".
export function matchedPrice(text: string): string {
  return text.replace(/\$(\d[\d,]*(?:\.\d+)?)/g, (_, n: string) => {
    const half = Number(n.replace(/,/g, "")) / 2;
    return `$${Number.isInteger(half) ? half : half.toFixed(2)}`;
  });
}

// Every community gets this to spend on equipment (Kai, 11 Nov 2026).
export const EQUIPMENT_GRANT = 400; // AUD

// What one item costs in a new base kit, for the version showing: the
// listed price × how many the kit needs ("$137.50 for 4" is already a pack).
// null = no price listed.
export function kitCost(
  item: EquipmentItem,
  opt?: { price?: string },
  qty = item.kitQty ?? 1,
): number | null {
  const text = opt ? opt.price : item.price;
  const m = text?.replace(/,/g, "").match(/\$(\d+(?:\.\d+)?)/);
  if (!m) return null;
  const pack = Number(text!.match(/\bfor (\d+)\b/)?.[1] ?? 1);
  return Number(m[1]) * Math.ceil(qty / pack);
}

// Just the matched amount for the pink price beside the main one (Kai,
// 11 Nov 2026: no repeated words): "$99 including shipping" -> "$49.50",
// "~$5 each" -> "~$2.50 each", "From $85" -> "From $42.50".
export function matchedShort(text: string): string {
  const m = text.match(/(from\s+|~|<)?\$\d[\d,]*(?:\.\d+)?/i);
  if (!m) return "";
  return matchedPrice(m[0]) + (/\beach\b/i.test(text) ? " each" : "");
}

// Which photo slot: the item, or one of its options (e.g. "table:best").
export const photoKey = (itemKey: string, option?: { label: string }) =>
  option ? `${itemKey}:${option.label.toLowerCase()}` : itemKey;

export type EquipmentItem = {
  key: string; // stays the same, so gear added from the guide can find it
  name: string;
  about: string;
  shop?: string; // no shop or link: there's a purchasing guide instead
  url?: string;
  price?: string; // from the listing, inc GST, e.g. "$69" (see PRICES_CHECKED)
  // Made from several parts bought separately (each with its own link).
  parts?: { name: string; shop: string; url: string; price?: string }[];
  // Tips for buying it, shown in a pop-up (instead of a shop link).
  guide?: { label: string; text: string }[];
  image?: string; // a default photo (under /equipment); uploads replace it
  // Left out of "What to get next" (consumables, or not every team needs it).
  noSuggest?: boolean;
  // How many a new community's base kit needs (for the kit total; default 1).
  kitQty?: number;
  // Different versions of the same thing (e.g. budget and best), shown with
  // a toggle. The first is shown to start with; url above matches it.
  options?: {
    label: string;
    about: string;
    url?: string; // where to buy it (if you can)
    price?: string;
    instructions?: string; // DIY: link to how-to ("" = coming soon)
    contactLead?: string; // get it from your Regional Support Lead (pop-up text)
    image?: string; // a default photo for this option
    product?: string; // when the options are different products
    shop?: string; // when they're from a different shop
  }[];
};

export const EQUIPMENT_GUIDE: {
  area: string;
  items: EquipmentItem[];
  upgrades: EquipmentItem[]; // nice to have once the basic kit is sorted
}[] = [
  {
    area: "Australia",
    items: [
      {
        key: "table",
        name: "Table",
        about: "For the viewing station and the treats.",
        shop: "Bunnings",
        url: "https://www.bunnings.com.au/lifetime-6ft-standard-blow-mould-trestle-table_p3192212",
        options: [
          {
            label: "Budget",
            product: "Lifetime 6ft Standard Blow Mould Trestle Table",
            about:
              "A standard 6ft trestle table. Needs to be picked up from Bunnings (it isn't delivered).",
            shop: "Bunnings",
            url: "https://www.bunnings.com.au/lifetime-6ft-standard-blow-mould-trestle-table_p3192212",
            price: "$69",
          },
          {
            label: "Best",
            product: "Kings Aluminium Roll-Up Camp Table (Large)",
            about: "Rolls up small to carry.",
            price: "$99 including shipping",
            shop: "4WD Supacentre",
            url: "https://www.4wdsupacentre.com.au/kings-aluminium-roll-up-camping-table-large-rechargeable-lithium-led-worklight.html",
            image: "/equipment/table-kings.jpg",
          },
        ],
      },
      {
        key: "signs",
        name: "Signs",
        about:
          "Signs inviting people to take the challenge. We recommend starting with 4 handheld signs.",
        kitQty: 4,
        options: [
          {
            label: "DIY",
            about:
              "Print the sign on 8 portrait A3 sheets and stick them onto thick cardboard backing.",
            price: "~$5 each",
            instructions: "/resources/signs",
          },
          {
            label: "Best",
            product: "Corrugated plastic signs",
            about: "Light and weatherproof.",
            shop: "Easy Signs",
            url: "https://www.easysigns.com.au/products/details/signflute-corrugated-plastic-signs",
            price: "$137.50 for 4 (600 × 900mm)",
          },
        ],
        guide: [
          {
            label: "When you order",
            text: "Ask for vertical flute: write “vertical flute” in the notes section when you order the signs.",
          },
          {
            label: "Order more than 4",
            text: "Signs get significantly cheaper per sign once you order more than 4.",
          },
        ],
      },
      {
        key: "headphones",
        kitQty: 2, // one pair per viewing device
        name: "Headphones",
        about: "So people watching can hear the footage properly.",
        shop: "AliExpress",
        url: "https://www.aliexpress.com/item/1005007618332688.html",
        price: "$8.19",
      },
      {
        key: "viewing_devices",
        kitQty: 2,
        name: "Viewing devices",
        about:
          "What people watch the footage on. Usually laptops, typically two.",
        price: "<$150 each",
        guide: [
          {
            label: "Priority 1",
            text: "Look on Facebook Marketplace. Also look in your area for refurbished options.",
          },
        ],
      },
      {
        key: "table_banner",
        name: "Table banner",
        about: "Goes across the front of the table.",
        options: [
          {
            label: "DIY",
            about:
              "Make your own: print the banner design on A3 sheets and tape them together.",
            price: "~$25",
            instructions: "/resources/signs?sign=table-banner",
          },
          {
            label: "Best",
            about: "Good-quality banners, bought in bulk.",
            price: "$50",
            contactLead:
              "Ask your Regional Support Lead: they keep a bulk stock of good table banners from Alibaba. Wholesale orders like this are hard to place directly, so get one from them.",
          },
        ],
      },
    ],
    upgrades: [
      {
        key: "headphone_splitters",
        name: "Headphone splitters",
        about: "Plug more than one pair of headphones into the same screen.",
        shop: "AliExpress",
        url: "https://www.aliexpress.com/item/1005006364582345.html",
        price: "~$4 each",
      },
      {
        key: "a_frame",
        name: "A-frame sign",
        about: "Stands on its own, so people can spot you from further away.",
        shop: "Easy Signs",
        url: "https://www.easysigns.com.au/products/details/signflute-insertable-a-frame-sandwich-board",
        guide: [
          {
            label: "When you order",
            text: "Ask for vertical flute: write “vertical flute” in the notes section when you order the signs.",
          },
          {
            label: "Order more than 4",
            text: "Signs get significantly cheaper per sign once you order more than 4.",
          },
        ],
        options: [
          {
            label: "Budget",
            about: "Corrugated plastic panels that slot into the frame.",
            url: "https://www.easysigns.com.au/products/details/signflute-insertable-a-frame-sandwich-board",
            price: "$132.44 with 2 printed signs",
          },
          {
            label: "Best",
            about:
              "Full-colour digital print with lamination, and a handle for easy carrying.",
            url: "https://www.easysigns.com.au/products/details/a-frame-with-full-colour-digital-print-lamination",
            price: "$192.50",
          },
        ],
      },
      {
        key: "standup_banner",
        name: "Stand-up banner",
        about:
          "A tall printed banner that stands on its own, so people can see who you are from down the street.",
        shop: "Officeworks",
        url: "https://www.officeworks.com.au/print-copy/p/pull-up-banners-pcbspbcp",
        options: [
          {
            label: "Budget",
            about:
              "Pull-up banner that rolls into its base. 610 × 1500 mm or 841 × 2000 mm.",
            url: "https://www.officeworks.com.au/print-copy/p/pull-up-banners-pcbspbcp",
            price: "From $85",
          },
          {
            label: "Best",
            about:
              "Stretch fabric banner on a curved frame. Printed in Sydney in 24 hours; single or double sided.",
            url: "https://www.easysigns.com.au/products/details/stretch-fabric-display-stand",
            price: "$197.67 (850 × 2000 mm, single sided)",
            shop: "Easy Signs",
            product: "Stretch fabric display stand",
          },
        ],
      },
      {
        key: "hand_trolley",
        noSuggest: true,
        name: "Hand trolley",
        about:
          "Folding trolley for carrying the gear. More details coming soon.",
        shop: "Bunnings",
        price: "$79",
      },
      {
        key: "video_player_box",
        name: "Video player box",
        about:
          "A fabric storage box to sit the screen in. More details coming soon.",
        shop: "IKEA or Kmart",
        price: "$5 each",
      },
      {
        key: "disinfectant_spray",
        noSuggest: true,
        name: "Disinfectant spray",
        about:
          "For wiping down the headphones between people. More details coming soon.",
        shop: "Woolworths",
        price: "~$4",
      },
      {
        key: "spring_clamps",
        name: "Spring clamps",
        about:
          "Clamp the video stations to the table so they stay put in high wind.",
        shop: "Bunnings",
        url: "https://www.bunnings.com.au/trojan-100mm-spring-clamp_p0319718",
        price: "$8.48 each",
      },
      {
        key: "sign_clamps",
        name: "Sign clamps",
        about: "Good for attaching smaller signs to your tables.",
        shop: "Amazon",
        url: "https://www.amazon.com.au/dp/B0G4S4VHX6",
        price: "~$15",
      },
      {
        key: "sign_carry_bag",
        name: "Sign carry bag",
        about:
          "Keeps your signs flat, dry and in one piece between events, and makes them easy to carry.",
        shop: "AliExpress",
        url: "https://www.aliexpress.com/item/1005008990198241.html",
        options: [
          {
            label: "A2",
            about: "Fits A2 signs (420 × 594 mm).",
            url: "https://www.aliexpress.com/item/1005008990198241.html",
            price: "~$14",
          },
          {
            label: "A1",
            about: "Fits bigger A1 signs (594 × 841 mm).",
            url: "https://www.aliexpress.com/item/1005013138921601.html",
            price: "~$13",
          },
        ],
      },
      {
        key: "power_station",
        name: "Portable power station",
        about:
          "A big rechargeable battery with power points, to keep the screens, laptops and phones charged at events with no power nearby. BLUETTI AC2A: 204 Wh battery, 300 W output.",
        shop: "Amazon",
        url: "https://www.amazon.com.au/dp/B0DWXFJSR9",
        price: "~$300 (often on sale)",
      },
      {
        key: "lanyards",
        name: "Lanyards",
        about:
          "So people can tell who's with the team. More details coming soon.",
      },
      {
        key: "vr_headset",
        name: "VR headset",
        about: "For showing footage in 360°. More details coming soon.",
      },
      {
        key: "lav_mic",
        name: "Lav mic",
        about:
          "A small clip-on microphone for filming conversations and talks. More details coming soon.",
      },
      {
        key: "video_station_covers",
        name: "Video station covers",
        about: "More details coming soon.",
      },
      {
        key: "media_wall",
        name: "Media wall",
        about:
          "A big printed fabric backdrop on a straight frame, 1.5 m wide × 2.2 m high. Great for photos at events and stalls. Premium fabric, single sided, with a bottom zipper.",
        shop: "Easy Signs",
        url: "https://www.easysigns.com.au/products/details/stretch-fabric-media-wall",
        price: "$329.20 inc delivery",
      },
      {
        key: "sign_poles",
        name: "Sign poles",
        about: "Hold signs up high. Made from a few parts:",
        parts: [
          {
            name: "Tuscan Path 280mm black garden edging pegs (10 pack)",
            shop: "Bunnings",
            url: "https://www.bunnings.com.au/tuscan-path-280mm-black-garden-edging-peg-10-pack-black_p0238074",
            price: "$13.98",
          },
          {
            name: "Hy-Clor 1.2m to 3.6m extension pole (3 piece)",
            shop: "Bunnings",
            url: "https://www.bunnings.com.au/hy-clor-1-2m-3-6m-extension-pole-3-piece-1-2-3-6m_p0293231",
            price: "$22",
          },
          {
            name: "Holman 16 to 27mm stainless steel hose clamp",
            shop: "Bunnings",
            url: "https://www.bunnings.com.au/holman-16-27mm-stainless-steel-hose-clamp_p0779876",
            price: "$1.62",
          },
        ],
      },
    ],
  },
];
