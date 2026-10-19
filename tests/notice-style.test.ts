import { afterEach, describe, it, expect, vi } from "vitest";
import notices from "../api/notices";
import {
  coverSize,
  coverStyle,
  dragFocus,
  eventPhase,
  normalizeFrame,
  normalizeMeta,
  remaining,
} from "../shared/notice-style.js";
import {
  noticeHero,
  noticeKind,
  noticePeriod,
  renderNoticeBoard,
  type StyledNotice,
} from "../src/ui/notice-views";
import type { Response as ApiResponse } from "../server/http";

const now = Date.parse("2026-10-18T12:00:00Z");
const base: StyledNotice = {
  slug: "a",
  category: "notice",
  published_at: "2026-10-10T00:00:00Z",
  title: "제목",
  summary: "",
};
const row = (n: StyledNotice, ended?: boolean) =>
  `<row ${n.slug}${ended ? " ended" : ""}>`;
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("cover frame", () => {
  it("clamps zoom and focus and renders the same CSS everywhere", () => {
    expect(normalizeFrame(null)).toEqual({ zoom: 1, x: 50, y: 50 });
    expect(normalizeFrame({ zoom: 9, x: -4, y: 140 })).toEqual({
      zoom: 3,
      x: 0,
      y: 100,
    });
    expect(coverStyle({ zoom: 1.5, x: 20, y: 30 })).toBe(
      "object-position:20% 30%;transform:scale(1.5);transform-origin:20% 30%",
    );
  });
  it("maps a drag across the whole overflow to the full 0-100 focus range", () => {
    // 1000x500 image in a 400x200 box at zoom 1 covers exactly: no overflow.
    expect(dragFocus({ zoom: 1 }, 50, 400, coverSize(2, 400, 200).w)).toBe(0);
    // Wider image: cover width 800, visible width 400 -> 400px of travel.
    const w = coverSize(4, 400, 200).w;
    expect(w).toBe(800);
    expect(dragFocus({ zoom: 1 }, -400, 400, w)).toBe(100);
    // Zoom 2 on the 2:1 image: window is 200 cover px wide, travel 200 cover px = 400 screen px.
    expect(dragFocus({ zoom: 2 }, -400, 400, 400)).toBe(100);
  });
});

describe("event metadata", () => {
  it("keeps only valid fields and derives the phase and remaining time", () => {
    expect(
      normalizeMeta({
        version: " 1.4.0 ",
        game_event_id: "wolf-cafe",
        starts_at: "2026-10-01T00:00:00+09:00",
        ends_at: "bad",
        script: "<x>",
      }),
    ).toEqual({
      version: "1.4.0",
      game_event_id: "wolf-cafe",
      starts_at: "2026-09-30T15:00:00.000Z",
    });
    expect(eventPhase({ ends_at: "2026-10-17T00:00:00Z" }, now)).toBe("ended");
    expect(eventPhase({ starts_at: "2026-10-20T00:00:00Z" }, now)).toBe(
      "upcoming",
    );
    expect(eventPhase({}, now)).toBe("live");
    expect(remaining("2026-10-20T15:30:00Z", now)).toEqual({
      days: 2,
      hours: 3,
      minutes: 30,
    });
  });
});

describe("board", () => {
  const event = {
    ...base,
    slug: "ev",
    template: "event",
    title: "시즌 이벤트",
    cover_image: "https://cdn.example/e.webp",
    cover_frame: { zoom: 1.2, x: 30, y: 40 },
    meta: {
      starts_at: "2026-10-07T00:00:00+09:00",
      ends_at: "2026-11-17T00:00:00+09:00",
    },
  };
  const past = {
    ...event,
    slug: "old",
    meta: { ends_at: "2026-10-01T00:00:00Z" },
  };
  const patch = {
    ...base,
    slug: "p",
    template: "update",
    title: "정기 업데이트",
    published_at: "2026-10-15T00:00:00Z",
    meta: { version: "1.4.0" },
  };
  const plain = { ...base, slug: "n" };
  const list = [event, past, patch, plain];
  it("groups by style and filters by tab", () => {
    const all = renderNoticeBoard(list, "ko", { tab: 0, now, row });
    expect(all).toContain("진행 중인 이벤트 <span>(1)</span>");
    expect(all).toContain("<row old ended>");
    expect(all).toContain('class="patch-version" role="cell">1.4.0');
    expect(all).toContain("New</em>");
    expect(all).toContain("<row n>");
    expect(all).toContain("D-29");
    const soon = renderNoticeBoard(
      [{ ...event, meta: { starts_at: "2026-10-20T00:00:00Z" } }],
      "ko",
      { tab: 0, now, row },
    );
    expect(soon).toContain('event-d is-soon">시작 예정');
    expect(all).toContain(
      "object-position:30% 40%;transform:scale(1.2);transform-origin:30% 40%",
    );
    expect(all).toContain("2026.10.07 00:00 ~ 2026.11.17 00:00 (KST)");
    const events = renderNoticeBoard(list, "ko", { tab: 1, now, row });
    expect(events).not.toContain("<row n>");
    expect(events).not.toContain("patch-table");
    expect(renderNoticeBoard(list, "ko", { tab: 3, now, row })).toBe(
      '<section class="notice-block" aria-label="공지"><div class="board"><row n></div></section>',
    );
  });
  it("escapes titles and falls back to category for old rows", () => {
    expect(noticeKind({ ...base, category: "development" })).toBe("update");
    expect(noticeKind({ ...base, category: "event" })).toBe("event");
    const html = renderNoticeBoard(
      [{ ...event, title: '<img src=x onerror="1">' }],
      "en",
      { tab: 0, now, row },
    );
    expect(html).not.toContain("<img src=x");
    expect(noticeHero(plain, "ko", now)).toBe("");
    expect(noticeHero(event, "ko", now)).toContain("notice-hero kind-event");
    expect(noticePeriod(event, "ko")).toContain("진행 기간");
    expect(noticePeriod(patch, "ko")).toBe("");
  });
});

describe("API", () => {
  it("returns sanitized frame and meta from the current schema", async () => {
    vi.stubEnv("SUPABASE_URL", "https://project.supabase.co");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "test-only");
    const fetch = vi.fn().mockResolvedValue(
      Response.json([
        {
          slug: "ev",
          category: "event",
          published_at: "2026-10-16T00:00:00Z",
          template: "event",
          source_locale: "ko",
          cover_frame: { zoom: 7, x: 10, y: 20 },
          meta: { game_event_id: "wolf-cafe", junk: 1 },
          website_notice_translations: [
            { locale: "ko", title: "t", summary: "", body: "b" },
          ],
        },
      ]),
    );
    vi.stubGlobal("fetch", fetch);
    let body: any;
    const res: ApiResponse = {
      setHeader() {},
      status() {
        return res;
      },
      json(v) {
        body = v;
      },
    };
    await notices({ method: "GET", headers: {}, url: "/api/notices" }, res);
    expect(fetch.mock.calls[0][0]).toContain("cover_frame,meta");
    expect(body.notices[0]).toMatchObject({
      cover_frame: { zoom: 3, x: 10, y: 20 },
      meta: { game_event_id: "wolf-cafe" },
    });
    expect(body.notices[0].meta.junk).toBeUndefined();
  });
});
