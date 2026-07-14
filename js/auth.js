// auth.js (v5 — GUEST MODE + CLOUD MIGRATION)
// ---------------------------------------------------------------------------
// FRICTIONLESS ONBOARDING: there is no login gate. The very first time the
// game loads, GuestAuthProvider.getCurrentUser() silently mints a Guest
// identity and writes it to localStorage — main.js can boot straight into
// character creation, no form, no button press. Every save from then on is
// keyed to that guest id, entirely local.
//
// "ผูกบัญชี" (Link Account) is the escape hatch: migrateGuestToFirebase()
// opens the Firebase Google popup, decides which save is the one worth
// keeping (guest's local run vs. whatever's already in the cloud under that
// Google account, if anything), pushes it to Firestore, and hands the
// caller a ready-to-use Firebase backend so GameController can hot-swap
// onto it without a page reload. The guest's local save is left untouched
// (just flagged migrated) — nothing is deleted, in case linking is
// abandoned partway through.
//
// Every provider here (GuestAuthProvider, LocalStorageAuthProvider, and
// FirebaseAuthProvider in firebase-service.js) implements the same 4-method
// contract: register / login / logout / getCurrentUser. GameController only
// ever talks to that contract, never to a concrete provider — so swapping
// which one is active, or hot-swapping mid-session after linking, is safe.
//
// Depends on localStorage/window (this is the one file in the logic layer
// allowed to), but nothing else in the codebase depends on ITS internals —
// replacing it doesn't ripple outward. Firebase itself is only ever loaded
// via dynamic import, on demand, so a guest who never links pays zero
// Firebase weight.
// ---------------------------------------------------------------------------

import { t } from './i18n.js';

const GUEST_KEY = 'ashen_guest_session';
const SAVE_PREFIX = 'ashen_save_';
const USERS_KEY = 'ashen_named_users'; // legacy named-account map (LocalStorageAuthProvider only)

function readJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}
function writeJSON(key, value) { localStorage.setItem(key, JSON.stringify(value)); }

function randomId(prefix) {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

// ======================= Guest identity =======================

/**
 * Auto-creates (once) and returns the Guest identity. No password, no
 * username prompt — the point is a stable id to key local save data
 * against, exactly like LocalStorageAuthProvider's usernames, just skipping
 * the step where the player has to type anything before they can play.
 */
export class GuestAuthProvider {
  async register() { return this.getCurrentUser(); }
  async login() { return this.getCurrentUser(); }

  logout() {
    // A guest "logging out" just forgets the session pointer, not the save —
    // the same guest id will pick the save back up if they return before
    // clearing browser storage.
    localStorage.removeItem(GUEST_KEY);
  }

  getCurrentUser() {
    let session = readJSON(GUEST_KEY, null);
    if (!session) {
      session = { id: randomId('guest'), username: t('auth.guestName'), isGuest: true, createdAt: Date.now() };
      writeJSON(GUEST_KEY, session);
    }
    return session;
  }
}

export function isGuest(user) { return !!(user && user.isGuest); }

// ======================= Local save I/O =======================
// Shared by GuestAuthProvider and LocalStorageAuthProvider — mirrors the
// signature of firebase-service.js's savePlayerData/loadPlayerData so
// GameController's persist() never needs to know which backend is live.

export function saveGameState(userId, state) {
  writeJSON(SAVE_PREFIX + userId, state);
  return Promise.resolve();
}

export function loadGameState(userId) {
  return Promise.resolve(readJSON(SAVE_PREFIX + userId, null));
}

/**
 * v9.1: given the cloud copy and the synchronous local mirror of the same
 * save, return whichever is NEWER. `savedAt` (stamped by persist()) decides;
 * a pre-v9 save without it loses to any stamped one, and two unstamped
 * saves fall back to the maxCP heuristic (never discard the further run).
 */
export function pickNewestSave(a, b) {
  if (!a) return b;
  if (!b) return a;
  const at = a.savedAt || 0;
  const bt = b.savedAt || 0;
  if (at !== bt) return at > bt ? a : b;
  return (a.player?.maxCP || 0) >= (b.player?.maxCP || 0) ? a : b;
}

// ======================= Guest -> Cloud migration =======================

/**
 * Picks the save worth keeping when a guest with local progress links an
 * account that may already have cloud progress under it (e.g. they linked
 * once before on another device). Never silently discards real progress:
 * whichever run got further (by maxCP) wins.
 */
function pickBetterSave(cloudState, guestState) {
  if (!cloudState) return guestState;
  if (!guestState) return cloudState;
  const cloudCP = cloudState.player?.maxCP || 0;
  const guestCP = guestState.player?.maxCP || 0;
  return guestCP >= cloudCP ? guestState : cloudState;
}

/**
 * The "ผูกบัญชี" action. Opens the Firebase Google popup, resolves which
 * save should live in the cloud going forward, writes it, and returns a
 * ready-made backend bundle:
 *   { user, auth, saveFn, loadFn, leaderboard, state }
 * The caller (GameController / main.js) swaps its own auth/saveFn/user
 * references to these and keeps playing — no reload needed. Throws if the
 * player cancels the Google popup or Firebase isn't configured yet; the
 * caller should catch and show a Thai error, leaving the guest save exactly
 * as it was.
 */
export async function migrateGuestToFirebase(guestUser, currentLocalState) {
  const fb = await import('./firebase-service.js');
  await fb.initFirebase();

  const provider = new fb.FirebaseAuthProvider();
  const fbUser = await provider.loginWithGoogle();

  const guestState = currentLocalState || readJSON(SAVE_PREFIX + guestUser.id, null);
  const existingCloudState = await fb.loadPlayerData(fbUser.id);
  const winningState = pickBetterSave(existingCloudState, guestState);

  if (winningState) await fb.savePlayerData(fbUser.id, winningState);

  // Never delete the guest's local save — just mark it migrated, so a
  // browser-only fallback still exists if the player ever wants it.
  writeJSON(GUEST_KEY, { ...guestUser, migratedTo: fbUser.id, migratedAt: Date.now() });

  return {
    user: fbUser,
    auth: provider,
    saveFn: fb.savePlayerData,
    loadFn: fb.loadPlayerData,
    leaderboard: new fb.FirebaseLeaderboardService(),
    state: winningState,
  };
}

// ======================= Optional: named local accounts =======================
// Not used by the default Guest flow, kept for parity with the v4 GDD and
// for anyone who wants an explicit "type a name" local-only mode instead of
// (or alongside) Guest Mode — e.g. testing multiple characters on one
// machine without linking each to a separate Google account.

export class LocalStorageAuthProvider {
  async register(username) {
    const name = (username || '').trim();
    if (name.length < 2) throw new Error(t('auth.err.short'));
    const users = readJSON(USERS_KEY, {});
    if (users[name]) throw new Error(t('auth.err.taken'));
    const user = { id: randomId('user'), username: name, isGuest: false };
    users[name] = user;
    writeJSON(USERS_KEY, users);
    writeJSON(GUEST_KEY, user); // reuse the same "current session" slot
    return user;
  }

  async login(username) {
    const name = (username || '').trim();
    const users = readJSON(USERS_KEY, {});
    const user = users[name];
    if (!user) throw new Error(t('auth.err.notfound'));
    writeJSON(GUEST_KEY, user);
    return user;
  }

  logout() { localStorage.removeItem(GUEST_KEY); }

  getCurrentUser() {
    const session = readJSON(GUEST_KEY, null);
    return session && session.isGuest === false ? session : null;
  }
}
