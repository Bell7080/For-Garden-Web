import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import preregister from "../api/preregister";
import notices from "../api/notices";
import type { Request, Response } from "../server/http";

function response() {
  let status = 200;
  let body: unknown;
  const headers: Record<string, string> = {};
  const res: Response = {
    status(code) {
      status = code;
      return res;
    },
    json(value) {
      body = value;
    },
    setHeader(name, value) {
      headers[name] = value;
    },
  };
  return { res, result: () => ({ status, body, headers }) };
}
const valid = {
  email: "researcher@example.com",
  platform: "android",
  locale: "ko",
  consent: true,
};
function request(body: unknown = valid): Request {
  return {
    method: "POST",
    headers: {
      "content-type": "application/json",
      host: "garden.test",
      origin: "https://garden.test",
      "x-vercel-forwarded-for": "192.0.2.10",
    },
    body,
  };
}
beforeEach(() => {
  vi.stubEnv("SUPABASE_URL", "");
  vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "");
  vi.stubEnv("PREREGISTRATION_ENABLED", "false");
  vi.stubEnv("SITE_OPERATOR_NAME", "");
  vi.stubEnv("PRIVACY_CONTACT_EMAIL", "");
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});
function configure() {
  vi.stubEnv("SUPABASE_URL", "https://project.supabase.co");
  vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "test-only-server-key");
  vi.stubEnv("PREREGISTRATION_ENABLED", "true");
  vi.stubEnv("SITE_OPERATOR_NAME", "Garden Test");
  vi.stubEnv("PRIVACY_CONTACT_EMAIL", "privacy@example.com");
}
describe("launch notification API", () => {
  it("does not claim success before the operator opens registration", async () => {
    const r = response();
    await preregister(request(), r.res);
    expect(r.result().status).toBe(503);
    expect(r.result().body).not.toHaveProperty("ok");
  });
  it.each([
    { ...valid, consent: false },
    { ...valid, email: "invalid" },
    { ...valid, platform: "windows" },
    { ...valid, locale: "xx" },
    { ...valid, website: "bot.example" },
  ])(
    "rejects invalid signup without calling the database: %j",
    async (body) => {
      const fetch = vi.fn();
      vi.stubGlobal("fetch", fetch);
      const r = response();
      await preregister(request(body), r.res);
      expect(r.result().status).toBe(400);
      expect(fetch).not.toHaveBeenCalled();
    },
  );
  it("rejects another origin", async () => {
    const req = request();
    req.headers.origin = "https://other.example";
    const r = response();
    await preregister(req, r.res);
    expect(r.result().status).toBe(403);
  });
  it("sends normalized data and a hashed IP only after configuration, and returns success after storage confirms", async () => {
    configure();
    const fetch = vi
      .fn()
      .mockResolvedValue(
        new globalThis.Response(JSON.stringify("accepted"), { status: 200 }),
      );
    vi.stubGlobal("fetch", fetch);
    const r = response();
    await preregister(
      request({ ...valid, email: "Researcher@Example.com" }),
      r.res,
    );
    expect(r.result().status).toBe(200);
    expect(r.result().body).toEqual({ ok: true });
    const [url, options] = fetch.mock.calls[0];
    expect(url).toMatch(/rpc\/register_website_interest$/);
    const sent = JSON.parse(options.body);
    expect(sent.p_email).toBe("researcher@example.com");
    expect(sent.p_fingerprint).toMatch(/^[a-f0-9]{64}$/);
    expect(options.body).not.toContain("192.0.2.10");
  });
  it("preserves rate limit outcome", async () => {
    configure();
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          new globalThis.Response(JSON.stringify("rate_limited")),
        ),
    );
    const r = response();
    await preregister(request(), r.res);
    expect(r.result().status).toBe(429);
  });
  it("never reports acceptance on a failed database write", async () => {
    configure();
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          new globalThis.Response("unavailable", { status: 503 }),
        ),
    );
    const r = response();
    await preregister(request(), r.res);
    expect(r.result().status).toBe(503);
    expect(r.result().body).not.toHaveProperty("ok");
  });
});
describe("announcements API", () => {
  it("provides localized editorial content before DB configuration", async () => {
    const r = response();
    await notices(
      { method: "GET", headers: {}, url: "/api/notices?lang=ja" },
      r.res,
    );
    expect(r.result().status).toBe(200);
    const body = r.result().body as { notices: { title: string }[] };
    expect(body.notices).toHaveLength(3);
    expect(body.notices[0].title).toContain("公式");
  });
  it("restricts DB selection to published, due, translated content", async () => {
    configure();
    const fetch = vi.fn().mockResolvedValue(new globalThis.Response("[]"));
    vi.stubGlobal("fetch", fetch);
    const r = response();
    await notices(
      { method: "GET", headers: {}, url: "/api/notices?lang=en" },
      r.res,
    );
    expect(fetch.mock.calls[0][0]).toContain("status=eq.published");
    expect(fetch.mock.calls[0][0]).toContain("published_at=lte.");
    expect(fetch.mock.calls[0][0]).toContain(
      "website_notice_translations.locale=eq.en",
    );
    expect(r.result().body).toEqual({ notices: [] });
  });
  it("does not disguise a DB outage as editorial news", async () => {
    configure();
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(Error("offline")));
    const r = response();
    await notices({ method: "GET", headers: {}, url: "/api/notices" }, r.res);
    expect(r.result().status).toBe(503);
    expect(r.result().body).not.toHaveProperty("notices");
  });
});
