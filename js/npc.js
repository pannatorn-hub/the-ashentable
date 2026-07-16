// npc.js (v6)
// ---------------------------------------------------------------------------
// Unique, named NPCs with deep Thai lore. NPCs are DATA + small service
// functions; all display text lives in i18n.js under npc.* keys. Placement:
//   เวสเปอร์ (Dimensional Mage)  -> Capital ONLY. Bag upgrades + v6 Cleanse Curse.
//   อิศรา   (Blinded Scout)     -> town of zone 6. Vision range upgrades
//                                   (v6: high enough vision also reveals
//                                   zone hazard icons — see zone-map.js).
//   ครอม    (One-armed Smith)   -> town of zone 1. Weapon reforging.
//   มารา    (Moonshadow Peddler)-> town of zone 4. Rare/epic stock at a markup.
//   มืดกาล  (Wandering Smuggler)-> v6 NEW. Not placed in any town — she is
//                                   found via world-map.js's macro fog
//                                   encounter (triggerSmugglerEncounter).
//                                   Her `location` is the sentinel string
//                                   'wandering', which npcsAt() deliberately
//                                   never matches — she cannot be reached
//                                   any other way.
// Zero DOM dependencies.
// ---------------------------------------------------------------------------

import { t } from './i18n.js';
import { bagCapacity, BAG_MAX_UPGRADES, largestMaterialStack, spendMaterialsOfOneKind } from './inventory.js';
import { createEquipment, createCursedEquipment, EquipmentSlot, Rarity, salvageValue, cleanseCurse, rollLootSlot } from './equipment.js';
import { STARTING_HEARTS } from './player.js';

export const NPCS = Object.freeze({
  vesper: { id: 'vesper', location: 'capital', service: 'bag' },
  isra: { id: 'isra', location: { zoneIndex: 6 }, service: 'vision' },
  krom: { id: 'krom', location: { zoneIndex: 1 }, service: 'reforge' },
  mara: { id: 'mara', location: { zoneIndex: 4 }, service: 'peddler' },
  smuggler: { id: 'smuggler', location: 'wandering', service: 'smuggler' }, // v6
  // v11: ผู้คุมสังเวียน — the Arena Warden. Capital only, sells the Arena
  // Honor set for PvP Points (gameController.renderPvpShop / PVP_SET).
  warden: { id: 'warden', location: 'capital', service: 'pvpshop' },
});

export function npcName(npc) { return t(`npc.${npc.id}.name`); }
export function npcTitle(npc) { return t(`npc.${npc.id}.title`); }
export function npcLore(npc) { return t(`npc.${npc.id}.lore`); }
export function npcLines(npc) { return [t(`npc.${npc.id}.line1`), t(`npc.${npc.id}.line2`)]; }

export function npcsAt(location) {
  // location: 'capital' | zoneIndex (number). 'wandering' NPCs (the
  // Smuggler) never surface here — she's reached only via her own
  // macro-fog encounter flow.
  return Object.values(NPCS).filter((n) =>
    location === 'capital' ? n.location === 'capital' : (n.location !== 'capital' && n.location !== 'wandering' && n.location.zoneIndex === location)
  );
}

// ---------------- เวสเปอร์: bag upgrades ----------------

// v12 BALANCE: the Dimensional Mage's price now COMPOUNDS — each fold of
// space is three times harder to weave than the last. 6 → 18 → 54 → 162 of
// one material kind. Maxing the bag is a late-game achievement, not a
// shopping trip.
export function bagUpgradeCost(player) { return 6 * Math.pow(3, player.bagUpgrades || 0); }

export function canUpgradeBag(player) {
  if ((player.bagUpgrades || 0) >= BAG_MAX_UPGRADES) return { ok: false, reason: 'maxed' };
  const cost = bagUpgradeCost(player);
  if (largestMaterialStack(player).count < cost) return { ok: false, reason: 'materials' };
  return { ok: true, cost };
}

export function upgradeBag(player) {
  const check = canUpgradeBag(player);
  if (!check.ok) return null;
  const spentKey = spendMaterialsOfOneKind(player, check.cost);
  if (!spentKey) return null;
  player.bagUpgrades = (player.bagUpgrades || 0) + 1;
  return { newCapacity: bagCapacity(player), spentKey, cost: check.cost };
}

// ---------------- เวสเปอร์: v6 Cleanse Curse ----------------
// Strips a cursed item's debuff and promotes it to LEGENDARY rarity — same
// monstrous stats, no more drawback. Costs gold AND materials: cleansing a
// mistake should still hurt a little less than the curse itself did.

// v12 BALANCE: cleansing scales punishingly with the sinner's stature.
// The stronger you are, the more the curse has rooted into you — a level-30,
// CP-2000 lord pays ~3,550 gold and 30 materials per cleanse (was a flat
// 150/15). Cursed gear stays a genuine devil's bargain all game long.
export function cleanseCost(player) {
  return {
    gold: 500 + player.level * 75 + Math.round((player.combatPower || 0) * 0.4),
    materials: 20 + Math.floor(player.level / 3),
  };
}

export function canCleanseCurse(player, item) {
  if (!item || !item.curse) return { ok: false, reason: 'noCurse' };
  const cost = cleanseCost(player);
  if (player.gold < cost.gold) return { ok: false, reason: 'gold' };
  if (largestMaterialStack(player).count < cost.materials) return { ok: false, reason: 'materials' };
  return { ok: true, cost };
}

