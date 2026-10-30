import { afterEach, describe, expect, it, vi } from "vitest";
import handler from "../api/unsubscribe";
import { unsubscribeLink, unsubscribeToken, verifyUnsubscribeToken } from "../server/unsubscribe";
import type { Request, Response } from "../server/http";

const SECRET = "test-only-unsubscribe-secret-0123456789";
function run(body: unknown) {
  let status = 200; let out: unknown;
  const res: Response = { status(c) { status = c; return res; }, json(v) { out = v; }, setHeader() {} };
  const req: Request = { method: "POST", headers: { "content-type": "application/json", host: "garden.test", origin: "https://garden.test" }, body };
  return handler(req, res).then(() => ({ status, body: out }));
}
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });

describe("출시 알림 수신거부", () => {
  it("서명은 이메일을 소문자로 맞춰 계산하고 다른 이메일·비밀값에는 통하지 않는다", () => {
    const t = unsubscribeToken("A@Example.com", SECRET);
    expect(verifyUnsubscribeToken("a@example.com", t, SECRET)).toBe(true);
    expect(verifyUnsubscribeToken("b@example.com", t, SECRET)).toBe(false);
    expect(verifyUnsubscribeToken("a@example.com", t, "other-secret")).toBe(false);
    expect(verifyUnsubscribeToken("a@example.com", "zz", SECRET)).toBe(false);
  });
  it("링크는 조각(#)에 이메일과 서명을 싣는다", () => {
    const link = new URL(unsubscribeLink("https://garden.test", "a@example.com", SECRET));
    expect(link.pathname).toBe("/unsubscribe");
    expect(link.search).toBe("");
    expect(new URLSearchParams(link.hash.slice(1)).get("t")).toBe(unsubscribeToken("a@example.com", SECRET));
  });
  it("비밀값이 없으면 503이다", async () => {
    vi.stubEnv("UNSUBSCRIBE_SECRET", "");
    expect((await run({ email: "a@example.com", token: "x" })).status).toBe(503);
  });
  it("잘못된 서명은 400이고 DB를 건드리지 않는다", async () => {
    vi.stubEnv("UNSUBSCRIBE_SECRET", SECRET);
    const fetchMock = vi.fn(); vi.stubGlobal("fetch", fetchMock);
    expect((await run({ email: "a@example.com", token: "0".repeat(64) })).status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it("올바른 서명이면 그 이메일의 신청 행만 지운다", async () => {
    vi.stubEnv("UNSUBSCRIBE_SECRET", SECRET);
    vi.stubEnv("SUPABASE_URL", "https://project.supabase.co");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "server-key");
    const fetchMock = vi.fn(async () => new Response(null, { status: 204 })); vi.stubGlobal("fetch", fetchMock);
    const r = await run({ email: "A@example.com", token: unsubscribeToken("a@example.com", SECRET) });
    expect(r).toEqual({ status: 200, body: { ok: true } });
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://project.supabase.co/rest/v1/website_preregistrations?email=eq.a%40example.com");
    expect(init.method).toBe("DELETE");
  });
});
