import { readFile, writeFile, mkdir } from "node:fs/promises";
import { transform } from "esbuild";
import { renderFooterLinks } from "../shared/site-footer.js";
const { code } = await transform(await readFile("src/ui/icons.ts", "utf8"), {
  loader: "ts",
  format: "esm",
});
const { icon } = await import(
  "data:text/javascript;base64," + Buffer.from(code).toString("base64")
);
const content = JSON.parse(await readFile("content/project.json", "utf8"));
const escape = (s) =>
  String(s).replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
for (const [lang, t] of Object.entries(content)) {
  const path = lang === "ko" ? "/about" : `/about/${lang}`;
  const languages = [
    ["ko", "한국어"],
    ["en", "EN"],
    ["ja", "日本語"],
  ]
    .map(
      ([code, label]) =>
        `<a href="${code === "ko" ? "/about" : `/about/${code}`}" lang="${code}" hreflang="${code}"${code === lang ? ' aria-current="page"' : ""}>${label}</a>`,
    )
    .join("");
  const html = `<!doctype html><html lang="${lang}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="description" content="${escape(t.intro)}"><title>${escape(t.title)} · For Garden</title><link rel="icon" href="/favicon.svg"><script src="/legal/theme.js"></script><link rel="stylesheet" href="/legal/center.css"><link rel="stylesheet" href="/ui/footer.css"><link rel="stylesheet" href="/ui/about.css"><script defer src="/legal/center.js"></script><script defer src="/ui/storage-notice.js"></script><script defer src="/ui/about.js"></script>${Object.keys(
    content,
  )
    .map(
      (code) =>
        `<link rel="alternate" hreflang="${code}" href="https://forgarden-web.vercel.app/about${code === "ko" ? "" : "/" + code}">`,
    )
    .join(
      "",
    )}</head><body><a class="skip" href="#project">${escape(t.title)}</a><header><a class="brand" href="/" aria-label="${escape(t.home)}"><img src="/assets/for-garden-logo.webp" alt="For Garden" width="1358" height="392"></a><nav class="about-language" aria-label="${escape(t.language)}">${languages}</nav><button id="theme" type="button" aria-label="${escape(t.theme)}">${escape(t.theme)}</button></header><main id="project" class="about-main"><a class="about-back" href="/">${icon("left")} ${escape(t.home)}</a><div class="project-hero"><div class="project-copy"><p class="eyebrow">FOR GARDEN / INDEPENDENT DEVELOPMENT</p><h1>${t.headline.map(escape).join("<br>")}</h1><p class="lead">${escape(t.intro)}</p><span class="project-status">${escape(t.status)}</span></div><figure class="project-art"><img class="project-landscape" src="/assets/garden.webp" alt="" width="844" height="1500"><div class="project-orbit" aria-hidden="true"></div><img class="project-torika" src="/assets/torika.webp" alt="${escape(t.art)}" width="750" height="1100"><figcaption><span>FOR THE ONES WE FORGOT</span><strong>${escape(t.caption)}</strong></figcaption></figure></div><section class="project-values"><p class="eyebrow">THE IDEA BEHIND THE GARDEN</p><h2>${escape(t.section)}</h2><div class="project-value-grid">${t.values.map(([n, title, body]) => `<article><span class="section-number">${n}</span><h3>${escape(title)}</h3><p>${escape(body)}</p></article>`).join("")}</div></section><section class="project-record"><div><p class="eyebrow">PROJECT FILE / 001</p><h2>${escape(t.record)}</h2><p class="small">${escape(t.brand)}</p></div><dl>${t.facts.map(([label, value]) => `<div><dt>${escape(label)}</dt><dd>${escape(value)}</dd></div>`).join("")}</dl></section><section class="project-contact"><img src="/assets/torika-sd.webp" alt="" loading="lazy" width="750" height="1100"><div><p class="eyebrow">KEEP IN TOUCH</p><h2>${escape(t.newsTitle)}</h2><p>${escape(t.newsBody)}</p><div class="project-actions"><a href="/#news">${escape(t.news)} ${icon("right")}</a><a href="/support.html">${escape(t.contact)} ${icon("right")}</a></div></div></section></main><footer>${renderFooterLinks(lang, path)}<p>© ${new Date().getFullYear()} For Garden. All rights reserved.</p></footer></body></html>`;
  const directory = `public${path}`;
  await mkdir(directory, { recursive: true });
  await writeFile(`${directory}/index.html`, html);
}
console.log("Generated project introduction in ko/en/ja.");
