import type { Locale } from "./content";

/**
 * Pre-registration milestones. The thresholds are not linear, so the gauge gives each
 * stretch between two milestones the same width; the fill interpolates inside a stretch.
 * Reward amounts follow the game's clean paid-amount units and are paid by mail after launch.
 */
export interface Milestone {
  goal: number;
  icon: "gold" | "cake" | "crystal" | "fossil" | "amber";
  amount: number;
  name: Record<Locale, string>;
}

export const MILESTONES: readonly Milestone[] = [
  {
    goal: 1000,
    icon: "gold",
    amount: 50000,
    name: { ko: "골드", en: "Gold", ja: "ゴールド" },
  },
  {
    goal: 3000,
    icon: "cake",
    amount: 300,
    name: { ko: "치즈케이크", en: "Cheesecake", ja: "チーズケーキ" },
  },
  {
    goal: 5000,
    icon: "crystal",
    amount: 500,
    name: { ko: "젬", en: "Gems", ja: "ジェム" },
  },
  {
    goal: 10000,
    icon: "fossil",
    amount: 5,
    name: { ko: "화석", en: "Fossils", ja: "化石" },
  },
  {
    goal: 30000,
    icon: "amber",
    amount: 10,
    name: { ko: "호박석", en: "Amber", ja: "琥珀石" },
  },
];

/** 0..1 position of `count` on a gauge whose milestones are evenly spaced. */
export function milestoneProgress(
  count: number,
  goals: readonly number[] = MILESTONES.map((m) => m.goal),
): number {
  if (!Number.isFinite(count) || count <= 0 || goals.length === 0) return 0;
  const segments = goals.length;
  let previous = 0;
  for (let i = 0; i < segments; i++) {
    const goal = goals[i];
    if (count < goal)
      return (i + (count - previous) / (goal - previous)) / segments;
    previous = goal;
  }
  return 1;
}

/** Number of milestones already reached. */
export function reachedMilestones(
  count: number,
  goals: readonly number[] = MILESTONES.map((m) => m.goal),
): number {
  return goals.filter((goal) => count >= goal).length;
}

export function formatCount(value: number, lang: Locale) {
  return new Intl.NumberFormat(
    lang === "ko" ? "ko-KR" : lang === "ja" ? "ja-JP" : "en-US",
  ).format(Math.max(0, Math.round(value)));
}
