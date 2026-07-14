// zone-map.js (v6 — MICRO LAYER)
// ---------------------------------------------------------------------------
// The inside of ONE region: the "Slay the Spire"-style node crawl.
// Persistent HP, fog of war, and difficulty all live at this scope.
//
// v6 CHANGES:
//   1. RARE DEEP ALTAR — the Heart Sacrifice Altar can no longer roll in the
//      shallow half of a region. It appears ONLY at depth > TOWN_DEPTH
//      (i.e. depths 4-6), at a slim ~5% per field node. Its reward grew to
//      match (see altar.js): finding one deep in the dark is a real event.
//   2. ZONE HAZARDS — combat nodes can carry an environmental hazard:
//        toxic_fog  — the player bleeds HP every turn of the fight
//        blood_moon — the enemy crits on EVERY hit, but gold doubles
//        overgrowth — vines seal the player's dodge entirely
//      Hazard chance scales with dangerTier — the deep world is hostile in
//      more ways than raw stats. combat.js executes the effects; the map
//      only stamps `node.hazard`. Isra's (Blind Scout) vision upgrade lets
//      the zone screen SHOW hazard icons on not-yet-visited nodes
//      (worldVisionRange >= HAZARD_SIGHT_VISION) so routes can be planned.
//   3. CAMPFIRE AMBUSH — resting in a high-danger region (dangerTier >=
//      AMBUSH_MIN_TIER) risks an 18% ambush: combat begins with the enemy
//      striking first. Survival guarantees rare loot. This file supplies
//      the odds + the ambusher; gameController rolls the dice.
//   4. CURSED DROP ODDS — Lords and elites (and anything deep in the outer
//      web) can drop Cursed Equipment. The odds live here because they're
//      a property of the map's danger, not of the loot table itself.
//
// Zero DOM dependencies.
// ---------------------------------------------------------------------------

import { t } from './i18n.js';
import { Combatant } from './combatant.js';

export const NodeType = Object.freeze({
  NORMAL: 'normal', HARD: 'hard', ELITE: 'elite', LORD: 'lord',
  EVENT: 'event', ALTAR: 'altar', CAMPFIRE: 'campfire', TOWN: 'town',
});

// v6: environmental hazards stamped onto combat nodes.
export const NodeHazard = Object.freeze({
  TOXIC_FOG: 'toxic_fog',
  BLOOD_MOON: 'blood_moon',
  OVERGROWTH: 'overgrowth',
});
const HAZARD_KEYS = Object.values(NodeHazard);
const HAZARD_ICONS = { toxic_fog: '☣', blood_moon: '🌕', overgrowth: '🌿' };

/** Isra's Blind-Scout vision must reach this before hazard icons show on unvisited nodes. */
export const HAZARD_SIGHT_VISION = 2;

// v6: campfire ambush tuning.
export const AMBUSH_MIN_TIER = 3;
export const AMBUSH_CHANCE = 0.18;

export const ZONE_COUNT = 10;          // authored regions with unique hand-written lore
export const SOFT_CAP_DEPTH = 4;       // per-region: beyond the region's own town, no more mercy
export const TOWN_DEPTH = 3;
const DEPTH_WIDTHS = [2, 3, 3, 1, 2, 3, 2, 1]; // depth 3 = town (1), depth 7 = lord (1)

// Must match world-map.js's CAPITAL_TIER. Kept as a local constant instead of
// an import to avoid a circular dependency between the two map layers.
const MACRO_SOFT_CAP_TIER = 5;

const ZONE_ACCENTS = ['#3e8e7e', '#b9b2a0', '#48a08e', '#8a94a6', '#d68a4a', '#6a5dc9', '#7fbf4d', '#5c86c9', '#7b8a5a', '#b04a8f'];

// ---------------- Identity / flavor text ----------------

// index -> { biomeKey, dangerTier } for procedurally-generated regions past the 10 authored ones.
const outerMetaRegistry = {};

/** Called once, right when a new procedural region is created (see world-map.js's expandOuterFrontier). */
export function registerOuterZoneMeta(index, meta) { outerMetaRegistry[index] = meta; }

