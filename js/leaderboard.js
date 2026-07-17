// leaderboard.js
// ---------------------------------------------------------------------------
// Leaderboard service, local implementation. Stores one entry per user id in
// localStorage (device-wide, across all local accounts). The interface is
// deliberately identical to FirebaseLeaderboardService in firebase-service.js
// — both expose async submit(entry) / fetch({by, limit}) — so the UI layer
// doesn't know or care which backend is behind it.
// ---------------------------------------------------------------------------

import { SEASON, seasonStorageKey } from './season.js';

// v14: storage is keyed by season — flipping SEASON.id in season.js resets
// the local board instantly, with old seasons left archived under their keys.
function readAll() {
  try { return JSON.parse(localStorage.getItem(seasonStorageKey())) || {}; } catch { return {}; }
}
function writeAll(map) { localStorage.setItem(seasonStorageKey(), JSON.stringify(map)); }

/**
 * v14 shared name-uniqueness rule, used by BOTH character creation and
 * rename, on BOTH backends. A name is taken if any entry on the current
 * board carries it (case-insensitive) — including a fallen legend's entry.
 * excludeUserId lets rename skip the caller's own live entry.
 */
export function isNameTaken(entries, name, excludeUserId = null) {
  const wanted = String(name || '').trim().toLowerCase();
  if (!wanted) return false;
  return (entries || []).some((e) => e
    && (excludeUserId === null || e.userId !== excludeUserId)
    && String(e.name || '').trim().toLowerCase() === wanted);
}

/**
 * v14 shared merge rule: same charId (or a pre-v14 entry with none) means
 * the same hero got stronger — keep the peak. A DIFFERENT charId means the
 * hero died and this is the heir — the ghost's record is replaced outright,
 * which is what empties stale entries off the board after a rebirth.
 */
export function mergeEntry(prev, entry) {
  const sameChar = !prev || !prev.charId || prev.charId === entry.charId;
  return {
    userId: entry.userId,
    charId: entry.charId || null,
    name: entry.name,
    classId: entry.classId,
    maxCP: sameChar ? Math.max((prev && prev.maxCP) || 0, entry.maxCP || 0) : (entry.maxCP || 0),
    maxZone: sameChar ? Math.max((prev && prev.maxZone) || 0, entry.maxZone || 0) : (entry.maxZone || 0),
    season: SEASON.id,
  };
}

export class LocalLeaderboardService {
  /**
   * Upserts this user's scores. v14: merge is charId-aware — the same
   * character never lowers its peak, but an HEIR (new charId after a
   * permadeath) replaces the fallen character's entry entirely, so the
   * board never shows a ghost under a new hero's account.
   * @param {{userId, charId, name, classId, maxCP, maxZone}} entry
   */
  async submit(entry) {
    const map = readAll();
    map[entry.userId] = { ...mergeEntry(map[entry.userId], entry), updatedAt: Date.now() };
    writeAll(map);
  }

  /** @param {{by?: 'maxCP'|'maxZone', limit?: number}} opts */
  async fetch({ by = 'maxCP', limit = 20 } = {}) {
    const entries = Object.values(readAll());
    entries.sort((a, b) => (b[by] || 0) - (a[by] || 0) || (b.maxCP || 0) - (a.maxCP || 0));
    return entries.slice(0, limit);
  }
}
