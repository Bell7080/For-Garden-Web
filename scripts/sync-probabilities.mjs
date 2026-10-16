import { build } from "esbuild";
import { readFile, writeFile, mkdtemp, rm, readdir } from "node:fs/promises";
import { resolve } from "node:path";
import { tmpdir } from "node:os";
import { createHash } from "node:crypto";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { pathToFileURL } from "node:url";
const execute = promisify(execFile);
const game = resolve(process.argv[2] || "../For-Garden");
const files = (await readdir("content/legal"))
  .filter((p) => p.endsWith(".json"))
  .sort();
const editionPath = resolve("content/legal", files.at(-1));
const edition = JSON.parse(await readFile(editionPath, "utf8"));
if (edition.status !== "draft")
  throw new Error("확률 갱신은 새 초안 버전에서 진행하세요.");
const output = `content/probabilities/${edition.version}.json`;
const temp = await mkdtemp(resolve(tmpdir(), "fg-rates-"));
try {
  const modules = [
    "src/data/banners.ts",
    "src/data/relics.ts",
    "src/core/gacha.ts",
    "src/core/gachaRateTable.ts",
  ];
  const sourceHashes = Object.fromEntries(
    await Promise.all(
      modules.map(async (p) => [
        p,
        createHash("sha256")
          .update(await readFile(resolve(game, p)))
          .digest("hex"),
      ]),
    ),
  );
  const entry = `import {BANNERS} from ${JSON.stringify(resolve(game, modules[0]))};import {PLAYABLE_RELICS} from ${JSON.stringify(resolve(game, modules[1]))};import {gachaRateTable} from ${JSON.stringify(resolve(game, modules[3]))};const names=Object.fromEntries(PLAYABLE_RELICS.map(r=>[r.id,r.name]));const banners=BANNERS.map(b=>({...b,states:[false,...(b.pickupRate?[true]:[])].flatMap(guaranteed=>['normal','tenth','pity'].map(state=>({state,pickupGuaranteed:guaranteed,rows:gachaRateTable({...b,pickupRate:guaranteed?1:b.pickupRate,slotRates:state==='pity'?{SSR:1,SR:0,R:0,GRAY:0}:state==='tenth'?{SSR:b.slotRates.SSR,SR:1-b.slotRates.SSR,R:0,GRAY:0}:b.slotRates})})))}));export default {names,banners};`;
  await build({
    stdin: { contents: entry, resolveDir: game },
    bundle: true,
    platform: "node",
    format: "esm",
    outfile: resolve(temp, "snapshot.mjs"),
  });
  const data = (await import(pathToFileURL(resolve(temp, "snapshot.mjs")).href))
    .default;
  const version = JSON.parse(
    await readFile(resolve(game, "package.json")),
  ).version;
  const commit = (
    await execute("git", ["rev-parse", "HEAD"], { cwd: game, encoding: "utf8" })
  ).stdout.trim();
  await writeFile(
    output,
    JSON.stringify({ version, commit, sourceHashes, ...data }, null, 2) + "\n",
  );
  edition.probabilitySnapshot = output;
  await writeFile(editionPath, JSON.stringify(edition, null, 2) + "\n");
} finally {
  await rm(temp, { recursive: true, force: true });
}
