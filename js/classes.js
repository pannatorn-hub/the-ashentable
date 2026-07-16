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
  const def = resolveClassDef(classId);
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
  const def = resolveClassDef(player.classId);
  if (!def || !def.hidden) return null;
  const stats = player.getStats();
  const { stat, threshold } = def.hidden.unlock;
  return (stats[stat] || 0) >= threshold ? def.hidden : null;
}

/** The player's hidden skill effect, but only if awakened — combat.js calls this. */
export function activeHiddenEffect(player) {
  if (!player || !player.hiddenAwakened || !player.classId) return null;
  const def = resolveClassDef(player.classId);
  return def && def.hidden ? { id: def.hidden.id, ...def.hidden.effect } : null;
}


// ===========================================================================
// v11 — SECRET CLASSES (account-unlocked) & UNIQUE "HIGHLANDER" CLASSES
// ===========================================================================
// Three class tiers now exist:
//   1. CLASS_DEFINITIONS         — the 12 defaults, pickable from day one.
//   2. SECRET_CLASS_DEFINITIONS  — ~18% stronger. Locked silhouettes on the
//      creation screen until the ACCOUNT (not the character — unlocks
//      survive permadeath) satisfies its predicate in SECRET_UNLOCKS,
//      evaluated over progression.js account counters.
//   3. UNIQUE_CLASS_DEFINITIONS  — the 10 Apex. ~40% stronger, deep combo
//      predicates in UNIQUE_UNLOCKS, and SERVER-WIDE HIGHLANDER RULE: one
//      holder per class at a time (firebase-service.js claimUniqueClass
//      transaction; progression.js LocalUniqueRegistry offline). Permadying
//      in PvP while holding one strips it back into the server pool.
//
// DISCIPLINE (unchanged from v6): signatures and hidden skills below use
// ONLY effect types combat.js already executes (heal / buff / multibuff /
// vanish / overcharge / dot / surecrit / drain / burnOnHit + the hidden-
// effect vocabulary). Adding these 14 classes required ZERO combat changes.

export const SECRET_CLASS_DEFINITIONS = Object.freeze({
  cursebreaker: {
    id: 'cursebreaker', tier: 'secret',
    baseStats: { maxHp: 150, atk: 17, def: 14, speed: 10, dodge: 5, accuracy: 7, critRate: 7, critDamage: 25, spellSpeed: 8, dotPower: 6, lifesteal: 4 },
    signature: { id: 'sunder', effects: [{ type: 'dot', mult: 2.0, ticks: 3 }, { type: 'buff', stat: 'atk', pct: 0.25, turns: 2 }] },
    hidden: { id: 'hexeater', unlock: { stat: 'dotPower', threshold: 40 }, effect: { type: 'dotAmp', pct: 1.0 } },
    portrait: { tint: '#8b1a3d', glyph: 'sword' },
  },
  ashenknight: {
    id: 'ashenknight', tier: 'secret',
    baseStats: { maxHp: 175, atk: 16, def: 19, speed: 8, dodge: 4, accuracy: 6, critRate: 6, critDamage: 22, spellSpeed: 0, dotPower: 0, lifesteal: 3 },
    signature: { id: 'cinderwall', effects: [{ type: 'multibuff', stats: [{ stat: 'def', pct: 0.35 }, { stat: 'atk', pct: 0.20 }], turns: 2 }, { type: 'heal', pct: 0.12 }] },
    hidden: { id: 'emberheart', unlock: { stat: 'def', threshold: 120 }, effect: { type: 'onLowHpBuff', stat: 'def', pct: 0.80, hpThresh: 0.35 } },
    portrait: { tint: '#5a5350', glyph: 'shield' },
  },
  gravewarden: {
    id: 'gravewarden', tier: 'secret',
    baseStats: { maxHp: 190, atk: 15, def: 15, speed: 9, dodge: 5, accuracy: 6, critRate: 5, critDamage: 20, spellSpeed: 0, dotPower: 4, lifesteal: 10 },
    signature: { id: 'gravedraw', effects: [{ type: 'drain', mult: 1.6 }] },
    hidden: { id: 'tombpact', unlock: { stat: 'lifesteal', threshold: 30 }, effect: { type: 'secondWind', healPct: 0.45 } },
    portrait: { tint: '#3e5e4e', glyph: 'scythe' },
  },
  moonveil: {
    id: 'moonveil', tier: 'secret',
    baseStats: { maxHp: 130, atk: 18, def: 9, speed: 14, dodge: 12, accuracy: 9, critRate: 14, critDamage: 45, spellSpeed: 4, dotPower: 0, lifesteal: 0 },
    signature: { id: 'lunareclipse', effects: [{ type: 'vanish' }, { type: 'buff', stat: 'critRate', pct: 0.50, turns: 2 }] },
    hidden: { id: 'silvershadow', unlock: { stat: 'dodge', threshold: 40 }, effect: { type: 'firstVanish' } },
    portrait: { tint: '#6e7fb8', glyph: 'dagger' },
  },
});

