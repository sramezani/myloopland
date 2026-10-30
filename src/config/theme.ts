/**
 * THE theme and brand file (docs/SPEC.md section 8).
 *
 * Every colour, the corner radius, the shadows and the brand facts live here, and nowhere
 * else. The look comes from the "X growth dashboard" mockup: warm stone with an orange accent.
 *
 * - Plain data with no imports, so pages and tests can use it.
 * - Colours are hex, so the contrast test can check them.
 * - `npm run check` tests WCAG AA contrast for every text and background pair here.
 */

/** The accent. It feeds `primary`, `ring` and `brand`. */
const accentColor = "#C2410C";

/** The warm stone scale. It feeds surfaces, borders and quiet text. */
const stone = {
  0: "#FFFFFF",
  25: "#FBFAF8",
  50: "#F7F6F3",
  100: "#F0EEEA",
  150: "#ECEAE5",
  200: "#E7E5E0",
  300: "#D6D3CD",
  600: "#57534E",
  900: "#1C1917",
} as const;

export const brand = {
  name: "myloopland",
  tagline: "Grow your X account with your own Claude.",
  description:
    "Your Claude plans, drafts and reviews your X posts. myloopland keeps the plan, the drafts and the numbers, so every week gets a little better.",
  /** Who makes myloopland: "Made by Sia", linking to X. */
  makerName: "Sia",
  makerUrl: "https://x.com/siaramzee",
} as const;

/** Light theme only in v1. A `dark` palette with the same keys can be added later. */
export const colors = {
  light: {
    // Surfaces and text
    background: stone[50],
    foreground: stone[900],
    card: stone[0],
    "card-foreground": stone[900],
    popover: stone[0],
    "popover-foreground": stone[900],
    muted: stone[150],
    "muted-foreground": stone[600],
    secondary: stone[100],
    "secondary-foreground": stone[900],
    accent: stone[100],
    "accent-foreground": stone[900],
    // Days that have passed, on the calendar
    past: stone[25],
    // Actions
    primary: accentColor,
    "primary-foreground": stone[0],
    // Accent text on light surfaces: "Today", "Waiting for your take"
    "primary-strong": "#9A3412",
    ring: accentColor,
    destructive: "#B91C1C",
    "destructive-foreground": stone[0],
    // Lines
    border: stone[200],
    input: stone[300],
    // Brand
    brand: accentColor,
    // A slot with drafts ready ("Suggested")
    suggested: "#FFF1E8",
    "suggested-foreground": "#9A3412",
    // Changes: always shown with an arrow and a word too
    positive: "#15803D",
    negative: "#B91C1C",
    warning: "#B45309",
    // The dim layer behind dialogs (used with an opacity, e.g. bg-overlay/50)
    overlay: stone[900],
  },
} as const;

export type ColorToken = keyof (typeof colors)["light"];

/** The base corner radius. Smaller and larger radii are worked out from it. */
export const radius = "0.625rem";

/** Shadows, only for raised layers such as menus and dialogs. Cards stay flat. */
export const shadows = {
  xs: "0 1px 2px 0 #1C19170D",
  sm: "0 1px 3px 0 #1C191714, 0 1px 2px -1px #1C191714",
  md: "0 4px 6px -1px #1C191714, 0 2px 4px -2px #1C191714",
  lg: "0 10px 15px -3px #1C19171A, 0 4px 6px -4px #1C19171A",
} as const;

/**
 * Text and background pairs that must reach WCAG AA (4.5:1).
 * The contrast test reads this list, so a new pair is checked as soon as it is added.
 */
export const textPairs: ReadonlyArray<readonly [text: ColorToken, background: ColorToken]> = [
  ["foreground", "background"],
  ["foreground", "past"],
  ["card-foreground", "card"],
  ["popover-foreground", "popover"],
  ["muted-foreground", "muted"],
  ["muted-foreground", "card"],
  ["muted-foreground", "background"],
  ["muted-foreground", "past"],
  ["muted-foreground", "secondary"],
  ["secondary-foreground", "secondary"],
  ["accent-foreground", "accent"],
  ["primary-foreground", "primary"],
  ["destructive-foreground", "destructive"],
  ["primary", "card"],
  ["primary", "background"],
  ["primary-strong", "card"],
  ["primary-strong", "background"],
  ["suggested-foreground", "suggested"],
  ["destructive", "card"],
  ["positive", "card"],
  ["negative", "card"],
  ["warning", "card"],
  // The "Posted" badge: light text on the dark foreground colour.
  ["card", "foreground"],
];

/** Non-text pairs that must reach 3:1 (WCAG 1.4.11): the focus ring and today's outline. */
export const uiPairs: ReadonlyArray<readonly [ColorToken, ColorToken]> = [
  ["ring", "card"],
  ["ring", "background"],
  ["primary", "past"],
];

export const theme = { brand, accentColor, colors, radius, shadows } as const;
