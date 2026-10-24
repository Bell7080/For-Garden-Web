// 홈페이지 이벤트란의 인게임 이벤트 카드. 데이터는 게임 로비 이벤트 정의의 스냅샷
// (content/game-events.json, `npm run sync:events`)이고, 카드 양식은 게임 LobbyEventCard를 따른다:
// 원화 뒷배경 · 글 쪽 어둠 · 왼쪽 금빛 빗금 · 제목 · 한 줄 부제 · 붉은 기간 시계.
import snapshot from "../../content/game-events.json";
import { normalizeMeta, remaining } from "../../shared/notice-style.js";
import { icon } from "./icons";

type Lang = "ko" | "en" | "ja";
export type EventPhase = "live" | "upcoming" | "ended";
export const EVENT_PHASES: readonly EventPhase[] = ["live", "upcoming", "ended"];
type Localized = Readonly<Record<Lang, string>>;
export interface GameEvent {
  id: string;
  title: Localized;
  subtitle: Localized;
  startsAt: string;
  endsAt: string;
  backdrop: string;
  frame: { zoom: number; offsetX: number; offsetY: number } | null;
  sd: { relicId: string; side: string } | null;
  showcase: string | null;
  destination: string | null;
}
export const GAME_EVENTS: readonly GameEvent[] = snapshot.events as GameEvent[];
// 게임 카드의 규격(820 폭)과 같은 비율 — 원화 위치 값이 이 크기 기준이다.
const CARD = { width: 820 } as const;

const text = {
  ko: {
    phases: { live: "진행 중", upcoming: "준비 중", ended: "완료" },
    empty: {
      live: "지금 진행 중인 이벤트가 없습니다.",
      upcoming: "준비 중인 이벤트가 없습니다.",
      ended: "완료된 이벤트가 없습니다.",
    },
    group: "이벤트 상태",
    more: "공지 보기",
    start: "시작",
    end: "종료",
    soon: "곧 시작",
    ended: "완료",
  },
  en: {
    phases: { live: "Ongoing", upcoming: "Upcoming", ended: "Ended" },
    empty: {
      live: "No events are running right now.",
      upcoming: "No events are being prepared.",
      ended: "No past events yet.",
    },
    group: "Event status",
    more: "Read notice",
    start: "Starts",
    end: "Ends",
    soon: "Starting soon",
    ended: "Ended",
  },
  ja: {
    phases: { live: "開催中", upcoming: "準備中", ended: "終了" },
    empty: {
      live: "開催中のイベントはありません。",
      upcoming: "準備中のイベントはありません。",
      ended: "終了したイベントはありません。",
    },
    group: "イベントの状態",
    more: "お知らせを見る",
    start: "開始",
    end: "終了",
    soon: "まもなく開始",
    ended: "終了",
  },
} as const;
export const eventPhaseLabels = (lang: Lang) => text[lang].phases;

const esc = (s: unknown) =>
  String(s ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ]!,
  );
