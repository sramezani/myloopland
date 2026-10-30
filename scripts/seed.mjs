// Sample data for development (docs/SPEC.md section 11): two weeks of posts with numbers,
// today's question and drafts, notes, a review and follower counts, for one existing user.
//
//   npm run db:seed -- you@example.com
//
// Sign in and add your X profile first (that creates the playbook the samples follow).
// Never run it against production: it refuses unless DATABASE_URL points at a local database.
import postgres from "postgres";

const email = process.argv[2];
const url = process.env.DATABASE_URL;
if (!email || !url) {
  console.error("usage: npm run db:seed -- you@example.com   (needs DATABASE_URL in .env)");
  process.exit(1);
}
const host = new URL(url).hostname;
if (!["localhost", "127.0.0.1", "::1", "[::1]", "db"].includes(host)) {
  console.error(`seed: refusing to write sample data to ${host}; it only runs on a local database`);
  process.exit(1);
}

const sql = postgres(url, { max: 1, onnotice: () => {} });
const id = () => crypto.randomUUID();
const WEEKDAYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];

function localDay(timeZone, date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
}
function addDays(day, n) {
  const d = new Date(`${day}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}
function weekday(day) {
  return WEEKDAYS[(new Date(`${day}T00:00:00Z`).getUTCDay() + 6) % 7];
}
/** The instant of a local day and time in a time zone (good enough for sample data). */
function instant(day, time, timeZone) {
  const guess = new Date(`${day}T${time}:00Z`);
  const shown = new Intl.DateTimeFormat("en-GB", { timeZone, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(guess);
  const [h, m] = shown.split(":").map(Number);
  const [wantH, wantM] = time.split(":").map(Number);
  return new Date(guess.getTime() - ((h - wantH) * 60 + (m - wantM)) * 60_000);
}

const samples = [
  "Shipped the new onboarding today. Two screens became one",
  "Spent the evening deleting code. Best commit this week",
  "Old way: 6 tools for one report. My way: one page",
  "Tried writing the landing page with Claude first, then editing. Way faster",
  "Still not sure about the pricing. What would you pay for this?",
  "A bug took 3 hours. The fix was one line",
  "Night shift log: 22:00 to 00:30, fixed the sign-in flow",
  "Learning in public is scary. Doing it anyway",
  "Weekly recap: 1 feature shipped, 2 ideas killed, 0 regrets",
  "Small products, small teams, big leverage with AI agents",
];

try {
  const [user] = await sql`select id, x_handle, time_zone from "user" where email = ${email}`;
  if (!user) throw new Error(`no user with email ${email}: sign in once first`);
  const [pb] = await sql`select content from playbook where user_id = ${user.id} order by version desc limit 1`;
  if (!pb) throw new Error("this user has no playbook yet: add the X profile on the dashboard first");
  const tz = user.time_zone || "UTC";
  const handle = user.x_handle || "sample";
  const today = localDay(tz);
  const week = pb.content.week;

  await sql.begin(async (tx) => {
    // Start clean: the seed replaces earlier sample data for this user.
    await tx`delete from post where user_id = ${user.id}`;
    await tx`delete from account_stat where user_id = ${user.id}`;
    await tx`delete from note where user_id = ${user.id}`;
    await tx`delete from review where user_id = ${user.id}`;
    await tx`delete from decision where user_id = ${user.id}`;

    // Followers: one reading a day for 30 days, slowly growing.
    for (let i = 30; i >= 0; i--) {
      const day = addDays(today, -i);
      await tx`insert into account_stat (id, user_id, captured_at, followers)
        values (${id()}, ${user.id}, ${instant(day, "21:30", tz)}, ${243 - Math.round(i * 1.1)})`;
    }

    // The last 14 days: most planned slots posted, a few quotes on top.
    let n = 0;
    for (let i = 14; i >= 1; i--) {
      const day = addDays(today, -i);
      for (const slot of week[weekday(day)]) {
        n++;
        if (n % 5 === 0) continue; // a missed slot now and then
        const text = samples[n % samples.length];
        const postId = id();
        const postedAt = instant(day, slot.time, tz);
        const xId = String(1980000000000000000n + BigInt(n));
        await tx`insert into post (id, user_id, date, slot_time, status, topic, pillar, kind, x_post_id, x_url, posted_at, text)
          values (${postId}, ${user.id}, ${day}, ${slot.time}, 'posted', ${slot.topic}, ${slot.pillar ?? null}, 'post',
                  ${xId}, ${`https://x.com/${handle}/status/${xId}`}, ${postedAt}, ${text})`;
        const edited = n % 3 === 0;
        await tx`insert into draft (id, post_id, position, text, reason, picked)
          values (${id()}, ${postId}, 1, ${edited ? `${text}, honestly` : text}, 'Sample draft', true),
                 (${id()}, ${postId}, 2, ${"Another way to say it"}, null, false)`;
        const views = 30 + ((n * 37) % 160);
        await tx`insert into post_metric (id, post_id, captured_at, views, likes, replies, reposts, bookmarks, profile_visits, new_follows)
          values (${id()}, ${postId}, ${instant(addDays(day, 1), "21:30", tz)}, ${views}, ${Math.round(views / 18)},
                  ${n % 4}, ${n % 3}, ${n % 2}, ${n % 6 === 0 ? null : Math.round(views / 40)}, ${n % 6 === 0 ? null : n % 3})`;
      }
      if (i % 4 === 0) {
        const xId = String(1990000000000000000n + BigInt(i));
        const postId = id();
        await tx`insert into post (id, user_id, date, slot_time, status, kind, x_post_id, x_url, posted_at, text)
          values (${postId}, ${user.id}, ${day}, null, 'posted', 'quote', ${xId}, ${`https://x.com/${handle}/status/${xId}`},
                  ${instant(day, "16:45", tz)}, 'Legend says there is no moat')`;
        await tx`insert into post_metric (id, post_id, captured_at, views, likes)
          values (${id()}, ${postId}, ${instant(day, "21:30", tz)}, ${40 + i * 3}, ${2})`;
      }
    }

    // Today: the first slot waits for the user's take, the second has drafts.
    const [first, second] = week[weekday(today)];
    if (first) {
      const question = "Today's big AI launch: useful for small builders, or mostly hype? One line is enough.";
      await tx`insert into post (id, user_id, date, slot_time, status, topic, pillar, question)
        values (${id()}, ${user.id}, ${today}, ${first.time}, 'needs_input', ${first.topic}, ${first.pillar ?? null}, ${question})`;
    }
    if (second) {
      const postId = id();
      await tx`insert into post (id, user_id, date, slot_time, status, topic, pillar)
        values (${postId}, ${user.id}, ${today}, ${second.time}, 'drafted', ${second.topic}, ${second.pillar ?? null})`;
      await tx`insert into draft (id, post_id, position, text, reason, picked) values
        (${id()}, ${postId}, 1, 'Built a tiny tool tonight that reads every word out loud. Learning Dutch from zero', 'Personal posts make you a person, not only a product. No numbers on this type yet', false),
        (${id()}, ${postId}, 2, 'A2 Dutch exam in 3 months. My plan: one small app a week to practise', 'Series posts kept people coming back last month', false)`;
    }

    // Tomorrow: a custom topic for the first slot.
    const [tomorrowFirst] = week[weekday(addDays(today, 1))];
    if (tomorrowFirst) {
      await tx`insert into post (id, user_id, date, slot_time, status, topic, pillar)
        values (${id()}, ${user.id}, ${addDays(today, 1)}, ${tomorrowFirst.time}, 'planned', 'What I learned from 100 sign-ups', 'build')`;
    }

    await tx`insert into note (id, user_id, kind, text) values
      (${id()}, ${user.id}, 'dump', 'Fixed the sign-in bug, rewrote the pricing page copy, tired but happy'),
      (${id()}, ${user.id}, 'fact', 'First paying user this week')`;

    const reviewId = id();
    await tx`insert into review (id, user_id, period_start, period_end, summary, findings)
      values (${reviewId}, ${user.id}, ${addDays(today, -7)}, ${addDays(today, -1)},
              'Building posts beat everything else; evening posts got fewer views.',
              ${sql.json(["Building: 120 median views over 6 posts", "19:00 posts: 60 median views vs 95 at 12:30"])})`;
    await tx`insert into decision (id, user_id, review_id, change, reason) values
      (${id()}, ${user.id}, ${reviewId}, 'Move the evening slot to 18:00', '19:00 posts got 37% fewer views')`;
  });
  console.log(`seed: sample data for ${email} (@${handle}, ${tz}) is in. Open the dashboard.`);
} catch (error) {
  console.error("seed: failed", error instanceof Error ? error.message : error);
  process.exitCode = 1;
} finally {
  await sql.end();
}
