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
import { LocalStorageAuthProvider, loadGameState, saveGameState } from './auth.js';
import { LocalLeaderboardService } from './leaderboard.js';
import { GameController } from './gameController.js';
import { initParallax, initAmbientDrift } from './parallax.js';

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

async function boot(user, svc) {
  const savedState = await svc.loadFn(user.id);
  window.gameController = new GameController({
    user,
    auth: svc.auth,
    savedState,
    root,
    leaderboard: svc.leaderboard,
    saveFn: svc.saveFn,
  });
}

function bootGuest() {
  const svc = guestServices();
  boot(svc.auth.getCurrentUser(), svc);
}

document.addEventListener('DOMContentLoaded', async () => {
  initParallax('.parallax-scene');
  initAmbientDrift('.parallax-scene');

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
