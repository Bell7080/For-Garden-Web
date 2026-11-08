import { describe, expect, it } from "vitest";
import {
  GAME_EVENTS,
  backdropStyle,
  dayClock,
  eventCard,
  gameEventPhase,
  renderGameEventBoard,
  sortEvents,
  type GameEvent,
} from "../src/ui/game-events";
import { renderNoticeBoard, type StyledNotice } from "../src/ui/notice-views";

const base = GAME_EVENTS[0];
const make = (id: string, startsAt: string, endsAt: string): GameEvent => ({
  ...base,
  id,
  startsAt,
  endsAt,
});
const now = Date.parse("2026-10-24T00:00:00+09:00");
const live = make("live", "2026-10-01T00:00:00+09:00", "2026-11-01T00:00:00+09:00");
const soon = make("soon", "2026-11-05T00:00:00+09:00", "2026-12-01T00:00:00+09:00");
const done = make("done", "2026-09-01T00:00:00+09:00", "2026-10-10T00:00:00+09:00");

describe("game event snapshot", () => {
  it("carries every locale the site shows for each in-game event", () => {
    expect(GAME_EVENTS.length).toBeGreaterThan(0);
    for (const e of GAME_EVENTS) {
      for (const lang of ["ko", "en", "ja"] as const) {
        expect(e.title[lang]).toBeTruthy();
        expect(e.subtitle[lang]).toBeTruthy();
      }
      expect(e.backdrop).toMatch(/^\/assets\/events\/[a-z0-9-]+\.webp$/);
      expect(Date.parse(e.endsAt)).toBeGreaterThan(Date.parse(e.startsAt));
    }
  });
});

describe("event phases", () => {
  it("splits into live / upcoming / ended at the boundaries", () => {
    expect(gameEventPhase(live, now)).toBe("live");
    expect(gameEventPhase(soon, now)).toBe("upcoming");
    expect(gameEventPhase(done, now)).toBe("ended");
    expect(gameEventPhase(live, Date.parse(live.endsAt))).toBe("ended");
    expect(gameEventPhase(soon, Date.parse(soon.startsAt))).toBe("live");
  });
  it("sorts live by nearest end, upcoming by nearest start, ended by latest end", () => {
    const later = make("later", "2026-10-02T00:00:00+09:00", "2026-12-01T00:00:00+09:00");
    expect(sortEvents([later, live], "live", now).map((e) => e.id)).toEqual(["live", "later"]);
    expect(sortEvents([live, soon, done], "ended", now).map((e) => e.id)).toEqual(["done"]);
  });
});

describe("game-style card", () => {
  it("uses the game's D00:HH:MM:SS clock and the card art frame", () => {
    expect(dayClock(((2 * 24 + 3) * 3600 + 4 * 60 + 5) * 1000)).toBe("D02:03:04:05");
    expect(dayClock(-5)).toBe("D00:00:00:00");
    expect(backdropStyle(null)).toBe("width:100%;left:50%;top:calc(50% + 0cqw)");
    expect(backdropStyle({ zoom: 1.22, offsetX: 82, offsetY: 110 })).toContain("width:122%");
  });
  it("renders localized text escaped, and a notice link only when one exists", () => {
    const tricky = { ...live, title: { ...live.title, en: "<b>x</b>" } };
    const plain = eventCard(tricky, "en", now);
    expect(plain).toContain("&lt;b&gt;x&lt;/b&gt;");
    expect(plain).not.toContain("data-notice");
    expect(eventCard(live, "ko", now, "some-slug")).toContain('data-notice="some-slug"');
  });
  it("links a card to the notice that carries its game_event_id", () => {
    const notice = { slug: "n1", meta: { game_event_id: "live" } };
    const html = renderGameEventBoard([live, soon, done], [notice], "ko", { phase: "live", now });
    expect(html).toContain('data-notice="n1"');
    expect(html).toContain('data-event-phase="upcoming"');
    expect(html).toContain("준비 중");
    expect(html).not.toContain("game-card is-upcoming");
  });
  it("shows an empty message for a phase with no events", () => {
    expect(renderGameEventBoard([live], [], "ko", { phase: "ended", now })).toContain("완료된 이벤트가 없습니다.");
  });
});

describe("event tab of the notice board", () => {
  const notice = (slug: string, meta: unknown): StyledNotice => ({
    slug,
    category: "event",
    template: "event",
    published_at: "2026-10-01T00:00:00Z",
    title: slug,
    summary: "",
    meta,
  });
  const row = (n: StyledNotice) => `<row ${n.slug}>`;
  it("lists unlinked event notices under their own phase and hides linked ones as cards", () => {
    const list = [
      notice("linked", { game_event_id: "live" }),
      notice("solo", { starts_at: "2026-09-01T00:00:00Z", ends_at: "2026-12-01T00:00:00Z" }),
    ];
    const html = renderNoticeBoard(list, "ko", { tab: 0, now, row, gameEvents: [live] });
    expect(html).toContain('data-notice="linked"');
    expect(html).toContain("<row solo>");
    expect(html).not.toContain("<row linked>");
  });
  it("opens the first non-empty phase when none is chosen", () => {
    const html = renderNoticeBoard([], "ko", { tab: 0, now, row, gameEvents: [soon] });
    expect(html).toContain('class="phase-tab active" data-event-phase="upcoming"');
  });
});

