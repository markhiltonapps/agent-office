import type { AudioCore } from '../../sound/core';

// The alarm for a worker that has stopped to ask you something.

/** The notes of the alarm, and of the reminder: [Hz, seconds in]. */
const ALARM: readonly (readonly [number, number])[] = [[784, 0], [1047, 0.13], [784, 0.42], [1175, 0.55]];
const AGAIN: readonly (readonly [number, number])[] = [[784, 0], [1047, 0.13]];

/** When each tap of the knock lands: [seconds in]. The fist on screen (see ui.ts) hits at the same moments. */
const KNOCK: readonly number[] = [0.13, 0.35, 0.57];

/**
 * Three quick taps on the glass, for a worker that needs you: a bright tick with a hollow ring under it,
 * each a hair different from the last so it doesn't sound like a machine.
 */
export function knock(a: AudioCore) {
  a.unlock();
  const ctx = a.ctx;
  if (!ctx) return;
  if (ctx.state === 'suspended') void ctx.resume();
  a.count('knock');
  KNOCK.forEach((at, i) => {
    const t0 = ctx.currentTime + at;
    const drift = 1 + (i - 1) * 0.03;
    // [Hz, level, seconds it rings]: the tick, its glassy overtone, and the thump of the pane under it.
    for (const [f, amp, len] of [
      [2350, 0.32, 0.09],
      [3520, 0.14, 0.06],
      [1180, 0.2, 0.15],
    ]) {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = 'sine';
      o.frequency.value = f * drift;
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(amp, t0 + 0.004);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + len);
      o.connect(g).connect(a.alerts);
      o.start(t0);
      o.stop(t0 + len + 0.05);
    }
  });
}

/**
 * Two rising pairs, brighter and louder than the ding for a worker that's done, so one is never taken
 * for the other. `again` is the reminder while it's still waiting: one pair, soft.
 */
export function needsYou(a: AudioCore, again = false) {
  a.unlock();
  const ctx = a.ctx;
  if (!ctx) return;
  if (ctx.state === 'suspended') void ctx.resume();
  a.count(again ? 'needs-you-again' : 'needs-you');
  const level = again ? 0.14 : 0.34;
  for (const [f, at] of again ? AGAIN : ALARM) {
    const t0 = ctx.currentTime + at;
    // A bell: the note, and a quieter one an octave up that dies away sooner.
    for (const [mult, amp, len] of [
      [1, level, 0.34],
      [2, level * 0.3, 0.16],
    ]) {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = 'triangle';
      o.frequency.value = f * mult;
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(amp, t0 + 0.015);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + len);
      o.connect(g).connect(a.alerts);
      o.start(t0);
      o.stop(t0 + len + 0.05);
    }
  }
}