// Predicates over the progression.js account object: (account) => boolean.
export const SECRET_UNLOCKS = Object.freeze({
  cursebreaker: (acc) => (acc.counters.cleansedCurses || 0) >= 3,
  ashenknight: (acc) => (acc.counters.lordKillsTier6 || 0) >= 1,
  gravewarden: (acc) => (acc.counters.legacyChildren || 0) >= 1,
  moonveil: (acc) => (acc.counters.smugglerHeartBought || 0) >= 1,
});

export const UNIQUE_CLASS_DEFINITIONS = Object.freeze({
  eclipsemonarch: {
    id: 'eclipsemonarch', tier: 'unique',
    baseStats: { maxHp: 210, atk: 24, def: 20, speed: 11, dodge: 6, accuracy: 9, critRate: 12, critDamage: 40, spellSpeed: 6, dotPower: 4, lifesteal: 5 },
    signature: { id: 'totaleclipse', effects: [{ type: 'surecrit' }, { type: 'buff', stat: 'atk', pct: 0.40, turns: 2 }] },
    hidden: { id: 'crownofash', unlock: { stat: 'atk', threshold: 140 }, effect: { type: 'executioner', pct: 0.60, hpThresh: 0.40 } },
    portrait: { tint: '#1c1024', glyph: 'crown' },
  },
  hollowsaint: {
    id: 'hollowsaint', tier: 'unique',
    baseStats: { maxHp: 260, atk: 18, def: 22, speed: 9, dodge: 5, accuracy: 7, critRate: 6, critDamage: 22, spellSpeed: 8, dotPower: 6, lifesteal: 12 },
    signature: { id: 'hollowgrace', effects: [{ type: 'heal', pct: 0.35 }, { type: 'multibuff', stats: [{ stat: 'def', pct: 0.30 }, { stat: 'lifesteal', pct: 0.50 }], turns: 2 }] },
    hidden: { id: 'emptyvessel', unlock: { stat: 'maxHp', threshold: 600 }, effect: { type: 'secondWind', healPct: 0.60 } },
    portrait: { tint: '#cbb98a', glyph: 'halo' },
  },
  plagueempress: {
    id: 'plagueempress', tier: 'unique',
    baseStats: { maxHp: 185, atk: 20, def: 14, speed: 12, dodge: 7, accuracy: 10, critRate: 8, critDamage: 28, spellSpeed: 14, dotPower: 18, lifesteal: 4 },
    signature: { id: 'blightbloom', effects: [{ type: 'dot', mult: 3.2, ticks: 4 }] },
    hidden: { id: 'thousandsores', unlock: { stat: 'dotPower', threshold: 60 }, effect: { type: 'dotAmp', pct: 1.5 } },
    portrait: { tint: '#4c7a3f', glyph: 'thorn' },
  },
  voidreaver: {
    id: 'voidreaver', tier: 'unique',
    baseStats: { maxHp: 170, atk: 26, def: 12, speed: 15, dodge: 13, accuracy: 11, critRate: 16, critDamage: 55, spellSpeed: 4, dotPower: 0, lifesteal: 6 },
    signature: { id: 'voidstep', effects: [{ type: 'vanish' }, { type: 'surecrit' }] },
    hidden: { id: 'edgeofnothing', unlock: { stat: 'speed', threshold: 70 }, effect: { type: 'doubleStrike', chance: 0.40 } },
    portrait: { tint: '#241a3d', glyph: 'dagger' },
  },
  dawnbreaker: {
    id: 'dawnbreaker', tier: 'unique',
    baseStats: { maxHp: 220, atk: 22, def: 18, speed: 12, dodge: 8, accuracy: 12, critRate: 10, critDamage: 35, spellSpeed: 4, dotPower: 0, lifesteal: 4 },
    signature: { id: 'firstlight', effects: [{ type: 'heal', pct: 0.20 }, { type: 'multibuff', stats: [{ stat: 'atk', pct: 0.30 }, { stat: 'speed', pct: 0.30 }], turns: 2 }] },
    hidden: { id: 'oathofdawn', unlock: { stat: 'accuracy', threshold: 60 }, effect: { type: 'onLowHpBuff', stat: 'atk', pct: 0.70, hpThresh: 0.35 } },
    portrait: { tint: '#d8a24a', glyph: 'sun' },
  },
  gravemarshal: {
    id: 'gravemarshal', tier: 'unique',
    baseStats: { maxHp: 240, atk: 21, def: 24, speed: 8, dodge: 4, accuracy: 8, critRate: 6, critDamage: 24, spellSpeed: 0, dotPower: 6, lifesteal: 8 },
    signature: { id: 'legionrise', effects: [{ type: 'drain', mult: 1.9 }, { type: 'buff', stat: 'def', pct: 0.35, turns: 2 }] },
    hidden: { id: 'deadmensoath', unlock: { stat: 'def', threshold: 150 }, effect: { type: 'onLowHpBuff', stat: 'def', pct: 1.0, hpThresh: 0.30 } },
    portrait: { tint: '#37424a', glyph: 'banner' },
  },
  runeprophet: {
    id: 'runeprophet', tier: 'unique',
    baseStats: { maxHp: 175, atk: 17, def: 13, speed: 11, dodge: 7, accuracy: 10, critRate: 8, critDamage: 26, spellSpeed: 22, dotPower: 10, lifesteal: 2 },
    signature: { id: 'runecascade', effects: [{ type: 'overcharge' }, { type: 'dot', mult: 1.8, ticks: 3 }] },
    hidden: { id: 'openedeye', unlock: { stat: 'spellSpeed', threshold: 60 }, effect: { type: 'sigStart', value: 100 } },
    portrait: { tint: '#5a7fae', glyph: 'rune' },
  },
  nightsovereign: {
    id: 'nightsovereign', tier: 'unique',
    baseStats: { maxHp: 195, atk: 23, def: 15, speed: 13, dodge: 10, accuracy: 10, critRate: 13, critDamage: 42, spellSpeed: 6, dotPower: 4, lifesteal: 7 },
    signature: { id: 'kingdomofnight', effects: [{ type: 'vanish' }, { type: 'dot', mult: 2.2, ticks: 3 }] },
    hidden: { id: 'throneunseen', unlock: { stat: 'dodge', threshold: 50 }, effect: { type: 'firstVanish' } },
    portrait: { tint: '#161228', glyph: 'moon' },
  },
  ashqueen: {
    id: 'ashqueen', tier: 'unique',
    baseStats: { maxHp: 205, atk: 25, def: 16, speed: 10, dodge: 6, accuracy: 9, critRate: 11, critDamage: 38, spellSpeed: 10, dotPower: 12, lifesteal: 5 },
    signature: { id: 'pyrelight', effects: [{ type: 'burnOnHit' }, { type: 'buff', stat: 'atk', pct: 0.45, turns: 2 }] },
    hidden: { id: 'cinderveil', unlock: { stat: 'dotPower', threshold: 50 }, effect: { type: 'dotAmp', pct: 1.2 } },
    portrait: { tint: '#a34a2f', glyph: 'flame' },
  },
  worldsedge: {
    id: 'worldsedge', tier: 'unique',
    baseStats: { maxHp: 230, atk: 24, def: 21, speed: 13, dodge: 9, accuracy: 11, critRate: 12, critDamage: 40, spellSpeed: 10, dotPower: 8, lifesteal: 8 },
    signature: { id: 'horizonfall', effects: [{ type: 'surecrit' }, { type: 'multibuff', stats: [{ stat: 'atk', pct: 0.35 }, { stat: 'def', pct: 0.35 }], turns: 2 }] },
    hidden: { id: 'lastcartographer', unlock: { stat: 'speed', threshold: 60 }, effect: { type: 'doubleStrike', chance: 0.35 } },
    portrait: { tint: '#2e4a5a', glyph: 'compass' },
  },
});

