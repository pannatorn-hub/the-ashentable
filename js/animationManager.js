// animationManager.js (v7 — NEW)
// ---------------------------------------------------------------------------
// Replays the structured combat event stream (combat.js v7) as timed visual
// cues over a *stable* battle DOM (gameController.js v7's mountBattle).
//
// Design rules (see the Phase 2 roadmap):
//   1. OWNS ZERO GAME STATE. Combat already happened; this is a film of it.
//      Every event carries { playerHp, enemyHp } snapshots — the replay
//      tweens to those, never recomputes anything.
//   2. NEVER BLOCKS. Everything is await-driven off setTimeout /
//      animationend; the main thread stays free.
//   3. NEVER SOFT-LOCKS. Every class-based cue has a fuse timeout — if a
//      stylesheet is missing or a class name typos, the cue resolves anyway
//      and the battle continues as a cosmetic (not functional) bug.
//   4. ALWAYS SKIPPABLE. skip() collapses every wait() to ~0 and the replay
//      finishes in a couple of frames at the exact correct final state.
//      prefers-reduced-motion starts every replay pre-skipped.
//   5. DIES SAFELY. If the DOM refs disappear mid-replay (the player
//      navigated away), every helper no-ops on null and play() completes
//      harmlessly.
//
// User-facing float text (พลาด! etc.) goes through i18n like everything else.
// ---------------------------------------------------------------------------

import { t } from './i18n.js';
import { SkillType } from './combat.js';

const REDUCED_MOTION = typeof matchMedia === 'function'
  && matchMedia('(prefers-reduced-motion: reduce)').matches;

// Pacing: normal cues 150–450ms, "money moments" (counter/signature/ko) 500–900ms.
const PACE = Object.freeze({
  microBeat: 120,
  logBeat: 160,
  hitStop: 70,        // frozen frame before a crit lands — classic impact trick
  stanceBeat: 260,
  dodgeBeat: 240,
  counterBeat: 520,
  signatureBeat: 780,
  koBeat: 820,
});

// ---------------- Low-level DOM cue toolkit ----------------

/**
 * Add a class, await its CSS animation end, then remove the class.
 * The fuse timeout is non-negotiable: a missing stylesheet or a typo'd
 * class name must degrade to "no visual", never to a hung battle.
 */
export function playClass(el, className, maxMs = 900) {
  if (!el || !el.isConnected) return Promise.resolve();
  return new Promise((resolve) => {
    let settled = false;
    const done = () => {
      if (settled) return;
      settled = true;
      el.classList.remove(className);
      el.removeEventListener('animationend', done);
      resolve();
    };
    el.addEventListener('animationend', done, { once: true });
    setTimeout(done, maxMs); // the fuse
    // Restart-safe: if the class is somehow still present, force a reflow re-trigger.
    el.classList.remove(className);
    void el.offsetWidth;
    el.classList.add(className);
  });
}

/** Floating combat number/word. Self-positioning over the target card, self-removing. */
export function spawnFloatText(fxLayer, targetCard, text, kind /* 'dmg'|'crit'|'heal'|'dodge'|'dot' */) {
  if (!fxLayer || !fxLayer.isConnected || !targetCard || !targetCard.isConnected) return;
  const n = document.createElement('span');
  n.className = `float-num float-${kind}`;
  n.textContent = text;
  const r = targetCard.getBoundingClientRect();
  const f = fxLayer.getBoundingClientRect();
  const jitter = Math.random() * 44 - 22;
  n.style.left = `${r.left - f.left + r.width / 2 + jitter}px`;
  n.style.top = `${r.top - f.top + 6}px`;
  n.addEventListener('animationend', () => n.remove(), { once: true });
  setTimeout(() => n.remove(), 1400); // fuse: never leak nodes
  fxLayer.appendChild(n);
}

/** Full-width banner for Signature moments (text is the already-Thai log line). */
function spawnSignatureBanner(fxLayer, text) {
  if (!fxLayer || !fxLayer.isConnected) return Promise.resolve();
  const b = document.createElement('div');
  b.className = 'sig-banner';
  b.textContent = text;
  fxLayer.appendChild(b);
  return new Promise((resolve) => {
    const done = () => { b.remove(); resolve(); };
    b.addEventListener('animationend', done, { once: true });
    setTimeout(done, 1200); // fuse
  });
}

export function shake(el, cls = 'shake-md') { return playClass(el, cls, 600); }

