// world-map.js (v6 — MACRO LAYER)
// ---------------------------------------------------------------------------
// The Region-level map. A hidden WEB/GRAPH of the world — not a simple tree,
// not a free-pick grid. This is what the player sees when they open
// "ดูแผนที่โลก" (View World Map).
//
// v6 ADDITION — THE WANDERING SMUGGLER (มืดกาล):
//   A unique black-market NPC who is never placed by hand. She sits on
//   exactly ONE random ZONE node that is still hidden behind the macro fog
//   (i.e. its region's Town hasn't been found yet) — `macro.smugglerNodeId`.
//   Walking INTO that region's wilds (enterZone, before the Town is ever
//   found) triggers a one-time encounter (GameController checks
//   triggerSmugglerEncounter on entry). The instant she's found, she packs
//   up and reappears on a different patch of unmapped fog elsewhere on the
//   web — she is never on a node the player has already secured, and she is
//   never encountered twice in the same hiding spot. This file owns WHERE
//   she is; npc.js owns WHAT she sells (see npc.js's smuggler service).
//
//   GameController calls `ensureSmugglerPlaced(macro, world)` after every
//   discovery event (arriving at a hub, discovering a region's Town) so her
//   camp keeps drifting into whatever fog is left, the way the GDD's lore
//   describes: "no one has ever seen her arrive."
//
// This file owns: the graph shape, macro fog of war, the danger curve, and
// the Smuggler's whereabouts. zone-map.js owns everything that happens once
// you're inside a single region. Zero DOM dependencies.
// ---------------------------------------------------------------------------

import { generateMicroZone, registerOuterZoneMeta } from './zone-map.js';

export const MacroKind = Object.freeze({ HUB: 'hub', ZONE: 'zone' });
export const ZONE_COUNT = 10; // the 10 hand-authored regions of the pre-Capital web

// The hidden web. Keys are region indices (0-9); `children` are the regions
// a Town-secured region opens onto next. `gatesToCapital` means: once this
// region's Town is found, a path back to the Capital opens from it too.
// `deadEnd` regions have no forward path at all.
const STATIC_ZONE_GRAPH = {
  0: { children: [1, 2] },
  1: { children: [3] },
  2: { children: [3, 4] },
  3: { children: [5] },
  4: { children: [5, 6] },
  5: { children: [7], gatesToCapital: true },
  6: { children: [8, 9] },
  7: { children: [], gatesToCapital: true },
  8: { children: [], deadEnd: true },
  9: { children: [], gatesToCapital: true },
};

/** BFS depth of each authored region from region 0 — this becomes its dangerTier. */
function computeStaticDepths() {
  const depth = { 0: 0 };
  const queue = [0];
  while (queue.length) {
    const cur = queue.shift();
    for (const child of STATIC_ZONE_GRAPH[cur].children) {
      if (depth[child] === undefined) { depth[child] = depth[cur] + 1; queue.push(child); }
    }
  }
  return depth;
}

const STATIC_DEPTHS = computeStaticDepths();

/** One tier past the deepest region that actually gates to the Capital — the Capital always sits just beyond the web. */
export const CAPITAL_TIER = Math.max(...Object.entries(STATIC_ZONE_GRAPH)
  .filter(([, def]) => def.gatesToCapital)
  .map(([idx]) => STATIC_DEPTHS[Number(idx)])) + 1;

const OUTER_BIOME_KEYS = ['ember_wastes', 'verdant_hollow', 'frostpeak', 'ashen_ruins'];

// ---------------- Generation ----------------

/**
 * Builds the whole persistent world: the 10 authored regions wired into the
 * macro web, plus the Start Village and Capital hubs. Outer (post-Capital)
 * regions are grown on demand (expandOuterFrontier). The Wandering
 * Smuggler is placed on a random still-fogged region as the final step.
 */
export function generateWorld() {
  const nodes = {};
  nodes.start = { id: 'start', kind: MacroKind.HUB, connectsTo: ['0'], visited: true, dangerTier: -1 };
  nodes.capital = { id: 'capital', kind: MacroKind.HUB, connectsTo: [], visited: false, dangerTier: CAPITAL_TIER };

  const zones = [];
  for (let i = 0; i < ZONE_COUNT; i += 1) {
    const dangerTier = STATIC_DEPTHS[i];
    zones[i] = generateMicroZone(i, dangerTier);
    const def = STATIC_ZONE_GRAPH[i];
    const children = def.children.map(String);
    if (def.gatesToCapital) children.push('capital');
    nodes[String(i)] = {
      id: String(i), kind: MacroKind.ZONE, zoneIndex: i, connectsTo: children,
      dangerTier, deadEnd: !!def.deadEnd, outer: false,
    };
  }

  const world = {
    zones,
    macro: { nodes, startId: 'start', capitalId: 'capital', nextOuterIndex: ZONE_COUNT, smugglerNodeId: null },
  };
  ensureSmugglerPlaced(world.macro, world); // her very first hiding spot
  return world;
}

export function findMacroNode(macro, id) { return macro.nodes[id] || null; }

/** Has this node been secured enough that its onward paths exist to walk? */
function isFootholdSecured(node, world) {
  if (!node) return false;
  if (node.kind === MacroKind.HUB) return node.visited;
  const zone = world.zones[node.zoneIndex];
  return !!(zone && zone.townDiscovered); // the road only forks once you've found the region's Town
}

