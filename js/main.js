// main.js (v5)
// ---------------------------------------------------------------------------
// Entry point. Boot order:
//   1. Pick services — Firebase when USE_FIREBASE && config is filled,
//      otherwise localStorage. A broken/placeholder Firebase config now
//      degrades gracefully to local mode instead of killing the app.
//   2. Landing page (homepage): "เล่นทันที (ผู้มาเยือน)" for a frictionless
//      guest start (GDD §6), or a proper login (Google / local save name).
//   3. Guest saves live in localStorage under a stable per-device guest id;
//      logged-in saves go through the chosen backend.
// ---------------------------------------------------------------------------

import { t } from './i18n.js';
import { LocalStorageAuthProvider, loadGameState, saveGameState, pickNewestSave } from './auth.js';
import { LocalLeaderboardService } from './leaderboard.js';
import { GameController } from './gameController.js';
import { initParallax, initAmbientDrift } from './parallax.js';
import { initScene3D } from './scene3d.js';   // v13: WebGL 2.5D sky
import { initVisual3D } from './visual3d.js'; // v13: 3D characters everywhere

// Flip to true AFTER filling firebaseConfig in js/firebase-service.js.
const USE_FIREBASE = true;

const GUEST_ID_KEY = 'ashen_guest_uid';
const MODE_KEY = 'ashen_last_mode'; // 'guest' | 'account'

const root = document.getElementById('app');
let services = null;

// ---------------- Guest (frictionless start) ----------------

/** Same contract as the other auth providers, but zero friction: no form. */
class GuestAuthProvider {
  login() { return GuestAuthProvider.currentGuest(); }

  getCurrentUser() { return GuestAuthProvider.currentGuest(); }

  logout() { localStorage.removeItem(MODE_KEY); }

  static currentGuest() {
    let id = localStorage.getItem(GUEST_ID_KEY);
    if (!id) {
      id = `guest_${Date.now()}_${Math.floor(Math.random() * 1e6)}`;
      localStorage.setItem(GUEST_ID_KEY, id);
    }
    return { id, username: t('auth.guestName'), isGuest: true };
  }
}

// ---------------- Service selection ----------------

async function getServices() {
  if (USE_FIREBASE) {
    try {
      const fb = await import('./firebase-service.js');
      await fb.initFirebase();
      return {
        mode: 'firebase',
        auth: new fb.FirebaseAuthProvider(),
        leaderboard: new fb.FirebaseLeaderboardService(),
        saveFn: fb.savePlayerData,
        loadFn: fb.loadPlayerData,
        // v11: server-wide Highlander arbitration + account-ledger cloud mirror
        uniqueRegistry: new fb.FirebaseUniqueRegistry(),
        saveAccountFn: fb.saveAccountData,
        loadAccountFn: fb.loadAccountData,
      };
    } catch (err) {
      console.warn('Firebase unavailable — falling back to local mode:', err.message);
    }
  }
  return {
    mode: 'local',
    auth: new LocalStorageAuthProvider(),
    leaderboard: new LocalLeaderboardService(),
    saveFn: saveGameState,
    loadFn: async (uid) => loadGameState(uid),
  };
}

/** Guests always save locally and rank locally, no matter the backend. */
function guestServices() {
  return {
    mode: 'guest',
    auth: new GuestAuthProvider(),
    leaderboard: new LocalLeaderboardService(),
    saveFn: saveGameState,
    loadFn: async (uid) => loadGameState(uid),
  };
}

// ---------------- Landing page (homepage) ----------------

function renderLanding() {
  const loginBlock = services.mode === 'firebase'
    ? `<button type="button" class="btn btn-secondary" id="google-btn">${t('auth.google')}</button>`
    : `
      <input type="text" id="auth-username" class="name-input" placeholder="${t('auth.placeholder')}" autocomplete="off" />
      <div class="menu-actions">
        <button type="button" class="btn btn-secondary" id="login-btn">${t('auth.login')}</button>
        <button type="button" class="btn btn-secondary" id="register-btn">${t('auth.register')}</button>
      </div>`;

  root.innerHTML = `
    <div class="auth-shell">
      <h1>${t('app.title')}</h1>
      <p class="tagline">${t('auth.tagline')}</p>
      <form id="auth-form" class="auth-form">
        <button type="button" class="btn btn-primary" id="guest-btn">${t('landing.guest')}</button>
        <p class="legend-note">${t('landing.guestNote')}</p>
        <p class="legend-note">${t('landing.or')}</p>
        ${loginBlock}
        <p class="legend-note">${t('landing.loginNote')}</p>
        <p id="auth-error" class="auth-error"></p>
      </form>
    </div>
  `;

  const errorEl = document.getElementById('auth-error');
  const showError = (err) => { errorEl.textContent = err.message; };
  document.getElementById('auth-form').addEventListener('submit', (e) => e.preventDefault());

  document.getElementById('guest-btn').addEventListener('click', () => {
    localStorage.setItem(MODE_KEY, 'guest');
    bootGuest();
  });

  if (services.mode === 'firebase') {
    document.getElementById('google-btn').addEventListener('click', async () => {
      try {
        const user = await services.auth.loginWithGoogle();
        localStorage.setItem(MODE_KEY, 'account');
        boot(user, services);
      } catch (err) { showError(err); }
    });
  } else {
    const username = () => document.getElementById('auth-username').value;
    document.getElementById('login-btn').addEventListener('click', async () => {
      try {
        const user = await services.auth.login(username());
        localStorage.setItem(MODE_KEY, 'account');
        boot(user, services);
      } catch (err) { showError(err); }
    });
    document.getElementById('register-btn').addEventListener('click', async () => {
      try {
        const user = await services.auth.register(username());
        localStorage.setItem(MODE_KEY, 'account');
        boot(user, services);
      } catch (err) { showError(err); }
    });
  }
}

