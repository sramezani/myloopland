import type { BacklinkCategory, LinkType } from "@/lib/db/schema";

export type StarterPlace = {
  name: string;
  url: string;
  category: BacklinkCategory;
  cost: string | null;
  note: string | null;
  linkType?: LinkType;
};

/**
 * The places every list starts with (docs/SPEC.md section 12), from Siamak's research on
 * 5 Nov 2026. Copied into a user's list the first time it is read. Notes suit any product;
 * Claude adds places for the user's own field. Link types are set only where they are known.
 */
export const STARTER_PLACES: readonly StarterPlace[] = [
  // Launch platforms: one launch day or week.
  {
    name: "Product Hunt",
    url: "https://www.producthunt.com",
    category: "launch",
    cost: "Free",
    note: "The biggest launch audience, and you only get one real launch. Wait until people can sign up and try it in minutes.",
  },
  {
    name: "Hacker News (Show HN)",
    url: "https://news.ycombinator.com/showhn.html",
    category: "launch",
    cost: "Free",
    note: "A strong fit for open-source and developer tools. Read the Show HN rules first.",
  },
  {
    name: "Indie Hackers products",
    url: "https://www.indiehackers.com/products",
    category: "launch",
    cost: "Free",
    note: "An audience of indie founders.",
  },
  {
    name: "Peerlist Launchpad",
    url: "https://peerlist.io/launchpad",
    category: "launch",
    cost: "Free",
    note: "Launches every Monday, from a verified Peerlist profile.",
  },
  {
    name: "Uneed",
    url: "https://www.uneed.best",
    category: "launch",
    cost: "Free queue, paid skip",
    note: "A free launch date is 30 days to 5 months out. It needs 10 upvotes to stay up and 20 to keep a followed link.",
  },
  {
    name: "Fazier",
    url: "https://fazier.com",
    category: "launch",
    cost: "Free",
    note: "The free Basic launch asks for a badge that links back to Fazier.",
  },
  {
    name: "DevHunt",
    url: "https://devhunt.org",
    category: "launch",
    cost: "Free listing, paid from $19",
    note: "Developer tools only; sign in with GitHub. The free listing's link is nofollow.",
    linkType: "nofollow",
  },
  {
    name: "TinyLaunch",
    url: "https://www.tinylaunch.com",
    category: "launch",
    cost: "Free + paid",
    note: "A small indie audience.",
  },
  {
    name: "Tiny Startups",
    url: "https://www.tinystartups.com",
    category: "launch",
    cost: "Free + paid",
    note: "A small indie audience.",
  },
  {
    name: "Launching Next",
    url: "https://www.launchingnext.com",
    category: "launch",
    cost: "Free",
    note: "A daily list of new products.",
  },
  {
    name: "StartupBase",
    url: "https://startupbase.io",
    category: "launch",
    cost: "Free + paid",
    note: "Launches, plus a listing that stays.",
  },
  {
    name: "OpenHunts",
    url: "https://openhunts.com",
    category: "launch",
    cost: "Free",
    note: "A long wait for a free launch, unless you add their badge.",
  },
  {
    name: "PeerPush",
    url: "https://peerpush.com",
    category: "launch",
    cost: "Free, paid fast-track",
    note: "SaaS and AI products.",
  },
  {
    name: "Pitchwall (was BetaPage)",
    url: "https://pitchwall.co",
    category: "launch",
    cost: "Free",
    note: "An older directory. BetaPage's address now leads here.",
  },
  {
    name: "Huzzler",
    url: "https://huzzler.so",
    category: "launch",
    cost: "Free",
    note: "A newer launch site.",
  },
  {
    name: "Microlaunch",
    url: "https://microlaunch.net",
    category: "launch",
    cost: "Check first",
    note: "Sources disagree on whether a launch now needs a paid credit.",
  },
  {
    name: "BetaList",
    url: "https://betalist.com",
    category: "launch",
    cost: "Check first",
    note: "Reportedly dropped its free option.",
  },

  // Directories: listings that last.
  {
    name: "AlternativeTo",
    url: "https://alternativeto.net",
    category: "directory",
    cost: "Free",
    note: "List it as an alternative to the paid tools it replaces.",
  },
  {
    name: "SaaSHub",
    url: "https://www.saashub.com",
    category: "directory",
    cost: "Free",
    note: "A good long-term listing.",
  },
  {
    name: "OpenAlternative",
    url: "https://openalternative.co",
    category: "directory",
    cost: "Free",
    note: "Open source only: actively maintained, in English, and a clear alternative to proprietary software.",
  },
  {
    name: "OpenSourceAlternative.to",
    url: "https://opensourcealternative.to",
    category: "directory",
    cost: "Free",
    note: "Open source only.",
  },
  {
    name: "OSS Gallery",
    url: "https://oss.gallery",
    category: "directory",
    cost: "Free",
    note: "A crowdsourced list of open-source projects.",
  },
  {
    name: "LibHunt",
    url: "https://www.libhunt.com",
    category: "directory",
    cost: "Free",
    note: "Open-source projects.",
  },
  {
    name: "awesome-selfhosted",
    url: "https://github.com/awesome-selfhosted/awesome-selfhosted-data",
    category: "directory",
    cost: "Free (pull request)",
    note: "Self-hosted open-source apps only, with strict rules. Read the contributing guide: apps that need a proprietary service may be turned down.",
  },
  {
    name: "selfh.st apps",
    url: "https://selfh.st/apps",
    category: "directory",
    cost: "Free",
    note: "A directory of self-hosted apps, with a weekly newsletter.",
  },
  {
    name: "G2",
    url: "https://www.g2.com",
    category: "directory",
    cost: "Free vendor listing",
    note: "Where business buyers look. Reviews help later.",
  },
  {
    name: "Capterra",
    url: "https://www.capterra.com",
    category: "directory",
    cost: "Free vendor listing",
    note: "Where business buyers look. Reviews help later.",
  },
  {
    name: "StackShare",
    url: "https://stackshare.io",
    category: "directory",
    cost: "Free",
    note: "Developer tool stacks.",
  },
  {
    name: "Crunchbase",
    url: "https://www.crunchbase.com",
    category: "directory",
    cost: "Free",
    note: "A company profile: little traffic, but a real link.",
  },
  {
    name: "Wellfound",
    url: "https://wellfound.com",
    category: "directory",
    cost: "Free",
    note: "A company profile: little traffic, but a real link.",
  },
  {
    name: "F6S",
    url: "https://www.f6s.com",
    category: "directory",
    cost: "Free",
    note: "A company profile: little traffic, but a real link.",
  },
  {
    name: "SideProjectors",
    url: "https://www.sideprojectors.com",
    category: "directory",
    cost: "Free",
    note: "Side-project listings.",
  },

  // Communities: posts, not listings. Read each one's rules on self-promotion first.
  {
    name: "r/selfhosted",
    url: "https://www.reddit.com/r/selfhosted",
    category: "community",
    cost: "Free",
    note: "The best Reddit fit for open-source, self-hosted tools.",
    linkType: "nofollow",
  },
  {
    name: "r/SideProject",
    url: "https://www.reddit.com/r/SideProject",
    category: "community",
    cost: "Free",
    note: "An audience of founders.",
    linkType: "nofollow",
  },
  {
    name: "r/SaaS",
    url: "https://www.reddit.com/r/SaaS",
    category: "community",
    cost: "Free",
    note: "An audience of founders.",
    linkType: "nofollow",
  },
  {
    name: "r/indiehackers",
    url: "https://www.reddit.com/r/indiehackers",
    category: "community",
    cost: "Free",
    note: "An audience of founders.",
    linkType: "nofollow",
  },
  {
    name: "r/webdev",
    url: "https://www.reddit.com/r/webdev",
    category: "community",
    cost: "Free",
    note: "Only in the Showoff Saturday thread.",
    linkType: "nofollow",
  },
  {
    name: "r/opensource",
    url: "https://www.reddit.com/r/opensource",
    category: "community",
    cost: "Free",
    note: "Open-source launches.",
    linkType: "nofollow",
  },
  {
    name: "DEV",
    url: "https://dev.to",
    category: "community",
    cost: "Free",
    note: "Write a post on what you built and why.",
  },
  {
    name: "Hashnode",
    url: "https://hashnode.com",
    category: "community",
    cost: "Free",
    note: "Write a post on what you built and why.",
  },
];
