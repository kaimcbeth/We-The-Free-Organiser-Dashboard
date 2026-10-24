// Scripts that open from an action (a starting point; to be refined).
export type Script = {
  title: string;
  minutes: string;
  label?: string; // the button ("Script" by default)
  steps: { heading: string; points: string[] }[];
};

export const SCRIPTS: Record<string, Script> = {
  // Placeholder: basic tips for now, the full guide comes later.
  ev_setup: {
    title: "Set-up guide",
    label: "Guide",
    minutes: "About 10 minutes, before people arrive",
    steps: [
      {
        heading: "Arrive early",
        points: [
          "Get there 30 minutes before the start so you're set up before anyone arrives.",
        ],
      },
      {
        heading: "Pick your spot",
        points: [
          "Somewhere visible with lots of foot traffic, but keep footpaths and doorways clear.",
          "Find some shade if you can, for people and for the screens.",
        ],
      },
      {
        heading: "Lay out the challenge space",
        points: [
          "Banner and sign facing the foot traffic.",
          "Screens and headphones together, with space for people to stand and watch.",
          "Prizes and resources on the table, the QR code where people can see it.",
        ],
      },
      {
        heading: "Check the gear",
        points: [
          "Screens on and charged, headphones working, spare power bank to hand.",
        ],
      },
      {
        heading: "Last look",
        points: [
          "Walk past it like a stranger would. Does it look inviting? Is anything in the way?",
        ],
      },
    ],
  },
  ev_briefing: {
    title: "Volunteer briefing",
    minutes: "About 5 minutes, before you start",
    steps: [
      {
        heading: "Welcome",
        points: [
          "Thank everyone for coming. Quick round of names.",
          "Give anyone new a warm welcome and pair them with someone experienced.",
        ],
      },
      {
        heading: "Today's plan",
        points: [
          "Start and finish times, and when we'll pack down.",
          "Where everything is: screens, headphones, prize table, resources.",
        ],
      },
      {
        heading: "Who's doing what",
        points: [
          "Inviting passers-by, running the screens, conversations after the video, photos, attendance.",
          "Swap roles during the day if you like.",
        ],
      },
      {
        heading: "How we talk to people",
        points: [
          "Friendly and curious, never lecturing. Ask open questions and listen.",
          "Share the resources and QR code. It's fine to say \"I'm not sure\".",
        ],
      },
      {
        heading: "Looking after each other",
        points: [
          "Water, sunscreen, and a break at least every hour.",
          "If someone's hostile: stay calm, don't argue, step away and find the Events Lead.",
          "If police come by: be polite. We've let them know we're here.",
        ],
      },
      {
        heading: "Photos",
        points: [
          "Ask before taking photos of people, and check if anyone new would rather not be in them.",
        ],
      },
      {
        heading: "Questions?",
        points: ["Any questions? Let's have a good one."],
      },
    ],
  },
  ev_debrief: {
    title: "Volunteer debrief",
    minutes: "5 to 10 minutes, after pack-down",
    steps: [
      {
        heading: "Thank you",
        points: ["Thank everyone. Name one win from the day."],
      },
      {
        heading: "Quick round",
        points: [
          "Each person: one thing that went well, and one thing that was hard. Keep it short.",
        ],
      },
      {
        heading: "Rough numbers",
        points: [
          "About how many watched the video and how many good conversations?",
        ],
      },
      {
        heading: "Next time",
        points: [
          "Anything to fix: gear, spot, timing, roles? Note it in the event's Notes.",
        ],
      },
      {
        heading: "How's everyone going?",
        points: [
          "Check in on how people are feeling. Outreach can be heavy.",
          "Remind people of the mental health resources at activism.wtf/mental-health.",
        ],
      },
      {
        heading: "What's next",
        points: [
          "When the next event is, and an invite to hang out afterwards.",
          "Make sure attendance is taken and photos are uploaded.",
        ],
      },
    ],
  },
};
