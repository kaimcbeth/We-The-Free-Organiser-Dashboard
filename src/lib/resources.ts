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
    about: "A step-by-step training path for new outreach volunteers.",
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
    title: "Fundraising guide",
    about:
      "Ways your community can raise money for gear, events and the movement.",
  },
  {
    title: "Brief and debrief guides",
    about:
      "Full guides for running the volunteer briefing before outreach and the debrief after.",
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
            about: "A standard 6ft trestle table.",
            shop: "Bunnings",
            url: "https://www.bunnings.com.au/lifetime-6ft-standard-blow-mould-trestle-table_p3192212",
            price: "$69",
          },
          {
            label: "Best",
            product: "Kings Aluminium Roll-Up Camp Table (Large)",
            about: "Rolls up small to carry.",
            shop: "4WD Supacentre",
            url: "https://www.4wdsupacentre.com.au/kings-aluminium-roll-up-camping-table-large-rechargeable-lithium-led-worklight.html",
            image: "/equipment/table-kings.jpg",
          },
        ],
      },
      {
        key: "signs",
        name: "Signs",
        about: "Signs inviting people to take the challenge.",
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
        name: "Headphones",
        about: "So people watching can hear the footage properly.",
        shop: "AliExpress",
        url: "https://www.aliexpress.com/item/1005007618332688.html",
        price: "$8.19",
      },
      {
        key: "headphone_splitters",
        name: "Headphone splitters",
        about: "Plug more than one pair of headphones into the same screen.",
        shop: "AliExpress",
        url: "https://www.aliexpress.com/item/1005006364582345.html",
        price: "~$4 each",
      },
      {
        key: "viewing_devices",
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
            about: "Make your own.",
            price: "~$25",
            instructions: "",
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
            about: "Full-colour digital print with lamination.",
            url: "https://www.easysigns.com.au/products/details/a-frame-with-full-colour-digital-print-lamination",
            price: "$192.50",
          },
        ],
      },
      {
        key: "bell",
        name: "Bell",
        about:
          "For people to ring when they finish the video. Great for busy and chaotic outreach events.",
        shop: "AliExpress",
        url: "https://www.aliexpress.com/item/1005003770913674.html",
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
            price: "From $140.26 ($197.67 for 850 × 2000 mm single sided)",
            shop: "Easy Signs",
            product: "Stretch fabric display stand",
          },
        ],
      },
      {
        key: "hand_trolley",
        name: "Hand trolley",
        about:
          "Folding trolley for carrying the gear. More details coming soon.",
        shop: "Bunnings",
        price: "$85",
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
        name: "Disinfectant spray",
        about:
          "For wiping down the headphones between people. More details coming soon.",
        shop: "Woolworths",
        price: "$9.50",
      },
      {
        key: "spring_clamps",
        name: "Spring clamps",
        about:
          "Clamp the video stations to the table so they stay put in high wind.",
        shop: "Bunnings",
        url: "https://www.bunnings.com.au/trojan-100mm-spring-clamp_p0319718",
        price: "$8.48 each (Trojan 100mm)",
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
