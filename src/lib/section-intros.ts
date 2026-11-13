// Section introductions (Kai, 7 Nov 2026): a short card at the top of each
// organiser tab, read once and then gone. The overall introduction only
// shows the tabs; the detail lives here, where people actually need it.

export type IntroStep = {
  title: string;
  body: string;
  // CSS selectors, comma separated: while the step is showing, the first one
  // on screen is scrolled into view and spotlighted.
  target?: string;
};

export type SectionIntro = {
  key: string; // saved in intro_dismissals
  name: string;
  icon: string;
  tone: string; // icon tile colour
  steps: IntroStep[];
};

const tour = (k: string) => `[data-tour="${k}"]`;

export const SECTION_INTROS: SectionIntro[] = [
  {
    key: "organiser-events",
    name: "Events",
    icon: "📅",
    tone: "bg-cyan",
    steps: [
      {
        title: "Events come in by themselves",
        body: "Your events are copied from activism.wtf every hour, so you never type them in. Tap “activism.wtf ↗” on any event to open it on the website.",
        target: `${tour("today-event")}, ${tour("next-event")}`,
      },
      {
        title: "List or calendar",
        body: "List puts today's event at the top. Calendar shows the month, and can also show nearby communities' events.",
        target: tour("view-switch"),
      },
      {
        title: "Attendance in 60 seconds",
        body: "On the day, open the event and tap names as people arrive. Busy running it? A member can scan the Helper QR on the event page and check people in for you.",
        target: `${tour("today-event")}, ${tour("next-event")}`,
      },
      {
        title: "After each event",
        body: "A recap card shows who came and who was new. Each Monday a Newcomers card lists last week's first-timers, so your regulars can welcome them.",
      },
      {
        title: "Reminders and sharing",
        body: "Reminders sets up emails or texts before events. Share gives you a link and QR code with all your upcoming events, for anyone.",
        target: tour("reminders-link"),
      },
    ],
  },
  {
    key: "organiser-actions",
    name: "Actions",
    icon: "📝",
    tone: "bg-yellow",
    steps: [
      {
        title: "What actions are",
        body: "Actions are the regular jobs that keep a community growing: promoting events, welcoming newcomers, sharing photos. They show up around each event, each with a time estimate. Tick them off as you go.",
        target: tour("tasks-head"),
      },
      {
        title: "Plan how much you take on",
        body: "Plan actions asks how much time you have each week and suggests which actions to switch on. Change it whenever life gets busier or quieter.",
        target: tour("choose-tasks"),
      },
      {
        title: "Most of the work is done for you",
        body: "Look for the buttons on each card: Write post writes the words, Get graphic makes the image, Open all opens every local Facebook group, and the police form fills itself in.",
      },
      {
        title: "Hand actions to your crew",
        body: "Tap Delegate on any action and pick who'll do it, just this once or every time. They get a notification and see it on their own page.",
        target: tour("delegate-button"),
      },
      {
        title: "Keep it tidy",
        body: "Tap ▼ beside a title to fold a card. Move for later puts an action off without losing it. The bell at the top tells you when something is due.",
      },
    ],
  },
  {
    key: "organiser-people",
    name: "People",
    icon: "🧑‍🤝‍🧑",
    tone: "bg-pink",
    steps: [
      {
        title: "Everyone in your community",
        body: "Add someone with just their name. Members can add their own details and photo once they connect, or you can add a phone number or Facebook link for them.",
        target: tour("people-search"),
      },
      {
        title: "Reach out in one tap",
        body: "WhatsApp and Messenger buttons sit next to anyone with a phone number or Facebook link.",
        target: tour("people-list"),
      },
      {
        title: "Who's engaged",
        body: "The little bars show how often each person comes, from red (rarely) to green (a lot). An arrow means it's changed a lot in the last two months.",
        target: `${tour("engagement-bar")}, ${tour("people-list")}`,
      },
      {
        title: "Build your crew",
        body: "Tap + Role next to anyone to make them an Organiser or Core Team member. Members who offer to help out (photos, check-ins, socials) show up under Helping out for you to say yes.",
        target: "#helping-out",
      },
    ],
  },
  {
    key: "organiser-insights",
    name: "Insights",
    icon: "📊",
    tone: "bg-cyan",
    steps: [
      {
        title: "How your community is growing",
        body: "The charts show people at events each month, how many were new or came back, and which kinds of events bring people in.",
        target: tour("insights-charts"),
      },
      {
        title: "Who to reach out to",
        body: "Lower down: people who came once, regulars who've drifted off, and milestones coming up. A friendly message goes a long way.",
        target: tour("insights-follow-up"),
      },
      {
        title: "Every person, every month",
        body: "At the bottom, open Everyone for each person's attendance, or Monthly totals for the numbers. Tap a month for its details, or download any list as a spreadsheet.",
        target: tour("insights-table"),
      },
    ],
  },
  {
    key: "organiser-resources",
    name: "Resources",
    icon: "📚",
    tone: "bg-yellow",
    steps: [
      {
        title: "Everything in one place",
        body: "Guides, forms and tools for running your community. Use the search box if you know what you're after.",
        target: 'input[type="search"]',
      },
      {
        title: "Social Media Hub",
        body: "Plan your posts on a calendar, make a graphic and caption for any event, or grab a ready-made post with your community's @handle on it.",
        target: 'a[href$="/resources/social"]',
      },
      {
        title: "Photo Hub",
        body: "All your community's photos together. Drag them in, or make a QR code so people can add photos from their phones at the event.",
      },
      {
        title: "For event days",
        body: "The Movie Challenge player, recommended prizes, the equipment guide and the sign splitter (print any sign on A3 sheets).",
        target: 'a[href$="/resources/equipment"]',
      },
      {
        title: "Hear from your members",
        body: "Share the member feedback link (no login needed), and send your own feedback to We The Free Global Support.",
      },
    ],
  },
  {
    key: "organiser-funding",
    name: "Funding",
    icon: "💸",
    tone: "bg-pink",
    steps: [
      {
        title: "Your community's money",
        body: "What you've banked and what comes in each month from We The Free. Unspent funding carries over, so you can save for bigger things. These are example numbers for now.",
      },
      {
        title: "What to get next",
        body: "Gear suggestions in the order that helps most, with prices and links, and when you'll have enough for each.",
      },
      {
        title: "Better prizes",
        body: "The more you've banked, the more premium Movie Challenge prizes you can unlock.",
      },
    ],
  },
];

// Which tab's introduction goes with a page (only the tab's main pages).
export function introForPath(path: string): SectionIntro | null {
  const key =
    path === "/" || path === "/calendar"
      ? "organiser-events"
      : path === "/tasks"
        ? "organiser-actions"
        : path === "/people"
          ? "organiser-people"
          : path === "/insights"
            ? "organiser-insights"
            : path === "/resources"
              ? "organiser-resources"
              : path === "/funding"
                ? "organiser-funding"
                : null;
  return SECTION_INTROS.find((s) => s.key === key) ?? null;
}
