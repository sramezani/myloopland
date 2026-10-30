import { Inter } from "next/font/google";

/**
 * Fonts are the one part of the look outside the theme file: Next.js needs
 * `next/font` calls in their own module. Change the font here.
 *
 * `display: "optional"`: the size-matched fallback shows at once and Inter is used when it
 * arrives in time (always on a repeat visit), so text never jumps. Code uses the system
 * monospace font.
 */
export const fontSans = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "optional",
});

export const fontVariables = fontSans.variable;
