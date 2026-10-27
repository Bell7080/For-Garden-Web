import "./style.css";
import "./ui/controls.css";
import "./ui/motion.css";
import "./ui/themes.css";
import "./ui/codex.css";
import "./ui/register.css";
import "./ui/depth.css";
import "./ui/notices.css";
import {
  renderCodex,
  renderFactions,
  heroProfile,
  registerDecor,
  gameSymbol,
} from "./codex";
import { languageNames } from "../shared/languages.js";
import { renderFooterLinks } from "../shared/site-footer.js";
import { renderBody } from "../shared/notice-body.js";
import {
  noticeHero,
  noticeKind,
  noticePeriod,
  noticeTabs,
  renderNoticeBoard,
  safeImage,
} from "./ui/notice-views";
import { mountFeedback } from "./ui/feedback";
import { mountScrollEffects } from "./ui/scroll";
import { mountRegisterSection, registerMilestones } from "./ui/register-milestones";
import { icon } from "./ui/icons";
import type { EventPhase } from "./ui/game-events";
import { languagePicker, bindLanguagePicker } from "./ui/language-picker";
import { copy, locales, relics, type Locale } from "./content";

const emblem = gameSymbol("factions", "rune", "archive-emblem");
const gameScreens = [
  "title",
  "lobby",
  "relics",
  "lab",
  "map",
  "party",
  "battle",
] as const;
const screenCopy = {
  ko: {
    title: "정원에서 보내는 하루",
    intro: "직접 만나게 될, 실제 인게임 화면.",
    labels: [
      "타이틀",
      "이터널 시티 로비",
      "렐릭 도감",
      "복원 연구소",
      "스테이지 지도",
      "파티 편성",
      "실시간 전투",
    ],
    open: "크게 보기",
    hint: "옆으로 넘겨 더 많은 화면을 확인하세요.",
  },
  en: {
    title: "A day inside the garden",
    intro: "A closer look at the actual game.",
    labels: [
      "Title",
      "Eternal City lobby",
      "Relic collection",
      "Restoration lab",
      "Stage map",
      "Party formation",
      "Real-time combat",
    ],
    open: "View screenshot",
    hint: "Scroll sideways to explore more screenshots.",
  },
  ja: {
    title: "庭園で過ごす一日",
    intro: "実際のゲーム画面をご紹介。",
    labels: [
      "タイトル",
      "エターナルシティ",
      "レリック図鑑",
      "復元研究所",
      "ステージマップ",
      "パーティ編成",
      "リアルタイムバトル",
    ],
    open: "拡大する",
    hint: "横にスクロールして、ほかの画面をご覧ください。",
  },
};
const arrow = `<span class="arrow-icon">${icon("arrow")}</span>`;
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
let eventPick: string | undefined;
let eventPhaseSel: EventPhase | undefined;
interface Notice {
  slug: string;
  category: "notice" | "development" | "event";
  published_at: string;
  title: string;
  summary: string;
  body: string;
  cover_image?: string | null;
  pinned?: boolean;
  template?: string;
  cover_frame?: { zoom: number; x: number; y: number } | null;
  meta?: unknown;
  translation?: "manual" | "original";
  source_locale?: string;
  content_locale?: string;
}
let notices: Notice[] = [];
let newsState: "loading" | "ready" | "error" = "loading";
let newsRequest = 0;
const escape = (s: string) =>
  s.replace(
    /[&<>"']/g,
    (x) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        x
      ]!,
  );
