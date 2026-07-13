// leaderboard.js
// ---------------------------------------------------------------------------
// Leaderboard service, local implementation. Stores one entry per user id in
// localStorage (device-wide, across all local accounts). The interface is
// deliberately identical to FirebaseLeaderboardService in firebase-service.js
// — both expose async submit(entry) / fetch({by, limit}) — so the UI layer
// doesn't know or care which backend is behind it.
// ---------------------------------------------------------------------------

const LB_KEY = 'ashen_table_leaderboard_v1';

function readAll() {
  try { return JSON.parse(localStorage.getItem(LB_KEY)) || {}; } catch { return {}; }
}
function writeAll(map) { localStorage.setItem(LB_KEY, JSON.stringify(map)); }

export class LocalLeaderboardService {
  /**
   * Upserts this user's best scores. Never lowers an existing record —
   * a new character with lower CP won't erase a fallen legend's peak.
   * @param {{userId, name, classId, maxCP, maxZone}} entry
   */
  async submit(entry) {
    const map = readAll();
    const prev = map[entry.userId] || { maxCP: 0, maxZone: 0 };
    map[entry.userId] = {
      userId: entry.userId,
      name: entry.name,
      classId: entry.classId,
      maxCP: Math.max(prev.maxCP || 0, entry.maxCP || 0),
      maxZone: Math.max(prev.maxZone || 0, entry.maxZone || 0),
      updatedAt: Date.now(),
    };
    writeAll(map);
  }

  /** @param {{by?: 'maxCP'|'maxZone', limit?: number}} opts */
  async fetch({ by = 'maxCP', limit = 20 } = {}) {
    const entries = Object.values(readAll());
    entries.sort((a, b) => (b[by] || 0) - (a[by] || 0) || (b.maxCP || 0) - (a.maxCP || 0));
    return entries.slice(0, limit);
  }
}
