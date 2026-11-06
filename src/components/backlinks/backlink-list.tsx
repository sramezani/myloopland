"use client";

import { ArrowUpRightIcon, CheckIcon, SearchIcon, XIcon } from "lucide-react";
import { startTransition, useEffect, useOptimistic, useRef, useState, type ReactNode } from "react";
import { CardShell } from "@/components/shared/card-shell";
import { EmptyState } from "@/components/shared/empty-state";
import { Notice } from "@/components/shared/notice";
import { segmentedGroup, segmentedItem } from "@/components/shared/segmented-links";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  CATEGORY_ORDER,
  countBacklinks,
  isNewPlace,
  matchesSearch,
  type BacklinkItem,
} from "@/lib/backlinks/summary";
import { displayUrl } from "@/lib/backlinks/url";
import { todayIn } from "@/lib/dates";
import { formatDay } from "@/lib/format";
import { cn } from "@/lib/utils";

type Category = BacklinkItem["category"];
type Filter = "all" | "todo" | "done" | "new";
type Result = { ok: true; submittedAt: string | null } | { ok: false; error: string };

const CATEGORIES: Record<Category, { title: string; short: string; hint: string }> = {
  launch: {
    title: "Launch platforms",
    short: "Launches",
    hint: "One launch day or week. Save the big ones for when people can try it in minutes.",
  },
  directory: {
    title: "Directories",
    short: "Directories",
    hint: "Listings that last. They work before you launch, so start here.",
  },
  community: {
    title: "Communities",
    short: "Communities",
    hint: "Posts, not listings. Read each one's rules on self-promotion first.",
  },
};

const LINK_WORDS = {
  dofollow: {
    label: "Followed link",
    title: "Search engines follow this link, so it counts for SEO",
  },
  nofollow: {
    label: "Nofollow link",
    title: "Search engines don't follow this link: traffic, but little SEO",
  },
} as const;

type BacklinkListProps = {
  items: BacklinkItem[];
  timeZone: string;
  /** The server's "now", so "New" is the same on the server and in the browser. */
  now: string;
  setSubmitted: (id: string, submitted: boolean) => Promise<Result>;
};

/**
 * One website's backlinks list (docs/SPEC.md section 12): progress, a filter and search, and one
 * section per category. A tick saves at once and goes back, with a message, if saving fails. A row
 * ticked while the list is filtered stays in view until the filter or search changes.
 */
