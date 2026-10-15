/** Native scroll remains untouched: one-shot reveals and one coalesced progress update. */
export function mountScrollEffects(): () => void {
  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  const bar = document.createElement("div");
  bar.className = "scroll-progress";
  bar.setAttribute("aria-hidden", "true");
  document.body.append(bar);
  let height = 1;
  let frame = 0;
  const measure = () => {
    height = Math.max(1, document.documentElement.scrollHeight - innerHeight);
    update();
  };
  const update = () => {
    if (frame) return;
    frame = requestAnimationFrame(() => {
      frame = 0;
      bar.style.transform = `scaleX(${Math.min(1, Math.max(0, scrollY / height))})`;
    });
  };
  const resize = new ResizeObserver(measure);
  resize.observe(document.body);
  measure();
  document.addEventListener("scroll", update, { passive: true });
  window.addEventListener("resize", measure, { passive: true });
  const ambient = new Map<HTMLElement, boolean>();
  const pauseAmbient = () =>
    ambient.forEach(
      (visible, element) =>
        (element.style.animationPlayState =
          visible &&
          !document.hidden &&
          !reduced.matches &&
          !document.body.classList.contains("modal-open")
            ? "running"
            : "paused"),
    );
  const ambience = new IntersectionObserver((entries) => {
    entries.forEach((entry) =>
      ambient.set(entry.target as HTMLElement, entry.isIntersecting),
    );
    pauseAmbient();
  });
  document.querySelectorAll<HTMLElement>(".ambient-dots").forEach((e) => {
    ambient.set(e, false);
    ambience.observe(e);
  });
  document.addEventListener("visibilitychange", pauseAmbient);
  document.addEventListener("garden:modal-change", pauseAmbient);
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        const element = entry.target as HTMLElement;
        observer.unobserve(element);
        element.classList.remove("reveal-pending");
        if (!reduced.matches)
          element.animate(
            [
              { opacity: 0, translate: "0 18px" },
              { opacity: 1, translate: "0 0" },
            ],
            {
              duration: 480,
              easing: "cubic-bezier(.2,.65,.3,1)",
              fill: "none",
            },
          );
      }
    },
    { threshold: 0.08, rootMargin: "0px 0px -28px 0px" },
  );
  const targets = [
    ...document.querySelectorAll<HTMLElement>(
      ".section-heading,.world-copy,.feature,.register-copy",
    ),
  ];
  if (!reduced.matches)
    targets.forEach((e) => {
      if (e.getBoundingClientRect().top > innerHeight)
        e.classList.add("reveal-pending");
      observer.observe(e);
    });
  const onMotion = () => {
    pauseAmbient();
    if (reduced.matches) {
      observer.disconnect();
      targets.forEach((e) => {
        e.classList.remove("reveal-pending");
        e.getAnimations().forEach((a) => a.cancel());
      });
    }
  };
  reduced.addEventListener("change", onMotion);
  return () => {
    observer.disconnect();
    ambience.disconnect();
    resize.disconnect();
    bar.remove();
    cancelAnimationFrame(frame);
    document.removeEventListener("scroll", update);
    document.removeEventListener("visibilitychange", pauseAmbient);
    document.removeEventListener("garden:modal-change", pauseAmbient);
    window.removeEventListener("resize", measure);
    reduced.removeEventListener("change", onMotion);
    targets.forEach((e) => e.classList.remove("reveal-pending"));
  };
}