/** VFX class name for a skill's impact (v7.1 swaps these to spritesheets). */
function impactClassFor(skill) {
  switch (skill) {
    case SkillType.HEAVY_ATTACK: return 'impact-heavy';
    case SkillType.QUICK_STRIKE: return 'impact-quick';
    default: return 'impact-heavy';
  }
}

// ---------------- Battle-DOM patch helpers ----------------

/** Prepend a log line (bs.log is newest-first in the v6 UI convention) and trim. */
function appendLogLine(logList, ev) {
  if (!logList || !logList.isConnected) return;
  const hint = logList.querySelector('.log-hint');
  if (hint) hint.remove();
  const li = document.createElement('li');
  li.className = `log-${ev.outcome} log-enter`;
  li.textContent = ev.text;
  logList.prepend(li);
  while (logList.children.length > 6) logList.lastElementChild.remove();
}

/** Tween both HP bars to this event's snapshot (CSS width transition does the easing). */
function syncHpBars(refs, ev) {
  if (typeof ev.playerHp !== 'number') return; // defensive: pre-v7 entry shape
  setHp(refs.playerHpFill, refs.playerHpText, ev.playerHp, refs.playerMaxHp);
  setHp(refs.enemyHpFill, refs.enemyHpText, ev.enemyHp, refs.enemyMaxHp);
}

function setHp(fillEl, textEl, hp, maxHp) {
  if (fillEl && fillEl.isConnected && maxHp > 0) {
    fillEl.style.width = `${Math.max(0, Math.min(100, (hp / maxHp) * 100))}%`;
  }
  if (textEl && textEl.isConnected) textEl.textContent = `${hp} / ${maxHp}`;
}

function cardOf(refs, side) { return side === 'player' ? refs.playerCard : refs.enemyCard; }
function otherSide(side) { return side === 'player' ? 'enemy' : 'player'; }

// ---------------- The manager ----------------

export class AnimationManager {
  constructor() {
    this.playing = false;
    this.fastForward = false;
    this.cueHandlers = new Map(); // outcome -> async (ev, refs, mgr) => void
    registerDefaultCues(this);
  }

  register(outcome, handler) { this.cueHandlers.set(outcome, handler); }

  /** Tap-to-fast-forward: collapse every remaining wait to ~0. */
  skip() { if (this.playing) this.fastForward = true; }

  /** All timing routes through here so skip()/reduced-motion collapse it. */
  wait(ms) {
    return new Promise((resolve) => setTimeout(resolve, this.fastForward ? 0 : ms));
  }

  /**
   * Replay a chronologically-ordered slice of combat events over the stable
   * battle DOM. Resolves when the last cue lands (instantly if fast-forwarded).
   * Re-entry is the caller's job to prevent (gameController blocks input
   * while playing) — but a second call while playing is still refused here.
   */
  async play(events, refs) {
    if (this.playing || !events || events.length === 0) return;
    this.playing = true;
    this.fastForward = REDUCED_MOTION;
    try {
      for (const ev of events) {
        const handler = this.cueHandlers.get(ev.outcome) || defaultCue;
        try {
          await handler(ev, refs || {}, this);
        } catch (err) {
          console.error('animation cue failed (continuing replay)', ev.outcome, err);
        }
        appendLogLine(refs && refs.logList, ev);
        syncHpBars(refs || {}, ev);
        await this.wait(PACE.logBeat);
      }
    } finally {
      this.playing = false;
      this.fastForward = false;
    }
  }
}

// ---------------- Default cue set ----------------