export function BacklinkList({ items, timeZone, now, setSubmitted }: BacklinkListProps) {
  const [list, applyTick] = useOptimistic(
    items,
    (state, tick: { id: string; submittedAt: string | null }) =>
      state.map((item) =>
        item.id === tick.id ? { ...item, submittedAt: tick.submittedAt } : item,
      ),
  );
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");
  const [kept, setKept] = useState<ReadonlySet<string>>(new Set());
  const [announcement, setAnnouncement] = useState("");
  const [error, setError] = useState<string | null>(null);
  const search = useRef<HTMLInputElement>(null);

  const nowDate = new Date(now);
  const counts = countBacklinks(list);
  const newIds = new Set(list.filter((item) => isNewPlace(item, nowDate)).map((item) => item.id));
  const todo = counts.total - counts.submitted;

  // "/" jumps to the search, as on most sites with a list to search.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const typing =
        event.target instanceof Element &&
        event.target.closest("input, textarea, select, [contenteditable='true']");
      if (event.key === "/" && !typing && !event.metaKey && !event.ctrlKey) {
        event.preventDefault();
        search.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const show = (next: Filter) => {
    setFilter(next);
    setKept(new Set());
  };

  const toggle = (item: BacklinkItem, submitted: boolean) => {
    setError(null);
    if (filter !== "all") setKept((ids) => new Set(ids).add(item.id));
    setAnnouncement(
      submitted ? `${item.name} ticked as submitted.` : `${item.name} is back on your to-do list.`,
    );
    startTransition(async () => {
      applyTick({ id: item.id, submittedAt: submitted ? new Date().toISOString() : null });
      const result = await setSubmitted(item.id, submitted);
      if (!result.ok) {
        setError(`${item.name}: ${result.error}`);
        setAnnouncement("");
      }
    });
  };

  const inFilter = (item: BacklinkItem) =>
    filter === "all" ||
    (filter === "todo" && item.submittedAt === null) ||
    (filter === "done" && item.submittedAt !== null) ||
    (filter === "new" && newIds.has(item.id));
  const visible = list.filter(
    (item) => (inFilter(item) || kept.has(item.id)) && matchesSearch(item, query),
  );
  const groups = CATEGORY_ORDER.map((category) => ({
    category,
    rows: visible.filter((item) => item.category === category),
  })).filter((group) => group.rows.length > 0);

  const filters: { key: Filter; label: string; count: number }[] = [
    { key: "all", label: "All", count: counts.total },
    { key: "todo", label: "To do", count: todo },
    { key: "done", label: "Submitted", count: counts.submitted },
    ...(newIds.size > 0 || filter === "new"
      ? [{ key: "new" as const, label: "New", count: newIds.size }]
      : []),
  ];

  return (
    <div className="flex flex-col gap-5">
      <Progress counts={counts} />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div role="group" aria-label="Show" className={cn(segmentedGroup, "w-full sm:w-auto")}>
          {filters.map((option) => (
            <button
              key={option.key}
              type="button"
              aria-pressed={filter === option.key}
              onClick={() => show(option.key)}
              className={segmentedItem(filter === option.key, "flex-1 px-3 sm:flex-none")}
            >
              {option.label}
              <span className="font-normal tabular-nums">{option.count}</span>
            </button>
          ))}
        </div>
        <div className="relative sm:w-72">
          <SearchIcon
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            ref={search}
            type="search"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setKept(new Set());
            }}
            onKeyDown={(event) => {
              if (event.key === "Escape" && query) {
                event.preventDefault();
                setQuery("");
              }
            }}
            placeholder="Search places"
            aria-label="Search places"
            className="h-11 bg-card pr-10 pl-9 sm:h-9 pointer-coarse:h-11 [&::-webkit-search-cancel-button]:appearance-none"
          />
          {query ? (
            <button
              type="button"
              aria-label="Clear search"
              onClick={() => {
                setQuery("");
                search.current?.focus();
              }}
              className="absolute top-1/2 right-1 grid size-9 -translate-y-1/2 place-items-center rounded-md text-muted-foreground hover:text-foreground"
            >
              <XIcon className="size-4" aria-hidden="true" />
            </button>
          ) : (
            <kbd className="pointer-events-none absolute top-1/2 right-2.5 hidden -translate-y-1/2 rounded border bg-muted px-1.5 font-mono text-xs text-muted-foreground pointer-fine:sm:inline">
              /
            </kbd>
          )}
        </div>
      </div>

      <p aria-live="polite" className="sr-only">
        {announcement}
      </p>
      {error ? (
        // Pinned to the bottom, so it shows wherever the list is scrolled to.
        <div className="fixed inset-x-4 bottom-4 z-50 mx-auto max-w-md">
          <Notice
            tone="danger"
            title="That tick wasn't saved"
            className="bg-card shadow-lg"
            action={
              <Button variant="outline" onClick={() => setError(null)}>
                Dismiss
              </Button>
            }
          >
            {error}
          </Notice>
        </div>
      ) : null}

      {groups.length > 0 ? (
        groups.map(({ category, rows }) => (
          <CardShell
            key={category}
            id={`places-${category}`}
            title={CATEGORIES[category].title}
            className="overflow-hidden"
            actions={
              <span className="text-xs text-muted-foreground tabular-nums">
                {counts.byCategory[category].submitted} of {counts.byCategory[category].total}{" "}
                submitted
              </span>
            }
          >
            <p className="-mt-1 pb-3 text-sm text-pretty text-muted-foreground">
              {CATEGORIES[category].hint}
            </p>
            <ul className="-mx-4 -mb-4 flex flex-col divide-y border-t">
              {rows.map((item) => (
                <PlaceRow
                  key={item.id}
                  item={item}
                  isNew={newIds.has(item.id)}
                  timeZone={timeZone}
                  thisYear={todayIn(timeZone, nowDate).slice(0, 4)}
                  onToggle={toggle}
                />
              ))}
            </ul>
          </CardShell>
        ))
      ) : (
        <div className="rounded-2xl border bg-card px-4 py-5">
          <NothingToShow
            filter={filter}
            query={query}
            hasPlaces={list.length > 0}
            clearSearch={() => setQuery("")}
          />
        </div>
      )}
    </div>
  );
}

