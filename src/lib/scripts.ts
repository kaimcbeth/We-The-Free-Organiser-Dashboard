// Scripts that open from an action (a starting point; to be refined).
export type Script = {
  title: string;
  minutes: string;
  steps: { heading: string; points: string[] }[];
};

export const SCRIPTS: Record<string, Script> = {
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
