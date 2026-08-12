const TIER_STYLES = [
  {
    seat: "border-cyan-400/70 bg-cyan-500/25 hover:bg-cyan-500/40",
    dot: "border-cyan-300 bg-cyan-500/60",
  },
  {
    seat: "border-fuchsia-400/70 bg-fuchsia-500/25 hover:bg-fuchsia-500/40",
    dot: "border-fuchsia-300 bg-fuchsia-500/60",
  },
  {
    seat: "border-blue-400/70 bg-blue-500/25 hover:bg-blue-500/40",
    dot: "border-blue-300 bg-blue-500/60",
  },
] as const;

const standardStyle = {
  seat: "border-emerald-400/60 bg-emerald-500/20 hover:bg-emerald-500/30",
  dot: "border-emerald-400/60 bg-emerald-500/60",
};

const premiumStyle = {
  seat: "border-amber-300/80 bg-amber-500/30 hover:bg-amber-500/45",
  dot: "border-amber-300 bg-amber-500/70",
};

const vipStyle = {
  seat: "border-violet-300/80 bg-violet-500/35 hover:bg-violet-500/50",
  dot: "border-violet-300 bg-violet-500/70",
};

const hash = (value: string): number =>
  [...value].reduce((total, char) => total + char.charCodeAt(0), 0);

/** Stable seat and legend colours for arbitrary organizer-defined tier names. */
export const tierStyle = (tier: string) => {
  const normalized = tier.trim().toLowerCase();
  if (normalized === "standard" || normalized === "general") {
    return standardStyle;
  }
  if (normalized.includes("premium")) return premiumStyle;
  if (normalized.includes("vip")) return vipStyle;
  return TIER_STYLES[hash(normalized) % TIER_STYLES.length];
};
