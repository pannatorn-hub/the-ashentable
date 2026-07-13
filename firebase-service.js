// firebase-service.js
// ---------------------------------------------------------------------------
// Backend-as-a-Service layer (Firebase). Complete, ready-to-use functions for:
//   - Auth:        Google Login (FirebaseAuthProvider — same contract as
//                  LocalStorageAuthProvider in auth.js)
//   - Firestore:   save/load player state, leaderboard submit/fetch, and
//                  CP-range PvP opponent search
//
// HOW TO ACTIVATE:
//   1. Create a Firebase project at https://console.firebase.google.com
//   2. Enable Authentication -> Google provider, and Cloud Firestore
//   3. Paste your web-app config into `firebaseConfig` below
//   4. In js/main.js set `USE_FIREBASE = true`
//
// Firebase SDK is loaded on demand from the official CDN (modular v10) so
// the game keeps working offline / in local mode with zero extra weight
// until this module is actually imported.
//
// SUGGESTED FIRESTORE STRUCTURE
//   saves/{uid}          -> { state: <full game state JSON>, updatedAt }
//   leaderboard/{uid}    -> { name, classId, maxCP, maxZone, updatedAt }
//
// SUGGESTED SECURITY RULES (paste into Firestore Rules):
//   rules_version = '2';
//   service cloud.firestore {
//     match /databases/{database}/documents {
//       match /saves/{uid} {
//         allow read, write: if request.auth != null && request.auth.uid == uid;
//       }
//       match /leaderboard/{uid} {
//         allow read: if true; // public leaderboard
//         allow write: if request.auth != null && request.auth.uid == uid;
//       }
//     }
//   }
//
// IMPORTANT HONESTY NOTE: rules like the above stop players from touching
// *each other's* data, but a modified client can still write inflated maxCP
// into its own leaderboard entry or save. Real anti-cheat requires moving
// combat/loot/Heart validation into Cloud Functions (or a server) — see
// docs/GDD.md §11. This module is the correct *data* layer for that future
// server; it is not, by itself, the trust layer.
// ---------------------------------------------------------------------------

// ======================= 1) CONFIG PLACEHOLDER =======================
// TODO: replace every "YOUR_..." value with your Firebase web-app config.
const firebaseConfig = {
  apiKey: "AIzaSyCov-l5H7JBDoUaAsR7lPr6zLM4kcfbjxA",
  authDomain: "the-ashen-table.firebaseapp.com",
  projectId: "the-ashen-table",
  storageBucket: "the-ashen-table.firebasestorage.app",
  messagingSenderId: "1010086877546",
  appId: "1:1010086877546:web:a6da923c38e91498c9ad13",
  measurementId: "G-RYVEFD7Q56"
};

export function isFirebaseConfigured() {
  return !Object.values(firebaseConfig).some((v) => String(v).startsWith('YOUR_'));
}

// ======================= 2) SDK BOOTSTRAP =======================

const SDK_VERSION = '10.12.2';
let app = null;
let auth = null;
let db = null;
let fns = null; // cached SDK function references

/** Loads the Firebase SDK from CDN and initializes app/auth/firestore. Call once at startup. */
export async function initFirebase() {
  if (app) return { app, auth, db };
  if (!isFirebaseConfigured()) {
    throw new Error('firebase-service: firebaseConfig still contains placeholders — fill it in first.');
  }

  const [appMod, authMod, fsMod] = await Promise.all([
    import(`https://www.gstatic.com/firebasejs/${SDK_VERSION}/firebase-app.js`),
    import(`https://www.gstatic.com/firebasejs/${SDK_VERSION}/firebase-auth.js`),
    import(`https://www.gstatic.com/firebasejs/${SDK_VERSION}/firebase-firestore.js`),
  ]);

  app = appMod.initializeApp(firebaseConfig);
  auth = authMod.getAuth(app);
  db = fsMod.getFirestore(app);

  fns = {
    // auth
    GoogleAuthProvider: authMod.GoogleAuthProvider,
    signInWithPopup: authMod.signInWithPopup,
    signOut: authMod.signOut,
    onAuthStateChanged: authMod.onAuthStateChanged,
    // firestore
    doc: fsMod.doc,
    getDoc: fsMod.getDoc,
    setDoc: fsMod.setDoc,
    collection: fsMod.collection,
    query: fsMod.query,
    where: fsMod.where,
    orderBy: fsMod.orderBy,
    limit: fsMod.limit,
    getDocs: fsMod.getDocs,
    serverTimestamp: fsMod.serverTimestamp,
  };

  return { app, auth, db };
}

function requireInit() {
  if (!app) throw new Error('firebase-service: call initFirebase() before using any service.');
}

// ======================= 3) AUTH (Google Login) =======================

