import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import support from "../api/support";
import preregister from "../api/preregister";
import notices from "../api/notices";
import coupon from "../api/coupon";
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
  it("restricts selection to published and due notices without dropping untranslated originals", async () => {
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
    expect(fetch.mock.calls[0][0]).not.toContain("!inner");
    expect(fetch.mock.calls[0][0]).not.toContain(
      "website_notice_translations.locale=eq.",
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

describe("support intake API", () => {
  const ticket = {
    email: "player@example.com",
    category: "bug",
    subject: "화면이 멈춰요",
    body: "전투 중 멈춥니다.",
    consent: true,
  };
  it("rejects non-POST, bad origin and invalid input", async () => {
    let r = response();
    await support({ ...request(ticket), method: "GET" }, r.res);
    expect(r.result().status).toBe(405);
    r = response();
    const bad = request(ticket);
    bad.headers.origin = "https://evil.test";
    await support(bad, r.res);
    expect(r.result().status).toBe(403);
    r = response();
    await support(request({ ...ticket, category: "x" }), r.res);
    expect(r.result().status).toBe(400);
    r = response();
    await support(request({ ...ticket, consent: false }), r.res);
    expect(r.result().status).toBe(400);
  });
  it("silently drops honeypot hits without touching the database", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const r = response();
    await support(request({ ...ticket, website: "http://spam" }), r.res);
    expect(r.result().status).toBe(200);
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it("sends a hashed IP (never the raw one) and maps results", async () => {
    configure();
    const fetchMock = vi.fn(async () =>
      new Response(JSON.stringify({ ok: true, ticket_no: 7 })),
    );
    vi.stubGlobal("fetch", fetchMock);
    const r = response();
    await support(request(ticket), r.res);
    expect(r.result().body).toEqual({ ok: true, ticket_no: 7 });
    const sent = JSON.parse((fetchMock.mock.calls[0] as any)[1].body);
    expect(sent.p_ip_hash).toMatch(/^[0-9a-f]{64}$/);
    expect(JSON.stringify(sent)).not.toContain("192.0.2.10");
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ ok: false, error: "rate_limited" }))));
    const limited = response();
    await support(request(ticket), limited.res);
    expect(limited.result().status).toBe(429);
  });
  it("reports unavailable when the database is not configured", async () => {
    const r = response();
    await support(request(ticket), r.res);
    expect(r.result().status).toBe(503);
  });
});

describe("coupon API", () => {
  const ticket = "ab".repeat(24);
  function couponRequest(body: unknown): Request {
    return { ...request(body), body: JSON.stringify(body) };
  }
  function db() {
    vi.stubEnv("SUPABASE_URL", "https://project.supabase.co");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "test-only-server-key");
  }
  it("rejects requests without a well-formed game ticket", async () => {
    db();
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    for (const body of [
      { action: "info", ticket: "short" },
      { action: "info", uid: "123456" },
      { action: "delete", ticket },
    ]) {
      const out = response();
      await coupon(couponRequest(body), out.res);
      expect(out.result().status).toBe(400);
    }
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it("reports unavailable when the database is not configured", async () => {
    const out = response();
    await coupon(couponRequest({ action: "info", ticket }), out.res);
    expect(out.result().status).toBe(503);
  });
  it("shows the linked account and redeems with only the code", async () => {
    db();
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        Response.json({ ok: true, uid: "1234567", nickname: "연구원", expires_at: "2026-10-27T00:15:00Z" }),
      )
      .mockResolvedValueOnce(Response.json({ ok: true, name: "오픈 기념", rewards: [] }));
    vi.stubGlobal("fetch", fetchMock);
    const info = response();
    await coupon(couponRequest({ action: "info", ticket }), info.res);
    expect(info.result()).toMatchObject({ status: 200, body: { ok: true, uid: "1234567", nickname: "연구원" } });
    const redeem = response();
    await coupon(couponRequest({ action: "redeem", ticket, code: "open-2026-gift" }), redeem.res);
    expect(redeem.result()).toMatchObject({ status: 200, body: { ok: true, name: "오픈 기념" } });
    expect(fetchMock.mock.calls[1][0]).toContain("rpc/server_redeem_coupon_ticket");
    expect(JSON.parse(fetchMock.mock.calls[1][1].body)).toEqual({ p_ticket: ticket, p_code: "OPEN2026GIFT" });
  });
  it("passes known coupon errors through and rate limits with 429", async () => {
    db();
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce(Response.json({ ok: false, error: "already_redeemed" }))
        .mockResolvedValueOnce(Response.json({ ok: false, error: "rate_limited" }))
        .mockResolvedValueOnce(Response.json({ ok: false, error: "something_internal" })),
    );
    const a = response();
    await coupon(couponRequest({ action: "redeem", ticket, code: "ABCD1234" }), a.res);
    expect(a.result()).toMatchObject({ status: 400, body: { error: "already_redeemed" } });
    const b = response();
    await coupon(couponRequest({ action: "redeem", ticket, code: "ABCD1234" }), b.res);
    expect(b.result().status).toBe(429);
    const c = response();
    await coupon(couponRequest({ action: "redeem", ticket, code: "ABCD1234" }), c.res);
    expect(c.result()).toMatchObject({ status: 400, body: { error: "coupon_unavailable" } });
  });
});
