"use client";

import { ArrowDownIcon, ArrowUpIcon, ChevronRightIcon, ChevronsUpDownIcon } from "lucide-react";
import { startTransition, useOptimistic, useState, type ReactNode } from "react";
import { CardShell } from "@/components/shared/card-shell";
import { Notice } from "@/components/shared/notice";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import {
  RATING_MAX,
  RATING_MIN,
  sortIdeas,
  type IdeaItem,
  type IdeaSort,
  type RatingKey,
  type SortDirection,
} from "@/lib/ideas/summary";
import { cn } from "@/lib/utils";

type Result = { ok: true } | { ok: false; error: string };
type Sort = { key: IdeaSort; direction: SortDirection };
type Patch = { id: string; myRating?: number | null; published?: boolean };

const NEWEST: Sort = { key: "created", direction: "desc" };

const COLUMNS: { key: RatingKey; label: string; whose: string }[] = [
  { key: "claude", label: "Claude", whose: "Claude's rating" },
  { key: "codex", label: "Codex", whose: "Codex's rating" },
  { key: "my", label: "My rating", whose: "Your rating" },
];

const SCORES = Array.from({ length: RATING_MAX - RATING_MIN + 1 }, (_, i) => RATING_MIN + i);

/** A heading click: highest first, then lowest first, then back to newest first. */
function nextSort(current: Sort, key: RatingKey): Sort {
  if (current.key !== key) return { key, direction: "desc" };
  return current.direction === "desc" ? { key, direction: "asc" } : NEWEST;
}

function describeSort(sort: Sort): string {
  const column = COLUMNS.find((each) => each.key === sort.key);
  if (!column) return "Newest first";
  return `${column.whose}, ${sort.direction === "desc" ? "highest" : "lowest"} first`;
}

type IdeaTableProps = {
  /** Newest first, as the server sends them. */
  ideas: IdeaItem[];
  setMyRating: (id: string, rating: number | null) => Promise<Result>;
  setPublished: (id: string, published: boolean) => Promise<Result>;
};

/**
 * The ideas table (docs/SPEC.md section 13). The rating headings sort it in the browser. My
 * rating and the published tick save at once and go back, with a message, if saving fails.
 * Rows keep their place while the user rates: the order changes only when a heading is clicked.
 * Below 640 px each row is a block, and the explicit roles keep it a table for screen readers.
 */