/**
 * Implements the same contract as auth.js's AuthProvider so main.js can swap
 * providers with one line. register() and login() are the same operation
 * under OAuth (Google decides whether the account is new), so both trigger
 * the Google popup.
 */
export class FirebaseAuthProvider {
  async register() { return this.loginWithGoogle(); }
  async login() { return this.loginWithGoogle(); }

  async loginWithGoogle() {
    requireInit();
    const provider = new fns.GoogleAuthProvider();
    const result = await fns.signInWithPopup(auth, provider);
    return FirebaseAuthProvider._toUser(result.user);
  }

  logout() {
    requireInit();
    return fns.signOut(auth);
  }

  getCurrentUser() {
    requireInit();
    return auth.currentUser ? FirebaseAuthProvider._toUser(auth.currentUser) : null;
  }

  /** Subscribe to login/logout events; returns an unsubscribe fn. Preferred over polling getCurrentUser(). */
  onAuthChanged(callback) {
    requireInit();
    return fns.onAuthStateChanged(auth, (fbUser) => {
      callback(fbUser ? FirebaseAuthProvider._toUser(fbUser) : null);
    });
  }

  static _toUser(fbUser) {
    return {
      id: fbUser.uid,
      username: fbUser.displayName || fbUser.email || 'Player',
      email: fbUser.email || null,
      photoURL: fbUser.photoURL || null,
    };
  }
}

// ======================= 4) SAVE / LOAD (Firestore) =======================

/** Persists the full game state for a user. Mirrors auth.js's saveGameState signature. */
export async function savePlayerData(uid, state) {
  requireInit();
  await fns.setDoc(fns.doc(db, 'saves', uid), {
    state: JSON.stringify(state), // stored as a string: avoids Firestore's nested-array limits on the zone graph
    updatedAt: fns.serverTimestamp(),
  });
}

/** Loads a user's game state, or null if none exists. Mirrors auth.js's loadGameState. */
export async function loadPlayerData(uid) {
  requireInit();
  const snap = await fns.getDoc(fns.doc(db, 'saves', uid));
  if (!snap.exists()) return null;
  try { return JSON.parse(snap.data().state); } catch { return null; }
}

// ======================= 5) LEADERBOARD (Firestore) =======================

/** Same interface as LocalLeaderboardService (leaderboard.js). */
export class FirebaseLeaderboardService {
  /** Upserts the user's best scores, never lowering an existing record. */
  async submit(entry) {
    requireInit();
    const ref = fns.doc(db, 'leaderboard', entry.userId);
    const snap = await fns.getDoc(ref);
    const prev = snap.exists() ? snap.data() : { maxCP: 0, maxZone: 0 };
    await fns.setDoc(ref, {
      name: entry.name,
      classId: entry.classId,
      maxCP: Math.max(prev.maxCP || 0, entry.maxCP || 0),
      maxZone: Math.max(prev.maxZone || 0, entry.maxZone || 0),
      updatedAt: fns.serverTimestamp(),
    });
  }

  /** Top N players ordered by maxCP or maxZone (descending). */
  async fetch({ by = 'maxCP', limit: n = 20 } = {}) {
    requireInit();
    const q = fns.query(fns.collection(db, 'leaderboard'), fns.orderBy(by, 'desc'), fns.limit(n));
    const snap = await fns.getDocs(q);
    return snap.docs.map((d) => ({ userId: d.id, ...d.data() }));
  }
}

// ======================= 6) PVP OPPONENT SEARCH (Firestore) =======================

/**
 * Finds a real opponent whose recorded maxCP is within ±tolerance of myCP,
 * excluding myself; returns the closest match's leaderboard entry, or null
 * (caller then uses Matchmaker.generateBot() — the same +10% Bot Fallback).
 *
 * NOTE: this is "ghost PvP" — you fight a snapshot of another player's
 * character, which is the standard async-multiplayer pattern for BaaS games
 * (no live socket needed). Live realtime PvP would need Firebase Realtime
 * Database presence or a dedicated socket server.
 */
export async function findPvpOpponent(myUid, myCP, tolerance = 0.15) {
  requireInit();
  const lo = Math.floor(myCP * (1 - tolerance));
  const hi = Math.ceil(myCP * (1 + tolerance));
  const q = fns.query(
    fns.collection(db, 'leaderboard'),
    fns.where('maxCP', '>=', lo),
    fns.where('maxCP', '<=', hi),
    fns.limit(25)
  );
  const snap = await fns.getDocs(q);
  const candidates = snap.docs
    .map((d) => ({ userId: d.id, ...d.data() }))
    .filter((e) => e.userId !== myUid);
  if (!candidates.length) return null;
  candidates.sort((a, b) => Math.abs(a.maxCP - myCP) - Math.abs(b.maxCP - myCP));
  return candidates[0];
}
