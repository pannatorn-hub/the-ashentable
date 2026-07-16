// town.js (v4 — NEW)
// ---------------------------------------------------------------------------
// Towns, shops, and paid fast travel. Towns are safe hubs discovered by
// reaching a zone's TOWN node (depth 3); the Capital is the permanent hub.
// Shops generate a small level-appropriate stock; the peddler's stock and
// markup come from npc.js. Fast travel burns gold, scaled by how deep into
// the world the destination lies. Zero DOM dependencies.
// ---------------------------------------------------------------------------

import { generateLoot, salvageValue, createEquipment, EquipmentSlot, rollLootSlot } from './equipment.js';
import { peddlerStock, npcsAt } from './npc.js';

const SHOP_STOCK_SIZE = 4;
const PEDDLER_MARKUP = 1.6;

/** Buy price: several times the salvage (sell) value, nudged by player level. */
export function buyPrice(item, playerLevel, markup = 1) {
  return Math.round((salvageValue(item) * 6 + playerLevel * 2) * markup);
}

export function sellPrice(item, zoneIndex) { 
  const basePrice = salvageValue(item); 
  
  // กิมมิค: ถ้าเป็นเมืองที่ 4 (เขตของมารา) จะรับซื้อของแพงกว่าปกติ 2 เท่า!
  if (zoneIndex === 4) {
    return basePrice * 2;
  }
  
  return basePrice; 
}

/**
 * Generates a town's shop stock. The zone-4 town (มารา's post) sells her
 * rare/epic stock at a markup; everywhere else gets a normal spread.
 * Returns [{ item, price }].
 */
export function generateShopStock(zoneIndex, playerLevel) {
  const hasPeddler = npcsAt(zoneIndex).some((n) => n.service === 'peddler');
  if (hasPeddler) {
    return peddlerStock(playerLevel).map((item) => ({ item, price: buyPrice(item, playerLevel, PEDDLER_MARKUP) }));
  }
  return Array.from({ length: SHOP_STOCK_SIZE }, () => {
    const item = createEquipment(rollLootSlot(), playerLevel); // v11: weighted slots — accessories rare here too
    return { item, price: buyPrice(item, playerLevel) };
  });
}

// ---------------- Fast travel ----------------

/** Cost to teleport to a destination: the Capital is cheap, deep towns cost dearly. */
export function travelCost(destination) {
  if (destination === 'capital') return 25;
  return 30 + destination.zoneIndex * 20;
}

/** All destinations reachable by candle-warp: the Capital + every discovered town (minus where you stand). */
export function travelDestinations(world, from) {
  const dests = [];
  // ตรวจสอบว่าเคยไปถึงเมืองหลวง (Capital) และปลดล็อคแล้วหรือยัง
  const capitalVisited = world.macro.nodes.capital && world.macro.nodes.capital.visited;
  
  if (from !== 'capital' && capitalVisited) dests.push({ kind: 'capital' });
  
  for (const zone of world.zones) {
    if (!zone || !zone.townDiscovered) continue;
    if (typeof from === 'object' && from !== null && from.zoneIndex === zone.index) continue;
    dests.push({ kind: 'town', zoneIndex: zone.index });
  }
  return dests;
}

export function canAffordTravel(player, destination) {
  const cost = travelCost(destination.kind === 'capital' ? 'capital' : destination);
  return { ok: player.gold >= cost, cost };
}
