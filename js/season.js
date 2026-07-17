// season.js (v14)
// ---------------------------------------------------------------------------
// Leaderboard seasons. The board resets per season — but during the current
// test period we run an open-ended PRESEASON with no scheduled end.
//
// HOW TO START A NEW SEASON (one edit, zero migrations):
//   1. change `id` below (e.g. 's1'), set startsAt/endsAt if known
//   2. add i18n keys `season.name.<id>` (TH + EN)
// Every backend keys its storage off the season id, so flipping the id
// gives everyone a fresh board instantly:
//   - Firestore: preseason keeps the LEGACY 'leaderboard' collection (all
//     existing entries stay valid — no data move); later seasons live in
//     'leaderboard_<id>'. Old seasons remain archived in their collections.
//   - localStorage: same pattern via seasonStorageKey().
// Ghost-PvP opponent search follows the same collection, so you only ever
// fight snapshots from the current season.
// ---------------------------------------------------------------------------

export const SEASON = Object.freeze({
  id: 'preseason',
  startsAt: null, // test period — no schedule yet
  endsAt: null,   // null = shown as "ยังไม่กำหนดวันสิ้นสุด" in the UI
});

/** Firestore collection for the current season's board. */
export function seasonCollection(seasonId = SEASON.id) {
  return seasonId === 'preseason' ? 'leaderboard' : `leaderboard_${seasonId}`;
}

/** localStorage key for the current season's board (LocalLeaderboardService). */
export function seasonStorageKey(seasonId = SEASON.id) {
  return seasonId === 'preseason'
    ? 'ashen_table_leaderboard_v1' // legacy key — preseason data survives v14
    : `ashen_table_leaderboard_${seasonId}`;
}