// Apex predicates: deep combos of account counters + earlier secret unlocks.
// isSecretUnlocked is passed in so the predicate layer stays data-only here.
export const UNIQUE_UNLOCKS = Object.freeze({
  eclipsemonarch: (acc) => SECRET_UNLOCKS.ashenknight(acc) && (acc.counters.lordKillsTier8 || 0) >= 3 && (acc.counters.pvpWinsTotal || 0) >= 25,
  hollowsaint: (acc) => SECRET_UNLOCKS.gravewarden(acc) && (acc.counters.legacyChildren || 0) >= 3 && (acc.counters.altarSacrifices || 0) >= 5,
  plagueempress: (acc) => SECRET_UNLOCKS.cursebreaker(acc) && (acc.counters.cleansedCurses || 0) >= 7 && (acc.counters.hiddenAwakenings || 0) >= 3,
  voidreaver: (acc) => SECRET_UNLOCKS.moonveil(acc) && (acc.counters.smugglerHeartBought || 0) >= 3 && (acc.counters.lordKillsTier6 || 0) >= 5,
  dawnbreaker: (acc) => (acc.counters.pvpWinsTotal || 0) >= 60 && (acc.counters.pvpMatchesTotal || 0) >= 100,
  gravemarshal: (acc) => (acc.counters.legacyChildren || 0) >= 5 && (acc.counters.lordKills || 0) >= 30,
  runeprophet: (acc) => (acc.counters.hiddenAwakenings || 0) >= 5 && (acc.counters.reforges || 0) >= 10,
  nightsovereign: (acc) => (acc.counters.smugglerMet || 0) >= 1 && (acc.counters.cleansedCurses || 0) >= 5 && (acc.counters.pvpWinsTotal || 0) >= 40,
  ashqueen: (acc) => (acc.counters.altarSacrifices || 0) >= 8 && (acc.counters.lordKillsTier8 || 0) >= 2,
  worldsedge: (acc) => Object.values(SECRET_UNLOCKS).every((fn) => fn(acc)) && (acc.counters.lordKillsTier8 || 0) >= 5,
});