describe("live event feed", () => {
  const feed = {
    schema: 1,
    version: "9.9.9",
    rotation: { cycle: ["chest-forge", "delophy-hunt", "shute-fishing"], anchor: "2026-11-02T00:00:00.000Z", weekMs: 604800000 },
    events: [
      { id: "chest-forge", title: { ko: "티아의 보물상자", en: "Tia" }, subtitle: { ko: "부제" }, startsAt: "2026-11-02T00:00:00Z", endsAt: "2099-12-31T23:59:59Z", weekly: true, backdrop: "/sprites/events/tia-card.webp", sd: { relicId: "tia", side: "right", zip: "/puppets/char_008.zip", bounds: [1, 2, 30, 40] } },
      { id: "new-one", title: { ko: "새 이벤트" }, subtitle: { ko: "부제" }, startsAt: "2026-11-01T00:00:00Z", endsAt: "2026-12-01T00:00:00Z", backdrop: "/sprites/events/new.webp", sd: { relicId: "tia", side: "left", zip: "/puppets/x.zip", bounds: [0, 0, 10, 10] } },
      { id: "Bad id", title: { ko: "x" }, startsAt: "2026-11-01T00:00:00Z", endsAt: "2026-12-01T00:00:00Z", backdrop: "/a.webp" },
      { id: "evil", title: { ko: "x" }, startsAt: "2026-11-01T00:00:00Z", endsAt: "2026-12-01T00:00:00Z", backdrop: "javascript:alert(1)" },
    ],
  };
  it("keeps only safe events and makes asset paths absolute on the game origin", async () => {
    const { parseEventFeed } = await import("../shared/game-event-feed.js");
    const parsed = parseEventFeed(feed, "https://forgarden.vercel.app")!;
    expect(parsed.events.map((e: GameEvent) => e.id)).toEqual(["chest-forge", "new-one"]);
    expect(parsed.events[0].backdrop).toBe("https://forgarden.vercel.app/sprites/events/tia-card.webp");
    expect(parsed.events[0].title.ja).toBe("티아의 보물상자");
    // 화면이 서버 응답을 다시 걸러도 절대 주소가 살아남는다.
    expect(parseEventFeed(parsed)!.events[1].sd!.zip).toBe("https://forgarden.vercel.app/puppets/x.zip");
  });
  it("prefers the site's own art for known events and the feed's text", async () => {
    const { parseEventFeed } = await import("../shared/game-event-feed.js");
    const { mergeEventFeed } = await import("../src/ui/game-events");
    const merged = mergeEventFeed(parseEventFeed(feed, "https://forgarden.vercel.app"));
    const chest = merged.events.find((e) => e.id === "chest-forge")!;
    expect(chest.backdrop).toBe("/assets/events/chest-forge.webp");
    expect(chest.sd!.still).toBe("/assets/tia-sd.webp");
    expect(chest.title.ko).toBe("티아의 보물상자");
    const fresh = merged.events.find((e) => e.id === "new-one")!;
    expect(fresh.backdrop).toMatch(/^https:\/\/forgarden\.vercel\.app\//);
    const card = eventCard({ ...fresh, startsAt: "2026-10-01T00:00:00Z" }, "ko", now);
    expect(card).toContain('data-puppet-src="https://forgarden.vercel.app/puppets/x.zip"');
    expect(card).toContain('data-puppet-bounds="0,0,10,10"');
  });
  it("spreads the weekly rotation into last, this and next weeks", async () => {
    const { expandRotation, EVENT_ROTATION } = await import("../src/ui/game-events");
    const at = Date.parse("2026-11-10T12:00:00Z"); // 둘째 주 — 델로피 차례
    const weekly = GAME_EVENTS.filter((e) => e.weekly);
    expect(weekly.map((e) => e.id).sort()).toEqual(["chest-forge", "delophy-hunt", "shute-fishing"]);
    const list = expandRotation(GAME_EVENTS, EVENT_ROTATION, at);
    const phase = (id: string, p: string) => list.filter((e) => e.id === id && gameEventPhase(e, at) === p);
    expect(phase("delophy-hunt", "live")).toHaveLength(1);
    expect(phase("delophy-hunt", "live")[0].endsAt).toBe("2026-11-16T00:00:00.000Z");
    expect(phase("chest-forge", "ended")).toHaveLength(1);
    expect(phase("shute-fishing", "upcoming")[0].startsAt).toBe("2026-11-16T00:00:00.000Z");
    expect(phase("chest-forge", "upcoming")[0].startsAt).toBe("2026-11-23T00:00:00.000Z");
    expect(list.filter((e) => gameEventPhase(e, at) === "live").map((e) => e.id).sort()).toEqual(["delophy-hunt", "research-roulette", "wolf-cafe"]);
    // 첫 주에는 앵커 이전의 지난 회차를 만들지 않는다.
    const first = expandRotation(GAME_EVENTS, EVENT_ROTATION, Date.parse("2026-11-03T00:00:00Z"));
    expect(first.filter((e) => e.weekly && gameEventPhase(e, Date.parse("2026-11-03T00:00:00Z")) === "ended")).toHaveLength(0);
  });
});
