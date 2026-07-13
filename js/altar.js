// altar.js (v6)
// ---------------------------------------------------------------------------
// The Heart Sacrifice Altar — v6: HARDER TO FIND, MASSIVELY MORE REWARDING.
//
//   - Rarity is enforced upstream in zone-map.js: the ALTAR node type can
//     now only roll DEEP in a region (depth > TOWN_DEPTH), at a slim ~5%.
//     Finding one is an event in itself.
//   - The reward matches the risk: instead of +35% to ONE random stat, the
//     altar now grants +25% to EVERY base stat, permanently. A true
//     character-defining spike — bought with a step toward permadeath.
//
// A character may still never sacrifice their last Heart.
// Zero DOM dependencies.
// ---------------------------------------------------------------------------

import { ALL_STATS } from './player.js';

// v6: +25% to ALL base stats, permanently.
export const ALTAR_BOOST_RATIO = 0.25;

export function canSacrifice(player) {
  return player.hearts > 1 && !player.isDead;
}

/**
 * Executes the sacrifice: -1 Heart, permanent +25% to EVERY base stat.
 * Returns { boosts: [{stat, before, after, boost}], heartsRemaining },
 * or null if it can't be afforded (last Heart / already dead).
 * Percent-type stats (dodge, crit, lifesteal) grow too but stay leashed by
 * the clamps in Player.getStats(), so the altar can't push past hard caps.
 */
export function executeSacrifice(player) {
  if (!canSacrifice(player)) return null;

  player.sacrificeHeart();

  const boosts = [];
  for (const stat of ALL_STATS) {
    const before = player.baseStats[stat] || 0;
    if (before <= 0) continue; // a stat the class doesn't have can't grow 25% of nothing
    const boost = Math.max(1, Math.round(before * ALTAR_BOOST_RATIO));
    player.baseStats[stat] = before + boost;
    boosts.push({ stat, before, after: player.baseStats[stat], boost });
  }

  // maxHp grew — current HP keeps its absolute value (the flesh remembers
  // its wounds), but never exceeds the new ceiling.
  player.hp = Math.min(player.hp, player.getStats().maxHp);

  return { boosts, heartsRemaining: player.hearts };
}
