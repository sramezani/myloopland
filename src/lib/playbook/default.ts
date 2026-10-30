import type { Playbook } from "./schema";

/**
 * Playbook v1, saved when a user first adds their X profile (docs/SPEC.md section 5).
 * Only a starting point: the setup chat with Claude makes it the user's own, and every later
 * change is a new version. Two posts a day, a lunch slot and an evening slot, each with a
 * weekly topic. `goal`, `about` and `voice` stay empty until Claude has asked.
 */
export const DEFAULT_PLAYBOOK: Playbook = {
  goal: null,
  about: "",
  voice: "",
  pillars: [
    { key: "build", label: "What you're building", share: 30 },
    { key: "lessons", label: "Lessons and how-tos", share: 25 },
    { key: "takes", label: "Takes on news in your field", share: 20 },
    { key: "journey", label: "Behind the scenes", share: 15 },
    { key: "life", label: "Life and fun", share: 10 },
  ],
  week: {
    mon: [
      { time: "12:30", topic: "What I'm working on this week", pillar: "build" },
      { time: "19:00", topic: "A tool or workflow I use", pillar: "lessons" },
    ],
    tue: [
      { time: "12:30", topic: "Old way vs my way", pillar: "lessons" },
      { time: "19:00", topic: "Today's news in my field, and my take", pillar: "takes" },
    ],
    wed: [
      { time: "12:30", topic: "An experiment and its result", pillar: "build" },
      { time: "19:00", topic: "Behind the scenes", pillar: "journey" },
    ],
    thu: [
      { time: "12:30", topic: "A decision I'm stuck on: ask my followers", pillar: "build" },
      { time: "19:00", topic: "A lesson learned the hard way", pillar: "lessons" },
    ],
    fri: [
      { time: "12:30", topic: "A take on a trend in my field", pillar: "takes" },
      { time: "19:00", topic: "Something fun or personal", pillar: "life" },
    ],
    sat: [
      { time: "12:30", topic: "Something that didn't work, and why", pillar: "journey" },
      { time: "19:00", topic: "A tip I wish I'd known earlier", pillar: "lessons" },
    ],
    sun: [
      { time: "12:30", topic: "Weekly recap: what shipped, what I learned", pillar: "build" },
      { time: "19:00", topic: "My plan for next week", pillar: "journey" },
    ],
  },
  rules: [
    "Never invent opinions, numbers, users or events. If a post needs one, ask the user first.",
    "Write drafts on the day, from the user's notes, real events and today's news. Future days only show the topic.",
    "One thought per post. Plain words and specific details. No hashtags and no engagement bait.",
    "At most one quote post a day, on top of the plan.",
    "Leave out anything the user marks as off limits, such as their employer, money or private life.",
    "Never post, schedule or reply on X for the user. The user posts by hand.",
  ],
  notes:
    "Starting plan. Growth habit: 10 to 15 minutes a day of thoughtful replies to bigger accounts in your field helps a small account get found.",
};

export const DEFAULT_PLAYBOOK_SUMMARY =
  "Default plan: 2 posts a day at 12:30 and 19:00. Change anything with Claude.";
