// classes.js (v6 — NEW)
// ---------------------------------------------------------------------------
// The 12 Classes, extracted from player.js so class DATA has one home:
//   - baseStats + signature + portrait (unchanged from v5)
//   - v6: each class carries a HIDDEN UNIQUE SKILL — a dormant passive that
//     AWAKENS permanently the first time the player's TOTAL stats (base +
//     gear) cross its threshold. Checked on level up, stat allocation, and
//     every gear change (see GameController.checkHiddenAwakening).
//
// Hidden skills are generic effect descriptors executed by combat.js —
// exactly the same discipline as signatures: adding/retuning a class means
// editing data here, never combat code. Effect types combat.js understands:
//   onLowHpBuff {stat,pct,hpThresh} — first time HP < thresh: battle-long buff
//   secondWind {healPct}            — once/battle: survive a lethal hit at 1 HP, then heal
//   firstVanish                     — begin every battle already vanished
//   sigStart {value}                — signature gauge starts at {value} (100 = instant)
//   sigGain {bonus}                 — +{bonus} gauge per action
//   dotAmp {pct}                    — player-applied burns deal +pct
//   executioner {pct,hpThresh}      — +pct damage vs enemies below hpThresh HP
//   doubleStrike {chance}           — attacks may strike twice (2nd hit at 50%)
//   startBuff {stat,pct}            — battle-long buff from turn one
//   reflect {pct}                   — reflect pct of damage taken
//   critBurn                        — landed crits apply burn
//
// Display text lives in i18n under class.*, sig.*, hidden.* keys.
// Zero DOM dependencies.
// ---------------------------------------------------------------------------

import { t } from './i18n.js';

export const CLASS_DEFINITIONS = Object.freeze({
  warrior: {
    id: 'warrior',
    baseStats: { maxHp: 140, atk: 14, def: 15, speed: 8, dodge: 4, accuracy: 5, critRate: 5, critDamage: 20, spellSpeed: 0, dotPower: 0, lifesteal: 0 },
    signature: { id: 'rally', effects: [{ type: 'heal', pct: 0.15 }, { type: 'buff', stat: 'def', pct: 0.30, turns: 2 }] },
    hidden: { id: 'lastbastion', unlock: { stat: 'def', threshold: 100 }, effect: { type: 'onLowHpBuff', stat: 'def', pct: 0.60, hpThresh: 0.30 } },
    portrait: { tint: '#a7333f', glyph: 'sword' },
  },
  berserker: {
    id: 'berserker',
    baseStats: { maxHp: 120, atk: 18, def: 8, speed: 9, dodge: 3, accuracy: 4, critRate: 10, critDamage: 40, spellSpeed: 0, dotPower: 0, lifesteal: 5 },
    signature: { id: 'bloodrage', effects: [{ type: 'buff', stat: 'atk', pct: 0.40, turns: 2 }] },
    hidden: { id: 'deathwish', unlock: { stat: 'atk', threshold: 90 }, effect: { type: 'onLowHpBuff', stat: 'atk', pct: 0.50, hpThresh: 0.40 } },
    portrait: { tint: '#c2452f', glyph: 'axe' },
  },
  paladin: {
    id: 'paladin',
    baseStats: { maxHp: 150, atk: 12, def: 16, speed: 7, dodge: 3, accuracy: 6, critRate: 3, critDamage: 10, spellSpeed: 5, dotPower: 0, lifesteal: 0 },
    signature: { id: 'sanctuary', effects: [{ type: 'heal', pct: 0.25 }] },
    hidden: { id: 'martyrlight', unlock: { stat: 'maxHp', threshold: 400 }, effect: { type: 'secondWind', healPct: 0.35 } },
    portrait: { tint: '#d9b45c', glyph: 'shield' },
  },
  assassin: {
    id: 'assassin',
    baseStats: { maxHp: 90, atk: 14, def: 6, speed: 18, dodge: 17, accuracy: 10, critRate: 15, critDamage: 50, spellSpeed: 0, dotPower: 0, lifesteal: 0 },
    signature: { id: 'vanish', effects: [{ type: 'vanish' }] },
    hidden: { id: 'phantomstep', unlock: { stat: 'speed', threshold: 50 }, effect: { type: 'firstVanish' } },
    portrait: { tint: '#3e8e7e', glyph: 'dagger' },
  },
  mage: {
    id: 'mage',
    baseStats: { maxHp: 80, atk: 19, def: 6, speed: 11, dodge: 8, accuracy: 8, critRate: 8, critDamage: 30, spellSpeed: 15, dotPower: 4, lifesteal: 0 },
    signature: { id: 'overcharge', effects: [{ type: 'overcharge' }] },
    hidden: { id: 'arcanetorrent', unlock: { stat: 'spellSpeed', threshold: 45 }, effect: { type: 'sigStart', value: 100 } },
    portrait: { tint: '#c98a3f', glyph: 'staff' },
  },
  warlock: {
    id: 'warlock',
    baseStats: { maxHp: 95, atk: 15, def: 7, speed: 10, dodge: 7, accuracy: 7, critRate: 5, critDamage: 20, spellSpeed: 12, dotPower: 10, lifesteal: 5 },
    signature: { id: 'curse', effects: [{ type: 'dot', mult: 2.5, ticks: 3 }] },
    hidden: { id: 'plaguebearer', unlock: { stat: 'dotPower', threshold: 35 }, effect: { type: 'dotAmp', pct: 0.75 } },
    portrait: { tint: '#6a5dc9', glyph: 'scythe' },
  },
  ranger: {
    id: 'ranger',
    baseStats: { maxHp: 100, atk: 15, def: 7, speed: 14, dodge: 10, accuracy: 15, critRate: 12, critDamage: 35, spellSpeed: 5, dotPower: 0, lifesteal: 0 },
    signature: { id: 'aimedshot', effects: [{ type: 'surecrit' }] },
    hidden: { id: 'hawkeye', unlock: { stat: 'accuracy', threshold: 45 }, effect: { type: 'executioner', pct: 0.40, hpThresh: 0.35 } },
    portrait: { tint: '#5a9e4b', glyph: 'bow' },
  },
  monk: {
    id: 'monk',
    baseStats: { maxHp: 110, atk: 13, def: 10, speed: 15, dodge: 10, accuracy: 8, critRate: 8, critDamage: 25, spellSpeed: 10, dotPower: 0, lifesteal: 0 },
    signature: { id: 'flow', effects: [{ type: 'buff', stat: 'speed', pct: 0.40, turns: 2 }] },
    hidden: { id: 'innertempo', unlock: { stat: 'speed', threshold: 48 }, effect: { type: 'doubleStrike', chance: 0.25 } },
    portrait: { tint: '#d68a4a', glyph: 'fist' },
  },
  necromancer: {
    id: 'necromancer',
    baseStats: { maxHp: 90, atk: 16, def: 7, speed: 9, dodge: 6, accuracy: 6, critRate: 5, critDamage: 20, spellSpeed: 10, dotPower: 7, lifesteal: 12 },
    signature: { id: 'drain', effects: [{ type: 'drain', pct: 0.6 }] },
    hidden: { id: 'soulharvest', unlock: { stat: 'lifesteal', threshold: 30 }, effect: { type: 'startBuff', stat: 'lifesteal', pct: 1.0 } },
    portrait: { tint: '#7b8a5a', glyph: 'skull' },
  },
  bard: {
    id: 'bard',
    baseStats: { maxHp: 105, atk: 12, def: 9, speed: 12, dodge: 8, accuracy: 7, critRate: 6, critDamage: 20, spellSpeed: 12, dotPower: 0, lifesteal: 0 },
    signature: { id: 'hymn', effects: [{ type: 'multibuff', pct: 0.15, turns: 2 }] },
    hidden: { id: 'crescendo', unlock: { stat: 'spellSpeed', threshold: 35 }, effect: { type: 'sigGain', bonus: 20 } },
    portrait: { tint: '#c95c8a', glyph: 'lute' },
  },
  guardian: {
    id: 'guardian',
    baseStats: { maxHp: 160, atk: 10, def: 18, speed: 6, dodge: 2, accuracy: 5, critRate: 2, critDamage: 10, spellSpeed: 3, dotPower: 0, lifesteal: 0 },
    signature: { id: 'ironshell', effects: [{ type: 'buff', stat: 'def', pct: 0.60, turns: 2 }] },
    hidden: { id: 'aegiswall', unlock: { stat: 'def', threshold: 120 }, effect: { type: 'reflect', pct: 0.25 } },
    portrait: { tint: '#5c86c9', glyph: 'tower' },
  },
  spellblade: {
    id: 'spellblade',
    baseStats: { maxHp: 105, atk: 16, def: 9, speed: 12, dodge: 7, accuracy: 8, critRate: 10, critDamage: 30, spellSpeed: 8, dotPower: 6, lifesteal: 0 },
    signature: { id: 'runicedge', effects: [{ type: 'burnOnHit', turns: 3 }] },
    hidden: { id: 'runeburst', unlock: { stat: 'critRate', threshold: 40 }, effect: { type: 'critBurn' } },
    portrait: { tint: '#b04a8f', glyph: 'runeblade' },
  },
});

