// Discussion prompts for community group chats (from Kai's spreadsheet,
// 29 Oct 2026). Keep ids stable: "posted" is saved against them.
export type PromptType = "General" | "Outreach" | "Other";
export const PROMPT_TYPES: PromptType[] = ["General", "Outreach", "Other"];
export type DiscussionPrompt = { id: string; text: string; type: PromptType };

export const DISCUSSION_PROMPTS: DiscussionPrompt[] = [
  {
    id: "p1",
    type: "General",
    text: "How do you balance your personal life with activism?",
  },
  {
    id: "p2",
    type: "General",
    text: "How do you handle moments of frustration or disappointment when progress toward veganism seems slow?",
  },
  {
    id: "p3",
    type: "General",
    text: "How has being vegan impacted your relationships with friends and family?",
  },
  {
    id: "p4",
    type: "General",
    text: "How quickly did you transition to being vegan and what was the hardest part?",
  },
  {
    id: "p5",
    type: "General",
    text: "What are some common misconceptions about veganism?",
  },
  {
    id: "p6",
    type: "General",
    text: "What are some of the most common mistakes people make as animal rights activists?",
  },
  {
    id: "p7",
    type: "General",
    text: "What are some of the most common mistakes people make as vegans?",
  },
  {
    id: "p8",
    type: "General",
    text: "What do you think the animal rights movement needs less of?",
  },
  {
    id: "p9",
    type: "General",
    text: "What do you think the animal rights movement needs more of?",
  },
  {
    id: "p10",
    type: "General",
    text: "What inspired you to become an activist?",
  },
  {
    id: "p11",
    type: "General",
    text: "What is the best or most inspiring conversation you've had with someone about veganism?",
  },
  {
    id: "p12",
    type: "General",
    text: "What is the hardest part about being an animal rights activist?",
  },
  {
    id: "p13",
    type: "General",
    text: "What is the hardest part about being vegan?",
  },
  {
    id: "p14",
    type: "General",
    text: "What is the weirdest conversation you've had with someone about veganism?",
  },
  {
    id: "p15",
    type: "General",
    text: "What is your favourite vegan/animal rights documentary and why?",
  },
  {
    id: "p16",
    type: "General",
    text: "What is your favourite vegan/animal rights speech and why?",
  },
  {
    id: "p17",
    type: "General",
    text: "What one thing would you like to improve on the most as an activist?",
  },
  {
    id: "p18",
    type: "General",
    text: "What are some common misconceptions about animal rights activism?",
  },
  {
    id: "p19",
    type: "General",
    text: "What and when was your first activism event?",
  },
  {
    id: "p20",
    type: "General",
    text: "Who are your favourite animal rights activists and why?",
  },
  {
    id: "p21",
    type: "Other",
    text: "What suggestions would you have (big or small) to make our events more effective?",
  },
  {
    id: "p22",
    type: "Other",
    text: "What suggestions would you make for food to be given out at our events?",
  },
  {
    id: "p23",
    type: "Outreach",
    text: "How do you deal with the topic of animal testing in medicine when speaking to people about veganism?",
  },
  {
    id: "p24",
    type: "Outreach",
    text: "How do you deal with the topic of bone char when speaking to people about veganism?",
  },
  {
    id: "p25",
    type: "Outreach",
    text: "How do you deal with the topic of honey when speaking to people about veganism?",
  },
  {
    id: "p26",
    type: "Outreach",
    text: "How do you deal with the topic of oysters when speaking to people about veganism?",
  },
  {
    id: "p27",
    type: "Outreach",
    text: 'How would you respond if someone said: "I woud be vegan but animal farming is important for the economy"?',
  },
  {
    id: "p28",
    type: "Outreach",
    text: 'How would you respond if someone said: "I woud be vegan but animals aren\'t sentient"?',
  },
  {
    id: "p29",
    type: "Outreach",
    text: 'How would you respond if someone said: "I would be vegan but animal farming is more efficient"?',
  },
  {
    id: "p30",
    type: "Outreach",
    text: 'How would you respond if someone said: "I would be vegan but animals and humans are different"?',
  },
  {
    id: "p31",
    type: "Outreach",
    text: 'How would you respond if someone said: "I would be vegan but animals can\'t reciprocate morality"?',
  },
  {
    id: "p32",
    type: "Outreach",
    text: 'How would you respond if someone said: "I would be vegan but animals were bred to be eaten"?',
  },
  {
    id: "p33",
    type: "Outreach",
    text: 'How would you respond if someone said: "I would be vegan but being vegan is unhealthy"?',
  },
  {
    id: "p34",
    type: "Outreach",
    text: 'How would you respond if someone said: "I would be vegan but eating meat is natural"?',
  },
  {
    id: "p35",
    type: "Outreach",
    text: 'How would you respond if someone said: "I would be vegan but eating meat is part of my culture"?',
  },
  {
    id: "p36",
    type: "Outreach",
    text: 'How would you respond if someone said: "I would be vegan but farm animals are given a net positive life"?',
  },
  {
    id: "p37",
    type: "Outreach",
    text: 'How would you respond if someone said: "I would be vegan but I can\'t because I would have to eat meat on a desert island."',
  },
  {
    id: "p38",
    type: "Outreach",
    text: 'How would you respond if someone said: "I would be vegan but I don\'t care"?',
  },
  {
    id: "p39",
    type: "Outreach",
    text: 'How would you respond if someone said: "I would be vegan but I eat because everyone else does"?',
  },
  {
    id: "p40",
    type: "Outreach",
    text: 'How would you respond if someone said: "I would be vegan but I enjoy the taste"?',
  },
  {
    id: "p41",
    type: "Outreach",
    text: 'How would you respond if someone said: "I would be vegan but I just don\'t think about it"?',
  },
  {
    id: "p42",
    type: "Outreach",
    text: 'How would you respond if someone said: "I would be vegan but I knew a vegan who was an asshole"?',
  },
  {
    id: "p43",
    type: "Outreach",
    text: 'How would you respond if someone said: "I would be vegan but I respect the animals I eat"?',
  },
  {
    id: "p44",
    type: "Outreach",
    text: "How would you respond if someone said: \"I would be vegan but I've killed animals before and I'm okay with it\"?",
  },
  {
    id: "p45",
    type: "Outreach",
    text: 'How would you respond if someone said: "I would be vegan but it is too hard"?',
  },
  {
    id: "p46",
    type: "Outreach",
    text: 'How would you respond if someone said: "I would be vegan but it\'s my personal choice to eat meat"?',
  },
  {
    id: "p47",
    type: "Outreach",
    text: 'How would you respond if someone said: "I would be vegan but it\'s too expensive"?',
  },
  {
    id: "p48",
    type: "Outreach",
    text: 'How would you respond if someone said: "I would be vegan but it\'s too extreme"?',
  },
  {
    id: "p49",
    type: "Outreach",
    text: 'How would you respond if someone said: "I would be vegan but morality is subjective"?',
  },
  {
    id: "p50",
    type: "Outreach",
    text: 'How would you respond if someone said: "I would be vegan but my religion allows me to eat meat"?',
  },
  {
    id: "p51",
    type: "Outreach",
    text: 'How would you respond if someone said: "I would be vegan but plants feel pain"?',
  },
  {
    id: "p52",
    type: "Outreach",
    text: 'How would you respond if someone said: "I would be vegan but regenerative animal farming is better for the environment"?',
  },
  {
    id: "p53",
    type: "Outreach",
    text: 'How would you respond if someone said: "I would be vegan but soy is bad for you"?',
  },
  {
    id: "p54",
    type: "Outreach",
    text: 'How would you respond if someone said: "I would be vegan but the animals we eat are treated well"?',
  },
  {
    id: "p55",
    type: "Outreach",
    text: 'How would you respond if someone said: "I would be vegan but the videos you show are cherry picked"?',
  },
  {
    id: "p56",
    type: "Outreach",
    text: 'How would you respond if someone said: "I would be vegan but there are bigger issues in the world"?',
  },
  {
    id: "p57",
    type: "Outreach",
    text: 'How would you respond if someone said: "I would be vegan but veganism is a privilage"?',
  },
  {
    id: "p58",
    type: "Outreach",
    text: 'How would you respond if someone said: "I would be vegan but veganism is bad for the environment"?',
  },
  {
    id: "p59",
    type: "Outreach",
    text: 'How would you respond if someone said: "I would be vegan but we couldn\'t feed everyone without meat"?',
  },
  {
    id: "p60",
    type: "Outreach",
    text: 'How would you respond if someone said: "I would be vegan but we have been eating meat for a long time"?',
  },
  {
    id: "p61",
    type: "Outreach",
    text: 'How would you respond if someone said: "I would be vegan but what I buy has no effect on things"?',
  },
  {
    id: "p62",
    type: "Outreach",
    text: 'How would you respond if someone said: "I would be vegan but what you are doing is ineffective"?',
  },
  {
    id: "p63",
    type: "Outreach",
    text: 'How would you respond if someone said: "I would be vegan but what you are doing is wrong/offensive"?',
  },
  {
    id: "p64",
    type: "Outreach",
    text: 'How would you respond if someone said: "I would be vegan but you can\'t change everyone else."',
  },
  {
    id: "p65",
    type: "Outreach",
    text: 'How would you respond if someone said: "I would be vegan but you shouldn\'t judge others"?',
  },
  {
    id: "p66",
    type: "Outreach",
    text: 'How would you respond if someone said: "I would be vegan but your clothes were probably made in a sweatshop"?',
  },
  { id: "p67", type: "Outreach", text: "Red herring" },
  { id: "p68", type: "Outreach", text: "Ridicule" },
  {
    id: "p69",
    type: "Outreach",
    text: "What is the most difficult religion to outreach?",
  },
  {
    id: "p70",
    type: "Outreach",
    text: 'How would you respond if someone said: "I would be vegan but farm animals would overpopulate"?',
  },
  { id: "p71", type: "Other", text: "Do you have pets/companion animals?" },
  {
    id: "p72",
    type: "Other",
    text: "What are your favourite Christmas foods to veganise?",
  },
];
