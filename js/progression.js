// progression.js (v11 — NEW)
// ---------------------------------------------------------------------------
// ACCOUNT-LEVEL progression — everything that must SURVIVE PERMADEATH and
// span every character the player will ever make:
//
//   1. THE ACCOUNT LEDGER: named event counters (curses cleansed, tier-8
//      Lords slain, arena wins...). classes.js's SECRET_UNLOCKS /
//      UNIQUE_UNLOCKS predicates read this ledger to decide which locked
//      classes have been earned. Stored in localStorage under
//      'ashen_account' (project ashen_* convention) and mirrored to
//      Firestore `accounts/{uid}` when a backend is linked — same
//      write-local-first discipline as the v9.1 save mirror.
//
//   2. PVP POINTS: the arena currency. Wins pay well; losses still pay a
//      little — deliberate, because the Sanity Curse (below) forces cursed
//      players into the arena daily, and a guaranteed trickle keeps that
//      tax from feeling purely punitive.
//
//   3. THE SANITY CURSE: past a late-game threshold the character is
//      permanently afflicted. One arena bout (win OR loss) each real-time
//      24h keeps the curse fed; each missed full day claims 1 Heart —
//      which CAN chain into permadeath. All timestamps are ms epoch.
//      HONESTY NOTE: the clock is the client's. A determined cheater can
//      wind their system clock; real enforcement needs a Cloud Function
//      stamping serverTimestamp (listed as future work, same status as
//      server-authoritative Heart deduction).
//
//   4. LocalUniqueRegistry: the offline stand-in for the server-wide
//      Highlander rule. Identical async interface to the Firestore
//      implementation in firebase-service.js (claim / release / fetchAll),
//      so GameController never knows which backend arbitrates.
//
// Zero DOM dependencies.
// ---------------------------------------------------------------------------

const ACCOUNT_KEY = 'ashen_account';
const UNIQUE_REGISTRY_KEY = 'ashen_unique_registry';

export const DAY_MS = 24 * 60 * 60 * 1000;

// ---------------- PvP point economy ----------------

export const PVP_POINTS_WIN = 12;
export const PVP_POINTS_LOSS = 4;

// ---------------- Sanity Curse thresholds ----------------

export const SANITY_LEVEL_THRESHOLD = 25; // character level that triggers onset
export const SANITY_ZONE_THRESHOLD = 6;   // OR deepest zone (player.maxZone) reached

// ===========================================================================
// 1) The Account Ledger
// ===========================================================================

export function emptyAccount() {
  return {
    version: 1,
    counters: {
      cleansedCurses: 0,
      lordKills: 0,
      lordKillsTier6: 0,   // Lords slain in zones of dangerTier >= 6
      lordKillsTier8: 0,   // ... dangerTier >= 8 (subset of the above)
      smugglerMet: 0,
      smugglerHeartBought: 0,
      legacyChildren: 0,
      pvpWinsTotal: 0,
      pvpMatchesTotal: 0,
      hiddenAwakenings: 0,
      altarSacrifices: 0,
      reforges: 0,
    },
    updatedAt: 0,
  };
}

export function loadAccount() {
  try {
    const raw = localStorage.getItem(ACCOUNT_KEY);
    if (!raw) return emptyAccount();
    const acc = JSON.parse(raw);
    // Forward migration: any counter added later defaults to 0.
    const base = emptyAccount();
    acc.counters = { ...base.counters, ...(acc.counters || {}) };
    return acc;
  } catch {
    return emptyAccount();
  }
}

export function saveAccount(account) {
  account.updatedAt = Date.now();
  try { localStorage.setItem(ACCOUNT_KEY, JSON.stringify(account)); } catch { /* storage full/blocked — cloud mirror still runs */ }
  return account;
}

/**
 * Bump one ledger counter and persist locally. Returns the new value.
 * GameController stamps these at the moment the event happens (Lord dies,
 * curse cleansed, arena bout resolves...) and mirrors to Firestore via
 * firebase-service.saveAccountData on its normal save cadence.
 */
export function recordEvent(account, counterId, amount = 1) {
  if (!(counterId in account.counters)) account.counters[counterId] = 0;
  account.counters[counterId] += amount;
  saveAccount(account);
  return account.counters[counterId];
}

/** Merge a cloud copy with the local ledger: per-counter MAX (counters only ever grow). */
export function mergeAccounts(local, cloud) {
  if (!cloud || !cloud.counters) return local;
  const merged = emptyAccount();
  for (const k of Object.keys(merged.counters)) {
    merged.counters[k] = Math.max(local.counters[k] || 0, cloud.counters[k] || 0);
  }
  // Keep any nonstandard counters either side may carry.
  for (const src of [local.counters, cloud.counters]) {
    for (const [k, v] of Object.entries(src)) {
      if (!(k in merged.counters)) merged.counters[k] = v;
      else merged.counters[k] = Math.max(merged.counters[k], v || 0);
    }
  }
  merged.updatedAt = Math.max(local.updatedAt || 0, cloud.updatedAt || 0);
  return merged;
}

