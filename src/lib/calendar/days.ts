import type { PostKind, PostStatus } from "@/lib/db/schema";
import { eachDay } from "@/lib/dates";
import type { PlannedSlot } from "@/lib/playbook/plan";

export type DraftView = {
  id: string;
  position: number;
  text: string;
  reason: string | null;
  picked: boolean;
};

export type MetricsView = {
  capturedAt: string;
  views: number | null;
  likes: number | null;
  replies: number | null;
  reposts: number | null;
  bookmarks: number | null;
  shares: number | null;
  profileVisits: number | null;
  newFollows: number | null;
};

/** A stored post row, ready for the calendar (`time` is the slot time or the posted time). */
export type StoredItem = {
  postId: string;
  date: string;
  slotTime: string | null;
  time: string | null;
  status: PostStatus;
  topic: string | null;
  pillar: string | null;
  series: string | null;
  question: string | null;
  kind: PostKind;
  xUrl: string | null;
  postedAt: string | null;
  text: string | null;
  drafts: DraftView[];
  metrics: MetricsView | null;
};

/** One thing on a calendar day: a planned slot (maybe only in the playbook) or a post. */
export type CalendarItem = StoredItem & {
  /** Stable within the calendar: the post id, or "date time" for a slot that isn't stored. */
  key: string;
  /** True when this slot comes only from the playbook and nothing is stored for it yet. */
  fromPlaybook: boolean;
};

export type CalendarDay = {
  date: string;
  isToday: boolean;
  isPast: boolean;
  items: CalendarItem[];
};

function fromRow(row: StoredItem): CalendarItem {
  return { ...row, key: row.postId, fromPlaybook: false };
}

function fromSlot(slot: PlannedSlot): CalendarItem {
  return {
    key: `${slot.date} ${slot.time}`,
    fromPlaybook: true,
    postId: "",
    date: slot.date,
    slotTime: slot.time,
    time: slot.time,
    status: "planned",
    topic: slot.topic,
    pillar: slot.pillar,
    series: slot.series,
    question: null,
    kind: "post",
    xUrl: null,
    postedAt: null,
    text: null,
    drafts: [],
    metrics: null,
  };
}

function groupBy<T>(items: T[], key: (item: T) => string): Map<string, T[]> {
  const groups = new Map<string, T[]>();
  for (const item of items) {
    const k = key(item);
    groups.set(k, [...(groups.get(k) ?? []), item]);
  }
  return groups;
}

const byTime = (a: CalendarItem, b: CalendarItem) =>
  (a.time ?? "99:99").localeCompare(b.time ?? "99:99") || a.key.localeCompare(b.key);

/**
 * The calendar's days (docs/SPEC.md section 6):
 * - past days show what was posted;
 * - today and later show the playbook's slots, where a stored row for the same slot wins and
 *   a skipped one hides it, plus stored rows that aren't in the playbook (custom or unplanned).
 */
export function buildDays(input: {
  from: string;
  to: string;
  today: string;
  planned: PlannedSlot[];
  rows: StoredItem[];
}): CalendarDay[] {
  const rowsByDay = groupBy(input.rows, (row) => row.date);
  const plannedByDay = groupBy(input.planned, (slot) => slot.date);

  return eachDay(input.from, input.to).map((date) => {
    const rows = rowsByDay.get(date) ?? [];
    const isPast = date < input.today;
    if (isPast) {
      const items = rows
        .filter((row) => row.status === "posted")
        .map(fromRow)
        .sort(byTime);
      return { date, isToday: false, isPast, items };
    }
    const stored = new Map(rows.filter((r) => r.slotTime).map((r) => [r.slotTime!, r]));
    const items: CalendarItem[] = [];
    for (const slot of plannedByDay.get(date) ?? []) {
      const row = stored.get(slot.time);
      if (!row) items.push(fromSlot(slot));
    }
    for (const row of rows) {
      if (row.status !== "skipped") items.push(fromRow(row));
    }
    return { date, isToday: date === input.today, isPast, items: items.sort(byTime) };
  });
}
