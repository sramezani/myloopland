import { CalendarIcon } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import type { CalendarDay } from "@/lib/calendar/days";
import { PostCard } from "./post-card";
import { SlotCard } from "./slot-card";

/** One day in full: every post with all its numbers, every slot with its drafts. */
export function DayView({ day, now }: { day: CalendarDay; now: Date }) {
  if (day.items.length === 0) {
    return (
      <EmptyState
        icon={CalendarIcon}
        title={day.isPast ? "No posts this day" : "Nothing planned this day"}
      >
        {day.isPast ? null : "Ask Claude to add a slot, or change the playbook."}
      </EmptyState>
    );
  }
  return (
    <div id={day.isToday ? "today" : undefined} className="flex max-w-2xl flex-col gap-3">
      {day.items.map((item) =>
        item.status === "posted" ? (
          <PostCard key={item.key} item={item} size="lg" now={now} />
        ) : (
          <SlotCard key={item.key} item={item} isToday={day.isToday} size="lg" />
        ),
      )}
    </div>
  );
}
