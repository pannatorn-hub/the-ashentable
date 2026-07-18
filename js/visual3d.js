// visual3d.js (v13)
// ---------------------------------------------------------------------------
// The bridge between the DOM the game already renders and the 3D layer.
// Design rule: gameController.js is NOT modified. This module watches #app
// with a MutationObserver and decorates screens as they appear:
//
//   .class-card[data-class]   → 3D thumbnail over the SVG portrait
//   .doll-center              → live rotating model wearing current gear
//   .battle-stage             → BattleDiorama backdrop; .hp-fill width
//                               mutations drive attack/hit reactions
//
// If three.js never loads, init resolves and nothing here runs — the SVG
// portraits and CSS effects remain exactly as they are today. Every stage is
// disposed the moment its host leaves the DOM, so we never leak WebGL
// contexts across screen swaps (the same lifecycle discipline destroy()
// brought to GameController in v9.1).
// ---------------------------------------------------------------------------

import { loadThree } from './three-loader.js';
import {
  SnapshotFactory, CharacterStage, BattleDiorama,
  rigSpecFromPortrait, rigSpecFromName, humanoidSpecFromName,
} from './character3d.js';
import { CLASS_DEFINITIONS, SECRET_CLASS_DEFINITIONS, UNIQUE_CLASS_DEFINITIONS } from './classes.js';
import { t } from './i18n.js'; // v13.2: to recognize sensitive PvP strings in the CURRENT language

// One flat lookup: any data-class id → its portrait spec. Data modules are
// DOM-free, so importing them here (the DOM layer) is the right direction.
const ALL_CLASSES = { ...CLASS_DEFINITIONS, ...SECRET_CLASS_DEFINITIONS, ...UNIQUE_CLASS_DEFINITIONS };

