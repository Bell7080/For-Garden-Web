// 홈페이지 이벤트란의 인게임 이벤트 카드. 데이터는 배포된 게임이 구워 두는 공개 피드(`/api/events` →
// 게임 `/site/events.json`)이고, 그것을 받기 전·받지 못했을 때는 함께 묶인 스냅샷(content/game-events.json,
// `npm run sync:events`)을 쓴다. 카드 양식은 게임 LobbyEventCard를 따른다:
// 원화 뒷배경 · 글 쪽 어둠 · 왼쪽 금빛 빗금 · 제목 · 한 줄 부제 · 붉은 기간 시계.
import snapshot from "../../content/game-events.json";
import bounds from "../puppet-bounds.json";
import { normalizeMeta } from "../../shared/notice-style.js";
import { parseEventFeed } from "../../shared/game-event-feed.js";
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
  /** 매주 순환하는 정기 이벤트 — 기간은 교대표(`EventRotation`)가 주 단위로 정한다. */
  weekly?: boolean;
  /** `zip`·`bounds`가 있으면 그 퍼펫을, 없으면 `puppet-bounds.json`의 `<relicId>-sd`를 쓴다. `still`은 움직임이 꺼졌을 때의 정지 이미지. */
  sd: { relicId: string; side: string; still: string | null; zip?: string | null; bounds?: readonly number[] | null } | null;
  showcase: string | null;
  destination: string | null;
}
/** 정기 이벤트 교대 — 게임 `core/regularEventRotation.ts`와 같은 규칙이다(앵커 주부터 UTC 월요일 00:00마다 다음 칸). */
export interface EventRotation {
  cycle: readonly string[];
  anchor: string;
  weekMs: number;
}
export interface EventFeed {
  version: string | null;
  rotation: EventRotation | null;
  events: GameEvent[];
}
const bundled = parseEventFeed(snapshot) as EventFeed;
export const GAME_EVENTS: readonly GameEvent[] = bundled.events;
export const EVENT_ROTATION: EventRotation | null = bundled.rotation;
/**
 * 서버가 내려 준 최신 피드를 묶인 스냅샷과 합친다. 글·기간·교대는 최신 피드를 따르고, 같은 이벤트의 원화·SD는
 * 이 사이트가 이미 가진 파일(정지 이미지 포함)을 쓴다 — 스냅샷에 없는 새 이벤트만 게임 주소의 파일을 읽는다.
 */
export function mergeEventFeed(remote: EventFeed | null, local: EventFeed = bundled): EventFeed {
  if (!remote || !remote.events.length) return local;
  const known = new Map(local.events.map((e) => [e.id, e]));
  return {
    version: remote.version,
    rotation: remote.rotation ?? local.rotation,
    events: remote.events.map((e) => {
      const mine = known.get(e.id);
      if (!mine) return e;
      const sameSd = mine.sd && e.sd && mine.sd.relicId === e.sd.relicId;
      return { ...e, backdrop: mine.backdrop, sd: sameSd ? { ...e.sd!, still: mine.sd!.still, zip: mine.sd!.zip, bounds: mine.sd!.bounds } : e.sd };
    }),
  };
}
/**
 * 정기 이벤트를 주 단위 회차로 편다 — 지난주(완료) · 이번 주(진행 중) · 다음 차례들(준비 중). 교대표에 없는
 * 주간 이벤트는 이번 주 회차 하나로 선다. 주간이 아닌 이벤트는 그대로다.
 */
