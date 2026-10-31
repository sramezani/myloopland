import type { ReactNode } from "react";
import { CardShell } from "@/components/shared/card-shell";
import { Copyable } from "@/components/shared/copyable";
import { WEEKDAYS } from "@/lib/dates";
import { formatDay, formatNumber, formatWeekday } from "@/lib/format";
import type { Playbook } from "@/lib/playbook/schema";

/** Things to say to Claude to change the plan (the chat routine, src/lib/mcp/routines.ts). */
const CHANGES = [
  "Change my myloopland plan: one post a day at 09:00",
  "Change my myloopland plan: you pick each day's topic",
  "Change my myloopland plan: write my week ahead, so I can schedule it on X",
];

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
      <dd className="text-pretty whitespace-pre-line">{children}</dd>
    </div>
  );
}

const notSet = (
  <span className="text-muted-foreground">Not set yet. Claude asks during setup.</span>
);

/**
 * The active playbook, read-only: goal and voice, the week's slots, the pillars, the rules
 * and notes. Claude is the only one who changes it.
 */
export function PlanView({ plan }: { plan: Playbook }) {
  const pillarLabels = new Map(plan.pillars.map((p) => [p.key, p.label]));
  const perWeek = WEEKDAYS.reduce((sum, day) => sum + plan.week[day].length, 0);

  return (
    <div className="flex flex-col gap-5">
      <CardShell id="goal" title="Goal and voice">
        <dl className="flex flex-col gap-3 text-sm">
          <Field label="Goal">
            {plan.goal
              ? `${formatNumber(plan.goal.followers)} followers by ${formatDay(plan.goal.by, true)}`
              : notSet}
          </Field>
          <Field label="About">{plan.about || notSet}</Field>
          <Field label="Voice">{plan.voice || notSet}</Field>
        </dl>
      </CardShell>

      <CardShell
        id="week"
        title="Your week"
        actions={
          <span className="text-xs text-muted-foreground tabular-nums">
            {perWeek} {perWeek === 1 ? "post" : "posts"} a week
          </span>
        }
      >
        <ul className="flex flex-col divide-y">
          {WEEKDAYS.map((day) => (
            <li
              key={day}
              className="flex flex-col gap-2 py-3 first:pt-0 last:pb-0 sm:flex-row sm:gap-4"
            >
              <h3 className="text-sm font-medium sm:w-28 sm:shrink-0">{formatWeekday(day)}</h3>
              {plan.week[day].length > 0 ? (
                <ul className="flex min-w-0 flex-1 flex-col gap-2">
                  {plan.week[day].map((slot) => {
                    const pillar = slot.pillar
                      ? (pillarLabels.get(slot.pillar) ?? slot.pillar)
                      : null;
                    const meta = [pillar, slot.series].filter(Boolean).join(" · ");
                    return (
                      <li key={slot.time} className="flex gap-3 text-sm">
                        <span className="w-11 shrink-0 text-muted-foreground tabular-nums">
                          {slot.time}
                        </span>
                        <div className="flex min-w-0 flex-col gap-0.5">
                          <p className="text-pretty">{slot.topic}</p>
                          {meta ? <p className="text-xs text-muted-foreground">{meta}</p> : null}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">No posts</p>
              )}
            </li>
          ))}
        </ul>
      </CardShell>

      <CardShell id="pillars" title="Pillars">
        {plan.pillars.length > 0 ? (
          <ul className="flex flex-col gap-3">
            {plan.pillars.map((p) => (
              <li key={p.key} className="flex flex-col gap-1.5">
                <div className="flex justify-between gap-3 text-sm">
                  <span className="text-pretty">{p.label}</span>
                  <span className="text-muted-foreground tabular-nums">{p.share}%</span>
                </div>
                <div className="h-1.5 rounded-full bg-muted" aria-hidden="true">
                  <div
                    className="h-full rounded-full bg-primary"
                    style={{ width: `${Math.min(p.share, 100)}%` }}
                  />
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">No pillars yet.</p>
        )}
      </CardShell>

      <CardShell id="rules" title="Rules">
        {plan.rules.length > 0 ? (
          <ul className="flex list-disc flex-col gap-2 pl-5 text-sm">
            {plan.rules.map((rule) => (
              <li key={rule} className="text-pretty">
                {rule}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">No rules yet.</p>
        )}
      </CardShell>

      {plan.notes ? (
        <CardShell id="notes" title="Notes">
          <p className="text-sm text-pretty whitespace-pre-line">{plan.notes}</p>
        </CardShell>
      ) : null}
    </div>
  );
}

/** How to change the plan (in Claude, in plain words) and the one scheduled task. */
export function ChangeInClaude() {
  return (
    <CardShell id="change" title="Change it in Claude">
      <div className="flex flex-col gap-5 text-sm">
        <div className="flex flex-col gap-2">
          <p className="text-pretty text-muted-foreground">
            This page only shows the plan. Tell your Claude what to change, in your own words: it
            saves a new version and keeps the old ones. For example:
          </p>
          <ul className="flex flex-col gap-2">
            {CHANGES.map((text) => (
              <li key={text}>
                <Copyable text={text} />
              </li>
            ))}
          </ul>
        </div>
        <div className="flex flex-col gap-2">
          <h3 className="font-medium">Run it every morning</h3>
          <p className="text-pretty text-muted-foreground">
            Ask Claude to schedule this around 07:30. It reads yesterday&apos;s numbers, reviews the
            week once a week, and writes today&apos;s drafts. Reading the numbers needs your
            computer awake, with a browser signed in to X.
          </p>
          <Copyable text="Run my myloopland daily routine" />
        </div>
      </div>
    </CardShell>
  );
}
