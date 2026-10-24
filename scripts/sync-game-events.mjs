// 인게임 로비 이벤트(For-Garden src/data/lobbyEvents.ts)를 홈페이지용 스냅샷으로 옮긴다.
// 사용: npm run sync:events [게임 저장소 경로(기본 ../For-Garden)] [--admin 어드민 저장소 경로]
// 결과: content/game-events.json, public/assets/events/<id>.webp, (선택) 어드민 shared/game-events.js
import { build } from "esbuild";
import { access, copyFile, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { tmpdir } from "node:os";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { pathToFileURL } from "node:url";
const execute = promisify(execFile);
const args = process.argv.slice(2);
// --check: 파일을 쓰지 않고 스냅샷이 게임과 같은지만 본다. 게임 저장소가 없으면 건너뛴다(배포 환경).
const check = args.includes("--check") ? (args.splice(args.indexOf("--check"), 1), true) : false;
const adminAt = args.indexOf("--admin");
const adminRoot = adminAt >= 0 ? resolve(args.splice(adminAt, 2)[1]) : undefined;
const game = resolve(args[0] || "../For-Garden");
const locales = ["ko", "en", "ja"];
try { await access(resolve(game, "src/data/lobbyEvents.ts")); } catch {
  if (check) { console.log("게임 저장소가 없어 이벤트 스냅샷 점검을 건너뜁니다."); process.exit(0); }
  throw new Error(`게임 저장소를 찾지 못했습니다: ${game}`);
}
const temp = await mkdtemp(resolve(tmpdir(), "fg-events-"));
try {
  const at = (p) => JSON.stringify(resolve(game, p));
  const entry = `import {LOBBY_EVENTS} from ${at("src/data/lobbyEvents.ts")};
import {BACKGROUND_ASSETS} from ${at("src/ui/backgroundAssets.ts")};
import {LOBBY_KO} from ${at("src/i18n/ko/lobby.ts")};
import {LOBBY_EN} from ${at("src/i18n/en/lobby.ts")};
import {LOBBY_JA} from ${at("src/i18n/ja/lobby.ts")};
import * as METADATA from ${at("src/puppets/assetMetadata.ts")};
export default {metadata: METADATA, events: LOBBY_EVENTS, assets: BACKGROUND_ASSETS, text: {ko: LOBBY_KO, en: LOBBY_EN, ja: LOBBY_JA}};`;
  await build({
    stdin: { contents: entry, resolveDir: game, loader: "ts" },
    bundle: true,
    platform: "node",
    format: "esm",
    outfile: resolve(temp, "snapshot.mjs"),
    logLevel: "error",
  });
  const data = (await import(pathToFileURL(resolve(temp, "snapshot.mjs")).href)).default;
  const files = new Map(data.assets);
  if (!check) await mkdir("public/assets/events", { recursive: true });
  const events = [];
  // 이벤트 카드의 SD: 게임 assets.ts의 아군 SD 표(relicId → X_SD_ASSET)와 그 ZIP·실측 경계를 따라간다.
  const assetsSource = await readFile(resolve(game, "src/puppets/assets.ts"), "utf8");
  const bounds = JSON.parse(await readFile("src/puppet-bounds.json", "utf8"));
  const stills = [];
  async function copySd(relicId) {
    const table = assetsSource.match(/const ALLY_SD_ASSETS[^=]*=\s*\{([\s\S]*?)\n\};/)?.[1] ?? "";
    const name = table.match(new RegExp(`^\\s*${relicId}:\\s*(\\w+),`, "m"))?.[1];
    const decl = name && assetsSource.match(new RegExp(`const ${name}\\b[^=]*=\\s*\\{([\\s\\S]*?)\\};`));
    const zip = decl?.[1].match(/puppets\/([\w.-]+\.zip)/)?.[1];
    const meta = decl?.[1].match(/\.\.\.(\w+)/)?.[1];
    const m = meta && data.metadata[meta];
    if (!zip || !m) throw new Error(`${relicId}: 게임에서 SD 에셋을 찾지 못했습니다.`);
    if (!check) await copyFile(resolve(game, "public/puppets", zip), `public/assets/puppets/${relicId}-sd.zip`);
    bounds[`${relicId}-sd`] = { width: m.imageWidth, height: m.imageHeight, bounds: [m.content.left, m.content.top, m.content.right, m.content.bottom] };
    try { await access(`public/assets/${relicId}-sd.webp`); } catch { stills.push(relicId); }
  }
  for (const e of data.events) {
    const file = files.get(e.backdropKey);
    if (!file) throw new Error(`${e.id}: 배경 ${e.backdropKey} 파일을 찾지 못했습니다.`);
    const text = (key) => Object.fromEntries(locales.map((l) => [l, data.text[l][key] ?? data.text.ko[key]]));
    if (!check) await copyFile(resolve(game, "public", file), `public/assets/events/${e.id}.webp`);
    if (e.sd) await copySd(e.sd.relicId);
    events.push({
      id: e.id,
      title: text(e.titleKey),
      subtitle: text(e.subtitleKey),
      startsAt: e.startsAt,
      endsAt: e.endsAt,
      backdrop: `/assets/events/${e.id}.webp`,
      frame: e.backdropFrame ?? null,
      sd: e.sd ? { ...e.sd, still: `/assets/${e.sd.relicId}-sd.webp` } : null,
      showcase: e.showcase ?? null,
      destination: e.destination?.kind ?? null,
    });
  }
  if (!check) await writeFile("src/puppet-bounds.json", JSON.stringify(bounds, null, 2).replace(/\[\s+(\d+),\s+(\d+),\s+(\d+),\s+(\d+)\s+\]/g, "[$1, $2, $3, $4]") + "\n");
  if (stills.length) console.warn(`정지 이미지가 없습니다: ${stills.join(", ")} → npm run render:sd-still -- ${stills.join(" ")}`);
  const read = async (p) => JSON.parse(await readFile(resolve(game, p), "utf8"));
  const commit = (await execute("git", ["rev-parse", "HEAD"], { cwd: game })).stdout.trim();
  const snapshot = { version: (await read("package.json")).version, commit, events };
  if (check) {
    const saved = JSON.parse(await readFile("content/game-events.json", "utf8"));
    if (JSON.stringify(saved.events) !== JSON.stringify(events)) {
      console.error("content/game-events.json이 게임의 이벤트와 다릅니다. `npm run sync:events`를 실행하고 함께 커밋하세요.");
      process.exit(1);
    }
    console.log("이벤트 스냅샷이 게임과 같습니다.");
    process.exit(0);
  }
  await writeFile("content/game-events.json", JSON.stringify(snapshot, null, 2) + "\n");
  if (adminRoot) {
    const list = events.map((e) => ({ id: e.id, title: e.title.ko, subtitle: e.subtitle.ko, starts_at: e.startsAt, ends_at: e.endsAt }));
    await writeFile(
      resolve(adminRoot, "shared/game-events.js"),
      `// Snapshot of the game's lobby events (For-Garden src/data/lobbyEvents.ts + ko titles).\n// Generated by For-Garden-Web \`npm run sync:events -- <game> --admin <admin>\`; do not edit by hand.\n// Linking a notice stores only the id and copies the period; edit the period freely.\nexport const GAME_EVENTS = ${JSON.stringify(list, null, 2)};\n`,
    );
  }
  console.log(`이벤트 ${events.length}개 동기화 (게임 ${snapshot.version})`);
} finally {
  await rm(temp, { recursive: true, force: true });
}
