import type { Locale } from "./content";

/**
 * Pre-registration milestones. The thresholds are not linear, so the gauge gives each
 * stretch between two milestones the same width; the fill interpolates inside a stretch.
 * Rewards lean on premium currency (gem 300 = fossil 1 = amber 1 = one research), as genre
 * pre-registration rewards do; amounts follow the game's clean paid-amount units and are mailed
 * after launch. All five unlocked = gem 9,000 + fossil 10 + amber 10 = 50 researches.
 */
export interface Milestone {
  goal: number;
  icon: "crystal" | "fossil" | "amber";
  amount: number;
  name: Record<Locale, string>;
  /** Game lore line plus what it is used for, from the game's currency/item catalogs. */
  desc: Record<Locale, string>;
}

export const MILESTONES: readonly Milestone[] = [
  {
    goal: 1000,
    icon: "crystal",
    amount: 1000,
    name: { ko: "젬", en: "Gems", ja: "ジェム" },
    desc: {
      ko: "도시의 연구 시설과 보급망이 인정하는 결정 화폐입니다. 300개로 연구소 연구를 1회 진행할 수 있습니다.",
      en: "The crystal currency the city's research facilities and supply network accept. 300 Gems buy one Research.",
      ja: "都市の研究施設と補給網が認める結晶通貨です。300個で研究所の研究を1回行えます。",
    },
  },
  {
    goal: 3000,
    icon: "fossil",
    amount: 10,
    name: { ko: "화석", en: "Fossils", ja: "化石" },
    desc: {
      ko: "복원 가능한 생명의 흔적이 잠든 표본입니다. 1개로 연구소의 화석 연구를 1회 진행합니다.",
      en: "A specimen holding the sleeping trace of a life that can be restored. One Fossil runs one Fossil Research.",
      ja: "復元できる生命の痕跡が眠る標本です。1個で研究所の化石研究を1回行えます。",
    },
  },
  {
    goal: 5000,
    icon: "crystal",
    amount: 3000,
    name: { ko: "젬", en: "Gems", ja: "ジェム" },
    desc: {
      ko: "도시의 연구 시설과 보급망이 인정하는 결정 화폐입니다. 300개로 연구소 연구를 1회 진행할 수 있습니다.",
      en: "The crystal currency the city's research facilities and supply network accept. 300 Gems buy one Research.",
      ja: "都市の研究施設と補給網が認める結晶通貨です。300個で研究所の研究を1回行えます。",
    },
  },
  {
    goal: 10000,
    icon: "amber",
    amount: 10,
    name: { ko: "호박석", en: "Amber", ja: "琥珀" },
    desc: {
      ko: "희귀한 복원 신호를 온전히 품은 결정입니다. 1개로 픽업 렐릭이 걸린 호박석 연구를 1회 진행합니다.",
      en: "A crystal holding a rare restoration signal intact. One Amber runs one featured Amber Research.",
      ja: "希少な復元信号をそのまま宿した結晶です。1個でピックアップ付きの琥珀研究を1回行えます。",
    },
  },
  {
    goal: 30000,
    icon: "crystal",
    amount: 5000,
    name: { ko: "젬", en: "Gems", ja: "ジェム" },
    desc: {
      ko: "도시의 연구 시설과 보급망이 인정하는 결정 화폐입니다. 300개로 연구소 연구를 1회 진행할 수 있습니다.",
      en: "The crystal currency the city's research facilities and supply network accept. 300 Gems buy one Research.",
      ja: "都市の研究施設と補給網が認める結晶通貨です。300個で研究所の研究を1回行えます。",
    },
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
