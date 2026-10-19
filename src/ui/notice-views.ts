// Three announcement styles on the news board: event cards, patch notes, plain board posts.
// Pure HTML builders so the page and tests share them; all text is escaped here.
import {
  coverStyle,
  eventPhase,
  normalizeMeta,
  remaining,
} from "../../shared/notice-style.js";
import { icon } from "./icons";

export interface StyledNotice {
  slug: string;
  category: string;
  published_at: string;
  title: string;
  summary: string;
  template?: string;
  pinned?: boolean;
  cover_image?: string | null;
  cover_frame?: { zoom: number; x: number; y: number } | null;
  meta?: unknown;
  content_locale?: string;
  translation?: string;
}
export type NoticeKind = "plain" | "update" | "event";
type Lang = "ko" | "en" | "ja";
const text = {
  ko: {
    tabs: ["전체", "이벤트", "패치노트", "공지"],
    ongoing: "진행 중인 이벤트",
    ended: "종료된 이벤트",
    patch: "패치노트",
    board: "공지",
    upcoming: "시작 예정",
    endedTag: "종료",
    left: (d: number, h: number, m: number) =>
      d > 0 ? `${d}일 ${h}시간 남음` : `${h}시간 ${m}분 남음`,
    starts: (d: number) => (d > 0 ? `${d}일 뒤 시작` : "곧 시작"),
    period: "진행 기간",
    local: "내 시간대",
    version: "버전",
    title: "제목",
    date: "작성일",
    more: "자세히 보기",
    pick: "이벤트 선택",
  },
  en: {
    tabs: ["All", "Events", "Patch notes", "Notices"],
    ongoing: "Ongoing events",
    ended: "Past events",
    patch: "Patch notes",
    board: "Notices",
    upcoming: "Upcoming",
    endedTag: "Ended",
    left: (d: number, h: number, m: number) =>
      d > 0 ? `${d}d ${h}h left` : `${h}h ${m}m left`,
    starts: (d: number) => (d > 0 ? `Starts in ${d}d` : "Starting soon"),
    period: "Event period",
    local: "Your time",
    version: "Version",
    title: "Title",
    date: "Posted",
    more: "Read more",
    pick: "Choose event",
  },
  ja: {
    tabs: ["すべて", "イベント", "パッチノート", "お知らせ"],
    ongoing: "開催中のイベント",
    ended: "終了したイベント",
    patch: "パッチノート",
    board: "お知らせ",
    upcoming: "開催予定",
    endedTag: "終了",
    left: (d: number, h: number, m: number) =>
      d > 0 ? `残り${d}日${h}時間` : `残り${h}時間${m}分`,
    starts: (d: number) => (d > 0 ? `${d}日後に開始` : "まもなく開始"),
    period: "開催期間",
    local: "お使いの時間",
    version: "バージョン",
    title: "タイトル",
    date: "投稿日",
    more: "詳しく見る",
    pick: "イベントを選択",
  },
} as const;
export const noticeTabs = (lang: Lang) => text[lang].tabs;
const esc = (s: unknown) =>
  String(s ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ]!,
  );
export const safeImage = (u: unknown): u is string =>
  typeof u === "string" && /^https:\/\/[^\s"'<>]+$/.test(u);
// Boards that predate the template column still sort by category.
export function noticeKind(n: StyledNotice): NoticeKind {
  if (
    n.template === "event" ||
    n.template === "update" ||
    n.template === "plain"
  )
    return n.template;
  return n.category === "event"
    ? "event"
    : n.category === "development"
      ? "update"
      : "plain";
}
const tabKinds: (NoticeKind | null)[] = [null, "event", "update", "plain"];
const date = (iso: string, lang: Lang) =>
  new Intl.DateTimeFormat(lang, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: "Asia/Seoul",
  }).format(new Date(iso));
