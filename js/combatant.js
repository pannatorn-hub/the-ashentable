// combatant.js
// ---------------------------------------------------------------------------
// A minimal combat-ready entity for PvE monsters and PvP Bot Fallback
// opponents. Exposes the full expanded stat block (new stats default to 0
// or small values) but has no class, signature, or equipment.
// ---------------------------------------------------------------------------

export class Combatant {
  constructor({ name, stats }) {
    this.name = name;
    this.stats = {
      atk: 5, def: 5, maxHp: 60, speed: 8, dodge: 5,
      accuracy: 3, critRate: 3, critDamage: 15, spellSpeed: 0, dotPower: 0, lifesteal: 0,
      ...stats,
    };
    this.hp = this.stats.maxHp;
    this.equipment = null;
  }

  getStats() { return { ...this.stats }; }

  get combatPower() {
    const s = this.stats;
    return Math.floor(
      s.atk * 2 + s.def * 1.8 + s.maxHp * 0.4 + s.speed * 1.5 + s.dodge * 3 +
      (s.accuracy || 0) * 2 + (s.critRate || 0) * 2.5 + (s.critDamage || 0) * 0.8 +
      (s.spellSpeed || 0) * 1.2 + (s.dotPower || 0) * 2 + (s.lifesteal || 0) * 2
    );
  }
}
