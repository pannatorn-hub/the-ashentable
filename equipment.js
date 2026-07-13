// equipment.js (v6)
// ---------------------------------------------------------------------------
// Post-combat loot: Weapon / Armor / Accessory drops with rarity-scaled stat
// mods plus passive synergies. Display names are Thai via i18n; ids stay
// English for code and saves.
//
// v6 ADDITIONS — CURSED EQUIPMENT:
//   A new Rarity tier, CURSED: absurd stat multipliers (4x — well past
//   Epic) but every cursed item carries exactly one persistent debuff (see
//   CURSE_LIBRARY). Stat-level curses (speedHalf, dodgeSeal) are read by
//   player.js's getStats(); combat-time curses (hpDrain, brittle) are read
//   by combat.js each turn via player.equippedCurses().
//   The Dimensional Mage's Cleanse Curse service (npc.js) calls
//   cleanseCurse(item) to strip the debuff and promote the item to a new
//   LEGENDARY rarity — same monstrous stats, no more drawback.
//   createCursedEquipment() is the drop-table entry point; the ODDS of a
//   cursed drop happening live in zone-map.js (cursedDropChanceFor), since
//   that's a property of the map's danger, not of the item table.
// ---------------------------------------------------------------------------

import { t } from './i18n.js';

export const EquipmentSlot = Object.freeze({ WEAPON: 'weapon', ARMOR: 'armor', ACCESSORY: 'accessory' });

export const Rarity = Object.freeze({
  COMMON: { id: 'common', labelKey: 'rarity.common', color: '#b9b2a0', statMult: 1, passiveChance: 0.05 },
  RARE: { id: 'rare', labelKey: 'rarity.rare', color: '#3e8e7e', statMult: 1.7, passiveChance: 0.45 },
  EPIC: { id: 'epic', labelKey: 'rarity.epic', color: '#c98a3f', statMult: 2.6, passiveChance: 0.9 },
  // v6:
  CURSED: { id: 'cursed', labelKey: 'rarity.cursed', color: '#8b1a3d', statMult: 4.0, passiveChance: 0 },
  LEGENDARY: { id: 'legendary', labelKey: 'rarity.legendary', color: '#e8c25c', statMult: 4.0, passiveChance: 0.3 },
});

const RARITY_TABLE = [
  [0.60, Rarity.COMMON],
  [0.30, Rarity.RARE],
  [0.10, Rarity.EPIC],
];

const ITEM_BASES = {
  [EquipmentSlot.WEAPON]: [
    { nameKey: 'item.sword', primary: 'atk' },
    { nameKey: 'item.dagger', primary: 'speed' },
    { nameKey: 'item.tome', primary: 'spellSpeed' },
  ],
  [EquipmentSlot.ARMOR]: [
    { nameKey: 'item.plate', primary: 'def' },
    { nameKey: 'item.vest', primary: 'maxHp' },
    { nameKey: 'item.robe', primary: 'dodge' },
  ],
  [EquipmentSlot.ACCESSORY]: [
    { nameKey: 'item.ring', primary: 'critRate' },
    { nameKey: 'item.charm', primary: 'accuracy' },
    { nameKey: 'item.amulet', primary: 'lifesteal' },
  ],
};

export const PASSIVE_LIBRARY = Object.freeze({
  vampiric: { id: 'vampiric', nameKey: 'passive.vampiric', descKey: 'passive.vampiric.desc' },
  thorns: { id: 'thorns', nameKey: 'passive.thorns', descKey: 'passive.thorns.desc' },
  fleetfoot: { id: 'fleetfoot', nameKey: 'passive.fleetfoot', descKey: 'passive.fleetfoot.desc' },
});

// v6: persistent debuffs carried by Cursed Equipment. Stat-shape curses
// (speedHalf, dodgeSeal) are applied in player.js's getStats(); combat-time
// curses (hpDrain, brittle) are applied per-turn in combat.js.
export const CURSE_LIBRARY = Object.freeze({
  hpDrain: { id: 'hpDrain', nameKey: 'curse.hpDrain', descKey: 'curse.hpDrain.desc' },       // -5% maxHp per turn
  speedHalf: { id: 'speedHalf', nameKey: 'curse.speedHalf', descKey: 'curse.speedHalf.desc' }, // speed halved
  dodgeSeal: { id: 'dodgeSeal', nameKey: 'curse.dodgeSeal', descKey: 'curse.dodgeSeal.desc' }, // dodge locked to 0
  brittle: { id: 'brittle', nameKey: 'curse.brittle', descKey: 'curse.brittle.desc' },        // +20% damage taken
});

