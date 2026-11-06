// Social Media Hub (Kai, 5 Nov 2026): posts from the We The Free main
// Instagram for communities to post on their own accounts. Newest first.
// Slides live in public/social/<slug>/ (1080 × 1350, the main page's
// "www.3movies.wtf" corner link painted out); the community's own
// @username is added in the browser (`watermark` = where it goes).
// {community} in a caption becomes the community's name.
// Give each post its own call to action at the end (Kai, 6 Nov: not the same line on every post).

export type SocialPost = {
  slug: string;
  title: string;
  added: string; // yyyy-mm-dd
  slides: number; // public/social/<slug>/1.jpg … n.jpg
  caption: string;
  // Bottom-left username, matching the original corner link (Poppins 28px).
  watermark: { x: number; baseline: number; size: number };
  source?: string; // the original post on the main account
};

const CORNER = { x: 51, baseline: 1307, size: 28 };

export const SOCIAL_POSTS: SocialPost[] = [
  {
    slug: "sunshine",
    title: "The first and probably the last time I feel the sunshine",
    added: "2026-11-05",
    slides: 1,
    // The main page's bottom-left "www.activism.wtf" (Poppins 27px).
    watermark: { x: 104, baseline: 1297, size: 27 },
    caption: `Slaughterhouses are undoubtedly horrific and literally 'places of doom' but are the lives of innocent animals any different before reaching there?

Most individuals bred for human consumption live in dingy, unhygienic, and cramped places with little to no sunlight. This is besides the violation of their fundamental right to bodily autonomy and free life.

The only time they ever get to experience sunlight is when they are shoved into trucks and transported to the slaughterhouse after long periods of suffering.

What crime did they commit to be suffering like this?

Question, reflect and go vegan!

☀️ Feeling this one? Turn it into action with us in {community}. Our events are friendly, relaxed and open to everyone, no experience needed. Dates are at the link in our bio.

.

#wtfactivism #wethefree #bacon #slaughterhouse #slaughter #farmedanimals #pig #cutepig #animals #pulledpork #baconburger #baconcheeseburger #ham #baconsandwich #animallovers #veganpost #vegansofinstagram #meatlover #animals #animalrights #vegan #veganism #hotdog #pizza #bbq #foodshare #foodie #food #tasty #oppression`,
  },
  {
    slug: "listen",
    title: "Lots of people talk to animals… not very many listen",
    added: "2026-11-05",
    slides: 1,
    // The main page's bottom-left "www.3movies.wtf" (Poppins 29px).
    watermark: { x: 50, baseline: 1304, size: 29 },
    caption: `How much louder must the animals cry before we acknowledge their misery? How many more mothers must bellow for their calves; how many more pigs scream as their lungs burn in gas chambers?

As humans, we love to talk to the farmed animals we meet on countryside walks or the companionship-bred animals who reside in our households…now it's time for us to finally LISTEN.

👂 Ready to listen, then act? There's a seat for you at our next {community} meet-up. Come on your own or bring a friend; the link in our bio has what's on.

.

#veganpost #animals #animallovers #quotes #animalrightsquotes #benjaminhoff`,
  },
  {
    slug: "why-how",
    title: "If the 'why' is powerful, the 'how' becomes easy",
    added: "2026-11-05",
    slides: 1,
    // The main page's bottom-left "www.3movies.wtf" (Poppins 28px).
    watermark: { x: 72, baseline: 1285, size: 28 },
    caption: `Adopting a vegan lifestyle is not hard when you see the victim's perspective.

🧥 Is a jacket worth their screams?

💄 Is lipstick worth their torment?

🎫 Is a show worth their captivity?

🍔 Is a burger worth their life?

🚀 Know your why? We'll help with the how. Join We The Free {community} at an upcoming event and learn alongside people who get it. Everything's at the link in our bio.

.

#argument #antivegan #veganargument #logical #fallacy #speciecism #pigslaughter #govegan #veganism #vegansofig #endspeciesism #veganlife #veganaf`,
  },
  {
    slug: "calves",
    title: "We belong here, not here",
    added: "2026-11-05",
    slides: 1,
    // The main page's bottom-left "www.activism.wtf" (Poppins 27px).
    watermark: { x: 59, baseline: 1286, size: 27 },
    caption: `Calves are taken away from their mothers in the dairy industry so that humans can selfishly drink the milk that should rightfully belong to the mother and baby.

Dairy cows will often cry out for weeks for their missing calves who have been snatched from them and will experience this routine of forced impregnations, kidnappings, and other abuses until it is their time to be executed.

Please stop funding this monstrous industry, and all industries that abuse, exploit, and murder animals for human greed. Go vegan.

🐮 Want to stand up for calves like these? Spend an afternoon with our {community} crew. New faces are always welcome, and you'll find the next event at the link in our bio.

PC: Karoliina Kase

.

#wethefree #wtfactivism #govegan #dairyfree #dairyisscary #cowsarefriends #animalrights #veganforthecows`,
  },
  {
    slug: "5-animals",
    title: "5 animals you didn't know were exploited",
    added: "2026-11-05",
    slides: 8,
    watermark: CORNER,
    caption: `The human exploitation of animals runs deep. 😔

👉 Scroll right to find out which other animals continue to suffer at the hands of humanity on a planet we're supposed to share.

💡 Didn't know about these? Now you do, and you can help change it. Come and meet us at an event in {community}: no experience needed, just curiosity. See what's coming up at the link in our bio.

.

#wethefree #wtfactivism #3mmc #3minutemoviechallenge
#animalexploitation #pangolins #beavers #songbird #civetcat #cochinealdye #kopiluwak #kopiluwakcoffee
#kopiluwakwhitekoffie #kopiluwakbali #kopiluwakasli
#vanillaflavour #vanillaflavoured #pangolinscales`,
  },
];

export const slideUrl = (p: SocialPost, n: number) =>
  `/social/${p.slug}/${n}.jpg`;