export function IdeaTable({ ideas, setMyRating, setPublished }: IdeaTableProps) {
  const [list, apply] = useOptimistic(ideas, (state, patch: Patch) =>
    state.map((item) => (item.id === patch.id ? { ...item, ...patch } : item)),
  );
  const [sort, setSort] = useState<Sort>(NEWEST);
  const [order, setOrder] = useState<string[]>(() => ideas.map((item) => item.id));
  const [announcement, setAnnouncement] = useState("");
  const [error, setError] = useState<string | null>(null);

  const position = new Map(order.map((id, index) => [id, index]));
  // An idea that arrived after the order was set is the newest, so it goes first.
  const rows = [...list].sort((a, b) => (position.get(a.id) ?? -1) - (position.get(b.id) ?? -1));
  const published = list.filter((item) => item.published).length;

  const sortBy = (key: RatingKey) => {
    const next = nextSort(sort, key);
    setSort(next);
    setOrder(sortIdeas(list, next.key, next.direction).map((item) => item.id));
    setAnnouncement(`${describeSort(next)}.`);
  };

  const save = (item: IdeaItem, patch: Patch, write: () => Promise<Result>, said = "") => {
    setError(null);
    setAnnouncement(said);
    startTransition(async () => {
      apply(patch);
      const result = await write();
      if (!result.ok) {
        setError(`${item.title}: ${result.error}`);
        setAnnouncement("");
      }
    });
  };

  const rate = (item: IdeaItem, rating: number | null) =>
    save(item, { id: item.id, myRating: rating }, () => setMyRating(item.id, rating));

  const publish = (item: IdeaItem, value: boolean) =>
    save(
      item,
      { id: item.id, published: value },
      () => setPublished(item.id, value),
      value ? `${item.title} ticked as published.` : `${item.title} is back to unpublished.`,
    );

  return (
    <>
      <p aria-live="polite" className="sr-only">
        {announcement}
      </p>
      {error ? (
        // Pinned to the bottom, so it shows wherever the table is scrolled to.
        <div className="fixed inset-x-4 bottom-4 z-50 mx-auto max-w-md">
          <Notice
            tone="danger"
            title="That change wasn't saved"
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

      <CardShell
        id="ideas"
        title={describeSort(sort)}
        className="overflow-hidden"
        actions={
          <span className="text-xs text-muted-foreground tabular-nums">
            {published} of {list.length} published
          </span>
        }
      >
        <div className="-mx-4 -mb-4 border-t">
          <table
            role="table"
            aria-labelledby="ideas-title"
            className="w-full table-fixed text-sm max-sm:block"
          >
            <thead role="rowgroup" className="max-sm:block">
              <tr
                role="row"
                className="border-b text-left text-xs text-muted-foreground max-sm:flex max-sm:flex-wrap max-sm:items-center max-sm:gap-1.5 max-sm:px-4 max-sm:py-2"
              >
                <th
                  role="columnheader"
                  scope="col"
                  className="px-4 py-2 font-medium max-sm:p-0 max-sm:pr-1"
                >
                  <span className="max-sm:sr-only">Idea</span>
                  <span className="sm:hidden" aria-hidden="true">
                    Sort by
                  </span>
                </th>
                {COLUMNS.map((column) => (
                  <SortHeading
                    key={column.key}
                    label={column.label}
                    hint={`Sort by ${column.whose.replace("Your", "your")}`}
                    direction={sort.key === column.key ? sort.direction : null}
                    onSort={() => sortBy(column.key)}
                    className={column.key === "my" ? "sm:w-28" : "sm:w-24"}
                  />
                ))}
                <th
                  role="columnheader"
                  scope="col"
                  className="w-28 px-4 py-2 text-center font-medium max-sm:sr-only"
                >
                  Published
                </th>
              </tr>
            </thead>
            <tbody role="rowgroup" className="divide-y max-sm:block">
              {rows.map((item) => (
                <IdeaRow key={item.id} item={item} onRate={rate} onPublish={publish} />
              ))}
            </tbody>
          </table>
        </div>
      </CardShell>
    </>
  );
}

function SortHeading({
  label,
  hint,
  direction,
  onSort,
  className,
}: {
  label: string;
  hint: string;
  direction: SortDirection | null;
  onSort: () => void;
  className?: string;
}) {
  const Icon =
    direction === "desc" ? ArrowDownIcon : direction === "asc" ? ArrowUpIcon : ChevronsUpDownIcon;
  return (
    <th
      role="columnheader"
      scope="col"
      aria-sort={
        direction === "desc" ? "descending" : direction === "asc" ? "ascending" : undefined
      }
      className={cn("px-1 py-1 text-center font-medium max-sm:p-0", className)}
    >
      <button
        type="button"
        title={hint}
        onClick={onSort}
        className={cn(
          "inline-flex h-9 items-center gap-1 rounded-md px-2 whitespace-nowrap transition-colors hover:text-foreground pointer-coarse:h-11",
          "max-sm:border max-sm:bg-card",
          direction ? "text-foreground max-sm:border-foreground" : "text-muted-foreground",
        )}
      >
        {label}
        <Icon
          className={cn("size-3.5", direction ? "text-primary" : "opacity-60")}
          aria-hidden="true"
        />
      </button>
    </th>
  );
}

/** A cell's name, shown on phones only, where the headings aren't above it. */
function PhoneLabel({ children }: { children: ReactNode }) {
  return (
    <span className="mb-1 block text-xs text-muted-foreground sm:hidden" aria-hidden="true">
      {children}
    </span>
  );
}

function Rating({ label, value }: { label: string; value: number | null }) {
  return (
    <td role="cell" className="px-1 py-2.5 text-center max-sm:p-0 max-sm:text-left">
      <PhoneLabel>{label}</PhoneLabel>
      <span className="flex h-9 items-center justify-center max-sm:justify-start max-sm:pl-0.5 pointer-coarse:h-11">
        {value === null ? (
          <>
            <span className="text-muted-foreground" aria-hidden="true">
              —
            </span>
            <span className="sr-only">Not rated</span>
          </>
        ) : (
          <span className="font-semibold tabular-nums">{value}</span>
        )}
      </span>
    </td>
  );
}

function IdeaRow({
  item,
  onRate,
  onPublish,
}: {
  item: IdeaItem;
  onRate: (item: IdeaItem, rating: number | null) => void;
  onPublish: (item: IdeaItem, published: boolean) => void;
}) {
  return (
    <tr
      role="row"
      className={cn(
        "align-top motion-safe:transition-colors max-sm:grid max-sm:grid-cols-4 max-sm:gap-x-2 max-sm:gap-y-3 max-sm:px-4 max-sm:py-3.5",
        item.published && "bg-past",
      )}
    >
      <td role="cell" className="px-4 py-3.5 max-sm:col-span-4 max-sm:p-0">
        <div className="flex min-w-0 flex-col gap-1">
          <p className="flex flex-wrap items-center gap-x-2 gap-y-1 leading-snug font-medium text-pretty wrap-anywhere">
            {item.title}
            {item.source === "codex" ? (
              <Badge variant="outline" title="Codex added this idea">
                Codex
              </Badge>
            ) : null}
          </p>
          <p className="text-pretty wrap-anywhere text-muted-foreground">{item.description}</p>
          {item.details ? (
            <details className="group/details">
              <summary className="inline-flex min-h-6 cursor-pointer list-none items-center gap-1 rounded-sm text-xs font-medium text-muted-foreground hover:text-foreground [&::-webkit-details-marker]:hidden">
                <ChevronRightIcon
                  className="size-3.5 group-open/details:rotate-90 motion-safe:transition-transform"
                  aria-hidden="true"
                />
                Details
              </summary>
              <p className="mt-1 text-pretty wrap-anywhere whitespace-pre-line text-muted-foreground">
                {item.details}
              </p>
            </details>
          ) : null}
        </div>
      </td>
      <Rating label="Claude" value={item.claudeRating} />
      <Rating label="Codex" value={item.codexRating} />
      <td role="cell" className="px-1 py-2.5 max-sm:p-0">
        <PhoneLabel>My rating</PhoneLabel>
        <NativeSelect
          size="lg"
          value={item.myRating ?? ""}
          onChange={(event) =>
            onRate(item, event.target.value === "" ? null : Number(event.target.value))
          }
          aria-label={`Your rating for ${item.title}`}
          className="w-18 rounded-lg bg-card max-sm:w-full sm:mx-auto"
        >
          <NativeSelectOption value="">—</NativeSelectOption>
          {SCORES.map((score) => (
            <NativeSelectOption key={score} value={score}>
              {score}
            </NativeSelectOption>
          ))}
        </NativeSelect>
      </td>
      <td role="cell" className="px-4 py-2.5 max-sm:p-0">
        <PhoneLabel>Published</PhoneLabel>
        <div className="flex h-9 items-center justify-center max-sm:justify-start max-sm:pl-0.5 pointer-coarse:h-11">
          <Checkbox
            checked={item.published}
            onCheckedChange={(checked) => onPublish(item, checked === true)}
            aria-label={`Published: ${item.title}`}
            className="size-5 rounded-md bg-card"
          />
        </div>
      </td>
    </tr>
  );
}