// ---------------- Display helpers ----------------

export function hiddenSkillName(hiddenId) { return t(`hidden.${hiddenId}`); }
export function hiddenSkillDesc(hiddenId) { return t(`hidden.${hiddenId}.desc`); }

/** The unlock hint shown while the skill is still dormant: "??? — สถิติลับยังไม่ถึงเกณฑ์". */
export function hiddenSkillHint(classId) {
  const def = CLASS_DEFINITIONS[classId];
  if (!def || !def.hidden) return '';
  const { stat, threshold } = def.hidden.unlock;
  return t('hidden.hint', { stat: t(`stat.${stat}`), n: threshold });
}

// ---------------- Awakening check ----------------

/**
 * Should this player's hidden skill awaken RIGHT NOW?
 * Checks TOTAL stats (base + gear + curses, via player.getStats()) against
 * the class threshold. Returns the hidden-skill def if it should awaken,
 * null otherwise. Idempotent-friendly: callers must check
 * player.hiddenAwakened themselves before announcing.
 */
export function checkHiddenUnlock(player) {
  if (!player || player.hiddenAwakened) return null;
  const def = CLASS_DEFINITIONS[player.classId];
  if (!def || !def.hidden) return null;
  const stats = player.getStats();
  const { stat, threshold } = def.hidden.unlock;
  return (stats[stat] || 0) >= threshold ? def.hidden : null;
}

/** The player's hidden skill effect, but only if awakened — combat.js calls this. */
export function activeHiddenEffect(player) {
  if (!player || !player.hiddenAwakened || !player.classId) return null;
  const def = CLASS_DEFINITIONS[player.classId];
  return def && def.hidden ? { id: def.hidden.id, ...def.hidden.effect } : null;
}
