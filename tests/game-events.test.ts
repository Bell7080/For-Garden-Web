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
    expect(sortEvents([later, live], "live").map((e) => e.id)).toEqual(["live", "later"]);
    expect(sortEvents([live, soon, done], "ended").map((e) => e.id)).toEqual(["done"]);
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
