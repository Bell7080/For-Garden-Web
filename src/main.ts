import "./style.css";
import { copy, locales, relics, type Locale } from "./content";

const leaf =
  '<svg viewBox="0 0 40 44" fill="none" aria-hidden="true"><path d="M20 40V19M20 29C3 29 4 9 4 9s18-1 16 20m0-10C20 5 36 4 36 4s4 17-16 20" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';
const arrow = '<span aria-hidden="true">↗</span>';
const app = document.querySelector<HTMLDivElement>("#app")!;
function storedLocale(): Locale {
  try {
    const value = localStorage.getItem("fg-language");
    return locales.includes(value as Locale) ? (value as Locale) : "ko";
  } catch {
    return "ko";
  }
}
const initial = new URLSearchParams(location.search).get("lang");
let lang: Locale = locales.includes(initial as Locale)
  ? (initial as Locale)
  : storedLocale();
let selected = 0;
let category = 0;
interface Notice {
  slug: string;
  category: "notice" | "development" | "event";
  published_at: string;
  title: string;
  summary: string;
  body: string;
}
let notices: Notice[] = [];
let newsState: "loading" | "ready" | "error" = "loading";
let newsRequest = 0;
let siteDetails: { operator?: string | null; privacyContact?: string | null } =
  {};
const escape = (s: string) =>
  s.replace(
    /[&<>"']/g,
    (x) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        x
      ]!,
  );
