// player.js (v6)
// ---------------------------------------------------------------------------
// The Player: EXP + manually allocated Stat Points, equipment slots,
// Hearts/permadeath, and maxCP/maxZone tracking. Zero DOM dependencies.
//
// v6 CHANGES:
//   - The 12 CLASS_DEFINITIONS moved to classes.js (their new single home,
//     alongside the v6 Hidden Unique Skills). Re-exported here so every v5
//     import site (`import { CLASS_DEFINITIONS } from './player.js'`) still
//     works untouched.
//   - `hiddenAwakened`: whether this character's Hidden Unique Skill has
//     awakened. Set once by GameController (via classes.js's
//     checkHiddenUnlock) and never unset — awakening is permanent, even if
//     the gear that pushed the stat over the line is later removed.
//   - CURSED EQUIPMENT: getStats() now applies stat-curses from equipped
//     cursed items (speedHalf, dodgeSeal). Combat-time curses (hpDrain,
//     brittle) are read by combat.js via equippedCurses().
//   - `gainHeart()`: the Wandering Smuggler's "extra life" purchase.
//     Hearts stay capped at STARTING_HEARTS — permadeath keeps its teeth.
// ---------------------------------------------------------------------------

import { t } from './i18n.js';
import { CLASS_DEFINITIONS, resolveClassDef } from './classes.js';

// Backward-compat re-export: every v5 file that imported CLASS_DEFINITIONS
// from player.js keeps working. New code should import from classes.js.
export { CLASS_DEFINITIONS };

export const ALL_STATS = ['maxHp', 'atk', 'def', 'speed', 'dodge', 'accuracy', 'critRate', 'critDamage', 'spellSpeed', 'dotPower', 'lifesteal'];
export const STARTING_HEARTS = 3;
export const STAT_POINTS_PER_LEVEL = 3;

// How much one allocated Stat Point is worth per stat.
const STAT_POINT_VALUE = {
  atk: 1, def: 1, speed: 1, maxHp: 8, dodge: 0.5,
  accuracy: 1, critRate: 0.5, critDamage: 2, spellSpeed: 1, dotPower: 1, lifesteal: 0.5,
};

export function className(classId) { return t(`class.${classId}`); }
export function classTagline(classId) { return t(`class.${classId}.tag`); }
export function signatureName(sigId) { return t(`sig.${sigId}`); }
export function signatureDesc(sigId) { return t(`sig.${sigId}.desc`); }

let _uid = 0;
function nextId(prefix = 'player') { _uid += 1; return `${prefix}_${Date.now()}_${_uid}`; }

export class Player {
  constructor({ name, classId, legacyBonus = null }) {
    const def = resolveClassDef(classId); // v11: default, secret, or unique class
    if (!def) throw new Error(`Unknown class: ${classId}`);

    this.id = nextId();
    this.name = name || className(classId);
    this.classId = classId;
    this.baseStats = { ...def.baseStats };
    this.signature = def.signature;
    this.portrait = def.portrait;

    this.level = 1;
    this.xp = 0;
    this.statPoints = 0;
    this.resources = 0;

    // v4 economy/inventory fields — gameController + inventory.js require these.
    this.gold = 0;
    this.bag = [];
    this.materials = {};
    this.bagUpgrades = 0;
    this.visionRange = 1;          // micro (per-region) fog of war — currently fixed, no upgrade path
    this.worldVisionRange = 1;     // macro (World Map Viewer) fog of war — upgraded by Isra (npc.js)
    this.renameCount = 0; // first rename is free; further renames are gated

    // v6: the class's Hidden Unique Skill starts dormant.
    this.hiddenAwakened = false;

    // v8: equipment passives (vampiric/thorns/fleetfoot) start DORMANT.
    // Awakened once — permanently — by the Hidden Runesmith event (Zone 5 town).
    this.passivesUnlocked = false;

    this.maxCP = 0;    // leaderboard: highest CP ever reached
    this.maxZone = 1;  // leaderboard: deepest zone reached (1-based)

    // v11: the full 8-slot paper-doll. 'armor' is the chest (legacy id).
    this.equipment = {
      weapon: null, head: null, armor: null, legs: null, boots: null,
      ring: null, necklace: null, bracelet: null,
    };

    // v11: PvP economy + Sanity Curse (late-game forced-PvP tax)
    this.pvpPoints = 0;
    this.pvpWins = 0;
    this.pvpMatches = 0;
    this.sanityCursed = false;  // set once by progression.checkSanityOnset — never unset
    this.lastPvpAt = null;      // ms timestamp of the last arena bout (win OR loss)

    this.hearts = STARTING_HEARTS;
    this.isDead = false;
    this.deathTimestamp = null;

    this.isLegacyChild = !!legacyBonus;
    if (legacyBonus) this._applyLegacyBonus(legacyBonus);

    this.hp = this.getStats().maxHp;
    this.maxCP = this.combatPower;
  }

