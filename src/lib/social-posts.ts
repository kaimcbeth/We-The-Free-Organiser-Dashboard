// Social Media Hub (Kai, 5 Nov 2026): posts from the We The Free main
// Instagram for communities to post on their own accounts. Newest first.
// Slides live in public/social/<slug>/ (1080 × 1350, the main page's
// "www.3movies.wtf" corner link painted out); the community's own
// @username is added in the browser (`watermark` = where it goes).
// {community} in a caption becomes the community's name.

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
    slug: "5-animals",
    title: "5 animals you didn't know were exploited",
    added: "2026-11-05",
    slides: 8,
    watermark: CORNER,
    caption: `The human exploitation of animals runs deep. 😔

👉 Scroll right to find out which other animals continue to suffer at the hands of humanity on a planet we're supposed to share.

🌱 Want to do something about it? Come along to one of our events in {community}. Everyone's welcome and no experience is needed. Find what's coming up at the link in our bio.

.

#wethefree #wtfactivism #3mmc #3minutemoviechallenge
#animalexploitation #pangolins #beavers #songbird #civetcat #cochinealdye #kopiluwak #kopiluwakcoffee
#kopiluwakwhitekoffie #kopiluwakbali #kopiluwakasli
#vanillaflavour #vanillaflavoured #pangolinscales`,
  },
];

export const slideUrl = (p: SocialPost, n: number) =>
  `/social/${p.slug}/${n}.jpg`;