/** How far along the list is: a bar for all of it and one per category. */
function Progress({ counts }: { counts: ReturnType<typeof countBacklinks> }) {
  const share = (done: number, total: number) => (total === 0 ? 0 : (done / total) * 100);
  const allDone = counts.total > 0 && counts.submitted === counts.total;
  return (
    <CardShell id="progress" title="Progress" hideTitle>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-8">
        <div className="flex flex-col gap-2 sm:w-60 sm:shrink-0">
          <p className="flex items-baseline gap-1.5">
            <span className="text-3xl font-bold tracking-tight tabular-nums">
              {counts.submitted}
            </span>
            <span className="text-sm text-muted-foreground">
              of {counts.total} submitted{allDone ? ". All done!" : ""}
            </span>
          </p>
          <Bar percent={share(counts.submitted, counts.total)} className="h-2" />
        </div>
        <dl className="grid flex-1 grid-cols-3 gap-4">
          {CATEGORY_ORDER.map((category) => {
            const { submitted, total } = counts.byCategory[category];
            return (
              <div key={category} className="flex min-w-0 flex-col gap-1.5">
                <dt className="truncate text-xs text-muted-foreground">
                  {CATEGORIES[category].short}
                </dt>
                <dd className="flex flex-col gap-1.5">
                  <span className="text-sm font-semibold tabular-nums">
                    {submitted}
                    <span className="font-normal text-muted-foreground"> / {total}</span>
                  </span>
                  <Bar percent={share(submitted, total)} className="h-1.5" />
                </dd>
              </div>
            );
          })}
        </dl>
      </div>
    </CardShell>
  );
}

function Bar({ percent, className }: { percent: number; className?: string }) {
  return (
    <div className={cn("overflow-hidden rounded-full bg-muted", className)} aria-hidden="true">
      <div
        className="h-full rounded-full bg-primary motion-safe:transition-[width] motion-safe:duration-500"
        style={{ width: `${Math.min(percent, 100)}%` }}
      />
    </div>
  );
}

function Chip({
  className,
  title,
  children,
}: {
  className?: string;
  title?: string;
  children: ReactNode;
}) {
  return (
    <span
      title={title}
      className={cn(
        "inline-flex h-6 max-w-full items-center gap-1 truncate rounded-full px-2.5 text-xs font-medium whitespace-nowrap",
        className,
      )}
    >
      {children}
    </span>
  );
}

