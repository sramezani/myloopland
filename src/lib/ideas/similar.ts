/**
 * Near-duplicate idea titles (docs/SPEC.md section 13): a safety net under get_ideas, which
 * Claude reads before suggesting ideas. Pure, so it is tested on its own.
 */

/** Small words that don't change what an idea is about. */
const SMALL_WORDS = new Set([
  "a",
  "an",
  "and",
  "are",
  "at",
  "be",
  "by",
  "for",
  "from",
  "i",
  "in",
  "is",
  "it",
  "its",
  "me",
  "my",
  "of",
  "on",
  "or",
  "our",
  "that",
  "the",
  "this",
  "to",
  "we",
  "with",
  "you",
  "your",
]);

/** At least this share of all the words in both titles is the same (a typo counts as the same). */
const WORD_OVERLAP = 0.8;

/** "threads" and "thread" are the same idea; "class" and "this" stay as they are. */
function stem(word: string): string {
  if (word.length > 3 && word.endsWith("s") && !word.endsWith("ss")) return word.slice(0, -1);
  return word;
}

/** A title's words: lower case, accents and punctuation gone, small words left out, plurals singular. */
export function titleWords(title: string): string[] {
  const words = title
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/['’]s\b/g, "")
    .split(/[^\p{L}\p{N}]+/u)
    .filter(Boolean);
  const content = words.filter((word) => !SMALL_WORDS.has(word));
  // A title made only of small words keeps them, or every such title would match every other.
  return (content.length > 0 ? content : words).map(stem);
}

/** How many letters to add, remove or change to turn one word into the other. */
function editDistance(a: string, b: string): number {
  let previous = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const current = [i];
    for (let j = 1; j <= b.length; j++) {
      current[j] = Math.min(
        previous[j]! + 1,
        current[j - 1]! + 1,
        previous[j - 1]! + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
    }
    previous = current;
  }
  return previous[b.length]!;
}

/**
 * The same word, or the same word with a typo: one letter off in words of 5 letters or more,
 * two in words of 9 or more. Shorter words and numbers must match exactly: "code" and "mode",
 * or 100 and 1000 followers, are different posts.
 */
function sameWord(a: string, b: string): boolean {
  if (a === b) return true;
  if (/\d/.test(a) || /\d/.test(b) || Math.min(a.length, b.length) < 5) return false;
  return editDistance(a, b) <= (Math.max(a.length, b.length) >= 9 ? 2 : 1);
}

/** Whether two titles name the same idea: mostly the same words, in any order, typos allowed. */
export function isNearDuplicate(a: string, b: string): boolean {
  const xs = [...new Set(titleWords(a))];
  const ys = [...new Set(titleWords(b))];
  if (xs.length === 0 || ys.length === 0) return false;
  const shared = xs.filter((x) => ys.some((y) => sameWord(x, y))).length;
  return shared / (xs.length + ys.length - shared) >= WORD_OVERLAP;
}

/** The first listed idea whose title is nearly the same as `title`, if any. */
export function findNearDuplicate<T extends { title: string }>(
  title: string,
  listed: readonly T[],
): T | undefined {
  return listed.find((item) => isNearDuplicate(title, item.title));
}
