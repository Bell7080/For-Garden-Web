import { reply, type Request, type Response } from "../server/http.js";
import { parseEventFeed } from "../shared/game-event-feed.js";
// 인게임 로비 이벤트의 최신판. 게임은 배포할 때마다 `/site/events.json`을 구워 두므로(For-Garden
// scripts/build-site-events.mjs), 홈페이지는 그 공개 파일을 잠깐씩 캐시해 내려 준다. 실패하면 화면이
// 함께 묶인 스냅샷(content/game-events.json)을 그대로 쓴다.
const DEFAULT_ORIGIN = "https://forgarden.vercel.app";
export function gameOrigin(): string {
  try {
    const url = new URL(process.env.GAME_SITE_ORIGIN || DEFAULT_ORIGIN);
    return url.protocol === "https:" || url.hostname === "localhost" ? url.origin : DEFAULT_ORIGIN;
  } catch {
    return DEFAULT_ORIGIN;
  }
}
export default async function handler(req: Request, res: Response) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return reply(res, 405, { error: "method_not_allowed" });
  }
  const origin = gameOrigin();
  try {
    const response = await fetch(`${origin}/site/events.json`, { signal: AbortSignal.timeout(5000) });
    if (!response.ok) throw Error(`feed ${response.status}`);
    const feed = parseEventFeed(await response.json(), origin);
    if (!feed || !feed.events.length) throw Error("feed empty");
    // 이벤트 기간은 분 단위로 바뀌지 않는다 — CDN이 5분 묶어 두고, 게임이 잠깐 내려가도 하루는 옛 판을 낸다.
    res.setHeader("Cache-Control", "public, max-age=60, s-maxage=300, stale-while-revalidate=86400");
    res.status(200).json(feed);
  } catch {
    return reply(res, 503, { error: "unavailable" });
  }
}
