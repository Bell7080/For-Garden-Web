import { readFile, writeFile, mkdir, readdir } from "node:fs/promises";
import { resolve } from "node:path";
export const escapeHtml = (s) =>
  String(s).replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
const e = escapeHtml;
const editions = (await readdir("content/legal"))
  .filter((p) => p.endsWith(".json"))
  .sort();
const versions = await Promise.all(
  editions.map((p) => readFile("content/legal/" + p, "utf8").then(JSON.parse)),
);
const current = versions.at(-1);

const table = (heads, rows) =>
  `<div class="table-scroll" tabindex="0" role="region" aria-label="${e(heads.join(" / "))}"><table><thead><tr>${heads.map((h) => `<th scope="col">${e(h)}</th>`).join("")}</tr></thead><tbody>${rows.map((row) => `<tr>${row.map((c) => `<td>${e(c)}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`;
const nav = () =>
  `<nav class="sections" aria-label="안내 문서"><a href="/legal">안내 센터</a><a href="/probabilities">확률 정보</a>${current.documents.map((d) => `<a href="${d.path}">${e(d.title)}</a>`).join("")}<a href="/support.html">비공개 문의</a></nav>`;
const shell = (title, description, body, archive = false) =>
  `<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="description" content="${e(description)}"><meta name="robots" content="${archive || current.status !== "effective" ? "noindex,follow" : "index,follow"}"><title>${e(title)} · For Garden</title><script src="/legal/theme.js"></script><link rel="stylesheet" href="/ui/controls.css"><link rel="stylesheet" href="/legal/center.css"><script defer src="/legal/center.js"></script></head><body><a class="skip" href="#document">본문으로</a><header><a class="brand" href="/" aria-label="For Garden 홈"><img src="/assets/for-garden-logo.webp" alt="For Garden" width="1358" height="392"></a><a href="/legal">POLICY & DISCLOSURE</a><button id="theme" type="button" aria-label="화면 테마 변경">테마: 장치 설정</button></header><div class="layout"><aside>${nav()}</aside><main id="document"><p class="eyebrow">FOR GARDEN / RESEARCH RECORDS</p><h1>${e(title)}</h1><p class="lead">${e(description)}</p>${body}</main></div><footer><a href="/">홈페이지</a><a href="/legal">정책·운영 안내</a><a href="/probabilities">확률 정보</a><a href="/support.html">문의하기</a><p>© For Garden · 이 안내의 원문은 한국어입니다. 브라우저 번역을 이용할 수 있습니다.</p></footer></body></html>`;
async function page(path, html) {
  const file = resolve("public", path.replace(/^\//, ""), "index.html");
  await mkdir(resolve(file, ".."), { recursive: true });
  await writeFile(file, html);
}
for (const edition of versions) {
  for (const d of edition.documents) {
    const archived = `/legal/archive/${edition.version}/${d.id}`;
    const isDraft = edition.status !== "effective";
    const body = `<div class="notice" role="note"><strong>${isDraft ? "출시 준비 초안 · 시행 전" : "시행 중인 문서"}</strong><p>${isDraft ? "확정된 방침이 아닙니다. 운영자·연락처·보유기간과 실제 기능을 확정하고 검토한 뒤 시행해야 합니다." : "시행일과 변경 이력을 확인해 주세요."}</p></div><div class="meta"><span>문서 버전 ${e(edition.version)}</span><span>시행일 ${e(edition.effectiveDate ?? "미정")}</span></div><nav class="toc" aria-label="본문 목차">${d.sections.map((s, i) => `<a href="#section-${i + 1}">${i + 1}. ${e(s.title)}</a>`).join("")}</nav>${d.sections.map((s, i) => `<section id="section-${i + 1}"><p class="section-number">RECORD ${String(i + 1).padStart(2, "0")}</p><h2>${e(s.title)}</h2>${s.paragraphs.map((p) => `<p>${e(p)}</p>`).join("")}</section>`).join("")}<section><h2>문서 이력</h2>${(edition === current ? versions.filter((v) => v.documents.some((doc) => doc.id === d.id)) : [edition]).map((v) => `<p><a href="/legal/archive/${v.version}/${d.id}">${e(v.version)} 원문 보관본</a></p>`).join("")}<p><a href="${d.path}">현재 문서 확인</a> · <a href="/legal">전체 정책 목록</a></p></section>`;
    await page(
      archived,
      shell(d.title + " · 원문 보관본", d.summary, body, true),
    );
    if (edition === current)
      await page(d.path, shell(d.title, d.summary, body));
  }
}
await page(
  "/legal",
  shell(
    "정책·운영 안내",
    "연구를 시작하기 전에, 알아두어야 할 기록을 모았습니다.",
    `<div class="notice"><strong>출시 준비 중인 안내 센터</strong><p>문서 내용은 초안이며 시행일은 미정입니다. 확정되지 않은 운영 정보를 임의로 기재하지 않았습니다. 문서 게시와 실제 기능 구현은 별개입니다.</p></div><a class="feature" href="/probabilities"><span class="eyebrow">PROBABILITY ARCHIVE</span><h2>확률을 투명하게.</h2><p>연구별 개별 렐릭·재화 확률과 천장·픽업 조건을 확인하세요.</p><span>확률 정보 열기 →</span></a><div class="cards">${current.documents.map((d, i) => `<a class="card" href="${d.path}"><span class="section-number">DOCUMENT ${String(i + 1).padStart(2, "0")}</span><h2>${e(d.title)}</h2><p>${e(d.summary)}</p><span class="tag">시행 전 초안</span></a>`).join("")}</div><section><h2>문의와 권리 행사</h2><p>개인정보와 거래 정보는 공개 게시판에 올리지 마세요. <a href="/support.html">비공개 문의</a>에서 접수 결과를 확인할 수 있습니다. 전담 운영자·연락처와 처리 기준은 출시 전에 확정할 예정입니다.</p></section>`,
  ),
);
const pct = (n) =>
  (n * 100).toLocaleString("en-US", { maximumFractionDigits: 6 }) + "%";
const modes = {
  normal: "일반 1회",
  tenth: "10회 연구의 마지막 슬롯",
  pity: "SSR 천장 발동 슬롯",
};
for (const edition of versions) {
  const snapshot = JSON.parse(
    await readFile(edition.probabilitySnapshot, "utf8"),
  );
  const bannerHtml = snapshot.banners
    .map(
      (b) =>
        `<section id="banner-${e(b.id)}"><p class="section-number">RESEARCH / ${e(b.id.toUpperCase())}</p><h2>${e(b.name)}</h2><p>${b.currency === "amber" ? "호박석" : "화석"} · ${b.tenOnly ? "10회 연구만 가능" : `1회 ${b.costOne}개`} · 10회 ${b.costTen}개${b.pullLimit ? ` · 계정당 총 ${b.pullLimit}회` : ""}</p><p>SSR 미획득 누적 ${b.highestRarityGuarantee}번째에 SSR 보장. SSR 획득 시 누적 횟수는 0으로 돌아갑니다. 누적 그룹: ${e(b.pityGroupId)}.</p>${b.states
          .map(
            (s, i) =>
              `<details ${i === 0 ? "open" : ""}><summary>${modes[s.state]}${s.pickupGuaranteed ? " · 다음 SSR 픽업 확정 상태" : ""}</summary><p>아래 수치는 이 조건에서 해당 슬롯을 1회 진행할 때의 확률입니다. 10회 전체의 획득 확률이 아닙니다.</p>${table(
                ["등급", "해당 슬롯의 확률"],
                s.rows.map((r) => [
                  r.tier === "GRAY" ? "잡화" : r.tier,
                  pct(r.rate),
                ]),
              )}${table(
                ["등급", "획득 대상", "개별 확률"],
                s.rows.flatMap((r) =>
                  r.entries.map((entry) => [
                    r.tier === "GRAY" ? "잡화" : r.tier,
                    entry.kind === "relic"
                      ? `${snapshot.names[entry.relicId] ?? entry.relicId}${entry.pickup ? " (픽업)" : ""}`
                      : `${entry.reward === "gold" ? "골드" : "치즈케이크"} ${entry.min.toLocaleString("ko")}~${entry.max.toLocaleString("ko")}`,
                    pct(entry.rate),
                  ]),
                ),
              )}${s.rows
                .filter((r) => r.tier === "GRAY")
                .flatMap((r) => r.entries)
                .map(
                  (x) =>
                    `<p class="small">${x.reward === "gold" ? "골드" : "치즈케이크"}는 범위 양 끝을 포함한 정수 ${x.max - x.min + 1}가지 수량 중 균등 선택합니다. 특정 수량 하나의 절대 확률: ${pct(x.rate / (x.max - x.min + 1))}.</p>`,
                )
                .join("")}</details>`,
          )
          .join("")}</section>`,
    )
    .join("");
  const probabilityBody = `<div class="notice"><strong>출시 전 개발 빌드 기준</strong><p>게임 v${e(snapshot.version)} 소스에서 추출한 연구 확률입니다. 실제 상용 서버의 운영 확률임을 보증하는 안내가 아닙니다. 출시·배너 변경 시 동일 빌드와 다시 대조해야 합니다.</p></div><nav class="toc" aria-label="연구 목록">${snapshot.banners.map((b) => `<a href="#banner-${b.id}">${e(b.name)}</a>`).join("")}<a href="#rules">보장 규칙·적용 범위</a><a href="#sources">버전·원본 데이터</a></nav><div class="rates">${["SSR", "SR", "R", "GRAY"].map((tier) => `<div><strong>${pct(snapshot.banners[0].slotRates[tier])}</strong><span>${tier === "GRAY" ? "잡화" : tier}</span></div>`).join("")}</div><p class="small">위 요약은 ${e(snapshot.banners[0].name)} 일반 슬롯의 기본 확률입니다. 아래 조건별 표에서 보장 상태에 따른 차이를 확인하세요.</p>${bannerHtml}<section id="rules"><h2>보장 규칙과 읽는 방법</h2><ul><li>10회 연구의 마지막 슬롯은 일반 판정에서 R·잡화가 나오면 SR로 바뀝니다. 앞선 9회에 SR·SSR이 나왔어도 적용됩니다. 천장과 겹치면 SSR 천장이 우선합니다.</li><li>호박석 연구는 SSR 당첨 시 픽업 디안의 비중이 50%입니다. 일반 상태에서 디안의 1회 절대 확률은 0.5%입니다. 비픽업 SSR을 획득하면 다음 SSR은 픽업 확정이며, SSR이 나오는 기본 확률 자체가 100%가 되는 것은 아닙니다.</li><li>픽업 SSR 획득 시 픽업 확정 상태가 해제됩니다. 같은 누적 그룹을 사용하는 교체 배너 사이에서 천장과 픽업 보장이 이어집니다. 다른 그룹으로 합쳐지지 않습니다.</li><li>연구권이 부족할 때 부족한 1개당 젬 300개로 대체됩니다. 실제 소비 내역은 게임의 실행 전 확인 화면에서 확인하세요.</li><li>표는 백분율 소수 여섯째 자리까지 반올림합니다. 반올림에 따라 표시 합계가 100%와 미세하게 다를 수 있습니다. 전체 대상과 수량별 계산 근거는 원본 데이터에서 확인할 수 있습니다.</li></ul><h3>다른 확률 요소의 공개 범위</h3><p>현재 이 센터에서 검증·공개한 범위는 렐릭 연구입니다. 룬 생성·강화·특성 재설정, 지층 보상, 상점·보상 로테이션 등은 별도 조사·표준화가 필요합니다. 유료 재화와 연결된 모든 확률 요소를 목록화하고 조건부·확정 보상까지 검증한 후 상용 서비스를 시작해야 합니다. 이 표를 전체 확률형 시스템의 공개 완료로 해석하지 마세요.</p></section><section id="sources"><h2>버전과 원본 데이터</h2><p>기준 게임 버전: v${e(snapshot.version)}</p><p class="code">소스 커밋: ${e(snapshot.commit)}</p><p><a href="/legal/archive/${edition.version}/probabilities.json" download>조건별 전체 확률 JSON 내려받기</a></p><p><a href="/legal/archive/${edition.version}/probabilities">이 버전의 확률표 보관본</a></p><p>게임의 배너 데이터와 실제 개별 확률 계산 함수에서 생성합니다. 파일별 SHA-256은 JSON의 sourceHashes에 보관합니다.</p></section>`;
  if (edition === current)
    await page(
      "/probabilities",
      shell(
        "확률 정보",
        "연구 대상과 보장 조건을, 한눈에 확인하세요.",
        probabilityBody,
      ),
    );
  await page(
    `/legal/archive/${edition.version}/probabilities`,
    shell(
      "확률 정보 · 원문 보관본",
      "연구 확률의 출시 전 기록",
      probabilityBody,
      true,
    ),
  );
  await writeFile(
    `public/legal/archive/${edition.version}/probabilities.json`,
    JSON.stringify(snapshot, null, 2) + "\n",
  );
  if (edition === current)
    await writeFile(
      "public/legal/probabilities.json",
      JSON.stringify(snapshot, null, 2) + "\n",
    );
}
console.log(
  `Generated ${versions.length} policy edition(s), ${current.documents.length} documents and research probability tables.`,
);