function stamp(iso: string, lang: Lang, zone?: string) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat(lang, {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
      timeZone: zone,
    })
      .formatToParts(new Date(iso))
      .map((p) => [p.type, p.value]),
  );
  return `${parts.year}.${parts.month}.${parts.day} ${parts.hour}:${parts.minute}`;
}
export function periodLines(n: StyledNotice, lang: Lang): string[] {
  const m = normalizeMeta(n.meta);
  if (!m.starts_at && !m.ends_at) return [];
  const range = (zone?: string) =>
    `${m.starts_at ? stamp(m.starts_at, lang, zone) : ""} ~ ${m.ends_at ? stamp(m.ends_at, lang, zone) : ""}`.trim();
  const lines = [`${range("Asia/Seoul")} (KST)`];
  const mine = Intl.DateTimeFormat().resolvedOptions().timeZone;
  if (mine && mine !== "Asia/Seoul" && mine !== "Asia/Tokyo" && lang !== "ja")
    lines.push(`${text[lang].local}: ${range(undefined)}`);
  return lines;
}
function badge(n: StyledNotice, lang: Lang, now: number) {
  const m = normalizeMeta(n.meta);
  const t = text[lang];
  const phase = eventPhase(m, now);
  if (phase === "ended") return { cls: "is-ended", label: t.endedTag };
  if (phase === "upcoming") {
    const left = m.starts_at ? remaining(m.starts_at, now) : null;
    return { cls: "is-soon", label: t.starts(left?.days ?? 0) };
  }
  const left = m.ends_at ? remaining(m.ends_at, now) : null;
  return left
    ? { cls: "", label: t.left(left.days, left.hours, left.minutes) }
    : null;
}
const dBadge = (n: StyledNotice, lang: Lang, now: number) => {
  const m = normalizeMeta(n.meta);
  if (eventPhase(m, now) === "upcoming")
    return `<span class="event-d is-soon">${text[lang].upcoming}</span>`;
  const left = m.ends_at ? remaining(m.ends_at, now) : null;
  return left ? `<span class="event-d">D-${left.days}</span>` : "";
};
// The cover is clipped by its box: the frame only moves/zooms the picture inside it.
export function coverImage(n: StyledNotice, cls = "") {
  return safeImage(n.cover_image)
    ? `<img class="cover-img ${cls}" src="${esc(n.cover_image)}" alt="" loading="lazy" style="${coverStyle(n.cover_frame)}"/>`
    : `<span class="cover-empty" aria-hidden="true">${icon("star")}</span>`;
}
const langAttr = (n: StyledNotice, lang: Lang) => esc(n.content_locale || lang);
function eventBlock<T extends StyledNotice>(
  list: T[],
  lang: Lang,
  now: number,
  pick: string | undefined,
  rows: (n: T, ended?: boolean) => string,
) {
  const t = text[lang];
  const live = list.filter((n) => eventPhase(n.meta, now) !== "ended");
  const past = list.filter((n) => eventPhase(n.meta, now) === "ended");
  let html = "";
  if (live.length) {
    const current = live.find((n) => n.slug === pick) || live[0];
    const b = badge(current, lang, now);
    html += `<section class="notice-block event-block" aria-label="${t.ongoing}"><h3 class="block-title">${t.ongoing} <span>(${live.length})</span></h3><div class="event-stage">
<div class="event-rail" role="group" aria-label="${t.pick}">${live
      .map(
        (n) =>
          `<button type="button" class="event-pick${n === current ? " active" : ""}" data-event-pick="${esc(n.slug)}" aria-pressed="${n === current}"><span class="cover-box">${coverImage(n)}</span>${dBadge(n, lang, now)}<strong lang="${langAttr(n, lang)}">${esc(n.title)}</strong></button>`,
      )
      .join("")}</div>
<div class="feature-wrap"><button type="button" class="event-feature" data-notice="${esc(current.slug)}" aria-label="${esc(current.title)} · ${t.more}"><span class="cover-box">${coverImage(current)}</span><span class="feature-shade"></span><span class="feature-copy">${b ? `<span class="event-badge ${b.cls}">${icon("star")}${esc(b.label)}</span>` : ""}<strong lang="${langAttr(current, lang)}">${esc(current.title)}</strong>${periodLines(
      current,
      lang,
    )
      .map(
        (l, i) =>
          `<span class="${i ? "feature-local" : "feature-period"}">${esc(l)}</span>`,
      )
      .join(
        "",
      )}${current.summary ? `<span class="feature-summary" lang="${langAttr(current, lang)}">${esc(current.summary)}</span>` : ""}<span class="feature-more">${t.more} ${icon("arrow")}</span></span></button></div></div></section>`;
  }
  if (past.length)
    html += `<section class="notice-block" aria-label="${t.ended}"><h3 class="block-title">${t.ended} <span>(${past.length})</span></h3><div class="board">${past.map((n) => rows(n, true)).join("")}</div></section>`;
  return html;
}
function patchBlock(list: StyledNotice[], lang: Lang, now: number) {
  const t = text[lang];
  const fresh = (n: StyledNotice) =>
    now - Date.parse(n.published_at) < 14 * 86400000;
  return `<section class="notice-block patch-block" aria-label="${t.patch}"><h3 class="block-title">${t.patch}</h3><div class="patch-table" role="table"><div class="patch-head" role="row"><span role="columnheader">${t.version}</span><span role="columnheader">${t.title}</span><span role="columnheader">${t.date}</span></div>${list
    .map((n) => {
      const v = normalizeMeta(n.meta).version;
      return `<button type="button" class="patch-row${n.pinned ? " pinned" : ""}" role="row" data-notice="${esc(n.slug)}"><span class="patch-version" role="cell">${v ? esc(v) : icon("star")}</span><strong role="cell" lang="${langAttr(n, lang)}">${esc(n.title)}${fresh(n) ? '<em class="new-chip">New</em>' : ""}</strong><time role="cell" datetime="${esc(n.published_at)}">${date(n.published_at, lang)}</time></button>`;
    })
    .join("")}</div></section>`;
}
export interface BoardOptions<T extends StyledNotice> {
  tab: number;
  pick?: string;
  now?: number;
  row: (n: T, ended?: boolean) => string;
}
export function renderNoticeBoard<T extends StyledNotice>(
  list: T[],
  lang: Lang,
  o: BoardOptions<T>,
): string {
  const now = o.now ?? Date.now();
  const only = tabKinds[o.tab] ?? null;
  const part = (k: NoticeKind) =>
    (only === null || only === k) && list.filter((n) => noticeKind(n) === k);
  const events = part("event");
  const updates = part("update");
  const plain = part("plain");
  const t = text[lang];
  let html = "";
  if (events && events.length)
    html += eventBlock(events, lang, now, o.pick, o.row);
  if (updates && updates.length) html += patchBlock(updates, lang, now);
  if (plain && plain.length)
    html += `<section class="notice-block" aria-label="${t.board}">${only === null ? `<h3 class="block-title">${t.board}</h3>` : ""}<div class="board">${plain.map((n) => o.row(n)).join("")}</div></section>`;
  return html;
}
// Detail dialog header for the two styled kinds; plain keeps the original markup.
export function noticeHero(n: StyledNotice, lang: Lang, now = Date.now()) {
  const kind = noticeKind(n);
  const m = normalizeMeta(n.meta);
  if (kind === "plain") return "";
  const b = kind === "event" ? badge(n, lang, now) : null;
  const hasCover = safeImage(n.cover_image);
  return `<div class="notice-hero kind-${kind}${hasCover ? "" : " no-cover"}"><span class="cover-box">${coverImage(n)}</span><span class="feature-shade"></span><span class="hero-copy">${kind === "update" && m.version ? `<span class="event-badge">${esc(m.version)}</span>` : ""}${b ? `<span class="event-badge ${b.cls}">${icon("star")}${esc(b.label)}</span>` : ""}</span></div>`;
}
export function noticePeriod(n: StyledNotice, lang: Lang) {
  if (noticeKind(n) !== "event") return "";
  const lines = periodLines(n, lang);
  return lines.length
    ? `<div class="notice-period"><strong>${text[lang].period}</strong>${lines.map((l) => `<p>${esc(l)}</p>`).join("")}</div>`
    : "";
}