// ===========================================================================
// 2) PvP Points
// ===========================================================================

/**
 * Award arena currency after a bout. Also stamps the ledger's win/match
 * totals (which feed several UNIQUE_UNLOCKS) and — crucially — feeds the
 * Sanity Curse via recordPvpFought. One call settles everything.
 * Returns the points awarded.
 */
export function awardPvpPoints(player, account, won, now = Date.now()) {
  const pts = won ? PVP_POINTS_WIN : PVP_POINTS_LOSS;
  player.pvpPoints = (player.pvpPoints || 0) + pts;
  player.pvpMatches = (player.pvpMatches || 0) + 1;
  if (won) player.pvpWins = (player.pvpWins || 0) + 1;
  recordEvent(account, 'pvpMatchesTotal');
  if (won) recordEvent(account, 'pvpWinsTotal');
  recordPvpFought(player, now);
  return pts;
}

export function spendPvpPoints(player, cost) {
  if ((player.pvpPoints || 0) < cost) return false;
  player.pvpPoints -= cost;
  return true;
}

// ===========================================================================
// 3) The Sanity Curse
// ===========================================================================

export function sanityThresholdMet(player) {
  return player.level >= SANITY_LEVEL_THRESHOLD || (player.maxZone || 1) >= SANITY_ZONE_THRESHOLD;
}

/**
 * Called whenever level or maxZone can have moved (level up, zone entry,
 * load). If the character just crossed the threshold: afflict them, start
 * the 24h clock AT THIS MOMENT (the first day is a free, full day — onset
 * itself never costs a Heart). Returns true exactly once, on onset, so the
 * caller can show the affliction cinematic/banner.
 */
export function checkSanityOnset(player, now = Date.now()) {
  if (player.sanityCursed || !sanityThresholdMet(player)) return false;
  player.sanityCursed = true;
  player.lastPvpAt = now;
  return true;
}

/** Any arena bout — win or loss — feeds the curse and resets the clock. */
export function recordPvpFought(player, now = Date.now()) {
  player.lastPvpAt = now;
}

/** ms until the curse next claims a Heart, or null if not cursed. */
export function sanityTimeLeft(player, now = Date.now()) {
  if (!player.sanityCursed || player.lastPvpAt == null) return null;
  return Math.max(0, player.lastPvpAt + DAY_MS - now);
}

/**
 * Settle the tax. For EVERY full missed day, the curse claims 1 Heart —
 * chained misses chain the cost, and yes, this can permadeath the
 * character (loseHeart() sets isDead at 0, exactly like a lost arena
 * bout — the Legacy/Tombstone flow takes over from there).
 * The clock is advanced by whole days only, so partial progress toward
 * the next deadline is preserved. Call on load and on a coarse interval.
 * Returns { heartsLost, died }.
 */
export function applySanityTax(player, now = Date.now()) {
  const result = { heartsLost: 0, died: false };
  if (!player.sanityCursed || player.lastPvpAt == null || player.isDead) return result;
  let missed = Math.floor((now - player.lastPvpAt) / DAY_MS);
  while (missed > 0 && !player.isDead) {
    player.loseHeart();
    player.lastPvpAt += DAY_MS;
    result.heartsLost += 1;
    missed -= 1;
  }
  result.died = player.isDead;
  return result;
}

// ===========================================================================
// 4) LocalUniqueRegistry — offline Highlander arbitration
// ===========================================================================
// Interface contract (mirrored by firebase-service.js's Firestore version):
//   fetchAll()                       -> { [classId]: { holderUid, holderName, claimedAt } | null }
//   claim(classId, uid, name)        -> { ok } | { ok:false, holder }
//   release(classId, uid)            -> { ok }
// localStorage is synchronous, but the methods are async so GameController
// can hot-swap the Firestore registry in without touching call sites.

export class LocalUniqueRegistry {
  _read() {
    try { return JSON.parse(localStorage.getItem(UNIQUE_REGISTRY_KEY)) || {}; } catch { return {}; }
  }

  _write(reg) {
    try { localStorage.setItem(UNIQUE_REGISTRY_KEY, JSON.stringify(reg)); } catch { /* non-fatal */ }
  }

  async fetchAll() { return this._read(); }

  async claim(classId, uid, name) {
    const reg = this._read();
    const cur = reg[classId];
    if (cur && cur.holderUid && cur.holderUid !== uid) return { ok: false, holder: cur };
    reg[classId] = { holderUid: uid, holderName: name, claimedAt: Date.now() };
    this._write(reg);
    return { ok: true };
  }

  async release(classId, uid) {
    const reg = this._read();
    const cur = reg[classId];
    if (cur && cur.holderUid === uid) { reg[classId] = null; this._write(reg); }
    return { ok: true };
  }
}
