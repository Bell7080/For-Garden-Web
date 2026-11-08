// 게임이 배포할 때마다 구워 두는 공개 이벤트 피드(For-Garden `scripts/build-site-events.mjs` → `/site/events.json`)를
// 홈페이지 모양으로 거른다. 서버 함수(api/events.ts)와 화면이 같은 규칙을 쓴다 — 알 수 없는 값은 버리고,
// 경로는 그 피드를 낸 게임 주소 기준의 절대 주소로 바꾼다.
const LOCALES = ["ko", "en", "ja"];
const ID = /^[a-z0-9][a-z0-9-]{0,63}$/;
const PATH = /^\/[A-Za-z0-9._/-]{1,200}$/;
const WEEK_MS = 7 * 86_400_000;

function localized(value) {
  if (!value || typeof value !== "object") return null;
  const ko = typeof value.ko === "string" ? value.ko.trim().slice(0, 120) : "";
  if (!ko) return null;
  return Object.fromEntries(
    LOCALES.map((l) => [l, typeof value[l] === "string" && value[l].trim() ? value[l].trim().slice(0, 120) : ko]),
  );
}
function time(value) {
  return typeof value === "string" && Number.isFinite(Date.parse(value)) ? value : null;
}
function asset(value, origin) {
  if (typeof value !== "string" || value.length > 400) return null;
  // 서버가 이미 절대 주소로 바꾼 피드(화면이 다시 거를 때)는 https 주소 그대로 받는다.
  if (/^https:\/\//.test(value)) {
    try {
      const url = new URL(value);
      return url.protocol === "https:" && !url.username && !url.password && PATH.test(url.pathname) ? url.href : null;
    } catch {
      return null;
    }
  }
  if (!PATH.test(value) || value.includes("..")) return null;
  return origin ? new URL(value, origin).href : value;
}
function finite(value, limit) {
  return typeof value === "number" && Number.isFinite(value) && Math.abs(value) <= limit ? value : null;
}
function frame(value) {
  if (!value || typeof value !== "object") return null;
  const zoom = finite(value.zoom, 10);
  const offsetX = finite(value.offsetX, 10000);
  const offsetY = finite(value.offsetY, 10000);
  return zoom && zoom > 0 && offsetX !== null && offsetY !== null ? { zoom, offsetX, offsetY } : null;
}
function sd(value, origin) {
  if (!value || typeof value !== "object" || typeof value.relicId !== "string" || !ID.test(value.relicId)) return null;
  const bounds = Array.isArray(value.bounds) && value.bounds.length === 4 && value.bounds.every((n) => finite(n, 100000) !== null)
    ? value.bounds
    : null;
  const valid = bounds && bounds[2] > bounds[0] && bounds[3] > bounds[1];
  return {
    relicId: value.relicId,
    side: value.side === "left" ? "left" : "right",
    zip: asset(value.zip, origin),
    bounds: valid ? bounds : null,
    still: asset(value.still, origin),
  };
}
function event(value, origin) {
  if (!value || typeof value !== "object" || typeof value.id !== "string" || !ID.test(value.id)) return null;
  const title = localized(value.title);
  const subtitle = localized(value.subtitle) ?? (title && { ...title });
  const startsAt = time(value.startsAt);
  const endsAt = time(value.endsAt);
  const backdrop = asset(value.backdrop, origin);
  if (!title || !subtitle || !startsAt || !endsAt || !backdrop || Date.parse(endsAt) <= Date.parse(startsAt)) return null;
  return {
    id: value.id,
    title,
    subtitle,
    startsAt,
    endsAt,
    weekly: value.weekly === true,
    backdrop,
    frame: frame(value.frame),
    sd: sd(value.sd, origin),
    showcase: typeof value.showcase === "string" && ID.test(value.showcase.toLowerCase()) ? value.showcase : null,
    destination: typeof value.destination === "string" && ID.test(value.destination.toLowerCase()) ? value.destination : null,
  };
}
function rotation(value) {
  const cycle = Array.isArray(value?.cycle) ? value.cycle.filter((id) => typeof id === "string" && ID.test(id)).slice(0, 20) : [];
  const anchor = time(value?.anchor);
  const weekMs = value?.weekMs === WEEK_MS ? WEEK_MS : WEEK_MS;
  return cycle.length && anchor ? { cycle, anchor, weekMs } : null;
}
/** 피드 한 장을 거른다. `origin`을 주면 원화·SD 경로를 그 주소의 절대 URL로 바꾼다. 쓸 수 없으면 null. */
export function parseEventFeed(json, origin) {
  if (!json || typeof json !== "object" || !Array.isArray(json.events)) return null;
  const seen = new Set();
  const events = [];
  for (const raw of json.events.slice(0, 50)) {
    const e = event(raw, origin);
    if (e && !seen.has(e.id)) (seen.add(e.id), events.push(e));
  }
  return {
    version: typeof json.version === "string" ? json.version.slice(0, 32) : null,
    rotation: rotation(json.rotation),
    events,
  };
}
