// "Welcome to We The Free": the first thing a new member sees. Mission and
// values, from WTF's own material (Code of Conduct values, Theory of Change,
// Movie Challenge FAQs). Photos are from activism.wtf for now; swap in your
// own community's by changing `image`.

export type WelcomeCard = {
  title: string;
  image: string;
  imageAlt: string;
  body: string[];
  list?: { title: string; text: string }[];
};

export const WELCOME_CARDS: WelcomeCard[] = [
  {
    title: "Welcome to We The Free",
    image: "https://activism.wtf/images/hero.jpg",
    imageAlt: "We The Free activists at a street outreach event",
    body: [
      "You've joined a global community of volunteers in over 170 teams across nearly 40 countries.",
      "We're working toward one thing: a world where all animals are free.",
    ],
  },
  {
    title: "Why we do what we do",
    image: "https://activism.wtf/images/organizers.jpg",
    imageAlt: "A We The Free team together",
    body: [
      "We're not trying to outreach our way to a vegan world. We're driving change through conversations that transform people, and by building a strong, united movement.",
    ],
    list: [
      {
        title: "Creating vegans who create change",
        text: "Every person who goes vegan votes for animals as a shopper, as a citizen and in their workplace, school and community.",
      },
      {
        title: "Building a movement",
        text: "Research on nonviolent movements suggests about 3.5% of people actively taking part can be enough to bring change. Every volunteer counts.",
      },
    ],
  },
  {
    title: "Our values",
    image:
      "https://getinvolved-prod.ams3.cdn.digitaloceanspaces.com/pages/01M2QM203T1V13AJ9ZQ3SVFQWP.jpg",
    imageAlt: "Activists embracing under umbrellas at a rainy street event",
    body: ["What we stand for, and how we treat each other."],
    list: [
      {
        title: "All animals should be free",
        text: "We work to end the exploitation of animals and all violence against them.",
      },
      {
        title: "We build inclusive communities",
        text: "Everyone is welcome, whatever their race, gender, culture, age, sexuality or politics. No discrimination, bullying or harassment.",
      },
      {
        title: "We are nonviolent",
        text: "We lead with kindness and compassion, and we calm conflict down.",
      },
      {
        title: "We embrace growth",
        text: "We keep learning, as people, as a community and as an organisation.",
      },
      {
        title: "We talk openly",
        text: "Honest, kind feedback keeps our community strong.",
      },
    ],
  },
  {
    title: "How we show up",
    image: "https://activism.wtf/images/hero.jpg",
    imageAlt: "A volunteer talking with a member of the public",
    body: [],
    list: [
      {
        title: "Everyone is pre-vegan",
        text: "Most of us weren't always vegan. We talk with people, never down to them.",
      },
      {
        title: "Listen more than you talk",
        text: "People believe what they say, not what they hear. Our job is to ask good questions.",
      },
      {
        title: "Look after each other",
        text: "Be kind, give people the benefit of the doubt, and keep each other's details private.",
      },
      {
        title: "Look after yourself",
        text: "This work can be heavy. Take breaks, talk to someone, and use our mental health resources whenever you need them.",
      },
    ],
  },
  {
    title: "Your first event",
    image: "https://activism.wtf/images/organizers.jpg",
    imageAlt: "Volunteers at a We The Free event",
    body: ["No experience needed. Here's all you need to know."],
    list: [
      {
        title: "Arrive 15 minutes early",
        text: "There's a short briefing before every event.",
      },
      {
        title: "Say it's your first time",
        text: "Your organiser will look after you.",
      },
      {
        title: "Start however you like",
        text: "Shadow someone experienced, or take a role that doesn't involve talking, like holding a sign or resetting the screens.",
      },
    ],
  },
];

export const MENTAL_HEALTH_URL = "https://activism.wtf/mental-health";
export const THEORY_OF_CHANGE_URL =
  "https://activism.wtf/blog/theory-of-change";