export function expandRotation(events: readonly GameEvent[], rotation: EventRotation | null, now = Date.now()): GameEvent[] {
  const week = rotation?.weekMs ?? 7 * 86_400_000;
  const anchor = rotation ? Date.parse(rotation.anchor) : NaN;
  const out: GameEvent[] = [];
  const iso = (t: number) => new Date(t).toISOString();
  const thisWeek = (() => {
    const d = new Date(now);
    const back = (d.getUTCDay() + 6) % 7;
    return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - back);
  })();
  for (const e of events) {
    if (!e.weekly) {
      out.push(e);
      continue;
    }
    const slot = rotation ? rotation.cycle.indexOf(e.id) : -1;
    const from = Date.parse(e.startsAt);
    const until = Date.parse(e.endsAt);
    const fits = (start: number) => start + week > from && start < until;
    if (slot < 0 || !Number.isFinite(anchor)) {
      if (fits(thisWeek)) out.push({ ...e, startsAt: iso(Math.max(thisWeek, from)), endsAt: iso(Math.min(thisWeek + week, until)) });
      continue;
    }
    const size = rotation!.cycle.length;
    const current = Math.floor((now - anchor) / week);
    for (let k = -1; k < size; k++) {
      const index = current + k;
      if (index < 0 || (((index % size) + size) % size) !== slot) continue;
      const start = anchor + index * week;
      if (fits(start)) out.push({ ...e, startsAt: iso(Math.max(start, from)), endsAt: iso(Math.min(start + week, until)) });
    }
  }
  return out;
}
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
export function sortEvents(list: readonly GameEvent[], phase: EventPhase, now = Date.now()): GameEvent[] {
  const key = (e: GameEvent) =>
    phase === "upcoming" ? Date.parse(e.startsAt) : phase === "ended" ? -Date.parse(e.endsAt) : Date.parse(e.endsAt);
  return list.filter((e) => gameEventPhase(e, now) === phase).sort((a, b) => key(a) - key(b));
}
// 게임 카드처럼 SD는 글의 반대쪽에 서고 몸 아래는 카드 밑변에서 잘린다. 움직임은 mountPuppets가 맡고 정지 이미지는 대체다.
// 정지 이미지가 아직 없는 새 이벤트의 SD는 빈 그림으로 자리만 잡고, 퍼펫이 그 자리를 채운다.
const BLANK = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";
function sdFigure(e: GameEvent, name: string): string {
  const sd = e.sd;
  if (!sd) return "";
  const local = (bounds as Record<string, { bounds: number[] } | undefined>)[`${sd.relicId}-sd`];
  const box = sd.bounds ?? local?.bounds;
  if (!box) return "";
  const [l, t, r, b] = box;
  // 사이트에 없는 퍼펫은 피드가 준 ZIP·경계로 읽는다(게임 주소는 /puppets에 CORS를 연다).
  const remote = sd.zip && !sd.zip.startsWith("/assets/puppets/") ? ` data-puppet-src="${esc(sd.zip)}" data-puppet-bounds="${box.join(",")}"` : "";
  return `<img class="gc-sd side-${sd.side === "left" ? "left" : "right"}" data-puppet="${esc(sd.relicId)}-sd"${remote} src="${esc(sd.still ?? BLANK)}" alt="${esc(name)}" style="aspect-ratio:${r - l}/${b - t}" loading="lazy" draggable="false"/>`;
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
  const body = `<span class="gc-art" aria-hidden="true"><img src="${esc(e.backdrop)}" alt="" loading="lazy" style="${backdropStyle(e.frame)}"/></span><span class="gc-veil" aria-hidden="true"></span><span class="gc-rail" aria-hidden="true"></span><span class="gc-copy"><strong class="gc-title">${esc(e.title[lang])}</strong><span class="gc-sub">${esc(e.subtitle[lang])}</span><span class="gc-clock"><span class="gc-clock-label">${esc(clockLabel)}</span><time datetime="${esc(phase === "upcoming" ? e.startsAt : e.endsAt)}">${esc(clock)}</time></span></span>${sdFigure(e, e.title[lang])}<span class="gc-period"><span>${esc(stamp(e.startsAt, lang))} ~ ${esc(stamp(e.endsAt, lang))} (KST)</span></span>${noticeSlug ? `<span class="gc-more">${t.more} ${icon("arrow")}</span>` : ""}`;
  // 링크 버튼은 카드 전체를 덮고, SD 퍼펫은 그 위에 서서 SD를 누르면 반응하고 나머지는 공지로 이동한다(버튼 안에 버튼을 두지 않는다).
  const link = noticeSlug
    ? `<button type="button" class="gc-link" data-notice="${esc(noticeSlug)}" aria-label="${esc(e.title[lang])} · ${t.more}"></button>`
    : "";
  return `<article class="game-card is-${phase}${noticeSlug ? " has-link" : ""}" aria-label="${esc(e.title[lang])}">${body.replace('<span class="gc-copy">', `${link}<span class="gc-copy">`)}</article>`;
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
  const list = sortEvents(events, o.phase, now).map((e) => eventCard(e, lang, now, linked.get(e.id)));
  const extra = o.extra?.(o.phase) ?? "";
  return `<section class="notice-block game-events" aria-label="${t.group}"><div class="phase-tabs" role="group" aria-label="${t.group}">${tabs}</div>${
    list.length || extra
      ? `<div class="game-card-list">${list.join("")}</div>${extra}`
      : `<p class="phase-empty">${t.empty[o.phase]}</p>`
  }</section>`;
}