/** Rebuilds the in-memory registry from a loaded save (module-level state doesn't survive a page reload). */
export function hydrateOuterZoneRegistry(world) {
  (world?.zones || []).forEach((z, i) => {
    if (z && z.outer) registerOuterZoneMeta(i, { biomeKey: z.biomeKey, dangerTier: z.dangerTier });
  });
}

function outerFlavor(index) {
  const meta = outerMetaRegistry[index];
  if (!meta) return { name: t('zone.unknown'), lore: t('zone.unknown.lore') };
  return {
    name: t('world.outerZoneName', { biome: t(`biome.${meta.biomeKey}`), n: meta.dangerTier }),
    lore: t(`biome.${meta.biomeKey}.flavor`),
  };
}

export function zoneName(index) { return index < ZONE_COUNT ? t(`zone.z${index}`) : outerFlavor(index).name; }
export function zoneLore(index) { return index < ZONE_COUNT ? t(`zone.z${index}.lore`) : outerFlavor(index).lore; }
export function townName(index) {
  if (index < ZONE_COUNT) return t(`town.z${index}`);
  const meta = outerMetaRegistry[index];
  return t('world.outerTownName', { biome: t(`biome.${meta ? meta.biomeKey : 'ashen_ruins'}`) });
}
export function materialName(index) { return index < ZONE_COUNT ? t(`mat.z${index}`) : t('mat.generic'); }
export function zoneAccent(index) { return ZONE_ACCENTS[index % ZONE_ACCENTS.length]; }

// ---------------- Hazard display helpers ----------------

export function hazardName(hazard) { return t(`hazard.${hazard}`); }
export function hazardDesc(hazard) { return t(`hazard.${hazard}.desc`); }
export function hazardIcon(hazard) { return HAZARD_ICONS[hazard] || '⚠'; }

let _nodeUid = 0;
function nextNodeId() { _nodeUid += 1; return `n_${Date.now()}_${_nodeUid}`; }

/**
 * v6: the ALTAR is gone from the shallow roll entirely — it exists only
 * past the region's own town, and rarely even there. Slots the old shallow
 * altar odds into EVENT instead so the pre-town mix stays survivable.
 */
function rollFieldNodeType(depth) {
  const r = Math.random();
  if (depth <= 2) { // before the town: survivable mix — NO altar this shallow anymore
    if (r < 0.20) return NodeType.EVENT;
    if (r < 0.60) return NodeType.NORMAL;
    return NodeType.HARD;
  }
  // beyond the town: the deep dark — the altar hides here, and only here
  if (r < 0.05) return NodeType.ALTAR;
  if (r < 0.14) return NodeType.EVENT;
  if (r < 0.44) return NodeType.HARD;
  return NodeType.ELITE;
}

/** Chance a combat node at this depth/tier carries an environmental hazard. */
function hazardChance(dangerTier, depth) {
  if (dangerTier < 2) return 0;                       // the early web stays clean — teach first, punish later
  const base = 0.06 + dangerTier * 0.05 + (depth > TOWN_DEPTH ? 0.06 : 0);
  return Math.min(0.4, base);
}

const COMBAT_TYPES = new Set([NodeType.NORMAL, NodeType.HARD, NodeType.ELITE, NodeType.LORD]);

/**
 * Generates one region's internal node graph (the micro crawl).
 * `dangerTier` comes from the macro layer — this region's real distance
 * from the Start Village through the web of paths, NOT its raw index.
 * `opts.outer` / `opts.biomeKey` mark a procedural post-Capital region.
 */