  /**
   * Base stats + equipment bonuses, then CURSE penalties, with sanity clamps.
   * Curse order matters: curses bite AFTER all bonuses are summed, so a
   * speedHalf curse halves your real speed, not just the base.
   */
  getStats() {
    const s = {};
    for (const k of ALL_STATS) s[k] = this.baseStats[k] || 0;
    for (const item of Object.values(this.equipment)) {
      if (!item) continue;
      for (const [k, v] of Object.entries(item.statMods)) s[k] = (s[k] || 0) + v;
    }
    // v6: stat-level curses from equipped cursed items.
    const curses = this.equippedCurses();
    if (curses.includes('speedHalf')) s.speed = Math.floor(s.speed / 2);
    if (curses.includes('dodgeSeal')) s.dodge = 0;

    s.dodge = Math.min(60, Math.max(0, s.dodge));
    s.critRate = Math.min(80, Math.max(0, s.critRate));
    s.lifesteal = Math.min(50, Math.max(0, s.lifesteal));
    s.def = Math.max(0, s.def);
    s.speed = Math.max(1, s.speed);
    return s;
  }

  /** v6: curse ids on currently equipped items (e.g. ['hpDrain','speedHalf']). */
  equippedCurses() {
    const out = [];
    for (const item of Object.values(this.equipment)) {
      if (item && item.curse) out.push(item.curse.id);
    }
    return out;
  }

  get combatPower() {
    const s = this.getStats();
    return Math.floor(
      s.atk * 2 + s.def * 1.8 + s.maxHp * 0.4 + s.speed * 1.5 + s.dodge * 3 +
      s.accuracy * 2 + s.critRate * 2.5 + s.critDamage * 0.8 + s.spellSpeed * 1.2 +
      s.dotPower * 2 + s.lifesteal * 2 + this.level * 4
    );
  }

  resetForBattle() { this.hp = this.getStats().maxHp; }

  gainXp(amount) {
    this.xp += amount;
    let leveledUp = false;
    while (this.xp >= this._xpToNextLevel()) {
      this.xp -= this._xpToNextLevel();
      this.level += 1;
      this.statPoints += STAT_POINTS_PER_LEVEL;
      leveledUp = true;
    }
    return leveledUp;
  }

  _xpToNextLevel() { return 60 + (this.level - 1) * 30; }

  allocateStatPoint(stat) {
    if (this.statPoints <= 0 || !(stat in STAT_POINT_VALUE)) return false;
    this.baseStats[stat] = (this.baseStats[stat] || 0) + STAT_POINT_VALUE[stat];
    this.statPoints -= 1;
    return true;
  }

  // ---------------- Equipment (paper-doll) ----------------

  equip(item) {
    if (!item || !(item.slot in this.equipment)) return null;
    const previous = this.equipment[item.slot];
    this.equipment[item.slot] = item;
    return previous;
  }

  unequip(slot) {
    const item = this.equipment[slot];
    this.equipment[slot] = null;
    return item;
  }

  // ---------------- Heart / Permadeath ----------------

  loseHeart() {
    if (this.isDead) return this.hearts;
    this.hearts = Math.max(0, this.hearts - 1);
    if (this.hearts === 0) { this.isDead = true; this.deathTimestamp = Date.now(); }
    return this.hearts;
  }

  sacrificeHeart() {
    if (this.hearts <= 1) throw new Error('Cannot sacrifice your last Heart.');
    this.hearts -= 1;
    return this.hearts;
  }

  /** v6: the Smuggler's extra life. Hard-capped — permadeath stays permadeath. */
  gainHeart() {
    if (this.isDead) return this.hearts;
    this.hearts = Math.min(STARTING_HEARTS, this.hearts + 1);
    return this.hearts;
  }

  isAlive() { return !this.isDead && this.hearts > 0; }