const lines = (values: readonly string[]) => values.map(escape).join("<br>");
function render() {
  const t = copy[lang];
  document.documentElement.lang = lang;
  document.title = t.title;
  app.innerHTML = `
 <a class="skip-link" href="#main">${lang === "ko" ? "본문 바로가기" : lang === "ja" ? "本文へ" : "Skip to content"}</a>
 <header class="header"><a class="brand" href="#home" aria-label="For Garden">${leaf}<span>for <i>Garden</i><small>OFFICIAL WEBSITE</small></span></a>
 <nav class="desktop-nav" aria-label="${lang === "ko" ? "주 메뉴" : "Main navigation"}">${t.nav.map((x, i) => `<a href="#${["news", "world", "relics", "about"][i]}">${x}</a>`).join("")}</nav>
 <div class="header-actions"><label class="language"><span aria-hidden="true">◎</span><select aria-label="Language">${locales.map((x) => `<option value="${x}" ${x === lang ? "selected" : ""}>${{ ko: "한국어", en: "English", ja: "日本語" }[x]}</option>`).join("")}</select></label><a class="nav-cta" href="#register">${t.reserve} ${arrow}</a><button class="menu-button" aria-label="${lang === "ko" ? "메뉴 열기" : "Toggle menu"}" aria-expanded="false">☰</button></div></header>
 <nav class="mobile-nav" hidden>${t.nav.map((x, i) => `<a href="#${["news", "world", "relics", "about"][i]}">${x}</a>`).join("")}</nav>
 <main id="main"><section id="home" class="hero"><div class="hero-grain"></div><div class="hero-orbit orbit-one"></div><div class="hero-orbit orbit-two"></div>
 <div class="hero-copy"><p class="eyebrow"><span class="live-dot"></span>${t.soon}</p><p class="hero-english">A little garden.<br>A second chance.</p><h1>${lines(t.hero)}</h1><p class="hero-intro">${escape(t.intro).replace("\n", "<br>")}</p><div class="hero-links"><a href="#register" class="button button-dark">${t.reserve} ${arrow}</a><a href="#world" class="text-link">${t.explore}<span aria-hidden="true">↓</span></a></div><div class="release-note"><span class="tiny-star">✳</span>${t.release}<span class="release-line"></span>Android · iOS</div></div>
 <div class="hero-visual"><div class="botanical-label">ETERNAL CITY<br>RESEARCH ARCHIVE — 001</div><div class="hero-window"><img src="/assets/garden.webp" alt="" fetchpriority="high" width="844" height="1500"/><div class="window-shade"></div></div><div class="specimen-circle"></div><img class="hero-character" src="/assets/torika.webp" alt="${relics[0].name[lang]}" fetchpriority="high" width="750" height="1100"/><div class="character-label"><span>RELIC NO.014</span><strong>${relics[0].name[lang]}</strong><span>${relics[0].origin[lang]}</span><i>✳</i></div><span class="hero-side-note">PRESERVING THE PAST. GROWING TOMORROW.</span><span class="floating-star star-one">✧</span><span class="floating-star star-two">✳</span></div>
 <div class="hero-bottom"><span>01 — THE BEGINNING</span><a href="#news">${t.scroll} <span aria-hidden="true">↓</span></a><span>EST. ETERNAL CITY</span></div></section>
 <div class="ticker"><span>✳</span><p>${t.ticker}</p><span>FOR GARDEN</span><span>✳</span><p>${t.ticker}</p><span>FOR GARDEN</span></div>
 <section id="news" class="section news-section"><div class="section-heading"><div><p class="eyebrow">GARDEN JOURNAL <span class="section-number">01</span></p><h2>${t.news}<span class="heading-dot">.</span></h2></div><button class="text-link all-news">${t.allNews} ${arrow}</button></div><div class="news-tabs" role="group" aria-label="${t.news}">${t.tabs.map((x, i) => `<button data-category="${i}" class="${category === i ? "active" : ""}" aria-pressed="${category === i}">${x}</button>`).join("")}</div><div id="news-list" aria-live="polite"></div></section>
 <section id="world" class="world-section"><div class="world-art"><img src="/assets/city.webp" alt="${t.worldTag}" loading="lazy" width="844" height="1500"/><div class="world-image-frame"></div><span class="world-tag">${t.worldTag}</span><span class="world-coordinate">35° 41′ N &nbsp; / &nbsp; GARDEN ARCHIVE</span></div><div class="world-copy"><p class="eyebrow">${t.worldLabel} <span class="section-number">02</span></p><h2>${lines(t.worldTitle)}</h2><p class="body-copy">${t.worldBody}</p><div class="world-rule"></div><p class="world-note">${escape(t.worldNote).replace("\n", "<br>")}</p>${leaf}</div></section>
 <section id="relics" class="section relic-section"><div class="section-heading"><div><p class="eyebrow">${t.relicLabel} <span class="section-number">03</span></p><h2>${t.relicTitle}<span class="heading-dot">.</span></h2></div><p class="small-copy">${escape(t.relicIntro).replace("\n", "<br>")}</p></div><div id="relic-display"></div></section>
 <section id="about" class="section about-section"><p class="eyebrow">${t.featuresLabel} <span class="section-number">04</span></p><h2>${t.featuresTitle}<span class="heading-dot">.</span></h2><div class="feature-grid">${t.features.map((f, i) => `<article class="feature"><div class="feature-image"><img src="/assets/${["archive", "battle", "city"][i]}.webp" alt="" loading="lazy" width="844" height="1500"/><span>0${i + 1}</span></div><p class="eyebrow">${["EXPLORE THE UNKNOWN", "FIND YOUR SYNERGY", "GROW TOGETHER"][i]}</p><h3>${f[0]}</h3><p>${f[1]}</p></article>`).join("")}</div><p class="art-disclaimer">${t.sample}</p></section>
 <section id="register" class="register-section"><div class="register-copy"><p class="eyebrow">${t.registerLabel}</p><h2>${lines(t.registerTitle)}</h2><p>${t.registerBody}</p><div class="register-flower">${leaf}</div><small>${t.noPromise}</small></div><form id="register-form"><fieldset><legend>${t.platform}</legend><div class="platform-options">${["android", "ios", "both"].map((p, i) => `<label><input type="radio" name="platform" value="${p}" ${i === 0 ? "checked" : ""}/><span>${[t.android, t.ios, t.both][i]}</span></label>`).join("")}</div></fieldset><label class="email-label" for="email">${t.email}</label><input type="email" id="email" name="email" placeholder="${t.emailPlaceholder}" required maxlength="254" autocomplete="email"/><div class="honeypot" aria-hidden="true"><label>Website<input name="website" type="text" tabindex="-1" autocomplete="off"/></label></div><label class="consent"><input type="checkbox" name="consent" required/><span>${t.consent}</span></label><button type="button" class="privacy-link">${t.privacy} ↗</button><button type="submit" class="button button-yellow">${t.submit} ${arrow}</button><p id="form-status" role="status"></p></form></section>
 </main><footer><div class="footer-main"><a class="brand" href="#home">${leaf}<span>for <i>Garden</i></span></a><p>${t.footer}</p><span class="footer-status"><span class="live-dot"></span>${t.status}</span></div><div class="footer-bottom"><span>© ${new Date().getFullYear()} For Garden. All rights reserved.</span><button class="privacy-link">${t.privacy}</button><a href="#home">${t.top} ↑</a></div></footer>
 <dialog id="content-dialog"><button class="dialog-close" aria-label="${t.close}">×</button><div class="dialog-content"></div></dialog>`;
  renderNews();
  renderRelic();
  bind();
}
function renderNews() {
  const t = copy[lang];
  const el = document.querySelector("#news-list")!;
  const shown = notices.filter(
    (n) =>
      category === 0 ||
      n.category === ["", "notice", "development", "event"][category],
  );
  el.innerHTML =
    newsState === "loading"
      ? `<p class="empty-news">${t.loading}</p>`
      : newsState === "error"
        ? `<div class="news-error">${{ ko: "소식을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.", en: "News is temporarily unavailable. Please try again.", ja: "お知らせを読み込めませんでした。もう一度お試しください。" }[lang]}<button class="retry-news">${{ ko: "다시 불러오기", en: "Try again", ja: "再読み込み" }[lang]} ↻</button></div>`
        : shown.length
          ? shown
              .map(
                (n) =>
                  `<button class="news-row" data-notice="${escape(n.slug)}"><span class="news-category">${t.tabs[["notice", "development", "event"].indexOf(n.category) + 1]}</span><strong>${escape(n.title)}</strong><time datetime="${escape(n.published_at)}">${new Intl.DateTimeFormat(lang, { year: "numeric", month: "2-digit", day: "2-digit", timeZone: "Asia/Seoul" }).format(new Date(n.published_at))}</time>${arrow}</button>`,
              )
              .join("")
          : `<div class="empty-news"><span class="empty-flower">✳</span><div><strong>${t.empty}</strong><p>${t.newsFallback}</p></div><span class="archive-stamp">GARDEN<br>JOURNAL</span></div>`;
  el.querySelector<HTMLButtonElement>(".retry-news")?.addEventListener(
    "click",
    () => void loadNews(),
  );
  el.querySelectorAll<HTMLButtonElement>("[data-notice]").forEach(
    (b) => (b.onclick = () => openNotice(b.dataset.notice!)),
  );
}
function renderRelic() {
  const r = relics[selected];
  const t = copy[lang];
  document.querySelector("#relic-display")!.innerHTML =
    `<div class="relic-stage" style="--relic-color:${r.color}"><div class="relic-stage-grid"></div><span class="relic-big-number">0${selected + 1}</span><div class="relic-halo"></div><img class="relic-portrait" src="/assets/${r.id}.webp" alt="${r.name[lang]}" loading="lazy" width="750" height="1100"/><div class="relic-data"><p class="eyebrow">${t.record} / NO.${r.number}</p><span class="relic-origin">${r.origin[lang]}</span><h3>${r.name[lang]}<span>${r.id === "rex" ? "REXIA" : r.id.toUpperCase()}</span></h3><span class="role-tag">${r.role[lang]}</span><p class="relic-description">${r.description[lang]}</p><div class="relic-controls"><button class="relic-prev" aria-label="${t.previous}">←</button><span>0${selected + 1}<i>/ 03</i></span><button class="relic-next" aria-label="${t.next}">→</button></div></div></div><div class="relic-selector" role="group" aria-label="${t.relicTitle}">${relics.map((x, i) => `<button data-relic="${i}" aria-pressed="${i === selected}" class="${i === selected ? "active" : ""}"><span>0${i + 1}</span><img src="/assets/${x.id}.webp" alt="" loading="lazy"/><strong>${x.name[lang]}</strong><span>${arrow}</span></button>`).join("")}</div>`;
  document.querySelectorAll<HTMLButtonElement>("[data-relic]").forEach(
    (b) =>
      (b.onclick = () => {
        selected = Number(b.dataset.relic);
        renderRelic();
        document
          .querySelector<HTMLButtonElement>(`[data-relic="${selected}"]`)
          ?.focus({ preventScroll: true });
      }),
  );
  document.querySelector<HTMLButtonElement>(".relic-prev")!.onclick = () => {
    selected = (selected + 2) % 3;
    renderRelic();
  };
  document.querySelector<HTMLButtonElement>(".relic-next")!.onclick = () => {
    selected = (selected + 1) % 3;
    renderRelic();
  };
}
function openDialog(html: string) {
  const dialog = document.querySelector<HTMLDialogElement>("dialog")!;
  dialog.querySelector(".dialog-content")!.innerHTML = html;
  dialog.showModal();
  document.body.classList.add("modal-open");
}
function openNotice(slug: string) {
  const n = notices.find((n) => n.slug === slug);
  if (!n) return;
  const url = new URL(location.href);
  url.searchParams.set("notice", slug);
  history.replaceState(null, "", url);
  openDialog(
    `<p class="eyebrow">GARDEN JOURNAL</p><h2>${escape(n.title)}</h2><time>${escape(n.published_at.slice(0, 10))}</time><div class="notice-body">${escape(
      n.body,
    )
      .split("\n\n")
      .map((p) => `<p>${p.replaceAll("\n", "<br>")}</p>`)
      .join("")}</div>`,
  );
}
function bind() {
  document.querySelector("select")!.onchange = (e) => {
    const next = (e.target as HTMLSelectElement).value as Locale;
    lang = next;
    try {
      localStorage.setItem("fg-language", lang);
    } catch {}
    const url = new URL(location.href);
    url.searchParams.set("lang", lang);
    history.replaceState(null, "", url);
    render();
    loadNews();
  };
  document.querySelectorAll<HTMLButtonElement>("[data-category]").forEach(
    (b) =>
      (b.onclick = () => {
        category = Number(b.dataset.category);
        document
          .querySelectorAll<HTMLButtonElement>("[data-category]")
          .forEach((x) => {
            const active = x === b;
            x.classList.toggle("active", active);
            x.setAttribute("aria-pressed", String(active));
          });
        renderNews();
      }),
  );
  document.querySelector<HTMLButtonElement>(".all-news")!.onclick = () => {
    category = 0;
    document.querySelector<HTMLButtonElement>('[data-category="0"]')!.click();
    document
      .querySelector("#news-list")!
      .scrollIntoView({ behavior: "smooth", block: "center" });
  };
  const menu = document.querySelector<HTMLButtonElement>(".menu-button")!;
  const nav = document.querySelector<HTMLElement>(".mobile-nav")!;
  menu.onclick = () => {
    nav.hidden = !nav.hidden;
    menu.setAttribute("aria-expanded", String(!nav.hidden));
  };
  nav.querySelectorAll("a").forEach(
    (a) =>
      (a.onclick = () => {
        nav.hidden = true;
        menu.setAttribute("aria-expanded", "false");
      }),
  );
  const dialog = document.querySelector<HTMLDialogElement>("dialog")!;
  document.querySelector<HTMLButtonElement>(".dialog-close")!.onclick = () =>
    dialog.close();
  dialog.addEventListener("click", (e) => {
    if (e.target === dialog) {
      const rect = dialog.getBoundingClientRect();
      if (
        e.clientX < rect.left ||
        e.clientX > rect.right ||
        e.clientY < rect.top ||
        e.clientY > rect.bottom
      )
        dialog.close();
    }
  });
  dialog.addEventListener("close", () => {
    document.body.classList.remove("modal-open");
    const url = new URL(location.href);
    url.searchParams.delete("notice");
    history.replaceState(null, "", url);
  });
  document
    .querySelectorAll<HTMLButtonElement>(".privacy-link")
    .forEach(
      (b) =>
        (b.onclick = () =>
          openDialog(
            `<p class="eyebrow">FOR GARDEN / PRIVACY</p><h2>${copy[lang].privacyTitle}</h2><p class="notice-body">${copy[lang].privacyBody}</p>${siteDetails.operator ? `<p class="notice-body">${escape(siteDetails.operator)}<br>${escape(siteDetails.privacyContact ?? "")}</p>` : ""}`,
          )),
    );
  document.querySelector<HTMLFormElement>("form")!.onsubmit = submit;
}
async function loadNews() {
  const request = ++newsRequest;
  newsState = "loading";
  renderNews();
  try {
    const response = await fetch(`/api/notices?lang=${lang}`, {
      signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) throw Error();
    const json = await response.json();
    if (!Array.isArray(json.notices)) throw Error();
    if (request !== newsRequest) return;
    notices = json.notices.filter(
      (n: Notice) =>
        typeof n.slug === "string" &&
        typeof n.title === "string" &&
        typeof n.body === "string" &&
        ["notice", "development", "event"].includes(n.category) &&
        Number.isFinite(Date.parse(n.published_at)),
    );
    newsState = "ready";
  } catch {
    if (request !== newsRequest) return;
    notices = [];
    newsState = "error";
  }
  renderNews();
  const slug = new URLSearchParams(location.search).get("notice");
  if (slug) {
    if (notices.some((n) => n.slug === slug)) openNotice(slug);
    else if (newsState === "ready")
      openDialog(`<h2>${copy[lang].noticeMissing}</h2>`);
  }
}
async function submit(e: SubmitEvent) {
  e.preventDefault();
  const t = copy[lang];
  const form = e.target as HTMLFormElement;
  if (!form.reportValidity()) return;
  const data = new FormData(form);
  const button = form.querySelector<HTMLButtonElement>('[type="submit"]')!;
  const status = document.querySelector<HTMLElement>("#form-status")!;
  button.disabled = true;
  button.textContent = t.submitting;
  status.textContent = "";
  try {
    const response = await fetch("/api/preregister", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: data.get("email"),
        platform: data.get("platform"),
        locale: lang,
        consent: data.get("consent") === "on",
        website: data.get("website"),
      }),
      signal: AbortSignal.timeout(15000),
    });
    if (!response.ok) {
      status.textContent =
        response.status === 503
          ? t.unavailable
          : response.status === 400
            ? t.invalid
            : t.failed;
      status.dataset.state = "error";
      return;
    }
    const result = await response.json();
    if (result.ok !== true) throw Error();
    status.textContent = t.success;
    status.dataset.state = "success";
    form.reset();
  } catch {
    status.textContent = t.failed;
    status.dataset.state = "error";
  } finally {
    button.disabled = false;
    button.innerHTML = `${t.submit} ${arrow}`;
  }
}
render();
void loadNews();
void fetch("/api/site", { signal: AbortSignal.timeout(10000) })
  .then((r) => (r.ok ? r.json() : {}))
  .then((data) => {
    siteDetails = data;
  })
  .catch(() => {});