/** Selectable next macro nodes: the Start Village when standing nowhere, otherwise the current node's secured edges. */
export function getAvailableMacroNodeIds(macro, world, currentMacroId) {
  if (!currentMacroId) return new Set([macro.startId]);
  const node = findMacroNode(macro, currentMacroId);
  if (!isFootholdSecured(node, world)) return new Set(); // still fighting through — no fork to choose yet
  return new Set(node.connectsTo);
}

export function isMacroNodeDiscovered(node, world) {
  if (!node) return false;
  return node.kind === MacroKind.HUB ? node.visited : !!(world.zones[node.zoneIndex] && world.zones[node.zoneIndex].townDiscovered);
}

export function isMacroNodeConquered(node, world) {
  if (!node) return false;
  return node.kind === MacroKind.HUB ? node.visited : !!(world.zones[node.zoneIndex] && world.zones[node.zoneIndex].lordDefeated);
}

/**
 * MACRO FOG OF WAR. Visible = every node ever discovered, plus everything
 * within `worldVisionRange` structural steps of the current position.
 * worldVisionRange is upgraded by the Blind Scout (Isra).
 */
export function computeVisibleMacroNodeIds(macro, world, currentMacroId, worldVisionRange = 1) {
  const visible = new Set();
  for (const id of Object.keys(macro.nodes)) {
    if (isMacroNodeDiscovered(macro.nodes[id], world)) visible.add(id);
  }
  const startAt = currentMacroId || macro.startId;
  visible.add(startAt);

  let frontier = [startAt];
  for (let step = 0; step < worldVisionRange; step += 1) {
    const next = [];
    for (const id of frontier) {
      const node = findMacroNode(macro, id);
      if (!node) continue;
      for (const targetId of node.connectsTo) {
        if (!visible.has(targetId)) next.push(targetId);
        visible.add(targetId);
      }
    }
    frontier = next;
  }
  return visible;
}

// ---------------- Marking progress ----------------

/** Call when the player arrives at a hub (Start Village or Capital). */
export function markHubVisited(macro, hubId) {
  const node = findMacroNode(macro, hubId);
  if (node) node.visited = true;
}

// ---------------- v6: The Wandering Smuggler ----------------

function pickUndiscoveredZoneNodeId(macro, world, excludeId = null) {
  const candidates = Object.keys(macro.nodes).filter((id) => {
    if (id === excludeId) return false;
    const node = macro.nodes[id];
    return node.kind === MacroKind.ZONE && !isMacroNodeDiscovered(node, world);
  });
  if (!candidates.length) return null;
  return candidates[Math.floor(Math.random() * candidates.length)];
}

/**
 * Places (or re-places) the Wandering Smuggler. Safe to call after ANY
 * discovery event (hub arrival, a region's Town being found) — it's a
 * no-op if her current spot is still hidden behind the fog. If every
 * region has been discovered (rare, late-game), she has nowhere to hide
 * and `smugglerNodeId` becomes null until fresh fog exists again (the
 * endless outer web reliably provides this).
 */
export function ensureSmugglerPlaced(macro, world) {
  const currentNode = macro.smugglerNodeId ? findMacroNode(macro, macro.smugglerNodeId) : null;
  if (currentNode && !isMacroNodeDiscovered(currentNode, world)) return; // still safely hidden
  macro.smugglerNodeId = pickUndiscoveredZoneNodeId(macro, world);
}

export function isSmugglerNode(macro, macroId) {
  return !!macro.smugglerNodeId && macro.smugglerNodeId === macroId;
}

/**
 * Call when the player enters a macro zone node (before its Town is found).
 * Returns true exactly once for her hiding spot — then she vanishes into a
 * different patch of unmapped fog, so the same camp is never found twice.
 */
export function triggerSmugglerEncounter(macro, world, macroId) {
  if (!isSmugglerNode(macro, macroId)) return false;
  macro.smugglerNodeId = pickUndiscoveredZoneNodeId(macro, world, macroId);
  return true;
}

// ---------------- The endless outer web ----------------

/**
 * Grows the frontier past the Capital (or past an already-secured outer
 * region) by 2-3 new procedural regions. Idempotent: does nothing if
 * `fromId` already has children, isn't eligible, or isn't itself secured.
 * Returns the list of newly created macro node ids (possibly empty).
 */
export function expandOuterFrontier(macro, world, fromId) {
  const from = findMacroNode(macro, fromId);
  if (!from) return [];
  const isCapital = fromId === macro.capitalId;
  const eligible = isCapital || (from.kind === MacroKind.ZONE && from.outer);
  if (!eligible || from.connectsTo.length > 0) return [];
  if (!isFootholdSecured(from, world)) return [];

  const count = 2 + Math.floor(Math.random() * 2); // 2-3: a fan, not a corridor
  const parentTier = isCapital ? CAPITAL_TIER : from.dangerTier;
  const newIds = [];

  for (let k = 0; k < count; k += 1) {
    const idx = macro.nextOuterIndex;
    macro.nextOuterIndex += 1;
    const dangerTier = parentTier + 1;
    const biomeKey = OUTER_BIOME_KEYS[Math.floor(Math.random() * OUTER_BIOME_KEYS.length)];
    const zone = generateMicroZone(idx, dangerTier, { outer: true, biomeKey });
    world.zones[idx] = zone;
    registerOuterZoneMeta(idx, { biomeKey, dangerTier });
    macro.nodes[String(idx)] = {
      id: String(idx), kind: MacroKind.ZONE, zoneIndex: idx, connectsTo: [],
      dangerTier, outer: true, biomeKey, deadEnd: false,
    };
    newIds.push(String(idx));
  }

  from.connectsTo = newIds;
  ensureSmugglerPlaced(macro, world); // fresh fog just opened up — she may have somewhere new to hide
  return newIds;
}