export function passiveName(p) { return t(p.nameKey); }
export function passiveDesc(p) { return t(p.descKey); }
export function curseName(c) { return t(c.nameKey); }
export function curseDesc(c) { return t(c.descKey); }

let _itemUid = 0;
function nextItemId() { _itemUid += 1; return `item_${Date.now()}_${_itemUid}`; }

function rollRarity() {
  const r = Math.random();
  let cum = 0;
  for (const [chance, rarity] of RARITY_TABLE) { cum += chance; if (r <= cum) return rarity; }
  return Rarity.COMMON;
}

// Base value of a primary/secondary roll per stat, before rarity/level scaling.
const STAT_BASE = {
  atk: 3, def: 3, speed: 2, maxHp: 10, dodge: 2,
  accuracy: 2, critRate: 2, critDamage: 5, spellSpeed: 3, dotPower: 2, lifesteal: 2,
};

/** Rebuilds an item's display name from its stored base + current rarity — used on creation and after a rarity change (Cleanse Curse). */
export function itemDisplayName(item) {
  return `${t(item.baseNameKey)}${t(item.rarity.labelKey)}`;
}

export function createEquipment(slot, playerLevel, forcedRarity = null) {
  const bases = ITEM_BASES[slot];
  const base = bases[Math.floor(Math.random() * bases.length)];
  const rarity = forcedRarity || rollRarity();
  const levelScale = 1 + (playerLevel - 1) * 0.12;

  const statMods = { [base.primary]: Math.max(1, Math.round(STAT_BASE[base.primary] * rarity.statMult * levelScale)) };

  if (Math.random() < 0.5) {
    const pool = Object.keys(STAT_BASE).filter((s) => s !== base.primary);
    const sec = pool[Math.floor(Math.random() * pool.length)];
    statMods[sec] = Math.max(1, Math.round(STAT_BASE[sec] * rarity.statMult * levelScale * 0.6));
  }

  let passive = null;
  if (Math.random() < rarity.passiveChance) {
    const keys = Object.keys(PASSIVE_LIBRARY);
    passive = PASSIVE_LIBRARY[keys[Math.floor(Math.random() * keys.length)]];
  }

  const item = { id: nextItemId(), slot, baseNameKey: base.nameKey, rarity, statMods, passive, curse: null, reforgeCount: 0 };
  item.name = itemDisplayName(item); // Thai reads adjective-after-noun: "ดาบหายาก" = base name + rarity label
  return item;
}

/**
 * v6: forges a Cursed item — a guaranteed primary + secondary roll at an
 * absurd multiplier, plus exactly one persistent debuff from CURSE_LIBRARY.
 * Never rolls a normal passive (the curse IS its defining trait).
 */
export function createCursedEquipment(slot, playerLevel) {
  const bases = ITEM_BASES[slot];
  const base = bases[Math.floor(Math.random() * bases.length)];
  const rarity = Rarity.CURSED;
  const levelScale = 1 + (playerLevel - 1) * 0.12;

  const statMods = { [base.primary]: Math.max(1, Math.round(STAT_BASE[base.primary] * rarity.statMult * levelScale)) };
  const pool = Object.keys(STAT_BASE).filter((s) => s !== base.primary);
  const sec = pool[Math.floor(Math.random() * pool.length)];
  statMods[sec] = Math.max(1, Math.round(STAT_BASE[sec] * rarity.statMult * levelScale * 0.6));

  const curseKeys = Object.keys(CURSE_LIBRARY);
  const curse = CURSE_LIBRARY[curseKeys[Math.floor(Math.random() * curseKeys.length)]];

  const item = { id: nextItemId(), slot, baseNameKey: base.nameKey, rarity, statMods, passive: null, curse, reforgeCount: 0 };
  item.name = itemDisplayName(item);
  return item;
}

/**
 * v6: the Dimensional Mage's Cleanse Curse — strips the debuff and promotes
 * the item to LEGENDARY rarity, keeping its monstrous stats. Mutates and
 * returns the same item (callers already hold the reference from bag/gear).
 * No-op (returns item unchanged) if it wasn't cursed to begin with.
 */
export function cleanseCurse(item) {
  if (!item || !item.curse) return item;
  item.curse = null;
  item.rarity = Rarity.LEGENDARY;
  item.name = itemDisplayName(item);
  return item;
}

export function generateLoot(playerLevel, count = null) {
  const n = count ?? (Math.random() < 0.35 ? 0 : Math.random() < 0.75 ? 1 : 2);
  const slots = Object.values(EquipmentSlot);
  const drops = [];
  for (let i = 0; i < n; i += 1) drops.push(createEquipment(slots[Math.floor(Math.random() * slots.length)], playerLevel));
  return drops;
}

export function salvageValue(item) { return Math.round(8 * item.rarity.statMult); }
