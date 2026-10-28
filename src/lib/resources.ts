// Resources and training for organisers and the Core Team. Add new ones here
// (files go in public/resources/).
export type Resource = {
  title: string;
  about: string;
  file: string; // under /resources
  area?: string; // e.g. "NSW" when it only applies there
  tip?: string;
};

export const RESOURCE_SECTIONS: { title: string; items: Resource[] }[] = [
  {
    title: "At outreach events",
    items: [
      {
        title: "Notice of legal protections",
        area: "NSW",
        about:
          "For police who come by: explains the right to peaceful protest, the limits on move-on directions (LEPRA s 200) and the test for “offensive” conduct.",
        file: "/resources/notice-of-legal-protections-nsw.pdf",
        tip: "Print a copy for the event kit, and keep it on your phone.",
      },
    ],
  },
];

// Shown under "Coming soon" on the Resources page.
export const RESOURCES_COMING_SOON: { title: string; about: string }[] = [
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
    title: "Incident report form",
    about:
      "For recording anything that goes wrong at an event, so it can be followed up.",
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
export type EquipmentItem = {
  key: string; // stays the same, so gear added from the guide can find it
  name: string;
  about: string;
  shop: string;
  url: string;
  // Different versions of the same thing (e.g. budget and best), shown with
  // a toggle. The first is shown to start with; url above matches it.
  options?: {
    label: string;
    about: string;
    url: string;
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
          },
          {
            label: "Best",
            product: "Kings Aluminium Roll-Up Camp Table (Large)",
            about: "Rolls up small to carry.",
            shop: "4WD Supacentre",
            url: "https://www.4wdsupacentre.com.au/kings-aluminium-roll-up-camping-table-large-rechargeable-lithium-led-worklight.html",
          },
        ],
      },
      {
        key: "signs",
        name: "Corrugated plastic signs",
        about:
          "Light, weatherproof signs inviting people to take the challenge.",
        shop: "Easy Signs",
        url: "https://www.easysigns.com.au/products/details/signflute-corrugated-plastic-signs",
      },
      {
        key: "headphones",
        name: "Headphones",
        about: "So people watching can hear the footage properly.",
        shop: "AliExpress",
        url: "https://www.aliexpress.com/item/1005007618332688.html",
      },
      {
        key: "headphone_splitters",
        name: "Headphone splitters",
        about: "Plug more than one pair of headphones into the same screen.",
        shop: "AliExpress",
        url: "https://www.aliexpress.com/item/1005006364582345.html",
      },
    ],
    upgrades: [
      {
        key: "a_frame",
        name: "A-frame sign",
        about: "Stands on its own, so people can spot you from further away.",
        shop: "Easy Signs",
        url: "https://www.easysigns.com.au/products/details/signflute-insertable-a-frame-sandwich-board",
        options: [
          {
            label: "Budget",
            about: "Corrugated plastic panels that slot into the frame.",
            url: "https://www.easysigns.com.au/products/details/signflute-insertable-a-frame-sandwich-board",
          },
          {
            label: "Best",
            about: "Full-colour digital print with lamination.",
            url: "https://www.easysigns.com.au/products/details/a-frame-with-full-colour-digital-print-lamination",
          },
        ],
      },
    ],
  },
];