/** Mutates `item` in place (cleanseCurse from equipment.js) — works whether it's equipped or sitting in the bag. */
export function performCleanseCurse(player, item) {
  const check = canCleanseCurse(player, item);
  if (!check.ok) return null;
  player.gold -= check.cost.gold;
  spendMaterialsOfOneKind(player, check.cost.materials);
  cleanseCurse(item);
  return { item, cost: check.cost };
}

// ---------------- อิศรา: World Map vision upgrades (macro layer) ----------------
// v6: at VISION_MAX, Isra's teaching is sharp enough that upcoming zone
// hazard icons (toxic fog / blood moon / overgrowth) also become visible on
// unvisited nodes — see zone-map.js's HAZARD_SIGHT_VISION. No extra code
// needed here; the zone screen just checks player.worldVisionRange.

export const VISION_MAX = 3;

export function visionUpgradeCost(player) { return (player.worldVisionRange || 1) * 6; } // 6 then 12

export function canUpgradeVision(player) {
  if ((player.worldVisionRange || 1) >= VISION_MAX) return { ok: false, reason: 'maxed' };
  const cost = visionUpgradeCost(player);
  if (largestMaterialStack(player).count < cost) return { ok: false, reason: 'materials' };
  return { ok: true, cost };
}

export function upgradeVision(player) {
  const check = canUpgradeVision(player);
  if (!check.ok) return null;
  const spentKey = spendMaterialsOfOneKind(player, check.cost);
  if (!spentKey) return null;
  player.worldVisionRange = (player.worldVisionRange || 1) + 1;
  return { newRange: player.worldVisionRange, spentKey, cost: check.cost };
}

// ---------------- ครอม: weapon reforging ----------------

export function reforgeCost(weapon) {
  const count = weapon.reforgeCount || 0;
  return { gold: Math.round(80 * Math.pow(1.5, count)), materials: 3 + count };
}

export function canReforge(player) {
  const weapon = player.equipment.weapon;
  if (!weapon) return { ok: false, reason: 'noWeapon' };
  const cost = reforgeCost(weapon);
  if (player.gold < cost.gold) return { ok: false, reason: 'gold' };
  if (largestMaterialStack(player).count < cost.materials) return { ok: false, reason: 'materials' };
  return { ok: true, cost };
}

export function reforgeWeapon(player) {
  const check = canReforge(player);
  if (!check.ok) return null;
  const weapon = player.equipment.weapon;
  player.gold -= check.cost.gold;
  spendMaterialsOfOneKind(player, check.cost.materials);
  weapon.statMods.atk = (weapon.statMods.atk || 0) + 2;
  weapon.reforgeCount = (weapon.reforgeCount || 0) + 1;
  return { weapon, cost: check.cost };
}

// ---------------- มารา: peddler stock ----------------

/** 3 guaranteed rare/epic items at a 1.6x markup (pricing handled by town.js). */
export function peddlerStock(playerLevel) {
  return Array.from({ length: 3 }, () => {
    const rarity = Math.random() < 0.35 ? Rarity.EPIC : Rarity.RARE;
    return createEquipment(rollLootSlot(), playerLevel, rarity); // v11: accessory scarcity applies in shops too
  });
}

// ---------------- v6: มืดกาล — the Wandering Smuggler's black market ----------------
// Found only by stumbling into her hidden camp (world-map.js). Her stock
// always includes at least one Cursed item (she deals in what "proper"
// merchants won't touch) plus Epic-tier goods, priced at a black-market
// markup. She is the ONLY source in the game for a PvP Heart — priced
// astronomically, in a single material kind, and capped by Player.gainHeart()
// so it can never push past the starting 3.

const SMUGGLER_MARKUP = 1.35;
export const SMUGGLER_HEART_COST = 40; // of ONE material kind — deliberately astronomical

/** Mirrors town.js's buyPrice formula (kept local — she isn't a normal town shop). */
export function smugglerPriceFor(item, playerLevel) {
  return Math.round((salvageValue(item) * 6 + playerLevel * 2) * SMUGGLER_MARKUP);
}

/** Fresh black-market stock: 2 Epic-tier goods + 1-2 Cursed items, each with its own price tag. Returns [{ item, price }]. */
export function smugglerStock(playerLevel) {
  const entries = [];
  for (let i = 0; i < 2; i += 1) {
    const item = createEquipment(rollLootSlot(), playerLevel, Rarity.EPIC); // v11: weighted slots
    entries.push({ item, price: smugglerPriceFor(item, playerLevel) });
  }
  const cursedCount = 1 + Math.floor(Math.random() * 2); // 1-2
  for (let i = 0; i < cursedCount; i += 1) {
    const item = createCursedEquipment(slots[Math.floor(Math.random() * slots.length)], playerLevel);
    entries.push({ item, price: smugglerPriceFor(item, playerLevel) });
  }
  return entries;
}

export function canBuyHeartFromSmuggler(player) {
  if ((player.hearts || 0) >= STARTING_HEARTS) return { ok: false, reason: 'maxHearts' };
  if (largestMaterialStack(player).count < SMUGGLER_HEART_COST) return { ok: false, reason: 'materials' };
  return { ok: true, cost: SMUGGLER_HEART_COST };
}

export function buyHeartFromSmuggler(player) {
  const check = canBuyHeartFromSmuggler(player);
  if (!check.ok) return null;
  const spentKey = spendMaterialsOfOneKind(player, check.cost);
  if (!spentKey) return null;
  player.gainHeart();
  return { heartsNow: player.hearts, spentKey, cost: check.cost };
}