const lines = (values: readonly string[]) => values.map(escape).join("<br>");
let cleanupLanguagePicker = () => {};
let cleanupPuppets = () => {};
let cleanupNewsPuppets = () => {};
let cleanupPagePuppets = () => {};
let cleanupScroll = () => {};
let cleanupRegister = () => {};
let renderVersion = 0;
let newsPuppetVersion = 0;
let pagePuppetVersion = 0;
function render() {
  cleanupLanguagePicker();
  cleanupScroll();
  cleanupRegister();
  cleanupPuppets();
  cleanupNewsPuppets();
  cleanupPagePuppets();
  pagePuppetVersion += 1;
  renderVersion += 1;
  const t = copy[lang];
  document.documentElement.lang = lang;
  document.title = t.title;
  app.innerHTML = `
 <a class="skip-link" href="#main">${lang === "ko" ? "본문 바로가기" : lang === "ja" ? "本文へ" : "Skip to content"}</a>
 <header class="header"><a class="brand" href="#home" aria-label="For Garden"><img class="brand-logotype" src="/assets/for-garden-logo.webp" alt="For Garden" width="1358" height="392"/></a>
 <nav class="desktop-nav" aria-label="${lang === "ko" ? "주 메뉴" : "Main navigation"}">${t.nav.map((x, i) => `<a href="#${["news", "world", "relics", "about"][i]}">${x}</a>`).join("")}</nav>
 <div class="header-actions"><div class="theme-control"><select data-theme-select aria-label="${lang === "ko" ? "화면 테마" : lang === "ja" ? "テーマ" : "Theme"}"><option value="system">${lang === "ko" ? "장치 설정에 맞춤" : lang === "ja" ? "端末の設定" : "Device setting"}</option><option value="dark">${lang === "ko" ? "다크 모드" : lang === "ja" ? "ダーク" : "Dark"}</option><option value="light">${lang === "ko" ? "라이트 모드" : lang === "ja" ? "ライト" : "Light"}</option></select></div>${languagePicker(lang)}<a class="nav-cta" href="#register">${t.reserve} ${arrow}</a><button class="menu-button" aria-label="${lang === "ko" ? "메뉴 열기" : "Toggle menu"}" aria-expanded="false">${icon("menu")}</button></div></header>
 <nav class="mobile-nav" hidden>${t.nav.map((x, i) => `<a href="#${["news", "world", "relics", "about"][i]}">${x}</a>`).join("")}</nav>
 <main id="main"><section id="home" class="hero"><div class="ambient-dots" aria-hidden="true"></div><div class="hero-grain"></div><div class="hero-orbit orbit-one"></div><div class="hero-orbit orbit-two"></div>
 <div class="hero-copy"><p class="eyebrow"><span class="live-dot"></span>${t.soon}</p><div class="hero-logotype"><img src="/assets/for-garden-logo.webp" alt="For Garden" width="1358" height="392" fetchpriority="high"/><span>ETERNAL CITY</span></div><h1>${lines(t.hero)}</h1><p class="hero-intro">${escape(t.intro).replace("\n", "<br>")}</p><div class="hero-links"><a href="#register" class="button button-dark">${t.reserve} ${arrow}</a><a href="#world" class="text-link">${t.explore}${icon("down")}</a></div><div class="release-note"><span class="tiny-star">${gameSymbol("factions", "rogue")}</span>${t.release}<span class="release-line"></span>Android · iOS</div>${heroProfile(lang)}</div>
 <div class="hero-visual"><div class="botanical-label">ETERNAL CITY<br>RESEARCH ARCHIVE — 001</div><div class="hero-window"><img src="/assets/garden.webp" alt="" fetchpriority="high" width="844" height="1500"/><div class="window-shade"></div></div><div class="specimen-circle"></div><img class="hero-character" data-puppet="torika" src="/assets/torika.webp" alt="${relics[0].name[lang]}" fetchpriority="high" width="750" height="1100"/><div class="character-label"><span>RELIC NO.014</span><strong>${relics[0].name[lang]}</strong><span>${relics[0].origin[lang]}</span><i>${gameSymbol("factions", "rogue")}</i></div><span class="hero-side-note">PRESERVING THE PAST. GROWING TOMORROW.</span><span class="floating-star star-one">${gameSymbol("elements", "earth")}</span><span class="floating-star star-two">${gameSymbol("roles", "tank")}</span></div>
 <div class="hero-bottom"><span>01 — THE BEGINNING</span><a href="#news">${t.scroll} ${icon("down")}</a><span>EST. ETERNAL CITY</span></div></section>
 <div class="ticker"><span>${gameSymbol("factions", "rogue")}</span><p>${t.ticker}</p><span>FOR GARDEN</span><span>${gameSymbol("factions", "rogue")}</span><p>${t.ticker}</p><span>FOR GARDEN</span></div>
 <section id="news" class="section news-section"><div class="section-heading"><div><p class="eyebrow">GARDEN JOURNAL <span class="section-number">01</span></p><h2>${t.news}<span class="heading-dot">.</span></h2></div><button class="text-link all-news">${t.allNews} ${arrow}</button></div><div class="news-tabs" role="group" aria-label="${t.news}">${noticeTabs(
   lang,
 )
   .map(
     (x, i) =>
       `<button data-category="${i}" class="${category === i ? "active" : ""}" aria-pressed="${category === i}">${x}</button>`,
   )
   .join("")}</div><div id="news-list" aria-live="polite"></div></section>
 <section id="world" class="world-section"><div class="world-art"><img src="/assets/city.webp" alt="${t.worldTag}" loading="lazy" width="844" height="1500"/><div class="world-image-frame"></div><span class="world-tag">${t.worldTag}</span><span class="world-coordinate">35° 41′ N &nbsp; / &nbsp; GARDEN ARCHIVE</span></div><div class="world-copy"><p class="eyebrow">${t.worldLabel} <span class="section-number">02</span></p><h2>${lines(t.worldTitle)}</h2><p class="body-copy">${t.worldBody}</p><div class="world-rule"></div><p class="world-note">${escape(t.worldNote).replace("\n", "<br>")}</p>${emblem}</div></section>
 <section id="relics" class="section relic-section"><div class="section-heading"><div><p class="eyebrow">${t.relicLabel} <span class="section-number">03</span></p><h2>${t.relicTitle}<span class="heading-dot">.</span></h2></div><p class="small-copy">${escape(t.relicIntro).replace("\n", "<br>")}</p></div><div id="relic-display"></div>${renderFactions(lang)}</section>
 <section id="gameplay" class="section gameplay-section"><div class="section-heading"><div><p class="eyebrow">IN-GAME ARCHIVE <span class="section-number">04</span></p><h2>${screenCopy[lang].title}<span class="heading-dot">.</span></h2></div><p class="small-copy">${screenCopy[lang].intro}</p></div><div class="screenshot-grid" aria-label="${screenCopy[lang].intro}">${gameScreens.map((name, i) => `<button class="screenshot-card" data-screenshot="${i}" aria-label="${screenCopy[lang].labels[i]} · ${screenCopy[lang].open}"><span class="screenshot-image"><img src="/assets/screenshots/${name}.webp" alt="${screenCopy[lang].labels[i]}" width="540" height="960" loading="lazy"/><span class="screenshot-enlarge" aria-hidden="true">${icon("arrow")}</span></span><span class="screenshot-caption"><span>0${i + 1}</span><strong>${screenCopy[lang].labels[i]}</strong></span></button>`).join("")}</div><p class="gallery-hint">${screenCopy[lang].hint}</p><p class="art-disclaimer">${t.sample}</p></section>
 <section id="about" class="section about-section"><p class="eyebrow">${t.featuresLabel} <span class="section-number">05</span></p><h2>${t.featuresTitle}<span class="heading-dot">.</span></h2><div class="feature-grid">${t.features.map((f, i) => `<article class="feature"><div class="feature-image"><img src="/assets/${["archive", "battle", "city"][i]}.webp" alt="" loading="lazy" width="844" height="1500"/><span>0${i + 1}</span></div><p class="eyebrow">${["EXPLORE THE UNKNOWN", "FIND YOUR SYNERGY", "GROW TOGETHER"][i]}</p><h3>${f[0]}</h3><p>${f[1]}</p></article>`).join("")}</div><p class="art-disclaimer">${t.sample}</p></section>
 <section id="register" class="register-section"><div class="ambient-dots" aria-hidden="true"></div><div class="register-copy"><p class="eyebrow">${t.registerLabel}</p><h2>${lines(t.registerTitle)}</h2><p>${t.registerBody}</p>${registerDecor(lang)}<small>${t.noPromise}</small></div><form id="register-form" novalidate><fieldset><legend>${t.platform}</legend><div class="platform-options">${["android", "ios", "both"].map((p, i) => `<label><input type="radio" name="platform" value="${p}" ${i === 0 ? "checked" : ""}/><span>${[t.android, t.ios, t.both][i]}</span></label>`).join("")}</div></fieldset><label class="email-label" for="email">${t.email}</label><input type="email" id="email" name="email" placeholder="${t.emailPlaceholder}" required maxlength="254" autocomplete="email"/><div class="honeypot" aria-hidden="true"><label>Website<input name="website" type="text" tabindex="-1" autocomplete="off"/></label></div><label class="consent"><input type="checkbox" name="consent" required/><span>${t.consent}</span></label><a class="privacy-link" href="/legal/preregistration-consent">${t.privacy} ${arrow}</a><button type="submit" class="button button-yellow">${t.submit} ${arrow}</button><p id="form-status" role="status"></p></form>${registerMilestones(lang)}</section>
 </main><footer><div class="footer-main"><a class="brand" href="#home"><img class="brand-logotype" src="/assets/for-garden-logo.webp" alt="For Garden" width="1358" height="392"/></a><p>${t.footer}</p><span class="footer-status"><span class="live-dot"></span>${t.status}</span></div><div class="footer-bottom"><span>© ${new Date().getFullYear()} For Garden. All rights reserved.</span>${renderFooterLinks(lang)}<a class="footer-top-link" href="#home">${t.top} ${icon("up")}</a></div></footer>
 <dialog id="content-dialog"><button class="dialog-close" aria-label="${t.close}">${icon("close")}</button><div class="dialog-content"></div></dialog>`;
  renderNews();
  renderRelic();
  bind();
  cleanupScroll = mountScrollEffects();
  cleanupRegister = mountRegisterSection(
    document.querySelector<HTMLElement>("#register")!,
    lang,
  );
  // 메인 화면과 사전예약의 장식 퍼펫은 렐릭을 고를 때마다 다시 만들지 않고 화면을 그릴 때 한 번만 올린다.
  const page = ++pagePuppetVersion;
  void import("./puppets")
    .then(({ mountPuppets }) => {
      if (page === pagePuppetVersion)
        cleanupPagePuppets = mountPuppets(
          ["#home", "#register"].map((q) => document.querySelector(q)!),
        );
    })
    .catch(() => {});
}
function renderNews() {
  const t = copy[lang];
  const el = document.querySelector("#news-list")!;
  const row = (n: Notice, ended = false) =>
    `<button class="news-row${n.cover_image ? " has-cover" : ""}" data-notice="${escape(n.slug)}">${n.cover_image && safeImage(n.cover_image) ? `<img class="news-thumb" src="${escape(n.cover_image)}" alt="" loading="lazy"/>` : ""}<span class="news-category">${n.pinned ? icon("pin") : ""}${noticeTabs(lang)[ended ? 0 : ["event", "update", "plain"].indexOf(noticeKind(n))]}</span><strong lang="${escape(n.content_locale || lang)}">${escape(n.title)}${n.translation === "original" && n.content_locale !== lang ? `<span class="notice-language-marker"> · ${escape(languageNames[n.content_locale || "ko"] || "원문")}</span>` : ""}</strong><time datetime="${escape(n.published_at)}">${new Intl.DateTimeFormat(lang, { year: "numeric", month: "2-digit", day: "2-digit", timeZone: "Asia/Seoul" }).format(new Date(n.published_at))}</time>${arrow}</button>`;
  const rail = el.querySelector<HTMLElement>(".event-rail")?.scrollTop ?? 0;
  const board =
    newsState === "ready"
      ? renderNoticeBoard(notices, lang, {
          tab: category,
          pick: eventPick,
          phase: eventPhaseSel,
          row,
        })
      : "";
  el.innerHTML =
    newsState === "loading"
      ? `<p class="empty-news">${t.loading}</p>`
      : newsState === "error"
        ? `<div class="news-error">${{ ko: "소식을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.", en: "News is temporarily unavailable. Please try again.", ja: "お知らせを読み込めませんでした。もう一度お試しください。" }[lang]}<button class="retry-news">${{ ko: "다시 불러오기", en: "Try again", ja: "再読み込み" }[lang]} ${icon("retry")}</button></div>`
        : board ||
          `<div class="empty-news"><span class="empty-flower">${gameSymbol("factions", "rogue")}</span><div><strong>${t.empty}</strong><p>${t.newsFallback}</p></div><span class="archive-stamp">GARDEN<br>JOURNAL</span></div>`;
  cleanupNewsPuppets();
  cleanupNewsPuppets = () => {};
  if (el.querySelector("img[data-puppet]")) {
    const current = ++newsPuppetVersion;
    void import("./puppets")
      .then(({ mountPuppets }) => {
        if (current === newsPuppetVersion) cleanupNewsPuppets = mountPuppets(el);
      })
      .catch(() => {});
  }
  el.querySelectorAll<HTMLButtonElement>("[data-event-phase]").forEach(
    (b) =>
      (b.onclick = () => {
        eventPhaseSel = b.dataset.eventPhase as EventPhase;
        renderNews();
        document
          .querySelector<HTMLButtonElement>(
            `[data-event-phase="${eventPhaseSel}"]`,
          )
          ?.focus({ preventScroll: true });
      }),
  );
  const railEl = el.querySelector<HTMLElement>(".event-rail");
  if (railEl) railEl.scrollTop = rail;
  el.querySelectorAll<HTMLButtonElement>("[data-event-pick]").forEach(
    (b) =>
      (b.onclick = () => {
        eventPick = b.dataset.eventPick;
        renderNews();
        document
          .querySelector<HTMLButtonElement>(
            `[data-event-pick="${CSS.escape(eventPick!)}"]`,
          )
          ?.focus({ preventScroll: true });
      }),
  );
  el.querySelector<HTMLButtonElement>(".retry-news")?.addEventListener(
    "click",
    () => void loadNews(),
  );
  el.querySelectorAll<HTMLButtonElement>("[data-notice]").forEach(
    (b) => (b.onclick = () => openNotice(b.dataset.notice!)),
  );
}
function renderRelic() {
  cleanupPuppets();
  renderVersion += 1;
  document.querySelector("#relic-display")!.innerHTML = renderCodex(
    selected,
    lang,
  );
  const choose = (index: number, focus: string) => {
    const anchor = focus.startsWith("[data-relic")
      ? document.querySelector(focus)?.getBoundingClientRect().top
      : undefined;
    selected = index;
    renderRelic();
    if (anchor !== undefined) {
      const top = document.querySelector(focus)?.getBoundingClientRect().top;
      if (top !== undefined)
        window.scrollBy({ top: top - anchor, behavior: "instant" });
    }
    document
      .querySelector<HTMLButtonElement>(focus)
      ?.focus({ preventScroll: true });
  };
  document.querySelectorAll<HTMLButtonElement>("[data-relic]").forEach((b) => {
    b.onclick = () =>
      choose(Number(b.dataset.relic), `[data-relic="${b.dataset.relic}"]`);
  });
  document.querySelector<HTMLButtonElement>(".relic-prev")!.onclick = () =>
    choose((selected + relics.length - 1) % relics.length, ".relic-prev");
  document.querySelector<HTMLButtonElement>(".relic-next")!.onclick = () =>
    choose((selected + 1) % relics.length, ".relic-next");
  const current = renderVersion;
  void import("./puppets")
    .then(({ mountPuppets }) => {
      if (current === renderVersion) {
        cleanupPuppets();
        cleanupPuppets = mountPuppets(
          document.querySelector("#relic-display")!,
        );
      }
    })
    .catch(() => {});
}
function openDialog(html: string) {
  const dialog = document.querySelector<HTMLDialogElement>("dialog")!;
  dialog.querySelector(".dialog-content")!.innerHTML = html;
  dialog.showModal();
  document.body.classList.add("modal-open");
  document.dispatchEvent(new Event("garden:modal-change"));
}
// 이미지는 https 주소만 허용한다(공지 본문의 `![설명](https://…)` 한 줄 = 그림 한 장).
function originalNote(n: Notice): string {
  if (!n.content_locale || n.content_locale === lang) return "";
  const name = languageNames[n.content_locale] || n.content_locale;
  return `<p class="notice-source-note">${escape({ ko: `원문 · ${name}`, en: `Original · ${name}`, ja: `原文 · ${name}` }[lang])}</p>`;
}
function noticeMarkup(n: Notice): string {
  const contentLang = n.content_locale || lang;
  const hero = noticeHero(n, lang);
  return `${hero}<p class="eyebrow">GARDEN JOURNAL</p><h2 lang="${escape(contentLang)}">${escape(n.title)}</h2><time>${escape(n.published_at.slice(0, 10))}</time>${noticePeriod(n, lang)}${originalNote(n)}${noticeKind(n) === "plain" ? (n.cover_image && safeImage(n.cover_image) ? `<img class="notice-cover" src="${escape(n.cover_image)}" alt=""/>` : "") : ""}<div class="notice-body" lang="${escape(contentLang)}">${renderBody(n.body)}</div>`;
}
function openNotice(slug: string) {
  const n = notices.find((n) => n.slug === slug);
  if (!n) return;
  const url = new URL(location.href);
  url.searchParams.set("notice", slug);
  url.searchParams.delete("noticeLang");
  history.replaceState(null, "", url);
  openDialog(noticeMarkup(n));
}
function bind() {
  cleanupLanguagePicker = bindLanguagePicker(lang, (next) => {
    lang = next;
    try {
      localStorage.setItem("fg-language", lang);
    } catch {}
    const url = new URL(location.href);
    url.searchParams.set("lang", lang);
    url.searchParams.delete("noticeLang");
    history.replaceState(null, "", url);
    render();
    loadNews();
  });
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
  const closeNav = () => {
    nav.hidden = true;
    menu.innerHTML = icon("menu");
    menu.setAttribute("aria-expanded", "false");
  };
  document
    .querySelector(".language-trigger")!
    .addEventListener("focus", closeNav);
  nav.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeNav();
      menu.focus({ preventScroll: true });
    }
  });
  menu.onclick = () => {
    nav.hidden = !nav.hidden;
    menu.innerHTML = icon(nav.hidden ? "menu" : "close");
    menu.setAttribute("aria-expanded", String(!nav.hidden));
  };
  nav.querySelectorAll("a").forEach(
    (a) =>
      (a.onclick = () => {
        nav.hidden = true;
        menu.innerHTML = icon("menu");
        menu.setAttribute("aria-expanded", "false");
      }),
  );
  document.querySelectorAll<HTMLButtonElement>("[data-screenshot]").forEach(
    (button) =>
      (button.onclick = () => {
        const index = Number(button.dataset.screenshot);
        openDialog(
          `<figure class="screenshot-dialog"><img src="/assets/screenshots/${gameScreens[index]}.webp" alt="${screenCopy[lang].labels[index]}" width="540" height="960"/><figcaption><strong>${screenCopy[lang].labels[index]}</strong><p>${copy[lang].sample}</p></figcaption></figure>`,
        );
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
    document.dispatchEvent(new Event("garden:modal-change"));
    const url = new URL(location.href);
    url.searchParams.delete("notice");
    history.replaceState(null, "", url);
  });
  document.querySelector<HTMLFormElement>("form")!.onsubmit = submit;
}
async function loadNews() {
  const request = ++newsRequest;
  newsState = "loading";
  renderNews();
  try {
    const response = await fetch(
      `/api/notices?lang=${encodeURIComponent(lang)}`,
      {
        signal: AbortSignal.timeout(10000),
      },
    );
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
  const data = new FormData(form);
  const button = form.querySelector<HTMLButtonElement>('[type="submit"]')!;
  const status = document.querySelector<HTMLElement>("#form-status")!;
  const inputs = [...form.querySelectorAll<HTMLInputElement>("input")];
  inputs.forEach((input) =>
    input.setAttribute("aria-invalid", String(!input.validity.valid)),
  );
  if (!form.checkValidity()) {
    status.textContent = t.invalid;
    status.dataset.state = "error";
    inputs
      .find((input) => !input.validity.valid)
      ?.focus({ preventScroll: true });
    return;
  }

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
mountFeedback();
render();
void loadNews();