export function gameEventPhase(e: Pick<GameEvent, "startsAt" | "endsAt">, now = Date.now()): EventPhase {
  if (Date.parse(e.endsAt) <= now) return "ended";
  if (Date.parse(e.startsAt) > now) return "upcoming";
  return "live";
}
// 게임의 `D00:HH:MM:SS` 시계와 같은 표기. 페이지는 렌더 시점의 값을 보여 준다.
export function dayClock(ms: number): string {
  const total = Math.floor(Math.max(0, Number.isFinite(ms) ? ms : 0) / 1000);
  const pad = (v: number) => String(v).padStart(2, "0");
  return `D${pad(Math.floor(total / 86400))}:${pad(Math.floor((total % 86400) / 3600))}:${pad(Math.floor((total % 3600) / 60))}:${pad(total % 60)}`;
}
function stamp(iso: string, lang: Lang) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat(lang, {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
      timeZone: "Asia/Seoul",
    })
      .formatToParts(new Date(iso))
      .map((p) => [p.type, p.value]),
  );
  return `${parts.year}.${parts.month}.${parts.day} ${parts.hour}:${parts.minute}`;
}
// 게임 카드의 원화 배치(확대·중심 이동)를 퍼센트로 옮긴다 — 카드 크기가 달라도 같은 구도가 된다.
export function backdropStyle(frame: GameEvent["frame"]): string {
  const f = frame ?? { zoom: 1, offsetX: 0, offsetY: 0 };
  // 세로 이동은 카드 폭 기준(cqw)이다 — 게임의 이동 값이 폭에 비례해 커지므로, 카드 높이가 달라지는 좁은 화면에서도 같은 구도가 된다.
  const y = (f.offsetY / CARD.width) * 100;
  return `width:${f.zoom * 100}%;left:${50 + (f.offsetX / CARD.width) * 100}%;top:calc(50% + ${y}cqw)`;
}
export function sortEvents(list: readonly GameEvent[], phase: EventPhase): GameEvent[] {
  const key = (e: GameEvent) =>
    phase === "upcoming" ? Date.parse(e.startsAt) : phase === "ended" ? -Date.parse(e.endsAt) : Date.parse(e.endsAt);
  return list.filter((e) => gameEventPhase(e) === phase).sort((a, b) => key(a) - key(b));
}
export function eventCard(
  e: GameEvent,
  lang: Lang,
  now: number,
  noticeSlug?: string,
): string {
  const t = text[lang];
  const phase = gameEventPhase(e, now);
  const clock =
    phase === "live"
      ? dayClock(Date.parse(e.endsAt) - now)
      : phase === "upcoming"
        ? dayClock(Date.parse(e.startsAt) - now)
        : t.ended;
  const clockLabel = phase === "upcoming" ? t.start : phase === "live" ? t.end : "";
  const body = `<span class="gc-art" aria-hidden="true"><img src="${esc(e.backdrop)}" alt="" loading="lazy" style="${backdropStyle(e.frame)}"/></span><span class="gc-veil" aria-hidden="true"></span><span class="gc-rail" aria-hidden="true"></span><span class="gc-copy"><strong class="gc-title">${esc(e.title[lang])}</strong><span class="gc-sub">${esc(e.subtitle[lang])}</span><span class="gc-clock"><span class="gc-clock-label">${esc(clockLabel)}</span><time datetime="${esc(phase === "upcoming" ? e.startsAt : e.endsAt)}">${esc(clock)}</time></span></span><span class="gc-period"><span>${esc(stamp(e.startsAt, lang))} ~ ${esc(stamp(e.endsAt, lang))} (KST)</span></span>${noticeSlug ? `<span class="gc-more">${t.more} ${icon("arrow")}</span>` : ""}`;
  const cls = `game-card is-${phase}`;
  return noticeSlug
    ? `<button type="button" class="${cls}" data-notice="${esc(noticeSlug)}" aria-label="${esc(e.title[lang])} · ${t.more}">${body}</button>`
    : `<article class="${cls}" aria-label="${esc(e.title[lang])}">${body}</article>`;
}
export interface EventNoticeLike {
  slug: string;
  meta?: unknown;
}
// 상태 라벨(진행 중 / 준비 중 / 완료)과 그 상태의 카드 목록. 공지는 meta.game_event_id로 카드에 이어진다.
export function renderGameEventBoard<T extends EventNoticeLike>(
  events: readonly GameEvent[],
  notices: readonly T[],
  lang: Lang,
  o: { phase: EventPhase; now?: number; extra?: (phase: EventPhase) => string; extraCount?: (phase: EventPhase) => number },
): string {
  const t = text[lang];
  const now = o.now ?? Date.now();
  const linked = new Map<string, string>();
  for (const n of notices) {
    const id = normalizeMeta(n.meta).game_event_id;
    if (id && !linked.has(id)) linked.set(id, n.slug);
  }
  const counts = (p: EventPhase) =>
    events.filter((e) => gameEventPhase(e, now) === p).length + (o.extraCount?.(p) ?? 0);
  const tabs = EVENT_PHASES.map(
    (p) =>
      `<button type="button" class="phase-tab${o.phase === p ? " active" : ""}" data-event-phase="${p}" aria-pressed="${o.phase === p}">${t.phases[p]} <span>${counts(p)}</span></button>`,
  ).join("");
  const list = sortEvents(events, o.phase).map((e) => eventCard(e, lang, now, linked.get(e.id)));
  const extra = o.extra?.(o.phase) ?? "";
  return `<section class="notice-block game-events" aria-label="${t.group}"><div class="phase-tabs" role="group" aria-label="${t.group}">${tabs}</div>${
    list.length || extra
      ? `<div class="game-card-list">${list.join("")}</div>${extra}`
      : `<p class="phase-empty">${t.empty[o.phase]}</p>`
  }</section>`;
}