// ---------------- Boot ----------------

// v9.1 SINGLE-TAB CLAIM. Booting stamps this tab's token; every OTHER open
// tab hears the storage event and freezes itself. A frozen tab can never
// persist stale state over live progress — the classic multi-tab rewind.
const ACTIVE_TAB_KEY = 'ashen_active_tab';
const TAB_TOKEN = `tab_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;

window.addEventListener('storage', (e) => {
  if (e.key === ACTIVE_TAB_KEY && e.newValue && e.newValue !== TAB_TOKEN && window.gameController) {
    window.gameController.freeze();
  }
});

async function boot(user, svc) {
  // v9.1: exactly one live controller. onAuthChanged can fire more than once
  // per page life; before this, each fire stacked another controller (and
  // another click listener) onto #app — every zombie a time-rewind machine.
  if (window.gameController && typeof window.gameController.destroy === 'function') {
    window.gameController.destroy();
  }

  // v9.1 NEWEST-SAVE RECOVERY. The cloud copy can trail reality (a write
  // that was in flight when the last page unloaded simply died). persist()
  // now mirrors every save synchronously to localStorage, so boot compares
  // both by savedAt and plays the newer one — then heals the cloud.
  const [cloudState, mirrorState] = await Promise.all([
    Promise.resolve(svc.loadFn(user.id)).catch((err) => { console.warn('cloud load failed', err); return null; }),
    loadGameState(user.id),
  ]);
  const savedState = pickNewestSave(cloudState, mirrorState);
  const recoveredFromMirror = !!(savedState && mirrorState && savedState === mirrorState
    && (mirrorState.savedAt || 0) > (cloudState?.savedAt || 0));
  if (recoveredFromMirror && svc.saveFn !== saveGameState) {
    Promise.resolve(svc.saveFn(user.id, savedState)).catch((err) => console.warn('cloud heal failed', err));
  }

  // v11: with a cloud backend, reconcile the account ledger (per-counter
  // MAX merge — counters only ever grow) BEFORE the controller reads it to
  // decide which Secret/Unique classes this account has earned.
  if (svc.loadAccountFn) {
    try {
      const { loadAccount, mergeAccounts, saveAccount } = await import('./progression.js');
      const cloudAcc = await svc.loadAccountFn(user.id);
      if (cloudAcc) saveAccount(mergeAccounts(loadAccount(), cloudAcc));
    } catch (err) { console.warn('account ledger sync failed — using local ledger', err); }
  }

  window.gameController = new GameController({
    user,
    auth: svc.auth,
    savedState,
    root,
    leaderboard: svc.leaderboard,
    saveFn: svc.saveFn,
    recoveredFromMirror,
    uniqueRegistry: svc.uniqueRegistry || null, // v11
    saveAccountFn: svc.saveAccountFn || null,   // v11
  });
  localStorage.setItem(ACTIVE_TAB_KEY, TAB_TOKEN); // claim AFTER a successful boot
}

function bootGuest() {
  const svc = guestServices();
  boot(svc.auth.getCurrentUser(), svc);
}

const APP_VERSION = 'v17'; // v16: bump together with the ?v= tags in index.html

document.addEventListener('DOMContentLoaded', async () => {
  // Version banner — one glance at the browser console (F12) answers
  // "which build am I actually running?" whenever caching is suspected.
  console.info(`โต๊ะเถ้าธุลี — The Ashen Table ${APP_VERSION}`);
  // v13: the CSS parallax boots FIRST so there is never a blank sky, then
  // the WebGL scene takes over on top of it if (and only if) three.js loads
  // and the device has WebGL. On failure both inits resolve null and the
  // CSS layers simply keep running — the game itself never waits on 3D.
  initParallax('.parallax-scene');
  initAmbientDrift('.parallax-scene');
  initScene3D().catch((err) => console.warn('scene3d skipped:', err.message));
  initVisual3D(root).catch((err) => console.warn('visual3d skipped:', err.message));

  services = await getServices();

  // Returning guest: skip the landing entirely (frictionless).
  if (localStorage.getItem(MODE_KEY) === 'guest') { bootGuest(); return; }

  if (services.mode === 'firebase') {
    // Firebase restores sessions asynchronously — subscribe instead of polling.
    services.auth.onAuthChanged((user) => { user ? boot(user, services) : renderLanding(); });
  } else {
    const existingUser = services.auth.getCurrentUser();
    existingUser && localStorage.getItem(MODE_KEY) === 'account'
      ? boot(existingUser, services)
      : renderLanding();
  }
});