export async function initVisual3D(rootEl) {
  if (!rootEl) return null;
  const THREE = await loadThree();

  // v13.2: the PvP scrubber must run EVEN WITHOUT WebGL — competitive
  // information hygiene can't depend on the graphics tier. With no THREE we
  // observe for scrubbing only and skip every 3D mount below.
  const snaps = THREE ? new SnapshotFactory(THREE, 160) : null;
  let dollStage = null;   // CharacterStage on the inventory screen
  let diorama = null;     // BattleDiorama on the battle screen
  let hpObserver = null;  // watches .hp-fill style mutations during battle

  const gc = () => window.gameController || null;

  // ---------------- v13.2 PvP information scrubber ----------------
  // Design intent (GDD §5): the Bot Fallback only works as a difficulty
  // valve if the player can't tell bots from humans. Two places leaked it:
  //   1) the searching screen advertised the bot mechanic outright
  //   2) the result line tagged the opponent "(บอทสำรอง, …)" / "(ผู้เล่นจริง, …)"
  // BOTH labels are scrubbed — hiding only the bot tag would leak by
  // omission (unlabeled ⇒ bot). Presentation-only: matchType, rewards and
  // Heart logic in gameController/matchmaking are untouched, and the text
  // runs on every graphics tier, including the no-WebGL 2D fallback.
  function scrubPvpInfo(scope) {
    // (1) the bot-mechanic hint on the searching screen
    const botNote = t('pvp.botNote');
    scope.querySelectorAll('.legend-note').forEach((el) => {
      if (el.dataset.scrubbed) return;
      if (el.textContent.trim() === botNote) {
        el.style.display = 'none';
        el.dataset.scrubbed = '1';
      }
    });
    // (2) the opponent-type tag on the result screen — strip the label but
    // keep name and CP: "ชื่อ (บอทสำรอง, พลังรบ 850)" → "ชื่อ (พลังรบ 850)"
    // v17: ALSO strip the legacy " (บอท)"/" (Bot)" name suffix. v17 removed
    // it at the source (matchmaking), but battleState is persisted — a match
    // saved under the old build still carries the tagged name into the HUD
    // and every log line, so the display layer erases it everywhere.
    const labels = [`${t('pvp.bot')}, `, `${t('pvp.human')}, `, ' (บอท)', ' (Bot)'];
    scope.querySelectorAll('p, .combatant-name, .battle-log-line, h2, h3, span').forEach((el) => {
      if (el.dataset.scrubbed || el.children.length > 0) return; // leaf text nodes only
      const txt = el.textContent;
      if (!labels.some((l) => txt.includes(l))) return;
      let clean = txt;
      for (const l of labels) clean = clean.split(l).join('');
      el.textContent = clean;
      el.dataset.scrubbed = '1'; // one-shot: never re-processed, no observer loop
    });
  }

  // ---------------- decorators ----------------

  function decorateClassCards(scope) {
    if (!snaps) return;
    scope.querySelectorAll('.class-card[data-class]').forEach((card) => {
      if (card.querySelector('.rig-thumb')) return;
      const def = ALL_CLASSES[card.dataset.class];
      const svg = card.querySelector('.portrait-svg');
      if (!def || !def.portrait || !svg) return;
      const img = document.createElement('img');
      img.className = 'rig-thumb';
      img.alt = '';
      img.width = svg.getAttribute('width') || 52;
      img.height = svg.getAttribute('height') || 52;
      svg.replaceWith(img); // claim the slot immediately (prevents double-mount)
      // v15: snapshots are async now (sculpted models load lazily)
      snaps.snapshot(rigSpecFromPortrait(def.portrait))
        .then((url) => { img.src = url; })
        .catch(() => {});
    });
  }

  // v17.2: the top-left HUD icon was the last 2D piece (a circle of
  // polygons). Swap it for the same sculpted bust the class cards use —
  // one cached snapshot, zero extra WebGL contexts. The SVG isn't touched
  // in 2D-fallback mode (no snaps), where it remains the portrait.
  function decorateHudPortrait(scope) {
    if (!snaps || !gc() || !gc().player) return;
    scope.querySelectorAll('.hud-portrait .portrait-svg').forEach((svg) => {
      const img = document.createElement('img');
      img.className = 'rig-thumb hud-rig-thumb';
      img.alt = '';
      img.width = svg.getAttribute('width') || 44;
      img.height = svg.getAttribute('height') || 44;
      svg.replaceWith(img);
      snaps.snapshot(rigSpecFromPortrait(gc().player.portrait))
        .then((url) => { img.src = url; })
        .catch(() => {});
    });
  }

  function mountDollStage(center) {
    if (!THREE || dollStage || !gc() || !gc().player) return;
    const p = gc().player;
    const host = document.createElement('div');
    host.className = 'doll-stage3d';
    center.prepend(host);
    // v13.1: the live model IS the portrait now — flag the container so
    // scene3d.css hides the old 2D SVG circle beneath it (it comes back
    // automatically in 2D-fallback mode, where this code never runs).
    center.classList.add('has-stage3d');
    dollStage = new CharacterStage(THREE, host, rigSpecFromPortrait(p.portrait), {
      equipment: p.equipment,
    });
  }

  function mountDiorama(stageEl) {
    if (!THREE || diorama || !gc() || !gc().player || !gc().battleState) return;
    const g = gc();
    const p = g.player;
    const enemy = g.battleState.enemy;

    // PvE monsters/bosses are plain Combatants (name + stats, no portrait):
    // hash the name into a deterministic look, and let raw mass decide the
    // silhouette — anything out-weighing the player 2:1 reads as a brute.
    const bulk = Math.min(1.8, Math.max(1, (enemy.stats?.maxHp || 60) / Math.max(1, p.getTotalStats?.().maxHp || p.stats?.maxHp || 100)));
    // v17: PvP opponents (bots AND ghost players) render as ADVENTURERS, not
    // skeleton beasts — a human-shaped foe is half the disguise.
    const enemySpec = enemy.portrait
      ? rigSpecFromPortrait(enemy.portrait, { bulk })
      : g.pvpMode
        ? humanoidSpecFromName(enemy.name)
        : rigSpecFromName(enemy.name, bulk);

    const host = document.createElement('div');
    host.className = 'battle-3d';
    stageEl.prepend(host);
    diorama = new BattleDiorama(THREE, host, rigSpecFromPortrait(p.portrait), enemySpec, {
      playerEquipment: p.equipment,
    });

    // HP bars are the one battle signal gameController repaints every turn
    // (patchBattleHud). Mirror them: width shrank → that side got hit and
    // the other side lunged. No combat.js coupling, replays included.
    const fills = {
      player: stageEl.querySelector('.combatant.player .hp-fill'),
      enemy: stageEl.querySelector('.combatant.enemy .hp-fill'),
    };
    const lastW = {};
    const readW = (el) => {
      const w = parseFloat((el.style.width || '100').replace('%', ''));
      return Number.isFinite(w) ? w : 100; // never let a NaN bar poison the fx
    };
    for (const side of ['player', 'enemy']) {
      if (fills[side]) {
        lastW[side] = readW(fills[side]);
        diorama.setHp(side, lastW[side] / 100);
      }
    }
    hpObserver = new MutationObserver(() => {
      if (!diorama) return;
      for (const side of ['player', 'enemy']) {
        const el = fills[side];
        if (!el || !el.isConnected) continue;
        const w = readW(el);
        if (w < lastW[side] - 0.01) {
          diorama.hit(side);
          diorama.attack(side === 'player' ? 'enemy' : 'player');
        }
        if (w !== lastW[side]) diorama.setHp(side, w / 100);
        lastW[side] = w;
      }
    });
    Object.values(fills).forEach((el) => el
      && hpObserver.observe(el, { attributes: true, attributeFilter: ['style'] }));
  }

  // ---------------- lifecycle sweep ----------------

  function sweep() {
    // dispose stages whose hosts were re-rendered away
    if (dollStage && !dollStage.host.isConnected) { dollStage.dispose(); dollStage = null; }
    if (diorama && !diorama.host.isConnected) {
      diorama.dispose(); diorama = null;
      if (hpObserver) { hpObserver.disconnect(); hpObserver = null; }
    }
    // mount whatever the current screen offers
    scrubPvpInfo(rootEl); // must run before paint settles — no bot-text flash
    decorateClassCards(rootEl);
    decorateHudPortrait(rootEl); // v17.2
    const center = rootEl.querySelector('.doll-center');
    if (center && !dollStage) mountDollStage(center);
    if (dollStage && gc() && gc().player) dollStage.setEquipment(gc().player.equipment);
    const stage = rootEl.querySelector('.battle-stage');
    if (stage && !diorama) mountDiorama(stage);
  }

  const observer = new MutationObserver(() => sweep());
  observer.observe(rootEl, { childList: true, subtree: true });
  sweep();

  return {
    dispose() {
      observer.disconnect();
      if (hpObserver) hpObserver.disconnect();
      if (dollStage) dollStage.dispose();
      if (diorama) diorama.dispose();
      if (snaps) snaps.dispose();
    },
  };
}
