import type { Locale } from "../content";
import {
  MILESTONES,
  formatCount,
  milestoneProgress,
  reachedMilestones,
} from "../preregistration";

const text = {
  label: {
    ko: "사전예약 달성 보상",
    en: "Pre-registration rewards",
    ja: "事前登録達成報酬",
  },
  now: { ko: "현재 사전예약", en: "Pre-registered", ja: "現在の事前登録" },
  unit: { ko: "명", en: "", ja: "名" },
  goal: { ko: "{n}명", en: "{n}", ja: "{n}名" },
  note: {
    ko: "달성한 보상은 출시 후 모든 연구원에게 우편으로 지급됩니다.",
    en: "Unlocked rewards are mailed to every researcher after launch.",
    ja: "達成した報酬はリリース後、すべての研究員に郵便で届きます。",
  },
  reached: { ko: "달성", en: "Unlocked", ja: "達成" },
  locked: { ko: "미달성", en: "Locked", ja: "未達成" },
  at: { ko: "{n} 달성 시 지급", en: "Unlocks at {n}", ja: "{n}達成で獲得" },
} as const;

/** Milestone gauge markup. Count stays hidden until the server reports a real number. */
export function registerMilestones(lang: Locale) {
  const n = MILESTONES.length;
  const nodes = MILESTONES.map((m, i) => {
    const goal = text.goal[lang].replace("{n}", formatCount(m.goal, lang));
    return `<li class="milestone" style="--at:${(i + 1) / n}" data-index="${i}"><button type="button" class="milestone-reward" aria-expanded="false" aria-controls="milestone-tip" aria-label="${m.name[lang]} ${formatCount(m.amount, lang)} · ${goal}"><img src="/assets/game/currency/${m.icon}.webp" alt="" width="48" height="48" loading="lazy"/><b aria-hidden="true">${formatCount(m.amount, lang)}</b></button><span class="milestone-node" aria-hidden="true"></span><span class="milestone-goal" aria-hidden="true">${goal}</span></li>`;
  }).join("");
  return `<section class="register-milestones" aria-labelledby="milestone-title"><div class="milestone-head"><h3 id="milestone-title">${text.label[lang]}</h3><p class="milestone-count" hidden><span>${text.now[lang]}</span><strong data-count>0</strong><em>${text.unit[lang]}</em></p></div><div class="milestone-gauge"><div class="milestone-track" aria-hidden="true"><span class="milestone-fill"></span><span class="milestone-glint"></span></div><ol class="milestone-list">${nodes}</ol><div id="milestone-tip" class="milestone-tip" role="region" aria-live="polite" hidden></div></div><small>${text.note[lang]}</small></section>`;
}

/**
 * Fetch the total once, then fill the gauge and count up the first time the gauge is seen.
 * Scene loops run only while the section is on screen, the tab is visible and no modal is open.
 */
