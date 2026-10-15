import { describe, expect, it, vi } from "vitest";
import type { Puppet } from "puppetforge";
import { createHitMotion } from "../src/puppet-motion";

function setup(duration = 1.1) {
  const play = vi.fn(() => true);
  const project = { animations: { hit: { duration } } } as Puppet["project"];
  return { play, project, motion: createHitMotion({ play, project }) };
}

describe("original game hit playback", () => {
  it("uses game speed/strength and the exported duration before returning to idle", () => {
    const { play, motion } = setup();
    expect(motion.hit()).toBe(true);
    expect(play).toHaveBeenLastCalledWith("hit", { speed: 2.2, strength: 0.4 });
    motion.advance(0.49);
    expect(play).toHaveBeenCalledTimes(1);
    motion.advance(0.02);
    expect(play).toHaveBeenLastCalledWith("idle");
    motion.advance(10);
    expect(play).toHaveBeenCalledTimes(2);
  });

  it("holds an equal priority hit during rapid taps without delaying the next reaction", () => {
    const { play, motion } = setup();
    motion.hit();
    motion.advance(0.25);
    expect(motion.hit()).toBe(false);
    motion.advance(0.25);
    expect(play).toHaveBeenLastCalledWith("idle");
    expect(motion.hit()).toBe(true);
    motion.advance(0.25);
    expect(play).toHaveBeenLastCalledWith("hit", { speed: 2.2, strength: 0.4 });
    motion.advance(0.25);
    expect(play).toHaveBeenLastCalledWith("idle");
  });

  it("pauses with render time and uses each asset's own clip length", () => {
    const { play, motion } = setup(2.2);
    motion.hit();
    motion.advance(0);
    motion.advance(0.75);
    expect(play).toHaveBeenCalledTimes(1);
    motion.advance(0.25);
    expect(play).toHaveBeenLastCalledWith("idle");
  });

  it("leaves idle untouched when the asset lacks hit or playback fails", () => {
    const { play, project } = setup();
    delete project.animations.hit;
    expect(createHitMotion({ play, project }).hit()).toBe(false);
    expect(play).not.toHaveBeenCalled();
    const failed = setup();
    failed.play.mockReturnValue(false);
    expect(failed.motion.hit()).toBe(false);
    failed.motion.advance(10);
    expect(failed.play).toHaveBeenCalledTimes(1);
  });
});
