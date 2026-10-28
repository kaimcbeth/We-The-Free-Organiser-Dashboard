// The Outreach guide: a condensed, between-conversations version of We The
// Free's Inspiring Behaviour Change (IBC) Foundations
// (https://activism.wtf/ibc/foundations). Not for reading during a
// conversation: a quick reflection after one, the bit of the method that
// helps, and one thing to focus on next time.

export const FOUNDATIONS_URL = "https://activism.wtf/ibc/foundations";

export type Stage = "awareness" | "accountability" | "action";

export const STAGES: { id: Stage; label: string; about: string }[] = [
  {
    id: "awareness",
    label: "Awareness",
    about: "Help them notice what they already feel about it.",
  },
  {
    id: "accountability",
    label: "Accountability",
    about: "Help them see what causes it, and that it doesn't have to happen.",
  },
  {
    id: "action",
    label: "Action",
    about: "Help them picture what they could do, in their own words.",
  },
];

export const QUESTIONS: {
  n: number;
  stage: Stage;
  q: string;
  note?: string;
}[] = [
  {
    n: 1,
    stage: "awareness",
    q: "Have you seen this type of footage before?",
    note: "If yes: where?",
  },
  {
    n: 2,
    stage: "awareness",
    q: "How do you feel when you see this?",
    note: "Then: what makes you feel that way?",
  },
  {
    n: 3,
    stage: "awareness",
    q: "What is it about animals being treated this way that bothers you?",
  },
  { n: 4, stage: "awareness", q: "How do you think the animals feel?" },
  {
    n: 5,
    stage: "accountability",
    q: "Given most people are against this, what do you think causes it to happen?",
  },
  { n: 6, stage: "accountability", q: "Do we have to do this to animals?" },
  {
    n: 7,
    stage: "action",
    q: "So what do you think we can do as individuals to stop this?",
  },
  { n: 8, stage: "action", q: "Would that be too difficult for you?" },
  {
    n: 9,
    stage: "action",
    q: "What would be the most difficult thing?",
    note: "Your bridge: their answer is the objection to work on next.",
  },
];

// Hidden from the cheat sheet for now (Kai, 29 Oct); kept to bring back.
export const ATTITUDE = [
  "Pre-vegan, never abuser",
  "No contempt, even unspoken",
  "Listen properly, don't plan your reply",
  "Friendly, kind, empowering",
  "Let them say it",
];

export const OBJECTION_MOVES = [
  {
    title: "Empathise briefly",
    text: "“Yeah, that makes sense, a lot of people worry about that.” Keep it short.",
  },
  {
    title: "Past problem",
    text: "“Have you ever solved something like this before? How could that work here?”",
  },
  {
    title: "Magic wand",
    text: "“If I waved a magic wand and you were vegan tomorrow, how would you…?”",
  },
  {
    title: "Fill the gaps",
    text: "Add your own know-how only where they're stuck.",
  },
  { title: "Close", text: "Closing card, then always ask: “Will you do it?”" },
];

export const OBJECTIONS: { id: string; label: string; tip: string }[] = [
  {
    id: "taste",
    label: "Taste / I love meat",
    tip: "Magic wand works well: “If you were vegan, what would you eat instead of your favourite meal?” Let them name the swaps.",
  },
  {
    id: "health",
    label: "Health / protein",
    tip: "Ask what they'd want to be sure of, then fill the gap briefly: beans, lentils, tofu and nuts cover protein for most people.",
  },
  {
    id: "convenience",
    label: "Too hard / no time",
    tip: "Past problem: “Have you changed a habit before? What helped?” Then: “What's one meal you could start with?”",
  },
  {
    id: "cost",
    label: "Cost",
    tip: "Ask what they eat on a budget now. Staples like rice, beans, lentils and veg are among the cheapest foods.",
  },
  {
    id: "social",
    label: "Family / friends",
    tip: "Empathise, then: “If you were vegan already, how would you handle dinner with them?” Let them plan it.",
  },
  {
    id: "humane",
    label: "“Humane” / local meat",
    tip: "Go back to their own words: “You said the animals feel… Does how they're raised change that?”",
  },
  {
    id: "natural",
    label: "Natural / food chain",
    tip: "Back to accountability: “Do we have to do this to animals?” Let them answer.",
  },
  {
    id: "difference",
    label: "One person can't change it",
    tip: "Ask how other changes they care about happened. Then: “What's the hardest part for you personally?”",
  },
  {
    id: "other",
    label: "Something else",
    tip: "Is it a real concern for them, or a hypothetical? If it's hypothetical, go back to: “What would be the most difficult thing for you?”",
  },
];

// The bit of the method to look at, by where the conversation got stuck.
export const REFRESHERS: Record<
  Stage | "none",
  { title: string; points: string[] }
> = {
  awareness: {
    title: "Awareness: let them feel it",
    points: [
      "Ask, then really listen. Silence is fine.",
      "Follow up on feelings: “What makes you feel that way?”",
      "Don't add facts yet. Their words matter more than yours.",
    ],
  },
  accountability: {
    title: "Accountability: what causes this?",
    points: [
      "“Given most people are against this, what causes it to happen?”",
      "Then: “Do we have to do this to animals?”",
      "Let them answer fully before you move on. No correcting.",
    ],
  },
  action: {
    title: "Action: let them picture it",
    points: [
      "“What can we do as individuals to stop this?”",
      "“Would that be too difficult for you?” Then “What would be the hardest thing?”",
      "Their hardest thing is your next step: handle it as an objection.",
    ],
  },
  none: {
    title: "Nice. Keep doing what you did.",
    points: [
      "Did you ask for a commitment? “Will you do it?”",
      "Did they get a closing card?",
    ],
  },
};

// One small thing to practise in the next conversation.
export const FOCUSES = [
  "Validate their answer before you ask the next question.",
  "After you ask, count to three before saying anything.",
  "Ask “What makes you feel that way?” at least once.",
  "Let them do most of the talking.",
  "Ask for a commitment: “Will you do it?”",
  "Use their exact words when you ask the next question.",
  "Notice any urge to correct them. Ask a question instead.",
  "Try the magic wand if they raise an objection.",
];

export const OUTCOMES = [
  { id: "committed", label: "They committed" },
  { id: "good", label: "Good chat" },
  { id: "tough", label: "Tough one" },
] as const;
export type Outcome = (typeof OUTCOMES)[number]["id"];

export const STUCK_OPTIONS: {
  id: Stage | "objection" | "none";
  label: string;
}[] = [
  { id: "awareness", label: "Awareness" },
  { id: "accountability", label: "Accountability" },
  { id: "action", label: "Action" },
  { id: "objection", label: "An objection" },
  { id: "none", label: "Didn't get stuck" },
];
