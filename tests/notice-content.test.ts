import { afterEach, describe, it, expect, vi } from "vitest";
import notices from "../api/notices";
import { selectNoticeContent } from "../shared/notice-content.js";
import type { Response as ApiResponse } from "../server/http";
const source = {
  locale: "ko",
  title: "원문 공지",
  summary: "요약",
  body: "내용",
};
const row = {
  slug: "new-notice",
  category: "notice",
  published_at: "2026-10-16T00:00:00Z",
  source_locale: "ko",
  website_notice_translations: [source],
};
function response() {
  let status = 0,
    body: any;
  const res: ApiResponse = {
    setHeader() {},
    status(code) {
      status = code;
      return res;
    },
    json(value) {
      body = value;
    },
  };
  return { res, result: () => ({ status, body }) };
}
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});
function configure() {
  vi.stubEnv("SUPABASE_URL", "https://project.supabase.co");
  vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "test-only");
}
describe("editorial-only announcements", () => {
  it("uses complete manual content and falls back from a partial manuscript", () => {
    const notice = {
      ...row,
      website_notice_translations: [
        source,
        { locale: "en", title: "Reviewed", body: "Text", summary: "" },
        { locale: "ja", title: "未完成", body: "", summary: "" },
      ],
    };
    expect(selectNoticeContent(notice, "en")).toMatchObject({
      title: "Reviewed",
      translation: "manual",
      content_locale: "en",
    });
    expect(selectNoticeContent(notice, "ja")).toMatchObject({
      title: "원문 공지",
      translation: "original",
      content_locale: "ko",
    });
  });
  it("does not expose old generated content even when it is present in a database result", () => {
    expect(
      selectNoticeContent(
        {
          ...row,
          website_notice_auto_translations: [
            { locale: "en", title: "Old generated text", body: "Body" },
          ],
        },
        "en",
      ),
    ).toMatchObject({ title: "원문 공지", translation: "original" });
  });
  it("keeps any supported original language and omits empty records", () => {
    expect(
      selectNoticeContent(
        {
          ...row,
          source_locale: "de",
          website_notice_translations: [
            { locale: "de", title: "Titel", body: "Text" },
          ],
        },
        "ja",
      ),
    ).toMatchObject({ content_locale: "de", source_locale: "de" });
    expect(
      selectNoticeContent({ ...row, website_notice_translations: [] }, "en"),
    ).toBeNull();
  });
  it("reads originals in one request with no auto-cache relationships or translation jobs", async () => {
    configure();
    const fetch = vi.fn().mockResolvedValue(Response.json([row]));
    vi.stubGlobal("fetch", fetch);
    const r = response();
    await notices(
      { method: "GET", headers: {}, url: "/api/notices?lang=en" },
      r.res,
    );
    expect(r.result()).toMatchObject({
      status: 200,
      body: {
        notices: [
          { title: "원문 공지", translation: "original", content_locale: "ko" },
        ],
      },
    });
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(fetch.mock.calls[0][0]).not.toMatch(
      /auto_translations|claim_notice|reserve_translation|translate/,
    );
  });
  it("preserves cover and pin metadata when only the source-locale column is missing", async () => {
    configure();
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(new Response("", { status: 400 }))
      .mockResolvedValueOnce(
        Response.json([
          {
            ...row,
            cover_image: "https://assets.example/cover.webp",
            pinned: true,
            template: "update",
          },
        ]),
      );
    vi.stubGlobal("fetch", fetch);
    const r = response();
    await notices(
      { method: "GET", headers: {}, url: "/api/notices?lang=en" },
      r.res,
    );
    expect(r.result()).toMatchObject({
      status: 200,
      body: {
        notices: [
          {
            cover_image: "https://assets.example/cover.webp",
            pinned: true,
            template: "update",
          },
        ],
      },
    });
    expect(fetch.mock.calls[1][0]).toContain("cover_image,pinned,template");
    expect(fetch.mock.calls[1][0]).not.toContain("auto_translations");
  });
});