export function mountRegisterSection(root: HTMLElement, lang: Locale) {
  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  const gauge = root.querySelector<HTMLElement>(".register-milestones");
  let alive = true;
  let seen = false;
  let count: number | null = null;
  let frame = 0;
  let onScreen = false;
  const live = () =>
    root.classList.toggle(
      "is-live",
      onScreen &&
        !document.hidden &&
        !reduced.matches &&
        !document.body.classList.contains("modal-open"),
    );
  const sceneObserver = new IntersectionObserver((entries) => {
    onScreen = entries.some((e) => e.isIntersecting);
    live();
  });
  sceneObserver.observe(root);
  document.addEventListener("visibilitychange", live);
  document.addEventListener("garden:modal-change", live);
  reduced.addEventListener("change", live);

  const paint = () => {
    if (!gauge || count === null || !seen) return;
    const output = gauge.querySelector<HTMLElement>("[data-count]")!;
    gauge.querySelector<HTMLElement>(".milestone-count")!.hidden = false;
    const target = milestoneProgress(count);
    const reached = reachedMilestones(count);
    const bar = gauge.querySelector<HTMLElement>(".milestone-gauge")!;
    bar.style.setProperty("--progress", String(target));
    gauge.querySelectorAll<HTMLElement>(".milestone").forEach((node, i) => {
      node.classList.toggle("is-reached", i < reached);
      node.classList.toggle("is-next", i === reached);
    });
    bar.classList.add("is-filled");
    const final = count;
    if (reduced.matches) {
      output.textContent = formatCount(final, lang);
      return;
    }
    const start = performance.now();
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / 1400);
      output.textContent = formatCount(final * (1 - (1 - t) ** 3), lang);
      if (t < 1 && alive) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
  };
  // 보상 아이콘을 누르면 그 아이템이 무엇인지 쪽지를 띄운다. 한 번에 하나, 다시 누르거나
  // 바깥을 누르거나 Esc로 닫는다. 키보드 포커스는 버튼에 그대로 남는다.
  const tip = gauge?.querySelector<HTMLElement>(".milestone-tip");
  const buttons = [
    ...(gauge?.querySelectorAll<HTMLButtonElement>(".milestone-reward") ?? []),
  ];
  let openIndex = -1;
  const closeTip = () => {
    if (!tip || openIndex < 0) return;
    buttons[openIndex].setAttribute("aria-expanded", "false");
    buttons[openIndex].closest(".milestone")!.classList.remove("is-open");
    tip.hidden = true;
    openIndex = -1;
  };
  const openTip = (index: number) => {
    if (!tip || !gauge) return;
    closeTip();
    const m = MILESTONES[index];
    const node = buttons[index].closest<HTMLElement>(".milestone")!;
    const goal = text.goal[lang].replace("{n}", formatCount(m.goal, lang));
    const done = node.classList.contains("is-reached");
    tip.innerHTML = `<strong>${m.name[lang]} <em>×${formatCount(m.amount, lang)}</em></strong><p>${m.desc[lang]}</p><span class="milestone-tip-state${done ? " is-done" : ""}">${text.at[lang].replace("{n}", goal)} · ${done ? text.reached[lang] : text.locked[lang]}</span>`;
    tip.hidden = false;
    const bar = tip.parentElement!.getBoundingClientRect();
    const icon = buttons[index].getBoundingClientRect();
    const width = tip.offsetWidth;
    const center = icon.left + icon.width / 2 - bar.left;
    tip.style.left = `${Math.max(0, Math.min(bar.width - width, center - width / 2))}px`;
    tip.style.setProperty(
      "--arrow",
      `${center - parseFloat(tip.style.left)}px`,
    );
    buttons[index].setAttribute("aria-expanded", "true");
    node.classList.add("is-open");
    openIndex = index;
  };
  const events = new AbortController();
  buttons.forEach((button, i) =>
    button.addEventListener(
      "click",
      () => (openIndex === i ? closeTip() : openTip(i)),
      { signal: events.signal },
    ),
  );
  document.addEventListener(
    "pointerdown",
    (e) => {
      const target = e.target as Element | null;
      if (target?.closest(".milestone-reward, .milestone-tip")) return;
      closeTip();
    },
    { signal: events.signal },
  );
  document.addEventListener(
    "keydown",
    (e) => {
      if (e.key !== "Escape" || openIndex < 0) return;
      const button = buttons[openIndex];
      closeTip();
      button.focus({ preventScroll: true });
    },
    { signal: events.signal },
  );
  window.addEventListener("resize", closeTip, { signal: events.signal });

  const gaugeObserver = new IntersectionObserver(
    (entries) => {
      if (!entries.some((e) => e.isIntersecting)) return;
      gaugeObserver.disconnect();
      seen = true;
      paint();
    },
    { threshold: 0.35 },
  );
  if (gauge) gaugeObserver.observe(gauge);
  void fetch("/api/preregister-count", { signal: AbortSignal.timeout(8000) })
    .then((r) => (r.ok ? r.json() : null))
    .then((body) => {
      if (!alive || typeof body?.count !== "number") return;
      count = body.count;
      paint();
    })
    .catch(() => {});

  return () => {
    alive = false;
    events.abort();
    cancelAnimationFrame(frame);
    sceneObserver.disconnect();
    gaugeObserver.disconnect();
    document.removeEventListener("visibilitychange", live);
    document.removeEventListener("garden:modal-change", live);
    reduced.removeEventListener("change", live);
    root.classList.remove("is-live");
  };
}
