// inventory.js (v4 — NEW)
// ---------------------------------------------------------------------------
// The Dimensional Bag. Loot no longer auto-equips: it lands here, capped by
// a capacity the Dimensional Mage can widen. Also: zone-material stacks and
// the side-by-side equipment comparison used by the bag UI.
// Zero DOM dependencies.
// ---------------------------------------------------------------------------

import { ALL_STATS } from './player.js';

export const BAG_BASE_CAPACITY = 6;
export const BAG_SLOTS_PER_UPGRADE = 2;
export const BAG_MAX_UPGRADES = 4;

export function bagCapacity(player) {
  return BAG_BASE_CAPACITY + (player.bagUpgrades || 0) * BAG_SLOTS_PER_UPGRADE;
}

/** Adds an item to the bag. Returns true, or false when full (caller decides the fallback, e.g. auto-sell). */
export function addToBag(player, item) {
  if (player.bag.length >= bagCapacity(player)) return false;
  player.bag.push(item);
  return true;
}

export function removeFromBag(player, itemId) {
  const idx = player.bag.findIndex((i) => i.id === itemId);
  if (idx === -1) return null;
  return player.bag.splice(idx, 1)[0];
}

// ---------------- Zone materials ----------------

export function addMaterial(player, zoneIndex, amount) {
  const key = `z${zoneIndex}`;
  player.materials[key] = (player.materials[key] || 0) + amount;
}

export function materialCount(player, zoneIndex) {
  return player.materials[`z${zoneIndex}`] || 0;
}

/** Largest single-type stack — NPC costs are paid in "N of one kind". */
export function largestMaterialStack(player) {
  let best = { key: null, count: 0 };
  for (const [key, count] of Object.entries(player.materials || {})) {
    if (count > best.count) best = { key, count };
  }
  return best;
}

/** Spends `amount` from ONE material type (largest stack first). Returns the spent key, or null if unaffordable. */
export function spendMaterialsOfOneKind(player, amount) {
  const best = largestMaterialStack(player);
  if (!best.key || best.count < amount) return null;
  player.materials[best.key] -= amount;
  if (player.materials[best.key] <= 0) delete player.materials[best.key];
  return best.key;
}

/** Spends from a specific zone's stack. */
export function spendMaterialsOfZone(player, zoneIndex, amount) {
  const key = `z${zoneIndex}`;
  if ((player.materials[key] || 0) < amount) return false;
  player.materials[key] -= amount;
  if (player.materials[key] <= 0) delete player.materials[key];
  return true;
}

// ---------------- Equipment comparison ----------------

/**
 * Side-by-side comparison rows for the bag UI: every stat either item
 * touches, with the delta from the player's perspective if they equip the
 * new one. equippedItem may be null (empty slot).
 */
export function compareItems(newItem, equippedItem) {
  const stats = ALL_STATS.filter((s) =>
    (newItem.statMods[s] || 0) !== 0 || (equippedItem && (equippedItem.statMods[s] || 0) !== 0)
  );
  return stats.map((stat) => {
    const newVal = newItem.statMods[stat] || 0;
    const oldVal = equippedItem ? (equippedItem.statMods[stat] || 0) : 0;
    return { stat, newVal, oldVal, delta: newVal - oldVal };
  });
}
export function disintegrate(item) {
  // ทิ้งไอเทมลงสู่ความว่างเปล่า ไม่ได้อะไรกลับมาเลย (Hardcore Mode)
}