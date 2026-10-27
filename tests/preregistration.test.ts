import { afterEach, describe, expect, it, vi } from "vitest";
import count from "../api/preregister-count";
import type { Response } from "../server/http";
import {
  MILESTONES,
  milestoneProgress,
  reachedMilestones,
} from "../src/preregistration";

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
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("pre-registration milestones", () => {
  it("spaces milestones evenly and interpolates inside a stretch", () => {
    const goals = MILESTONES.map((m) => m.goal);
    expect(milestoneProgress(0)).toBe(0);
    expect(milestoneProgress(goals[0])).toBeCloseTo(1 / goals.length);
    expect(milestoneProgress(goals[1])).toBeCloseTo(2 / goals.length);
    expect(milestoneProgress((goals[1] + goals[2]) / 2)).toBeCloseTo(
      2.5 / goals.length,
    );
    expect(milestoneProgress(goals.at(-1)! * 3)).toBe(1);
    expect(milestoneProgress(Number.NaN)).toBe(0);
  });
  it("counts reached milestones", () => {
    expect(reachedMilestones(999)).toBe(0);
    expect(reachedMilestones(1000)).toBe(1);
    expect(reachedMilestones(10 ** 9)).toBe(MILESTONES.length);
  });
  it("keeps goals ascending", () => {
    MILESTONES.forEach(
      (m, i) => i && expect(m.goal).toBeGreaterThan(MILESTONES[i - 1].goal),
    );
  });
});

describe("pre-registration count API", () => {
  it("reports null without a database instead of a guess", async () => {
    vi.stubEnv("SUPABASE_URL", "");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "");
    const out = response();
    await count({ method: "GET", headers: {} }, out.res);
    expect(out.result()).toMatchObject({ status: 200, body: { count: null } });
    expect(out.result().headers["Cache-Control"]).toBe("no-store");
  });
  it("adds the operator offset to the exact website total", async () => {
    vi.stubEnv("SUPABASE_URL", "https://project.supabase.co");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "test-only-server-key");
    vi.stubEnv("PREREGISTRATION_COUNT_OFFSET", "500");
    const fetch = vi.fn(
      async () =>
        new Response(null, {
          status: 206,
          headers: { "content-range": "0-0/1234" },
        }),
    );
    vi.stubGlobal("fetch", fetch);
    const out = response();
    await count({ method: "GET", headers: {} }, out.res);
    expect(out.result().body).toEqual({ count: 1734 });
    expect(String(fetch.mock.calls[0][0])).toContain(
      "website_preregistrations",
    );
    expect(out.result().headers["Cache-Control"]).toContain("s-maxage=60");
  });
  it("does not disguise a database outage", async () => {
    vi.stubEnv("SUPABASE_URL", "https://project.supabase.co");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "test-only-server-key");
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(null, { status: 500 })),
    );
    const out = response();
    await count({ method: "GET", headers: {} }, out.res);
    expect(out.result().body).toEqual({ count: null });
  });
});