export function generateMicroZone(zoneIndex, dangerTier, opts = {}) {
  // v9: the Lord floor gets ONE boss per macro exit this region owns — each
  // Lord physically guards one road out. `opts.exits` are macro node ids
  // (world-map.js passes them). Outer regions pass none: they keep a single
  // Lord whose death opens every road (that's what `outer` unlocking means).
  const exits = Array.isArray(opts.exits) ? opts.exits.slice() : [];
  const LORD_DEPTH = DEPTH_WIDTHS.length - 1;
  const lordCount = Math.max(1, exits.length);

  const floors = [];
  for (let d = 0; d < DEPTH_WIDTHS.length; d += 1) {
    const width = d === LORD_DEPTH ? lordCount : DEPTH_WIDTHS[d];
    const floor = [];
    for (let i = 0; i < width; i += 1) {
      let type;
      if (d === TOWN_DEPTH) type = NodeType.TOWN;
      else if (d === LORD_DEPTH) type = NodeType.LORD;
      else type = rollFieldNodeType(d);
      const node = { id: nextNodeId(), depth: d, index: i, type, cleared: false, connectsTo: [], capitalGate: false, hazard: null };
      // v9: which macro road this Lord blocks, and whether he's already dead.
      // A slain Lord's node survives — it just stops being a boss (see
      // effectiveNodeType) and repopulates with ordinary mobs.
      if (d === LORD_DEPTH) {
        node.macroTarget = exits[i] || null;
        node.bossSlain = false;
      }
      // v6: stamp environmental hazards onto combat nodes (Lords included —
      // a Blood-Moon Lord is exactly the kind of story this game wants).
      if (COMBAT_TYPES.has(type) && Math.random() < hazardChance(dangerTier, d)) {
        node.hazard = HAZARD_KEYS[Math.floor(Math.random() * HAZARD_KEYS.length)];
      }
      floor.push(node);
    }
    floors.push(floor);
  }

  // Guarantee one campfire shallow (depth 2) and one deep (depth 5) —
  // persistent HP needs breathing room on both sides of the town.
  const shallow = floors[2][Math.floor(Math.random() * floors[2].length)];
  if (shallow.type !== NodeType.TOWN) { shallow.type = NodeType.CAMPFIRE; shallow.hazard = null; }
  const deep = floors[5][Math.floor(Math.random() * floors[5].length)];
  deep.type = NodeType.CAMPFIRE;
  deep.hazard = null;

  // One capital gate at depth 4: a shortcut back to the Capital, usable once reached.
  const gate = floors[4][Math.floor(Math.random() * floors[4].length)];
  gate.capitalGate = true;

  // Connect depth d -> d+1 (1-2 nearest targets).
  for (let d = 0; d < floors.length - 1; d += 1) {
    const cur = floors[d];
    const next = floors[d + 1];
    cur.forEach((node, i) => {
      const primary = Math.min(next.length - 1, Math.max(0, Math.round((i * (next.length - 1)) / Math.max(1, cur.length - 1))));
      const targets = new Set([primary]);
      if (next.length > 1 && Math.random() < 0.5) {
        targets.add(Math.max(0, Math.min(next.length - 1, primary + (Math.random() < 0.5 ? -1 : 1))));
      }
      node.connectsTo = [...targets].map((idx) => next[idx].id);
    });
  }

  return {
    index: zoneIndex,
    dangerTier,
    outer: !!opts.outer,
    biomeKey: opts.biomeKey || null,
    floors,
    entranceIds: floors[0].map((n) => n.id),
    townNodeId: floors[TOWN_DEPTH][0].id,
    lordNodeId: floors[DEPTH_WIDTHS.length - 1][0].id,
    townDiscovered: false,
    lordDefeated: false,        // ANY Lord of this region has fallen (outer regions unlock on this)
    exits,                      // v9: macro roads out of this region, in Lord-node order
    defeatedLords: [],          // v9: macro ids whose guardian Lord is dead — THE unlock flags
    legacyBossGating: false,    // v9: true only for pre-v9 saves migrated in (see migrateBossGating)
  };
}

// ---------------- v9: Boss state ----------------

/** A Lord node whose boss is dead behaves as an ordinary combat node forever after. */
export function effectiveNodeType(node) {
  if (!node) return null;
  if (node.type === NodeType.LORD && node.bossSlain) return NodeType.NORMAL;
  return node.type;
}

/** True only for a Lord that is still alive — i.e. a real boss fight. */
export function isLiveBossNode(node) {
  return !!node && node.type === NodeType.LORD && !node.bossSlain;
}

