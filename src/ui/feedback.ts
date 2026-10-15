import { icon } from "./icons";

/** Same normal/primary timings and scales as the game's pressFeedbackStyle.ts. */
const tiers = {
  normal: { down: 0.94, downMs: 70, pop: 1.04, popMs: 200 },
  primary: { down: 0.92, downMs: 80, pop: 1.06, popMs: 230 },
};
export function mountFeedback(): () => void {
  const listeners = new AbortController();
  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  const animations = new WeakMap<HTMLElement, Animation>();
  let active: { element: HTMLElement; pointer: number } | null = null;
  let start: { x: number; y: number; pointer: number } | null = null;
  const control = (target: EventTarget | null) =>
    target instanceof Element
      ? target.closest<HTMLElement>("button,a[href],label.platform-option")
      : null;
  const tier = (e: HTMLElement) =>
    e.matches(".button,.nav-cta") ? tiers.primary : tiers.normal;
  const animate = (e: HTMLElement, frames: Keyframe[], duration: number) => {
    animations.get(e)?.cancel();
    const a = e.animate(frames, {
      duration,
      easing: "cubic-bezier(.2,.7,.2,1)",
      fill: "none",
    });
    animations.set(e, a);
  };
  const press = (e: HTMLElement) => {
    if (e.matches(":disabled,[aria-disabled=true]")) return;
    const t = tier(e);
    animate(
      e,
      reduced.matches
        ? [{ opacity: 1 }, { opacity: 0.8 }]
        : [{ scale: "1" }, { scale: String(t.down) }],
      t.downMs,
    );
    if (!reduced.matches) e.style.scale = String(t.down);
  };
  const release = (e: HTMLElement, pop: boolean) => {
    const t = tier(e);
    e.style.removeProperty("scale");
    animate(
      e,
      reduced.matches
        ? [{ opacity: 0.8 }, { opacity: 1 }]
        : pop
          ? [
              { scale: String(t.down) },
              { scale: String(t.pop), offset: 0.4 },
              { scale: "1" },
            ]
          : [{ scale: String(t.down) }, { scale: "1" }],
      reduced.matches ? 90 : t.popMs,
    );
  };
  const layer = document.createElement("div");
  layer.className = "click-effects";
  layer.setAttribute("aria-hidden", "true");
  document.body.append(layer);
  function spark(x: number, y: number, target: EventTarget | null) {
    if (
      reduced.matches ||
      (target instanceof Element &&
        target.closest("input,textarea,[contenteditable=true]")) ||
      !getSelection()?.isCollapsed
    )
      return;
    const mark = document.createElement("span");
    mark.className = "click-spark";
    mark.style.left = `${x}px`;
    mark.style.top = `${y}px`;
    mark.innerHTML = icon("star") + "<i></i><i></i><i></i><i></i>";
    const modal =
      target instanceof Element ? target.closest("dialog[open]") : null;
    (modal ?? layer).append(mark);
    mark.addEventListener("animationend", () => mark.remove(), { once: true });
    setTimeout(() => mark.remove(), 650);
    while (layer.children.length > 12) layer.firstElementChild?.remove();
  }
  document.addEventListener(
    "pointerdown",
    (event) => {
      if (event.button !== 0 || !event.isPrimary) return;
      start = { x: event.clientX, y: event.clientY, pointer: event.pointerId };
      const e = control(event.target);
      if (e) {
        active = { element: e, pointer: event.pointerId };
        press(e);
      }
    },
    { signal: listeners.signal },
  );
  document.addEventListener(
    "pointerup",
    (event) => {
      if (active?.pointer === event.pointerId) {
        release(active.element, active.element.contains(event.target as Node));
        active = null;
      }
      if (
        start?.pointer === event.pointerId &&
        Math.hypot(event.clientX - start.x, event.clientY - start.y) < 8
      )
        spark(event.clientX, event.clientY, event.target);
      start = null;
    },
    { signal: listeners.signal },
  );
  document.addEventListener(
    "pointercancel",
    () => {
      if (active) release(active.element, false);
      active = null;
      start = null;
    },
    { signal: listeners.signal },
  );
  window.addEventListener(
    "blur",
    () => {
      if (active) release(active.element, false);
      active = null;
      start = null;
    },
    { signal: listeners.signal },
  );
  document.addEventListener(
    "keydown",
    (event) => {
      if (event.repeat || !["Enter", " "].includes(event.key)) return;
      const e = control(event.target);
      if (e) press(e);
    },
    { signal: listeners.signal },
  );
  document.addEventListener(
    "keyup",
    (event) => {
      if (!["Enter", " "].includes(event.key)) return;
      const e = control(event.target);
      if (e) release(e, true);
    },
    { signal: listeners.signal },
  );
  return () => {
    listeners.abort();
    layer.remove();
  };
}