function registerDefaultCues(am) {
  // A landed attack: attacker lunges, impact flashes on the target,
  // damage floats, target flinches.
  am.register('hit', async (ev, refs, m) => {
    const atk = cardOf(refs, ev.side);
    const tgt = cardOf(refs, ev.targetSide || otherSide(ev.side));
    await playClass(atk, ev.side === 'player' ? 'lunge-right' : 'lunge-left', 500);
    playClass(tgt, impactClassFor(ev.skill), 500); // fire & forget overlay flash
    if (typeof ev.dmg === 'number') spawnFloatText(refs.fxLayer, tgt, `-${ev.dmg}`, 'dmg');
    await playClass(tgt, 'hurt-flash', 500);
    await m.wait(PACE.microBeat);
  });

  // A crit: same skeleton, plus a hit-stop beat and an arena shake.
  am.register('crit', async (ev, refs, m) => {
    const atk = cardOf(refs, ev.side);
    const tgt = cardOf(refs, ev.targetSide || otherSide(ev.side));
    await playClass(atk, ev.side === 'player' ? 'lunge-right' : 'lunge-left', 500);
    await m.wait(PACE.hitStop); // the frozen frame that sells the impact
    shake(refs.arena, 'shake-lg');
    if (typeof ev.dmg === 'number') spawnFloatText(refs.fxLayer, tgt, `-${ev.dmg}`, 'crit');
    await playClass(tgt, 'hurt-flash-crit', 600);
    await m.wait(PACE.microBeat);
  });

  // A dodge: ev.side is the dodger. Slip sideways, "พลาด!" floats.
  am.register('dodge', async (ev, refs, m) => {
    const dodger = cardOf(refs, ev.side);
    spawnFloatText(refs.fxLayer, dodger, t('fx.miss'), 'dodge');
    await playClass(dodger, 'dodge-slip', 500);
    await m.wait(PACE.dodgeBeat - PACE.microBeat);
  });

  // The money moment: a stance counter. Parry flash on the defender,
  // the punished attacker takes the reversed hit, the arena rocks.
  am.register('counter', async (ev, refs, m) => {
    const defender = cardOf(refs, ev.side);
    const punished = cardOf(refs, ev.targetSide || otherSide(ev.side));
    await playClass(defender, 'parry-flash', 600);
    shake(refs.arena, 'shake-lg');
    if (typeof ev.dmg === 'number') spawnFloatText(refs.fxLayer, punished, `-${ev.dmg}`, 'crit');
    await playClass(punished, 'hurt-flash-crit', 600);
    await m.wait(PACE.counterBeat - 300);
  });

  // Setting a stance: a brief guard aura on the actor.
  am.register('stance', async (ev, refs, m) => {
    await playClass(cardOf(refs, ev.side), 'stance-aura', 500);
    await m.wait(PACE.stanceBeat - PACE.microBeat);
  });

  // Signature: dim banner sweep with the (already-Thai) log line; any
  // payload dmg/heal floats on top of it.
  am.register('signature', async (ev, refs, m) => {
    const bannerDone = m.fastForward ? Promise.resolve() : spawnSignatureBanner(refs.fxLayer, ev.text);
    if (typeof ev.dmg === 'number') {
      spawnFloatText(refs.fxLayer, cardOf(refs, ev.targetSide || 'enemy'), `-${ev.dmg}`, 'crit');
    }
    if (typeof ev.heal === 'number') {
      spawnFloatText(refs.fxLayer, cardOf(refs, ev.side), `+${ev.heal}`, 'heal');
    }
    await Promise.race([bannerDone, m.wait(PACE.signatureBeat)]);
    await bannerDone;
  });

  // Burn tick: ember pulse + orange float on the burned side.
  am.register('dot', async (ev, refs, m) => {
    const tgt = cardOf(refs, ev.targetSide || ev.side);
    if (typeof ev.dmg === 'number') spawnFloatText(refs.fxLayer, tgt, `-${ev.dmg}`, 'dot');
    await playClass(tgt, 'burn-pulse', 500);
    await m.wait(PACE.microBeat);
  });

  // Passives (thorns / vampiric / fleetfoot): float what the payload says, keep it quick.
  am.register('passive', async (ev, refs, m) => {
    if (typeof ev.heal === 'number') {
      spawnFloatText(refs.fxLayer, cardOf(refs, ev.side), `+${ev.heal}`, 'heal');
    }
    if (typeof ev.dmg === 'number') {
      spawnFloatText(refs.fxLayer, cardOf(refs, ev.targetSide || otherSide(ev.side)), `-${ev.dmg}`, 'dmg');
    }
    await m.wait(PACE.microBeat);
  });

  // The fall. Loser desaturates and crumples; the win/lose screen comes after.
  am.register('ko', async (ev, refs, m) => {
    const fallen = cardOf(refs, ev.koSide || ev.side);
    await playClass(fallen, 'ko-fall', 950);
    await m.wait(m.fastForward ? 0 : PACE.koBeat - 700);
  });

  // 'info' (e.g. ท่าไม้ตายยังชาร์จไม่เต็ม) and anything unknown: just the log line.
  am.register('info', defaultCue);
}

async function defaultCue(ev, refs, m) { await m.wait(PACE.microBeat); }
