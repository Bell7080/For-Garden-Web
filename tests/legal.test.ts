import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import edition from "../content/legal/2026-10-27-draft-4.json";
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
        for (const section of d.sections) {
          expect(html).toContain(section.title);
          for (const head of section.table?.heads ?? []) expect(html).toContain(head);
        }
        expect(html).not.toContain("src/main.ts");
      }
    }
  });
});

describe("법적 문서 4판의 구성", () => {
  const ids = edition.documents.map((d) => d.id);
  it("실제 게임 홈페이지가 갖추는 필수 문서를 모두 갖는다", () => {
    for (const id of ["terms", "paid", "refunds", "privacy", "withdrawal", "operation", "youth", "coupon", "business", "cookies", "licenses"])
      expect(ids).toContain(id);
  });
  it("모든 문서는 분류에 속하고 분류는 안내 센터에 선다", () => {
    const groups = new Set(edition.groups.map((g) => g.id));
    for (const d of edition.documents) expect(groups.has(d.group)).toBe(true);
    const center = readFileSync("public/legal/index.html", "utf8");
    for (const g of edition.groups) expect(center).toContain(g.title);
  });
  it("확정되지 않은 값은 [대괄호] 자리표시자로 남고 강조 표시된다", () => {
    const html = readFileSync("public/terms/index.html", "utf8");
    expect(html).toContain('<mark class="todo">[운영자 상호]</mark>');
    expect(html).toContain("법률 전문가의 검토");
  });
  it("개인정보 처리방침은 법정 기재 사항의 절을 모두 갖는다", () => {
    const privacy = edition.documents.find((d) => d.id === "privacy")!;
    const titles = privacy.sections.map((s) => s.title).join(" ");
    for (const word of ["목적", "보유", "제3자", "위탁", "국외", "파기", "권리", "14세", "자동으로 수집", "안전성", "보호책임자", "구제", "변경"])
      expect(titles).toContain(word);
  });
  it("게임 밖에서도 계정 삭제를 요청하는 경로를 안내한다", () => {
    const withdrawal = edition.documents.find((d) => d.id === "withdrawal")!;
    expect(withdrawal.sections.map((s) => s.title).join(" ")).toContain("게임 밖에서");
  });
});

describe("출시 점검 20항목 보강", () => {
  it("쿠키 정책은 웹 전용이며 저장하는 값을 표로 밝히고 앱에는 적용되지 않음을 말한다", () => {
    const doc = edition.documents.find((d) => d.id === "cookies")!;
    expect(doc.path).toBe("/legal/cookies");
    const text = JSON.stringify(doc);
    for (const word of ["fg-language", "fg-theme", "fg-storage-notice", "앱에는 적용되지 않습니다", "사용하지 않는 것"]) expect(text).toContain(word);
  });
  it("저작물 고지는 글꼴·음원·이미지·외부 구성요소를 모두 다룬다", () => {
    const doc = edition.documents.find((d) => d.id === "licenses")!;
    const titles = doc.sections.map((s) => s.title).join(" ");
    for (const word of ["글꼴", "음원", "이미지", "외부 구성요소"]) expect(titles).toContain(word);
  });
  it("모든 정적 페이지가 저장소 안내 띠를 불러오고 띠는 키보드로 닫을 수 있는 버튼을 갖는다", () => {
    for (const file of ["index.html", "public/support.html", "public/coupon.html", "public/legal/cookies/index.html"])
      expect(readFileSync(file, "utf8")).toContain("/ui/storage-notice.js");
    const script = readFileSync("public/ui/storage-notice.js", "utf8");
    expect(script).toContain('createElement("button")');
    expect(script).toContain("/legal/cookies");
  });
  it("문의 종류에 개인정보·삭제가 있고 탈퇴 안내가 같은 이름으로 가리킨다", () => {
    expect(readFileSync("public/support.html", "utf8")).toContain('value="privacy"');
    const withdrawal = JSON.stringify(edition.documents.find((d) => d.id === "withdrawal"));
    expect(withdrawal).toContain("개인정보·삭제");
  });
});