  _applyLegacyBonus(bonus) {
    for (const k of ['atk', 'def', 'maxHp', 'speed', 'dodge']) this.baseStats[k] += bonus[k] || 0;
    this.resources += bonus.startingResources || 0;
  }

  // ---------------- Persistence ----------------

  toJSON() {
    return {
      id: this.id, name: this.name, classId: this.classId,
      baseStats: { ...this.baseStats },
      level: this.level, xp: this.xp, statPoints: this.statPoints, resources: this.resources,
      maxCP: this.maxCP, maxZone: this.maxZone,
      equipment: { ...this.equipment }, hearts: this.hearts, isDead: this.isDead,
      hp: this.hp, isLegacyChild: this.isLegacyChild,
      gold: this.gold, bag: this.bag, materials: { ...this.materials },
      bagUpgrades: this.bagUpgrades, visionRange: this.visionRange,
      worldVisionRange: this.worldVisionRange,
      renameCount: this.renameCount,
      hiddenAwakened: this.hiddenAwakened,
      passivesUnlocked: this.passivesUnlocked,
      // v11:
      pvpPoints: this.pvpPoints, pvpWins: this.pvpWins, pvpMatches: this.pvpMatches,
      sanityCursed: this.sanityCursed, lastPvpAt: this.lastPvpAt,
    };
  }

  static fromJSON(data) {
    const def = resolveClassDef(data.classId); // v11: default, secret, or unique
    const p = Object.create(Player.prototype);
    Object.assign(p, data);
    p.baseStats = { ...data.baseStats };

    // v11-save migration: 3-slot saves -> 8-slot paper-doll. The chest kept
    // the legacy id 'armor', so it carries over untouched. An old equipped
    // 'accessory' is re-homed into ring/necklace/bracelet by its base name
    // (the old accessory bases were exactly those three items).
    const LEGACY_ACC = { 'item.ring': 'ring', 'item.amulet': 'necklace', 'item.charm': 'bracelet' };
    const old = data.equipment || {};
    p.equipment = {
      weapon: old.weapon || null, head: old.head || null, armor: old.armor || null,
      legs: old.legs || null, boots: old.boots || null,
      ring: old.ring || null, necklace: old.necklace || null, bracelet: old.bracelet || null,
    };
    if (old.accessory) {
      const item = old.accessory;
      const home = LEGACY_ACC[item.baseNameKey] || 'ring';
      item.slot = home;
      if (!p.equipment[home]) p.equipment[home] = item;
      else if (Array.isArray(data.bag)) data.bag.push(item); // slot somehow taken — drop it in the bag
    }
    // Bag items minted before v11 with slot 'accessory' get re-homed the same way.
    if (Array.isArray(data.bag)) {
      for (const item of data.bag) {
        if (item && item.slot === 'accessory') item.slot = LEGACY_ACC[item.baseNameKey] || 'ring';
      }
    }
    p.signature = def ? def.signature : null;
    p.portrait = def ? def.portrait : { tint: '#888780', glyph: 'sword' };
    p.maxCP = data.maxCP || 0;
    p.maxZone = data.maxZone || 1;
    // v3-save migration: older saves lack the v4 fields entirely.
    p.gold = data.gold || 0;
    p.bag = Array.isArray(data.bag) ? data.bag : [];
    p.materials = data.materials || {};
    p.bagUpgrades = data.bagUpgrades || 0;
    p.visionRange = data.visionRange || 1;
    p.worldVisionRange = data.worldVisionRange || 1; // v5-save migration
    p.renameCount = data.renameCount || 0;
    p.hiddenAwakened = !!data.hiddenAwakened;        // v6-save migration
    p.passivesUnlocked = !!data.passivesUnlocked;    // v8-save migration: old saves default to dormant
    // v11-save migration:
    p.pvpPoints = data.pvpPoints || 0;
    p.pvpWins = data.pvpWins || 0;
    p.pvpMatches = data.pvpMatches || 0;
    p.sanityCursed = !!data.sanityCursed;
    p.lastPvpAt = data.lastPvpAt ?? null;
    // v13.1-save heal: the drain-NaN bug (fixed in combat.js) could persist
    // hp: NaN into a save, bricking every later battle. One finite check on
    // load repairs any wounded save silently.
    if (!Number.isFinite(p.hp)) p.hp = p.getStats().maxHp;
    return p;
  }
}
