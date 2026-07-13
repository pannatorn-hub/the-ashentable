// legacy.js
// ---------------------------------------------------------------------------
// The Legacy System. When a Player is permanently killed in PvP (0 Hearts),
// a Tombstone is recorded. The next character the player creates inherits a
// small permanent bonus from it.
// ---------------------------------------------------------------------------

const LEGACY_STAT_RATIO = 0.10;      // 10% of the fallen hero's stats carry over
const LEGACY_RESOURCE_RATIO = 0.15;  // 15% of banked resources carry over

export class Tombstone {
  constructor(player) {
    this.characterName = player.name;
    this.classId = player.classId;
    this.level = player.level;
    this.finalCP = player.combatPower;
    this.finalStats = player.getStats();
    this.finalResources = player.resources;
    this.diedAt = player.deathTimestamp || Date.now();
  }

  computeLegacyBonus() {
    return {
      atk: Math.floor(this.finalStats.atk * LEGACY_STAT_RATIO),
      def: Math.floor(this.finalStats.def * LEGACY_STAT_RATIO),
      maxHp: Math.floor(this.finalStats.maxHp * LEGACY_STAT_RATIO),
      speed: Math.floor(this.finalStats.speed * LEGACY_STAT_RATIO),
      dodge: Math.round(this.finalStats.dodge * LEGACY_STAT_RATIO * 10) / 10,
      startingResources: Math.floor(this.finalResources * LEGACY_RESOURCE_RATIO),
    };
  }
}

export class LegacyManager {
  constructor() {
    this.graveyard = []; // Tombstone[]
  }

  recordDeath(player) {
    const stone = new Tombstone(player);
    this.graveyard.push(stone);
    return stone;
  }

  hasLegacy() {
    return this.graveyard.length > 0;
  }

  latestTombstone() {
    return this.hasLegacy() ? this.graveyard[this.graveyard.length - 1] : null;
  }

  createHeirBonus() {
    const stone = this.latestTombstone();
    return stone ? stone.computeLegacyBonus() : null;
  }

  toJSON() {
    return { graveyard: this.graveyard.map((t) => ({ ...t })) };
  }

  static fromJSON(data) {
    const lm = new LegacyManager();
    if (data && Array.isArray(data.graveyard)) {
      lm.graveyard = data.graveyard.map((t) => Object.assign(Object.create(Tombstone.prototype), t));
    }
    return lm;
  }
}