// ---------------- Tier-aware lookups ----------------

/** One resolver for all three tiers. Player construction/deserialization go through here. */
export function resolveClassDef(classId) {
  return CLASS_DEFINITIONS[classId] || SECRET_CLASS_DEFINITIONS[classId] || UNIQUE_CLASS_DEFINITIONS[classId] || null;
}

export function classTier(classId) {
  if (CLASS_DEFINITIONS[classId]) return 'default';
  if (SECRET_CLASS_DEFINITIONS[classId]) return 'secret';
  if (UNIQUE_CLASS_DEFINITIONS[classId]) return 'unique';
  return null;
}

export function isSecretClass(classId) { return classTier(classId) === 'secret'; }
export function isUniqueClass(classId) { return classTier(classId) === 'unique'; }

/** Secret class ids this account has earned. */
export function unlockedSecretClasses(account) {
  if (!account || !account.counters) return [];
  return Object.keys(SECRET_CLASS_DEFINITIONS).filter((id) => SECRET_UNLOCKS[id] && SECRET_UNLOCKS[id](account));
}

/** Unique class ids this account QUALIFIES for (the Highlander claim is a separate, server-arbitrated step). */
export function qualifiedUniqueClasses(account) {
  if (!account || !account.counters) return [];
  return Object.keys(UNIQUE_CLASS_DEFINITIONS).filter((id) => UNIQUE_UNLOCKS[id] && UNIQUE_UNLOCKS[id](account));
}
