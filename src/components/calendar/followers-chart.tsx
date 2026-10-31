"use client";

import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import { daysBetween } from "@/lib/dates";
import { formatCompact, formatDay, formatDayName, formatNumber } from "@/lib/format";
import { consecutiveRuns, niceTicks, type FollowerDay } from "@/lib/progress/history";

const HEIGHT = 168;
const PAD = { top: 12, right: 48, bottom: 24, left: 40 };

/**
 * Followers over time as one line: a point a day, a gap where Claude didn't read the count,
 * the newest value at the end, and the day's number under a crosshair on hover, touch or the
 * arrow keys. Drawn at the box's real width, so lines and text never stretch.
 */
export function FollowersChart({ days }: { days: FollowerDay[] }) {
  const box = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState<number | null>(null);
  const [active, setActive] = useState<number | null>(null);

  useEffect(() => {
    const element = box.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => setWidth(entry!.contentRect.width));
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const first = days[0]!.date;
  const offsets = days.map((d) => daysBetween(first, d.date));
  const span = Math.max(offsets.at(-1)!, 1);
  const values = days.map((d) => d.followers);
  const ticks = niceTicks(Math.min(...values), Math.max(...values));
  const low = ticks[0]!;
  const high = ticks.at(-1)!;
  const plotWidth = Math.max((width ?? 0) - PAD.left - PAD.right, 1);
  const plotHeight = HEIGHT - PAD.top - PAD.bottom;
  const bottom = PAD.top + plotHeight;
  const x = (date: string) => PAD.left + (daysBetween(first, date) / span) * plotWidth;
  const y = (value: number) => PAD.top + (1 - (value - low) / (high - low)) * plotHeight;

  const runs = consecutiveRuns(days);
  const line = (run: FollowerDay[]) =>
    run.map((d, i) => `${i ? "L" : "M"}${x(d.date)},${y(d.followers)}`).join("");
  const last = days.at(-1)!;
  const shown = active === null ? null : days[active]!;

  function nearest(px: number): number {
    const target = ((px - PAD.left) / plotWidth) * span;
    return offsets.reduce(
      (best, offset, i) =>
        Math.abs(offset - target) < Math.abs(offsets[best]! - target) ? i : best,
      0,
    );
  }

  function onPointerMove(event: PointerEvent<SVGRectElement>) {
    const svg = event.currentTarget.ownerSVGElement!.getBoundingClientRect();
    setActive(nearest(event.clientX - svg.left));
  }

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const at = active ?? days.length - 1;
    const next =
      event.key === "ArrowLeft"
        ? at - 1
        : event.key === "ArrowRight"
          ? at + 1
          : event.key === "Home"
            ? 0
            : event.key === "End"
              ? days.length - 1
              : null;
    if (next === null) return;
    event.preventDefault();
    setActive(Math.min(Math.max(next, 0), days.length - 1));
  }

  return (
    <div
      ref={box}
      tabIndex={0}
      role="group"
      aria-label="Followers by day. Use the left and right arrow keys to read each day."
      onKeyDown={onKeyDown}
      onFocus={() => setActive((at) => at ?? days.length - 1)}
      onBlur={() => setActive(null)}
      className="relative rounded-lg outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
      style={{ height: HEIGHT }}
    >
      {width ? (
        <svg
          width={width}
          height={HEIGHT}
          role="img"
          aria-label={`Followers: ${formatNumber(days[0]!.followers)} on ${formatDay(first)}, ${formatNumber(last.followers)} on ${formatDay(last.date)}.`}
          className="block overflow-visible"
        >
          {ticks.map((tick) => (
            <g key={tick}>
              <line
                x1={PAD.left}
                x2={PAD.left + plotWidth}
                y1={y(tick)}
                y2={y(tick)}
                className="stroke-border"
                strokeWidth={1}
              />
              <text
                x={PAD.left - 8}
                y={y(tick)}
                textAnchor="end"
                dominantBaseline="middle"
                className="fill-muted-foreground text-xs tabular-nums"
              >
                {formatCompact(tick)}
              </text>
            </g>
          ))}
          <text x={PAD.left} y={HEIGHT - 4} className="fill-muted-foreground text-xs">
            {formatDay(first)}
          </text>
          <text
            x={PAD.left + plotWidth}
            y={HEIGHT - 4}
            textAnchor="end"
            className="fill-muted-foreground text-xs"
          >
            {formatDay(last.date)}
          </text>

          {/* A line only, no area fill: the axis doesn't start at 0, so a fill would overstate growth. */}
          {runs.map((run) =>
            run.length > 1 ? (
              <path
                key={run[0]!.date}
                d={line(run)}
                fill="none"
                className="stroke-primary"
                strokeWidth={2}
                strokeLinejoin="round"
                strokeLinecap="round"
              />
            ) : (
              <circle
                key={run[0]!.date}
                cx={x(run[0]!.date)}
                cy={y(run[0]!.followers)}
                r={4}
                className="fill-primary stroke-card"
                strokeWidth={2}
              />
            ),
          )}
          <circle
            cx={x(last.date)}
            cy={y(last.followers)}
            r={4}
            className="fill-primary stroke-card"
            strokeWidth={2}
          />
          <text
            x={x(last.date) + 8}
            y={y(last.followers)}
            dominantBaseline="middle"
            className="fill-foreground text-xs font-medium tabular-nums"
          >
            {formatCompact(last.followers)}
          </text>

          {shown ? (
            <g aria-hidden="true">
              <line
                x1={x(shown.date)}
                x2={x(shown.date)}
                y1={PAD.top}
                y2={bottom}
                className="stroke-muted-foreground/40"
                strokeWidth={1}
              />
              <circle
                cx={x(shown.date)}
                cy={y(shown.followers)}
                r={4}
                className="fill-primary stroke-card"
                strokeWidth={2}
              />
            </g>
          ) : null}
          <rect
            x={PAD.left}
            y={0}
            width={plotWidth}
            height={HEIGHT}
            fill="transparent"
            style={{ touchAction: "pan-y" }}
            onPointerMove={onPointerMove}
            onPointerDown={onPointerMove}
            onPointerLeave={() => setActive(null)}
          />
        </svg>
      ) : null}
      {shown && width ? (
        <div
          aria-live="polite"
          className="pointer-events-none absolute top-0 rounded-lg border bg-card px-2.5 py-1.5 shadow-sm"
          style={
            x(shown.date) > width / 2
              ? { right: width - x(shown.date) + 8 }
              : { left: x(shown.date) + 8 }
          }
        >
          <p className="text-sm font-semibold tabular-nums">
            {formatNumber(shown.followers)} followers
          </p>
          <p className="text-xs text-muted-foreground">{formatDayName(shown.date)}</p>
        </div>
      ) : null}
    </div>
  );
}