function PlaceRow({
  item,
  isNew,
  timeZone,
  thisYear,
  onToggle,
}: {
  item: BacklinkItem;
  isNew: boolean;
  timeZone: string;
  thisYear: string;
  onToggle: (item: BacklinkItem, submitted: boolean) => void;
}) {
  const done = item.submittedAt !== null;
  const submittedDay = item.submittedAt ? todayIn(timeZone, new Date(item.submittedAt)) : null;
  const link = item.linkType ? LINK_WORDS[item.linkType] : null;

  return (
    <li className={cn("flex gap-3.5 px-4 py-3.5 motion-safe:transition-colors", done && "bg-past")}>
      <div className="flex h-6 items-center">
        <Checkbox
          checked={done}
          onCheckedChange={(checked) => onToggle(item, checked === true)}
          aria-label={`Submitted to ${item.name}`}
          className="size-5 rounded-md bg-card after:-inset-3"
        />
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-1.5 @2xl:grid @2xl:grid-cols-[minmax(0,15rem)_minmax(0,1fr)_minmax(0,10rem)] @2xl:items-start @2xl:gap-5">
        <div className="flex min-w-0 flex-col gap-0.5">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <a
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(
                "group/link inline-flex min-h-6 items-center gap-1 rounded-sm leading-snug font-medium underline-offset-4 hover:underline",
                done && "text-muted-foreground",
              )}
            >
              {item.name}
              <ArrowUpRightIcon
                className="size-3.5 shrink-0 text-muted-foreground group-hover/link:translate-x-0.5 group-hover/link:-translate-y-0.5 motion-safe:transition-transform"
                aria-hidden="true"
              />
              <span className="sr-only">(opens in a new tab)</span>
            </a>
            {isNew ? (
              <Chip className="h-5 bg-suggested px-2 font-semibold text-suggested-foreground">
                New
              </Chip>
            ) : null}
          </div>
          <span className="truncate text-xs text-muted-foreground">{displayUrl(item.url)}</span>
        </div>

        {item.note ? (
          <p className="text-sm text-pretty text-muted-foreground">{item.note}</p>
        ) : (
          <p className="hidden text-sm text-muted-foreground @2xl:block">—</p>
        )}

        <div className="flex flex-wrap items-center gap-1.5 @2xl:flex-col @2xl:items-end">
          {item.cost ? (
            <Chip className="bg-secondary text-secondary-foreground">{item.cost}</Chip>
          ) : null}
          {link ? (
            <Chip
              title={link.title}
              className={cn(
                "border",
                item.linkType === "dofollow" ? "text-positive" : "text-muted-foreground",
              )}
            >
              {link.label}
            </Chip>
          ) : null}
          {submittedDay ? (
            <Chip className="px-0 text-positive @2xl:px-0">
              <CheckIcon className="size-3.5" aria-hidden="true" />
              Submitted {formatDay(submittedDay, submittedDay.slice(0, 4) !== thisYear)}
            </Chip>
          ) : null}
        </div>
      </div>
    </li>
  );
}

function NothingToShow({
  filter,
  query,
  hasPlaces,
  clearSearch,
}: {
  filter: Filter;
  query: string;
  hasPlaces: boolean;
  clearSearch: () => void;
}) {
  if (!hasPlaces) {
    return (
      <EmptyState title="No places yet">
        Ask your Claude to find places to submit your products to.
      </EmptyState>
    );
  }
  if (query.trim()) {
    return (
      <EmptyState
        icon={SearchIcon}
        title={`No place matches “${query.trim()}”`}
        action={
          <Button variant="outline" onClick={clearSearch}>
            Clear search
          </Button>
        }
      >
        Search looks in names, addresses, notes and costs.
      </EmptyState>
    );
  }
  if (filter === "todo") {
    return (
      <EmptyState
        icon={CheckIcon}
        title="You've submitted to every place on the list"
        action={
          <Button asChild variant="outline">
            <a href="#find-more">Find more with Claude</a>
          </Button>
        }
      >
        Nice work. Your Claude can look for more.
      </EmptyState>
    );
  }
  if (filter === "done") {
    return (
      <EmptyState title="Nothing submitted yet">
        Tick a place once you&apos;ve sent your product in. It shows up here with the date.
      </EmptyState>
    );
  }
  return (
    <EmptyState title="Nothing new">
      Places your Claude adds are marked New for two weeks.
    </EmptyState>
  );
}