/** Every still-living Lord in this region. */
export function liveBossNodes(zone) {
  return zone.floors.flat().filter(isLiveBossNode);
}

/**
 * v9 SAVE MIGRATION. Pre-v9 zones have a single Lord with no `macroTarget`,
 * so `defeatedLords` could never fill and the macro roads out could never
 * open. Rather than regenerate the world (which would wipe exploration), we
 * flag the region as legacy-gated: its already-dead Lord unlocks every road,
 * exactly like an outer region. New regions are unaffected.
 */
export function migrateBossGating(zone, macroChildren = []) {
  if (!Array.isArray(zone.defeatedLords)) zone.defeatedLords = [];
  if (!Array.isArray(zone.exits)) zone.exits = macroChildren.slice();
  const lords = zone.floors.flat().filter((n) => n.type === NodeType.LORD);
  const needsMigration = lords.some((n) => n.macroTarget === undefined);
  if (!needsMigration) return false;
  for (const n of lords) {
    if (n.macroTarget === undefined) n.macroTarget = null;
    if (n.bossSlain === undefined) n.bossSlain = !!(zone.lordDefeated && n.cleared);
  }
  zone.legacyBossGating = true;
  return true;
}

export function findNode(zone, nodeId) {
  return zone.floors.flat().find((n) => n.id === nodeId) || null;
}

/** Selectable next nodes: entrance floor when standing nowhere, otherwise the current node's forward edges. */
export function getAvailableNodeIds(zone, currentNodeId) {
  if (!currentNodeId) return new Set(zone.entranceIds);
  const current = findNode(zone, currentNodeId);
  if (!current) return new Set(zone.entranceIds);
  return new Set(current.connectsTo);
}

/**
 * FOG OF WAR (micro). Visible = cleared nodes + the discovered town + everything
 * within `visionRange` forward steps of the player's frontier (current node,
 * or the entrances when standing outside). Everything else renders as fog.
 */
export function computeVisibleNodeIds(zone, currentNodeId, visionRange = 1) {
  const visible = new Set();
  const all = zone.floors.flat();
  for (const n of all) if (n.cleared) visible.add(n.id);
  if (zone.townDiscovered) visible.add(zone.townNodeId);

  let frontier = currentNodeId ? [currentNodeId] : [...zone.entranceIds];
  if (!currentNodeId) frontier.forEach((id) => visible.add(id));
  for (let step = 0; step < visionRange; step += 1) {
    const nextFrontier = [];
    for (const id of frontier) {
      const node = findNode(zone, id);
      if (!node) continue;
      for (const targetId of node.connectsTo) {
        if (!visible.has(targetId)) nextFrontier.push(targetId);
        visible.add(targetId);
      }
    }
    frontier = nextFrontier;
  }
  return visible;
}

/** Respawn an expedition: enemies return; town discovery, Lord kills, and gates stay known. */
export function respawnZone(zone) {
  for (const n of zone.floors.flat()) {
    // v9: a slain Lord does NOT come back. His node reopens (cleared = false)
    // so the player can walk it again, but `bossSlain` makes it an ordinary
    // combat node from now on — normal mobs, normal rewards, no boss fight.
    // A Lord who is still alive also reopens: he was never beaten.
    n.cleared = false;
  }
}

// ---------------- Difficulty ----------------

/** Micro soft cap: gentle growth to a region's own town, exponential beyond it. */
export function depthMultiplier(depth) {
  const gentle = Math.pow(1.12, Math.min(depth, SOFT_CAP_DEPTH));
  const spike = depth > SOFT_CAP_DEPTH ? Math.pow(1.6, depth - SOFT_CAP_DEPTH) : 1;
  return gentle * spike;
}

/**
 * MACRO soft cap: how much this whole region is scaled up by its real
 * distance from the Start Village (dangerTier, handed down by world-map.js).
 */
