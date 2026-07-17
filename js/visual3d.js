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
  rigSpecFromPortrait, rigSpecFromName,
} from './character3d.js';
import { CLASS_DEFINITIONS, SECRET_CLASS_DEFINITIONS, UNIQUE_CLASS_DEFINITIONS } from './classes.js';

// One flat lookup: any data-class id → its portrait spec. Data modules are
// DOM-free, so importing them here (the DOM layer) is the right direction.
const ALL_CLASSES = { ...CLASS_DEFINITIONS, ...SECRET_CLASS_DEFINITIONS, ...UNIQUE_CLASS_DEFINITIONS };

export async function initVisual3D(rootEl) {
  const THREE = await loadThree();
  if (!THREE || !rootEl) return null;

  const snaps = new SnapshotFactory(THREE, 160);
  let dollStage = null;   // CharacterStage on the inventory screen
  let diorama = null;     // BattleDiorama on the battle screen
  let hpObserver = null;  // watches .hp-fill style mutations during battle

  const gc = () => window.gameController || null;

  // ---------------- decorators ----------------

  function decorateClassCards(scope) {
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
      img.src = snaps.snapshot(rigSpecFromPortrait(def.portrait));
      svg.replaceWith(img);
    });
  }

  function mountDollStage(center) {
    if (dollStage || !gc() || !gc().player) return;
    const p = gc().player;
    const host = document.createElement('div');
    host.className = 'doll-stage3d';
    center.prepend(host);
    dollStage = new CharacterStage(THREE, host, rigSpecFromPortrait(p.portrait), {
      equipment: p.equipment,
    });
  }

  function mountDiorama(stageEl) {
    if (diorama || !gc() || !gc().player || !gc().battleState) return;
    const g = gc();
    const p = g.player;
    const enemy = g.battleState.enemy;

    // PvE monsters/bosses are plain Combatants (name + stats, no portrait):
    // hash the name into a deterministic look, and let raw mass decide the
    // silhouette — anything out-weighing the player 2:1 reads as a brute.
    const bulk = Math.min(1.8, Math.max(1, (enemy.stats?.maxHp || 60) / Math.max(1, p.getTotalStats?.().maxHp || p.stats?.maxHp || 100)));
    const enemySpec = enemy.portrait
      ? rigSpecFromPortrait(enemy.portrait, { bulk })
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
    const readW = (el) => parseFloat((el.style.width || '100').replace('%', ''));
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
    decorateClassCards(rootEl);
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
      snaps.dispose();
    },
  };
}
