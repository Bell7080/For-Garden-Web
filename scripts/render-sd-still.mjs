// SD 정지 이미지(public/assets/<id>-sd.webp)를 실제 idle 퍼펫의 첫 프레임에서 뽑는다.
// 사용: npm run render:sd-still -- dian meron   (playwright가 설치돼 있어야 한다)
import { spawn } from "node:child_process";
import { rm, writeFile } from "node:fs/promises";
const ids = process.argv.slice(2);
if (!ids.length) throw new Error("개체 ID를 하나 이상 주세요.");
import { createRequire } from "node:module";
import { execFileSync } from "node:child_process";
const require = createRequire(import.meta.url);
const { chromium } = (() => {
  try { return require("playwright"); } catch { return require(require.resolve("playwright", { paths: [execFileSync("npm", ["root", "-g"], { encoding: "utf8" }).trim(), "/opt/pw-browsers/.."] })); }
})();
const port = 5198;
const server = spawn("npx", ["vite", "--port", String(port), "--strictPort"], { stdio: "ignore" });
try {
  const url = `http://localhost:${port}/`;
  for (let i = 0; i < 60; i++) {
    if (await fetch(url).then((r) => r.ok, () => false)) break;
    await new Promise((r) => setTimeout(r, 500));
  }
  const browser = await chromium.launch({ args: ["--use-gl=swiftshader", "--enable-unsafe-swiftshader"] });
  const page = await browser.newPage({ viewport: { width: 900, height: 900 } });
  await page.goto(url);
  for (const id of ids) {
    await page.evaluate(async (id) => {
      document.documentElement.style.cssText = document.body.style.cssText = "background:transparent!important";
      document.body.innerHTML = '<div id="stage" style="width:600px;height:600px"></div>';
      const bounds = await (await fetch("/src/puppet-bounds.json")).json();
      const [l, t, r, b] = bounds[`${id}-sd`].bounds;
      const img = document.createElement("img");
      img.dataset.puppet = `${id}-sd`;
      img.style.cssText = `width:600px;aspect-ratio:${r - l}/${b - t};display:block`;
      img.alt = id;
      document.querySelector("#stage").append(img);
      const { mountPuppets } = await import("/src/puppets.ts");
      mountPuppets(document.querySelector("#stage"));
    }, id);
    const canvas = page.locator("#stage canvas");
    await canvas.waitFor({ state: "visible", timeout: 20000 });
    await page.waitForTimeout(800);
    const png = await canvas.screenshot({ omitBackground: true });
    const still = `public/assets/${id}-sd.png`;
    await writeFile(still, png);
    execFileSync("python3", ["-c", "import sys;from PIL import Image;Image.open(sys.argv[1]).save(sys.argv[2],'WEBP',quality=90)", still, still.replace(/png$/, "webp")]);
    await rm(still);
    console.log(`public/assets/${id}-sd.webp`);
  }
  await browser.close();
} finally {
  server.kill();
}