export function dangerMultiplier(dangerTier) {
  const tier = Math.max(0, dangerTier);
  if (tier <= MACRO_SOFT_CAP_TIER) return 1 + tier * 0.4;
  const base = 1 + MACRO_SOFT_CAP_TIER * 0.4;
  return base * Math.pow(1.55, tier - MACRO_SOFT_CAP_TIER);
}

const TIER_MULT = { [NodeType.NORMAL]: 1, [NodeType.HARD]: 1.3, [NodeType.ELITE]: 1.7, [NodeType.LORD]: 2.3 };

export function generateEnemyForNode(node, zone, playerLevel) {
  const scale = (TIER_MULT[node.type] || 1) * dangerMultiplier(zone.dangerTier) * depthMultiplier(node.depth) * (1 + (playerLevel - 1) * 0.06)*0.5;
  const wobble = () => 0.85 + Math.random() * 0.3;
  const isLord = node.type === NodeType.LORD;

  const name = isLord
    ? t('enemy.warden', { biome: zoneName(zone.index) })
    : node.type === NodeType.ELITE ? t('node.elite')
    : node.type === NodeType.HARD ? t('enemy.stalker') : t('enemy.beast');

  return new Combatant({
    name,
    stats: {
      atk: Math.round(9 * scale * wobble()),
      def: Math.round(6 * scale * wobble()),
      maxHp: Math.round(50 * scale * wobble()),
      speed: Math.round(8 * (isLord ? 1.15 : 1) * wobble()),
      dodge: Math.round(4 + (isLord ? 6 : node.type === NodeType.ELITE ? 4 : 0)),
      accuracy: Math.round(3 + zone.dangerTier * 1.5 + node.depth),
      critRate: Math.round(3 + (isLord ? 6 : 0)),
    },
  });
}

// ---------------- v6: Campfire Ambush ----------------

/** Should THIS campfire risk an ambush? Only in high-danger regions. */
export function rollCampfireAmbush(zone) {
  if (zone.dangerTier < AMBUSH_MIN_TIER) return false;
  return Math.random() < AMBUSH_CHANCE;
}

/** The thing that crawls out of the dark while you sleep — an elite-grade predator. */
export function generateAmbushEnemy(zone, node, playerLevel) {
  const scale = 1.5 * dangerMultiplier(zone.dangerTier) * depthMultiplier(node.depth) * (1 + (playerLevel - 1) * 0.06);
  const wobble = () => 0.85 + Math.random() * 0.3;
  return new Combatant({
    name: t('enemy.ambusher'),
    stats: {
      atk: Math.round(10 * scale * wobble()),
      def: Math.round(5 * scale * wobble()),
      maxHp: Math.round(50 * scale * wobble()),
      speed: Math.round(11 * wobble()),      // fast — it chose the moment
      dodge: 8,
      accuracy: Math.round(5 + zone.dangerTier * 1.5),
      critRate: 8,
    },
  });
}

// ---------------- v6: Cursed drop odds ----------------

/**
 * Chance this node's victory yields a CURSED item (equipment.js forges it).
 * Lords are the prime source; elites a lesser one; deep outer-web regions
 * sweat curses from every pore.
 */
export function cursedDropChanceFor(node, zone) {
  let chance = 0;
  if (node.type === NodeType.LORD) chance = 0.35;
  else if (node.type === NodeType.ELITE) chance = 0.12;
  else if (zone.dangerTier > MACRO_SOFT_CAP_TIER) chance = 0.05; // the outer web itself is cursed ground
  if (zone.dangerTier > MACRO_SOFT_CAP_TIER) chance += 0.05;
  return Math.min(0.5, chance);
}

// ---------------- Economy drops ----------------

export function goldDropFor(node, zone, won) {
  return 0; // v7: มอนสเตอร์ไม่ดรอปเงินอีกต่อไป ต้องหาเงินจากการขายของให้ NPC เท่านั้น
}

/** Zone material drops: chance on a normal win, guaranteed and larger for elites and the Lord. */
export function materialDropFor(node, won) {
  if (!won) return 0;
  if (node.type === NodeType.LORD) return 4;
  if (node.type === NodeType.ELITE) return 2;
  return Math.random() < 0.45 ? 1 : 0;
}
