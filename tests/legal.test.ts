import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import edition from "../content/legal/2026-10-17-draft-2.json";
import snapshot from "../content/probabilities/2026-10-17-draft-1.json";

describe("공개 연구 확률의 조건별 정합성", () => {
  for (const banner of snapshot.banners) {
    it(`${banner.id}: 모든 보장 상태에서 등급·개별 대상 합이 100%다`, () => {
      for (const state of banner.states) {
        expect(state.rows.reduce((n, r) => n + r.rate, 0)).toBeCloseTo(1, 12);
        for (const row of state.rows) {
          expect(row.entries.reduce((n, e) => n + e.rate, 0)).toBeCloseTo(
            row.rate,
            12,
          );
          for (const entry of row.entries)
            expect(entry.rate).toBeGreaterThanOrEqual(0);
        }
        const ssr = state.rows.find((r) => r.tier === "SSR")!;
        expect(ssr.rate).toBe(state.state === "pity" ? 1 : 0.01);
        if (state.state === "tenth")
          expect(state.rows.find((r) => r.tier === "SR")!.rate).toBe(0.99);
        if (state.state !== "normal")
          expect(state.rows.find((r) => r.tier === "GRAY")!.rate).toBe(0);
      }
    });
  }
  it("픽업 확정은 SSR 안에서만 적용되며 기본 SSR 발생률을 바꾸지 않는다", () => {
    const amber = snapshot.banners.find((b) => b.id === "amber")!;
    const base = amber.states.find(
      (s) => s.state === "normal" && !s.pickupGuaranteed,
    )!;
    const guaranteed = amber.states.find(
      (s) => s.state === "normal" && s.pickupGuaranteed,
    )!;
    const ssr = (s: typeof base) => s.rows.find((r) => r.tier === "SSR")!;
    expect(
      ssr(base).entries.find((e) => e.kind === "relic" && e.relicId === "dian")!
        .rate,
    ).toBe(0.005);
    expect(
      ssr(guaranteed).entries.find(
        (e) => e.kind === "relic" && e.relicId === "dian",
      )!.rate,
    ).toBe(0.01);
    expect(
      ssr(guaranteed)
        .entries.filter((e) => e.kind === "relic" && e.relicId !== "dian")
        .every((e) => e.rate === 0),
    ).toBe(true);
  });
  it("첫 복원 연구의 현재 SSR 풀은 네 명이며 동일 비중이다", () => {
    const row = snapshot.banners.find((b) => b.id === "welcome")!.states[0]
      .rows[0];
    expect(
      row.entries.map((e) => (e.kind === "relic" ? e.relicId : null)).sort(),
    ).toEqual(["mette", "nodonia", "rex", "spino"]);
    expect(row.entries.every((e) => e.rate === 0.0025)).toBe(true);
  });
});

describe("정책 원문과 보관본", () => {
  it("확정되지 않은 정책을 시행 중으로 표시하지 않는다", () => {
    expect(edition.status).toBe("draft");
    expect(edition.effectiveDate).toBeNull();
    expect(new Set(edition.documents.map((d) => d.path)).size).toBe(
      edition.documents.length,
    );
    expect(existsSync(edition.probabilitySnapshot)).toBe(true);
  });
  it("모든 정책은 게임이나 DB 스크립트 없이 읽을 수 있는 정적 원문과 보관본을 제공한다", () => {
    for (const d of edition.documents) {
      const paths = [
        `public${d.path}/index.html`,
        `public/legal/archive/${edition.version}/${d.id}/index.html`,
      ];
      for (const path of paths) {
        const html = readFileSync(path, "utf8");
        expect(html).toContain(d.title);
        expect(html).toContain("출시 준비 초안");
        for (const section of d.sections) expect(html).toContain(section.title);
        expect(html).not.toContain("src/main.ts");
      }
    }
  });
});
