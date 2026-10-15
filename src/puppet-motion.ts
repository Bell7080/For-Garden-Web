import type { Puppet } from "puppetforge";

/** Same hit settings and equal-priority hold as the game's playMotion().
 * Advance on rendered time so background/offscreen pauses cannot cut a hit short.
 */
export function createHitMotion(puppet: Pick<Puppet, "play" | "project">) {
  let remaining = 0;
  return {
    hit(): boolean {
      if (remaining > 0) return false;
      const clip = puppet.project.animations.hit;
      if (!clip || !puppet.play("hit", { speed: 2.2, strength: 0.4 }))
        return false;
      remaining = clip.duration / 2.2;
      return true;
    },
    advance(dt: number) {
      if (remaining <= 0) return;
      remaining = Math.max(0, remaining - dt);
      if (remaining === 0) puppet.play("idle");
    },
  };
}
