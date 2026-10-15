import { afterEach, describe, it, expect, vi } from "vitest";
import notices from "../api/notices";
import translate from "../api/notice-translation";
import { sourceHash } from "../shared/notice-translation.js";
import type { Response as ApiResponse } from "../server/http";
const source = {
  locale: "ko",
  title: "새 공지",
  summary: "요약",
  body: "내용",
};
const row = {
  id: "00000000-0000-0000-0000-000000000001",
  slug: "new-notice",
  category: "notice",
  status: "published",
  published_at: "2026-10-16T00:00:00Z",
  source_locale: "ko",
  website_notice_translations: [source],
  website_notice_auto_translations: [],
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
function configure() {
  process.env.SUPABASE_URL = "https://project.supabase.co";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "server-only";
}
afterEach(() => {
  vi.unstubAllGlobals();
  delete process.env.SUPABASE_URL;
  delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  delete process.env.TRANSLATION_API_URL;
});
describe("dynamic announcement languages", () => {
  it("preserves existing cover and pin features before the translation migration is applied", async () => {
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
    expect(fetch.mock.calls[1][0]).not.toContain(
      "website_notice_auto_translations",
    );
  });
  it("keeps untranslated notices visible and labels the source language", async () => {
    configure();
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json([row])));
    const r = response();
    await notices(
      { method: "GET", headers: {}, url: "/api/notices?lang=th" },
      r.res,
    );
    expect(r.result().body.notices[0]).toMatchObject({
      title: "새 공지",
      translation: "original",
      content_locale: "ko",
    });
  });
  it("uses reviewed manual text before automatic caches", async () => {
    configure();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        Response.json([
          {
            ...row,
            website_notice_translations: [
              source,
              { locale: "de", title: "Redaktion", body: "Text", summary: "" },
            ],
            website_notice_auto_translations: [
              {
                locale: "de",
                source_hash: sourceHash(source),
                title: "Maschine",
                body: "Text",
              },
            ],
          },
        ]),
      ),
    );
    const r = response();
    await notices(
      { method: "GET", headers: {}, url: "/api/notices?lang=de" },
      r.res,
    );
    expect(r.result().body.notices[0]).toMatchObject({
      title: "Redaktion",
      translation: "manual",
    });
  });
  it("rejects stale generated content after a source edit", async () => {
    configure();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        Response.json([
          {
            ...row,
            website_notice_translations: [{ ...source, body: "새 원문" }],
            website_notice_auto_translations: [
              {
                locale: "es",
                source_hash: sourceHash(source),
                title: "Obsoleto",
                body: "Text",
              },
            ],
          },
        ]),
      ),
    );
    const r = response();
    await notices(
      { method: "GET", headers: {}, url: "/api/notices?lang=es" },
      r.res,
    );
    expect(r.result().body.notices[0].translation).toBe("original");
  });
  it("only translates an existing published and due notice, never arbitrary visitor text", async () => {
    configure();
    const fetch = vi.fn().mockResolvedValue(Response.json([]));
    vi.stubGlobal("fetch", fetch);
    const r = response();
    await translate(
      {
        method: "GET",
        headers: {},
        url: "/api/notice-translation?slug=new-notice&lang=vi&text=anything",
      },
      r.res,
    );
    expect(r.result().status).toBe(404);
    expect(fetch.mock.calls[0][0]).toContain("status=eq.published");
    expect(fetch.mock.calls[0][0]).toContain("published_at=lte.");
  });
  it("rejects malformed input before contacting storage", async () => {
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);
    const r = response();
    await translate(
      {
        method: "GET",
        headers: {},
        url: "/api/notice-translation?slug=x%26status=eq.draft&lang=es",
      },
      r.res,
    );
    expect(r.result().status).toBe(400);
    expect(fetch).not.toHaveBeenCalled();
  });
  it("serves a valid cached translation without an engine or paid API key", async () => {
    configure();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        Response.json([
          {
            ...row,
            website_notice_auto_translations: [
              {
                locale: "ru",
                source_hash: sourceHash(source),
                title: "Объявление",
                summary: "",
                body: "Текст",
              },
            ],
          },
        ]),
      ),
    );
    const r = response();
    await translate(
      {
        method: "GET",
        headers: {},
        url: "/api/notice-translation?slug=new-notice&lang=ru",
      },
      r.res,
    );
    expect(r.result()).toMatchObject({
      status: 200,
      body: { translation: { title: "Объявление", translation: "automatic" } },
    });
  });
  it("reports unconfigured automatic translation honestly", async () => {
    configure();
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json([row])));
    const r = response();
    await translate(
      {
        method: "GET",
        headers: {},
        url: "/api/notice-translation?slug=new-notice&lang=pt-BR",
      },
      r.res,
    );
    expect(r.result()).toMatchObject({
      status: 503,
      body: { error: "translation_not_configured" },
    });
  });
});
