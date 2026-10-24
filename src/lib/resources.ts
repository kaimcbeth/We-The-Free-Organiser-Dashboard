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
    title: "3MMC equipment guide",
    about: "What gear you need, how to set it up and how to pack it away.",
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
