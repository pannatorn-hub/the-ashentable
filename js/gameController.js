// gameController.js (v7 — Game Feel: the Stable Battle Mount)
//
// v7 CHANGES FROM v6 (no gameplay/logic changes — presentation only):
//   1. STABLE BATTLE MOUNT: render() no longer rebuilds the DOM while the
//      battle screen is mounted (the innerHTML nuke killed any animation
//      mid-flight). renderBattle() runs ONCE per battle; every subsequent
//      update is a targeted patch (HP bars, sig gauge, dot badges, log).
//   2. EVENT REPLAY: playerChooseSkill() is now async — combat still
//      resolves instantly (combat.js is untouched logic-wise), but the new
//      structured events it emits are replayed over time by
//      animationManager.js before the result screen appears.
//   3. INPUT LOCK: while a replay is playing, the single delegated click
//      handler swallows everything (tapping the arena fast-forwards via a
//      direct listener installed by mountBattle — not a data-action).
//   4. EXIT DISCIPLINE: goTo() clears battleMounted whenever the screen
//      changes away from 'battle', so every exit path (victory, defeat,
//      PvP, logout/reload) releases the mount with zero per-path code.
//   The one root listener / one place that mutates state rule is intact.
// ---------------------------------------------------------------------------
// The client/UI layer for the Dark World. Screen graph:
//   capital(hub: start|capital) <-> worldmap <-> zone(fog) <-> battle/result/altar/campfire
//   capital/town -> bag(compare) / shop / npc / smuggler / travel / allocate / leaderboard / settings
//   capital -> pvp (arena unchanged)
//
// v6 CHANGES FROM v5:
//   1. The Heart Sacrifice Altar is rarer (zone-map.js) and now grants
//      +25% to EVERY base stat (altar.js) — resolveAltar/renderEventResult
//      updated for the new multi-stat boon shape.
//   2. HARDCORE LOOT: the post-combat loot gate no longer offers a "sell
//      for gold" fallback anywhere. Discard, and any bag-full outcome,
//      call inventory.js's disintegrate() — the item is simply gone.
//      Selling loot is now only possible from the bag screen while
//      standing in a Town (sellBagItem is gated on this.place.kind).
//   3. HIDDEN UNIQUE SKILLS: checkHiddenAwakening() is called after every
//      stat-affecting action (allocate, gear change, altar, reforge,
//      character creation) and shows a one-time banner the moment a
//      class's dormant skill crosses its threshold.
//   4. CURSED EQUIPMENT: concludeNodeBattle can roll a Cursed item onto
//      the loot table (odds from zone-map.js); Vesper's Cleanse Curse
//      service is wired into renderNpc()/doCleanseCurse().
//   5. CAMPFIRE AMBUSH: selectNode's CAMPFIRE branch can divert straight
//      into a battle (ambush:true) instead of a free heal; on victory,
//      concludeNodeBattle grants a guaranteed Rare+ item AND still applies
//      the campfire's heal.
//   6. THE WANDERING SMUGGLER: enterZone checks world-map.js's
//      triggerSmugglerEncounter and can divert into her own screen instead
//      of the zone crawl; ensureSmugglerPlaced is called after every
//      discovery event so she keeps relocating into fresh fog.
//   7. ZONE HAZARDS: selectNode passes node.hazard into startBattle;
//      renderZone shows hazard badges once Isra's vision is sharp enough
//      (or the node is already cleared).
//   8. RENAME moved entirely into the Settings panel (ui.js) — the old
//      standalone 'rename' screen, its nav button, and its handler are
//      gone. doRename() is unchanged and still fires from there.
// ---------------------------------------------------------------------------

import { SEASON } from './season.js';
import { isNameTaken } from './leaderboard.js';
import { t, setLanguage } from './i18n.js';
import { Player, ALL_STATS, className, classTagline, signatureName, signatureDesc, STARTING_HEARTS } from './player.js';
import {
  CLASS_DEFINITIONS, hiddenSkillName, hiddenSkillDesc, hiddenSkillHint, checkHiddenUnlock,
  SECRET_CLASS_DEFINITIONS, UNIQUE_CLASS_DEFINITIONS, unlockedSecretClasses, qualifiedUniqueClasses,
  isUniqueClass, resolveClassDef,
} from './classes.js'; // v11: the three class tiers
import { LegacyManager } from './legacy.js';
import { Matchmaker } from './matchmaking.js';
import { startBattle, playerAct, patternedBotPicker, SkillType, SKILL_LIBRARY, skillName, skillDesc, getEffectiveStats, SIG_GAUGE_MAX } from './combat.js';
import {
  generateWorld, findMacroNode, getAvailableMacroNodeIds, markHubVisited, expandOuterFrontier, MacroKind,
  ensureSmugglerPlaced, triggerSmugglerEncounter, migrateWorldBossGating,
} from './world-map.js';
import {
  findNode, getAvailableNodeIds, computeVisibleNodeIds, respawnZone, hydrateOuterZoneRegistry,
  generateEnemyForNode, goldDropFor, materialDropFor, NodeType,
  zoneName, zoneLore, townName, materialName,
  rollCampfireAmbush, generateAmbushEnemy, cursedDropChanceFor,
  hazardName, hazardDesc, hazardIcon, HAZARD_SIGHT_VISION,
  effectiveNodeType, isLiveBossNode, rollProwler,
  xpMultiplierFor, // v12: anti-grind XP drop-off
} from './zone-map.js';
import {
  generateLoot, salvageValue, passiveName, passiveDesc,
  createEquipment, createCursedEquipment, EquipmentSlot, Rarity, curseName, curseDesc,
  rollLootSlot, PVP_SET, createPvpSetItem, // v11
} from './equipment.js';
import { executeSacrifice } from './altar.js';
import { saveGameState, isGuest, migrateGuestToFirebase } from './auth.js';
import { bagCapacity, materialCapacity, addToBag, removeFromBag, addMaterial, compareItems, disintegrate } from './inventory.js';
import {
  NPCS, npcsAt, npcName, npcTitle, npcLore, npcLines,
  canUpgradeBag, canUpgradeMaterials, matUpgradeCost, upgradeMaterialVault, upgradeBag, bagUpgradeCost,
  canUpgradeVision, upgradeVision, visionUpgradeCost, VISION_MAX,
  canReforge, reforgeWeapon, reforgeCost,
  canCleanseCurse, performCleanseCurse, cleanseCost, // v12: cost scales with level/CP
  smugglerStock, canBuyHeartFromSmuggler, buyHeartFromSmuggler, SMUGGLER_HEART_COST,
} from './npc.js';
import { generateShopStock, sellPrice, travelDestinations, travelCost } from './town.js';
import { worldMapNavButton, settingsNavButton, renderWorldMapViewer, renderSettingsPanel } from './ui.js';
import { AnimationManager } from './animationManager.js';
import {
  loadAccount, saveAccount, recordEvent, awardPvpPoints, spendPvpPoints,
  checkSanityOnset, applySanityTax, sanityTimeLeft, LocalUniqueRegistry,
} from './progression.js'; // v11

const NODE_REWARDS = {
  [NodeType.NORMAL]: { winXp: 35, loseXp: 10 },
  [NodeType.HARD]: { winXp: 60, loseXp: 14 },
  [NodeType.ELITE]: { winXp: 95, loseXp: 18 },
  [NodeType.LORD]: { winXp: 200, loseXp: 25 },
};
const CAMPFIRE_HEAL_PCT = 0.6;
const DEFEAT_HP_PCT = 0.4;
const EVENT_GOLD = [20, 55];
// v8: which authored region's town hosts the Hidden Runesmith (หุบเหวจันทร์ดับ → ค่ายขอบเหว).
const RUNESMITH_ZONE_INDEX = 5;

function randInt([min, max]) { return Math.floor(min + Math.random() * (max - min + 1)); }
function dangerGlyphs(tier) { return '☠'.repeat(Math.min(5, 1 + Math.max(0, tier))); }

const GLYPHS = {
  sword: 'M50 12 L54 40 L50 52 L46 40 Z M42 42 L58 42 L58 46 L42 46 Z',
  axe: 'M48 14 L52 14 L52 50 L48 50 Z M52 16 Q68 20 64 34 Q58 28 52 28 Z',
  shield: 'M50 14 Q62 18 62 30 Q62 44 50 52 Q38 44 38 30 Q38 18 50 14 Z',
  dagger: 'M50 20 L53 38 L50 46 L47 38 Z M45 39 L55 39 L55 42 L45 42 Z',
  staff: 'M48 14 L52 14 L52 54 L48 54 Z M50 8 m-6 0 a6 6 0 1 0 12 0 a6 6 0 1 0 -12 0',
  scythe: 'M48 16 L52 16 L52 54 L48 54 Z M52 16 Q70 14 68 28 Q60 20 52 22 Z',
  bow: 'M42 14 Q60 33 42 52 L45 52 Q62 33 45 14 Z M42 14 L42 52',
  fist: 'M42 30 Q42 22 50 22 Q58 22 58 30 L58 42 Q58 48 50 48 Q42 48 42 42 Z',
  skull: 'M50 18 Q62 18 62 32 Q62 40 56 42 L56 48 L44 48 L44 42 Q38 40 38 32 Q38 18 50 18 Z M45 30 a3 3 0 1 0 6 0 a3 3 0 1 0 -6 0 M55 30 a3 3 0 1 0 -6 0',
  lute: 'M50 16 L52 34 Q60 36 60 44 Q60 52 50 52 Q40 52 40 44 Q40 36 48 34 L50 16 Z',
  tower: 'M42 20 L58 20 L58 52 L42 52 Z M40 16 L60 16 L60 22 L40 22 Z',
  runeblade: 'M50 12 L54 40 L50 52 L46 40 Z M48 22 L52 26 M48 30 L52 34',
};

export class GameController {
  constructor({ user, auth, savedState, root, leaderboard = null, saveFn = null, recoveredFromMirror = false, uniqueRegistry = null, saveAccountFn = null }) {
    this.user = user;
    this.auth = auth;
    this.root = root;
    this.leaderboard = leaderboard;
    this.saveFn = saveFn || saveGameState;

    // v11: the permadeath-surviving account ledger (secret/unique class
    // gates) + the Highlander arbiter. Both are backend-agnostic: main.js
    // hands us the Firestore versions when linked, the local ones otherwise.
    this.account = loadAccount();
    this.uniqueRegistry = uniqueRegistry || new LocalUniqueRegistry();
    this.saveAccountFn = saveAccountFn; // cloud mirror for the ledger, or null in local mode
    this.uniqueHolders = null;          // fetched registry snapshot for the creation screen
    this.createError = null;            // unique-class claim races surface here
    this.pvpShopNotice = null;          // 'ok' | 'noPoints' | 'bagFull'
    this.sanityNotice = null;           // { kind: 'onset' } | { kind: 'tax', heartsLost, died } — shown once

    this.legacyManager = savedState?.legacy ? LegacyManager.fromJSON(savedState.legacy) : new LegacyManager();
    this.matchmaker = new Matchmaker();

    this.player = savedState?.player ? Player.fromJSON(savedState.player) : null;
    // v4-and-earlier save migration: a world with no `.macro` graph predates
    // the two-layer map. Regenerate fresh — player progress (level, gear,
    // hearts, gold) is kept; only the explored world resets.
    this.world = (savedState?.world && savedState.world.macro) ? savedState.world
      : (this.player ? generateWorld() : null);
    if (this.world) {
      hydrateOuterZoneRegistry(this.world);
      // v6: places the Wandering Smuggler fresh, or migrates a v5 save
      // that predates her (macro.smugglerNodeId is simply undefined then).
      ensureSmugglerPlaced(this.world.macro, this.world);
      // v9: repair pre-v9 boss bookkeeping so old saves aren't soft-locked.
      migrateWorldBossGating(this.world);
    }

    // Where the player stands:
    //   { kind: 'hub', hubId: 'start' | 'capital' } | { kind: 'field'|'town', zoneIndex }
    // v9 PERSISTENT RUN STATE: position and checkpoint now survive a reload.
    // Before v9 the save held player + world only, so every reload silently
    // teleported the player back to the hub and respawned the region.
    const homeHubId = (this.world && this.world.macro.nodes.capital.visited) ? 'capital' : 'start';
    const run = savedState?.run || null;
    this.place = run?.place || { kind: 'hub', hubId: homeHubId };
    this.currentZoneIndex = run?.currentZoneIndex ?? null;
    this.currentNodeId = run?.currentNodeId ?? null;
    // The last safe ground the player stood on: where defeat sends them back to.
    this.checkpoint = run?.checkpoint || { kind: 'hub', hubId: homeHubId };
    if (this.place.kind === 'field' && this.currentZoneIndex === null) {
      this.place = { kind: 'hub', hubId: homeHubId }; // corrupt/partial run block — fail safe, never throw
    }

    this.selectedClassId = null;
    this.screen = this.player ? this.placeScreen() : 'create_character';
    // v9: only sanctuaries heal you. Reloading mid-expedition no longer works
    // as a free full-heal exploit — HP persists exactly as the save left it.
    if (this.player && this.place.kind !== 'field') this.player.hp = this.player.getStats().maxHp;

    this.battleState = null;
    this.activeNode = null;
    this.lastResult = null;
    this.pvpMode = false;
    this.pendingMatchType = null;
    this.lbSortBy = 'maxCP';
    this.lbEntries = null;
    this.shopStock = null;
    this.activeNpcId = null;
    this.selectedBagItemId = null;
    this.npcNotice = null;
    this.pendingLoot = null;    // loot awaiting an equip/take/discard decision
    this.renameError = null;
    this.renameSuccess = null;
    this.renameDraft = '';
    this.linkStatus = null;     // null | 'working' | 'error' — Settings' Link Account flow
    this.saveError = null;      // v9: last save failure, surfaced in the HUD instead of swallowed
    // v9.1 SAVE LIFECYCLE — the "time rewind" killers:
    this.destroyed = false;         // a destroyed controller must never write a save again
    this._pendingState = null;      // newest state waiting for the async backend
    this._savingNow = false;        // one in-flight backend write at a time (ordered, coalesced)
    this.recoveryNotice = recoveredFromMirror; // boot found the local mirror ahead of the cloud

    // v6:
    this.smugglerStock = null;      // the current Wandering Smuggler encounter's offer
    this.ambushNode = null;         // set while a Campfire Ambush fight is being resolved
    this.prowlerNode = null;        // v9.2: set while re-fighting a wanderer on an already-cleared node
    this.hiddenAwakenNotice = null; // { id } — a Hidden Unique Skill just awakened; shown once, then dismissed

    // v7: the animation layer and the stable battle mount's bookkeeping.
    this.animator = new AnimationManager();
    this.battleMounted = false;     // true while the battle DOM must NOT be rebuilt
    this.animRefs = null;           // live element refs into the mounted battle DOM

    // v9.1: abortable, so destroy() can actually silence this controller.
    // Before this, every boot() left the previous controller's listener alive —
    // a zombie with stale state, persisting the past over the present.
    this._abort = new AbortController();
    this.root.addEventListener('click', (e) => this.handleClick(e), { signal: this._abort.signal });

    // v11 SANITY CURSE — settle the tax the moment the save opens. Days
    // missed while the game was closed are claimed here, one Heart per full
    // day, and a chained debt CAN permadeath the character on the spot
    // (progression.applySanityTax stops at 0 hearts; the standard
    // Legacy/Tombstone flow takes over). Onset is also checked: a save from
    // before v11 that is already past the threshold gets afflicted now,
    // with its first full free day starting from this boot.
    if (this.player && !this.player.isDead) {
      if (checkSanityOnset(this.player)) this.sanityNotice = { kind: 'onset' };
      const tax = applySanityTax(this.player);
      if (tax.heartsLost > 0) this.sanityNotice = { kind: 'tax', heartsLost: tax.heartsLost, died: tax.died };
      if (tax.died) {
        this.legacyManager.recordDeath(this.player);
        this.releaseUniqueIfHeld(); // the throne returns to the pool
        this.screen = 'permadeath';
      }
      if (this.sanityNotice) this.persist();
    }
    // A coarse in-session ticker: refreshes the HUD countdown and settles a
    // deadline that passes while the tab sits open. Never fires during a
    // mounted battle (the stable-mount rule), and dies with destroy().
    this._sanityTimer = setInterval(() => this.sanityTick(), 30000);

    // v11: entering the game with no character means the creation screen —
    // prefetch which unique thrones are occupied so the Apex section is live.
    if (!this.player) this.refreshUniqueHolders();

    this.render();
  }

  persist() {
    if (!this.player || this.destroyed) return;
    this.player.maxCP = Math.max(this.player.maxCP || 0, this.player.combatPower);
    const state = {
      player: this.player.toJSON(),
      world: this.world,            // boss kills + unlocked roads live in here
      legacy: this.legacyManager.toJSON(),
      run: {                        // v9: where you are, and where you respawn
        place: this.place,
        currentZoneIndex: this.currentZoneIndex,
        currentNodeId: this.currentNodeId,
        checkpoint: this.checkpoint,
      },
      savedAt: Date.now(),
    };
    // v9.1 (1/2) SYNCHRONOUS MIRROR. localStorage.setItem completes before
    // this line returns — so the instant a monster dies or a point is spent,
    // the save is already on disk. Navigating away, closing the tab, or a
    // dropped network write can no longer lose it: boot() picks the newest
    // of mirror-vs-cloud. (In local/guest mode saveFn IS the mirror.)
    if (this.saveFn !== saveGameState) {
      try { saveGameState(this.user.id, state); } catch (err) { console.warn('mirror write failed', err); }
    }

    // v9.1 (2/2) COALESCED, ORDERED BACKEND QUEUE. Only one write in flight;
    // rapid persist() bursts collapse to the latest state. An older snapshot
    // can never land after (and overwrite) a newer one.
    this._pendingState = state;
    this._drainSaves();
    if (this.leaderboard) {
      Promise.resolve(this.leaderboard.submit({
        userId: this.user.id, charId: this.player.charId, // v14: heir detection
        name: this.player.name, classId: this.player.classId,
        maxCP: this.player.maxCP, maxZone: this.player.maxZone,
      })).catch((err) => console.error('leaderboard submit failed', err));
    }
  }

  handleClick(e) {
    // v7 input lock: while a combat replay is playing, every data-action is
    // swallowed (skill spam, HUD nav, everything). Tapping the arena to
    // fast-forward uses a direct listener from mountBattle, not data-action,
    // so it passes right through this lock.
    if (this.animator.playing) return;
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    const a = btn.dataset;
    switch (a.action) {
      case 'pick-class': this.selectedClassId = a.class; this.render(); break;
      case 'confirm-create': this.confirmCreateCharacter(); break;
      case 'capital': this.goTo('capital'); break;
      case 'goto-worldmap': this.goTo('worldmap'); break;
      case 'worldmap-back': this.goTo(this.placeScreen()); break;
      case 'macro-select-node': this.selectMacroNode(a.macro); break;
      case 'select-node': this.selectNode(a.node); break;
      case 'retreat': this.retreat(); break;
      case 'use-gate': this.useCapitalGate(); break;
      case 'town-continue': this.continueFromTown(); break;
      case 'town-to-capital': this.arriveNearestHub(true); break;
      case 'goto-shop': this.openShop(); break;
      case 'buy': this.buyFromShop(Number(a.index)); break;
      case 'sell-bag-item': this.sellBagItem(a.item); break;
      case 'goto-town-from-shop': this.goTo(this.placeScreen()); break; // v12: works from the Capital market too
      case 'goto-npc': this.activeNpcId = a.npc; this.npcNotice = null; this.goTo('npc'); break;
      case 'npc-back': this.goTo(this.placeScreen()); break;
      case 'npc-upgrade-bag': this.doNpcService('bag'); break;
      case 'npc-upgrade-mats': this.doNpcService('matbag'); break; // v14
      case 'npc-upgrade-vision': this.doNpcService('vision'); break;
      case 'npc-reforge': this.doNpcService('reforge'); break;
      case 'npc-cleanse-curse': this.doCleanseCurse(a.item); break; // v6
      case 'goto-bag': this.selectedBagItemId = null; this.goTo('bag'); break;
      case 'bag-select': this.selectedBagItemId = a.item; this.render(); break;
      case 'bag-close-compare': this.selectedBagItemId = null; this.render(); break;
      case 'bag-equip': this.equipFromBag(a.item); break;
      case 'bag-sell': this.sellBagItem(a.item); break;
      case 'bag-back': this.goTo(this.placeScreen()); break;
      case 'unequip': this.unequipToBag(a.slot); break;
      case 'goto-travel': this.goTo('travel'); break;
      case 'travel-to': this.travelTo(a.dest); break;
      case 'travel-back': this.goTo(this.placeScreen()); break;
      case 'goto-allocate': this.goTo('allocate'); break;
      case 'allocate-stat': this.player.allocateStatPoint(a.stat); this.checkHiddenAwakening(); this.persist(); this.render(); break;
      case 'allocate-done': this.goTo(this.placeScreen()); break;
      case 'skill': this.playerChooseSkill(a.skill); break;
      case 'rename-confirm': this.doRename(); break; // v6: fired from the Settings panel now
      case 'loot-equip': this.decideLoot('equip'); break;
      case 'loot-take': this.decideLoot('take'); break;
      case 'loot-discard': this.decideLoot('discard'); break;
      case 'altar-yes': this.resolveAltar(true); break;
      case 'altar-no': this.resolveAltar(false); break;
      case 'continue-node': this.finishNodeResult(); break;
      case 'advance-next': this.advanceToMacroNode(a.macro); break; // v9: post-boss "walk on" choice
      case 'goto-leaderboard': this.openLeaderboard(); break;
      case 'lb-sort': this.lbSortBy = a.by; this.openLeaderboard(); break;
      case 'lb-back': this.goTo('capital'); break;
      case 'pvp': this.enterPvPQueue(); break;
      // v11: Arena Warden's PvP-point shop
      case 'goto-pvpshop': this.pvpShopNotice = null; this.goTo('pvpshop'); break;
      case 'pvpshop-buy': this.buyFromPvpShop(a.entry); break;
      // v11: Sanity Curse banner
      case 'dismiss-sanity': this.sanityNotice = null; this.render(); break;
      case 'revive': this.reviveWithNewCharacter(); break;
      case 'goto-settings': this.linkStatus = null; this.renameError = null; this.renameSuccess = null; this.renameDraft = ''; this.goTo('settings'); break;
      case 'settings-back': this.goTo(this.placeScreen()); break;
      case 'link-account': this.linkAccount(); break;
      case 'logout': this.auth.logout(); window.location.reload(); break;
      // v10: bilingual TH/EN toggle — setLanguage() persists to localStorage;
      // re-rendering the current screen (not goTo, screen doesn't change) is
      // enough since every renderX() reads strings through t() fresh, live.
      case 'change-language': setLanguage(a.lang); this.render(); break;
      // v6: The Wandering Smuggler's black market
      case 'smuggler-back': this.goTo(this.placeScreen()); break;
      case 'smuggler-buy': this.buyFromSmuggler(Number(a.index)); break;
      case 'smuggler-buy-heart': this.purchaseSmugglerHeart(); break;
      // v6: Hidden Unique Skill awakening banner
      case 'dismiss-awaken': this.hiddenAwakenNotice = null; this.render(); break;
      // v8: the Runesmith strikes the anvil — passives wake permanently.
      case 'unlock-passives': this.player.passivesUnlocked = true; this.persist(); this.goTo('town'); break;
      default: break;
    }
  }

  /** v9.1: one in-flight backend write; always ships the newest pending state. */
  _drainSaves() {
    if (this._savingNow || !this._pendingState || this.destroyed) return;
    const state = this._pendingState;
    this._pendingState = null;
    this._savingNow = true;
    Promise.resolve(this.saveFn(this.user.id, state))
      .then(() => { if (this.saveError) { this.saveError = null; this.render(); } })
      .catch((err) => {
        // Still visible (v9) — but the mirror above means even a dead cloud
        // write no longer costs the player their progress on this device.
        console.error('save failed', err);
        if (!this.saveError) { this.saveError = err.message || String(err); this.render(); }
      })
      .finally(() => { this._savingNow = false; this._drainSaves(); });
  }

  /** v9.1: silence this controller forever — no clicks, no renders, no saves. */
  destroy() {
    this.destroyed = true;
    if (this._abort) this._abort.abort();
    if (this._sanityTimer) clearInterval(this._sanityTimer); // v11
  }

  /**
   * v9.1: another tab took over this save. Freezing (instead of racing) is
   * what prevents the classic multi-tab rewind: a stale tab quietly writing
   * yesterday's state over today's.
   */
  freeze() {
    this.destroy();
    this.root.innerHTML = `
      <div class="auth-shell takeover-shell">
        <h2>${t('session.takeover.title')}</h2>
        <p class="tagline">${t('session.takeover.body')}</p>
        <button class="btn btn-primary" id="takeover-reload">${t('session.takeover.reload')}</button>
      </div>`;
    const btn = this.root.querySelector('#takeover-reload');
    if (btn) btn.addEventListener('click', () => window.location.reload());
  }

  goTo(screen) {
    // v7: leaving the battle screen (any path: victory, defeat, PvP result,
    // permadeath, even mid-battle HUD navigation) releases the stable mount
    // so the next render is a normal full rebuild. Entering 'battle' leaves
    // battleMounted false — render() will build once and then mountBattle().
    if (screen !== 'battle') { this.battleMounted = false; this.animRefs = null; }
    if (this.recoveryNotice && screen !== this.screen) this.recoveryNotice = false; // v9.1: shown until the player moves on
    this.screen = screen;
    this.render();
  }

  /** Which top-level screen name corresponds to where the player currently stands. */
  placeScreen() {
    if (this.place.kind === 'hub') return 'capital';
    if (this.place.kind === 'town') return 'town';
    return 'zone';
  }

  /** The macro-graph node id the player is currently standing on. */
  currentMacroId() {
    return this.place.kind === 'hub' ? this.place.hubId : String(this.place.zoneIndex);
  }

  // v12: everywhere a merchant will deal with you — every town, plus the
  // Capital's own market (the Start Village stays a merchant-less refuge).
  canTradeHere() {
    return this.place.kind === 'town' || (this.place.kind === 'hub' && this.place.hubId === 'capital');
  }

  /** What to hand town.js pricing/stock functions as the market's zone ref. */
  shopZoneRef() {
    return this.place.kind === 'hub' ? 'capital' : this.place.zoneIndex;
  }

  // ---------------- Character creation ----------------

  async confirmCreateCharacter() {
    const nameInput = document.getElementById('char-name-input');
    const name = nameInput ? nameInput.value.trim() : '';
    if (!this.selectedClassId || !name) return;
    this.createError = null;

    // v14 NAME UNIQUENESS. One name, one soul, per season — INCLUDING the
    // caller's own fallen character on the board (no excludeUserId here).
    // That's the fix for "reborn with the old name, board still shows the
    // ghost": the old name simply can't be claimed again, so an heir always
    // enters the board as a distinct, fresh entry. Offline/fetch failure
    // fails open, same policy as doRename — a network hiccup never blocks play.
    if (this.leaderboard) {
      try {
        const entries = await this.leaderboard.fetch({ by: 'maxCP', limit: 100 });
        if (isNameTaken(entries, name, null)) {
          this.createError = t('create.err.taken');
          this.render();
          return;
        }
      } catch { /* fail open */ }
    }

    // v11: server-side truth check — a locked class id smuggled into
    // selectedClassId (devtools) is refused here, not just hidden in the UI.
    const classId = this.selectedClassId;
    if (SECRET_CLASS_DEFINITIONS[classId] && !unlockedSecretClasses(this.account).includes(classId)) return;
    if (UNIQUE_CLASS_DEFINITIONS[classId]) {
      if (!qualifiedUniqueClasses(this.account).includes(classId)) return;
      // THE HIGHLANDER CLAIM: an atomic, race-safe grab at the throne.
      // Firestore transaction when linked, localStorage locally — losing
      // the race is a normal outcome, surfaced calmly, never thrown.
      try {
        const res = await this.uniqueRegistry.claim(classId, this.user.id, name);
        if (!res.ok) {
          this.createError = t('create.unique.taken', { name: (res.holder && res.holder.holderName) || '?' });
          this.refreshUniqueHolders();
          this.render();
          return;
        }
      } catch (err) {
        console.error('unique claim failed', err);
        this.createError = t('create.unique.claimError');
        this.render();
        return;
      }
    }

    const legacyBonus = this.legacyManager.createHeirBonus();
    this.player = new Player({ name, classId, legacyBonus });
    if (legacyBonus) { recordEvent(this.account, 'legacyChildren'); this.persistAccount(); } // v11: raising an heir is a gate
    this.world = generateWorld(); // Start Village ('start') is marked visited by generateWorld() itself
    this.place = { kind: 'hub', hubId: this.world.macro.startId };
    this.checkHiddenAwakening(); // v6: a generous Legacy bonus could in principle cross a threshold immediately
    // v11: an heir built on a monstrous legacy could already be past the Sanity threshold.
    if (checkSanityOnset(this.player)) this.sanityNotice = { kind: 'onset' };
    this.persist();
    this.goTo('capital');
  }

  reviveWithNewCharacter() {
    this.selectedClassId = null;
    this.player = null;
    this.world = null;
    this.createError = null;
    this.refreshUniqueHolders(); // v11: the Apex section needs a fresh occupancy snapshot
    this.goTo('create_character');
  }

  // ---------------- Movement between places (macro layer) ----------------

  currentZone() { return this.currentZoneIndex === null ? null : this.world.zones[this.currentZoneIndex]; }

  /** Arrive at a specific hub by id ('start' or 'capital'): full heal, secure it on the macro graph. */
  arriveHub(hubId, viaField = false) {
    if (viaField && this.currentZone()) respawnZone(this.currentZone());
    markHubVisited(this.world.macro, hubId);
    if (hubId === 'capital') expandOuterFrontier(this.world.macro, this.world, 'capital');
    ensureSmugglerPlaced(this.world.macro, this.world); // v6: this discovery may have exposed her camp
    this.place = { kind: 'hub', hubId };
    this.currentZoneIndex = null;
    this.currentNodeId = null;
    this.checkpoint = { kind: 'hub', hubId }; // v9: hubs are checkpoints
    this.player.hp = this.player.getStats().maxHp; // sanctuary: full heal
    this.shopStock = null;
    this.persist();
    this.goTo('capital');
  }

  /** Whichever hub actually belongs to the region you're leaving: Start Village for the authored web, Capital for the endless outer zones. */
  arriveNearestHub(viaField = false) {
    const zone = this.currentZone();
    const hubId = zone && zone.outer ? 'capital' : this.world.macro.startId;
    this.arriveHub(hubId, viaField);
  }

  retreat() {
    this.lastResult = { kind: 'retreat' };
    this.arriveNearestHub(true);
  }

  /** Does this region's Town shortcut lead to the Capital? Only true for the macro-designated gate regions (world-map.js), not every region. */
  zoneGatesToCapital(zoneIndex) {
    const node = findMacroNode(this.world.macro, String(zoneIndex));
    return !!(node && node.connectsTo.includes('capital'));
  }

  useCapitalGate() {
    const zone = this.currentZone();
    if (!zone || !this.zoneGatesToCapital(zone.index)) return;
    const node = this.currentNodeId ? findNode(zone, this.currentNodeId) : null;
    if (!node || !node.capitalGate || !node.cleared) return;
    this.arriveHub('capital', true);
  }

  /** Selecting a node on the macro World Map Viewer: a hub, a zone to (re)enter, or the node you're already standing on. */
  selectMacroNode(macroId) {
    if (!macroId) return;
    const { macro } = this.world;
    const isCurrent = macroId === this.currentMacroId();
    const available = getAvailableMacroNodeIds(macro, this.world, this.currentMacroId());
    if (!isCurrent && !available.has(macroId)) return;

    const node = findMacroNode(macro, macroId);
    if (!node) return;

    if (node.kind === MacroKind.HUB) {
      if (isCurrent) { this.goTo('capital'); return; }
      this.arriveHub(node.id, this.place.kind === 'field');
      return;
    }

    // MacroKind.ZONE
    if (isCurrent) { this.goTo(this.place.kind === 'town' ? 'town' : 'zone'); return; }
    this.enterZone(node.zoneIndex);
  }

  enterZone(zoneIndex) {
    const zone = this.world.zones[zoneIndex];
    respawnZone(zone); // a fresh expedition: the wilds have refilled
    this.place = { kind: 'field', zoneIndex };
    this.currentZoneIndex = zoneIndex;
    this.currentNodeId = null;
    // v6: stepping into unmapped wilds might mean stumbling on the Wandering Smuggler's hidden camp.
    if (triggerSmugglerEncounter(this.world.macro, this.world, String(zoneIndex))) {
      this.smugglerStock = smugglerStock(this.player.level);
      this.npcNotice = null;
      recordEvent(this.account, 'smugglerMet'); this.persistAccount(); // v11: meeting her is itself a gate
      this.persist(); // her relocation is world state — worth saving even if the player backs out immediately
      this.goTo('smuggler');
      return;
    }
    this.goTo('zone');
  }

  arriveTown(zoneIndex, { fresh = false } = {}) {
    const zone = this.world.zones[zoneIndex];
    const firstDiscovery = !zone.townDiscovered;
    zone.townDiscovered = true;
    if (fresh) { respawnZone(zone); }
    this.place = { kind: 'town', zoneIndex };
    this.currentZoneIndex = zoneIndex;
    this.currentNodeId = zone.townNodeId;
    this.checkpoint = { kind: 'town', zoneIndex }; // v9: reaching a town moves your respawn point
    const townNode = findNode(zone, zone.townNodeId);
    if (townNode) townNode.cleared = true;
    this.player.hp = this.player.getStats().maxHp; // sanctuary: full heal
    this.shopStock = null;
    this.firstTownDiscovery = firstDiscovery;
    // A newly-secured foothold past the Capital grows the endless web further outward.
    if (firstDiscovery) expandOuterFrontier(this.world.macro, this.world, String(zoneIndex));
    ensureSmugglerPlaced(this.world.macro, this.world); // v6: this discovery may have exposed her camp
    this.persist();

    // v8: the Hidden Runesmith of ค่ายขอบเหว — arriving with a dormant passive
    // item (any visit, including paid fast travel) diverts into the awakening
    // event instead of the town screen. Fires until the player accepts.
    if (zoneIndex === RUNESMITH_ZONE_INDEX && !this.player.passivesUnlocked && this.playerHasPassiveItem()) {
      this.goTo('awaken_event');
      return;
    }

    this.goTo('town');
  }

  /** v8: does the player own (equipped or bagged) at least one item with a passive? */
  playerHasPassiveItem() {
    return Object.values(this.player.equipment).some((i) => i && i.passive)
      || this.player.bag.some((i) => i && i.passive);
  }

  continueFromTown() {
    // Step back into the wilds from the town gate — same expedition, deeper in.
    this.place = { kind: 'field', zoneIndex: this.currentZoneIndex };
    this.goTo('zone');
  }

  /**
   * v9 CHECKPOINT RESPAWN. Death sends you back to `this.checkpoint` — the
   * last town or hub you actually stood in — NOT to the Start Village.
   * So: push into a fresh region past the boss, die before finding its town,
   * and you wake at the PREVIOUS town, with that new region respawned and
   * its road still unlocked (the boss stays dead).
   *
   * A checkpoint town that somehow no longer qualifies (never discovered —
   * only possible via a hand-edited save) degrades to the nearest hub
   * instead of throwing.
   */
  returnToSanctuary() {
    this.ambushNode = null; // v6: a lost ambush fight still ends the ambush state
    const zone = this.currentZone();
    if (zone) respawnZone(zone); // the region you fell in refills — bosses you already killed stay dead

    let cp = this.checkpoint;
    const cpZone = cp && cp.kind === 'town' ? this.world.zones[cp.zoneIndex] : null;
    if (cp?.kind === 'town' && !(cpZone && cpZone.townDiscovered)) cp = null;
    if (!cp) {
      const hubId = zone && zone.outer ? 'capital' : this.world.macro.startId;
      cp = { kind: 'hub', hubId };
    }

    if (cp.kind === 'town') {
      const home = this.world.zones[cp.zoneIndex];
      respawnZone(home);
      this.place = { kind: 'town', zoneIndex: cp.zoneIndex };
      this.currentZoneIndex = cp.zoneIndex;
      this.currentNodeId = home.townNodeId;
      const townNode = findNode(home, home.townNodeId);
      if (townNode) townNode.cleared = true;
      this.lastResult = { kind: 'defeat_return', placeName: townName(cp.zoneIndex), toTown: true, zoneIndex: cp.zoneIndex };
    } else {
      this.place = { kind: 'hub', hubId: cp.hubId };
      this.currentZoneIndex = null;
      this.currentNodeId = null;
      const placeName = cp.hubId === 'capital' ? t('capital.name') : t('world.hub.start.name');
      this.lastResult = { kind: 'defeat_return', placeName, toTown: false, zoneIndex: null };
    }
    this.checkpoint = cp;
    this.player.hp = Math.max(1, Math.round(this.player.getStats().maxHp * DEFEAT_HP_PCT));
    this.persist();
  }

  // ---------------- Zone / node selection (micro layer) ----------------
// --- โค้ดที่เพิ่มใหม่: คำนวณทางเดินแบบอิสระ (ไป-กลับ และออกข้าง) ---
  getBidirectionalAvailableNodes(zone) {
    const available = new Set();
    const allNodes = zone.floors.flat();
    
    // ถ้าเพิ่งเข้าด่านมาใหม่ ให้เข้าด่านแรกสุดได้
    if (!this.currentNodeId) {
      if (zone.floors.length > 0) {
        zone.floors[0].forEach(n => available.add(n.id));
      }
      return available;
    }

    const currentNode = allNodes.find(n => n.id === this.currentNodeId);
    if (!currentNode) return available;

    // เช็กเส้นเชื่อมทั้งเดินหน้าและถอยหลัง
    allNodes.forEach(targetNode => {
      const isForward = currentNode.connectsTo && currentNode.connectsTo.includes(targetNode.id);
      const isBackward = targetNode.connectsTo && targetNode.connectsTo.includes(currentNode.id);
      if (isForward || isBackward) {
        available.add(targetNode.id);
      }
    });
    return available;
  }
  // ----------------------------------------------------
 selectNode(nodeId) {
    const zone = this.currentZone();
    const node = findNode(zone, nodeId);
    if (!node) return;
    
    // ตรงนี้คือฟังก์ชันที่คุณแก้ไปรอบที่แล้ว ให้ใช้ของที่คุณมีอยู่ได้เลย
    const available = this.getBidirectionalAvailableNodes(zone); 
    const visible = computeVisibleNodeIds(zone, this.currentNodeId, this.player.visionRange);
    if (!available.has(nodeId) || !visible.has(nodeId)) return;

    this.activeNode = node;

    // --- เริ่มแก้ตรงนี้ ---
    // v9.2: A CLEARED NODE STAYS CLEARED for the rest of the expedition.
    if (node.cleared) {
      this.currentNodeId = node.id;
      
      // 🌟 โค้ดที่เพิ่มใหม่: ถ้าด่านที่เคยเคลียร์แล้ว เป็นประเภท TOWN ให้พาเข้าเมืองเลย
      if (node.type === NodeType.TOWN) {
        this.arriveTown(zone.index);
        return; 
      }
      // 🌟 จบโค้ดที่เพิ่มใหม่

      if (rollProwler(zone, node)) {
        const fightNode = { ...node, type: effectiveNodeType(node) };
        const enemy = generateEnemyForNode(fightNode, zone, this.player.level);
        this.prowlerNode = node; 
        this.battleState = startBattle(this.player, enemy, patternedBotPicker(SkillType.QUICK_STRIKE, 0.4), { fullHeal: false, hazard: node.hazard || null });
        this.pvpMode = false;
        this.goTo('battle');
        return;
      }
      this.persist();
      this.goTo('zone');
      return;
    }
    if (node.type === NodeType.TOWN) { this.arriveTown(zone.index); return; }
    if (node.type === NodeType.ALTAR) { this.goTo('altar_event'); return; }
    if (node.type === NodeType.CAMPFIRE) {
      // v6: Campfire Ambush — in a dangerous enough region, resting can go very wrong.
      if (rollCampfireAmbush(zone)) {
        const enemy = generateAmbushEnemy(zone, node, this.player.level);
        this.ambushNode = node;
        this.battleState = startBattle(this.player, enemy, patternedBotPicker(SkillType.HEAVY_ATTACK, 0.5), { fullHeal: false, ambush: true });
        this.pvpMode = false;
        this.goTo('battle');
        return;
      }
      const maxHp = this.player.getStats().maxHp;
      const heal = Math.round(maxHp * CAMPFIRE_HEAL_PCT);
      this.player.hp = Math.min(maxHp, this.player.hp + heal);
      this.lastResult = { kind: 'campfire', heal };
      this.markNodeCleared(node);
      this.goTo('event_result');
      return;
    }
    if (node.type === NodeType.EVENT) {
      // เปลี่ยนจากแจกทอง เป็นแจกวัตถุดิบ (Materials)
      const mats = 1 + Math.floor(Math.random() * 2);
      const gain = addMaterial(this.player, zone.index, mats); // v14: vault-capped
      this.lastResult = { kind: 'event_mat', mats: gain.added, matOverflow: gain.overflow, zoneIndex: zone.index };
      this.markNodeCleared(node);
      this.goTo('event_result');
      return;
    }

    // Combat node — persistent HP: no free heal on entering a fight.
    // v9: a Lord node whose boss is already dead fights as an ORDINARY node —
    // normal mob, normal difficulty, normal rewards. `fightNode` carries the
    // effective type so enemy generation and drops both see it that way.
    const fightNode = { ...node, type: effectiveNodeType(node) };
    const isBoss = isLiveBossNode(node);
    const enemy = generateEnemyForNode(fightNode, zone, this.player.level);
    const favored = isBoss ? SkillType.HEAVY_ATTACK : SkillType.QUICK_STRIKE;
    this.battleState = startBattle(this.player, enemy, patternedBotPicker(favored, isBoss ? 0.5 : 0.4), { fullHeal: false, hazard: node.hazard || null });
    this.pvpMode = false;
    this.goTo('battle');
  }

  markNodeCleared(node) {
    node.cleared = true;
    this.currentNodeId = node.id;
    this.persist();
  }

  // ---------------- Rename (v6: launched only from the Settings panel now) ----------------

  async doRename() {
    const p = this.player;
    if ((p.renameCount || 0) >= 1) return; // UI is disabled; guard anyway
    const input = document.getElementById('rename-input');
    const newName = (input ? input.value : '').replace(/[<>&"']/g, '').trim();
    this.renameDraft = newName;
    if (newName.length < 2) { this.renameError = t('rename.err.short'); this.render(); return; }
    if (newName === p.name) { this.renameError = t('rename.err.same'); this.render(); return; }
    let taken = false;
    if (this.leaderboard) {
      try {
        const entries = await this.leaderboard.fetch({ by: 'maxCP', limit: 100 });
        taken = isNameTaken(entries, newName, this.user.id); // v14: shared rule with creation
      } catch { taken = false; } // offline: don't block the rename on a network hiccup
    }
    if (taken) { this.renameError = t('rename.err.taken'); this.render(); return; }
    p.name = newName;
    p.renameCount = (p.renameCount || 0) + 1;
    this.renameError = null;
    this.renameSuccess = t('rename.success', { name: newName });
    this.persist(); // pushes the new name to the save AND the leaderboard entry
    this.render();
  }

  // ---------------- Battle ----------------

  currentEnemyPicker() {
    if (this.pvpMode) return patternedBotPicker(SkillType.HEAVY_ATTACK, 0.5);
    const isBoss = isLiveBossNode(this.activeNode);
    const favored = isBoss ? SkillType.HEAVY_ATTACK : SkillType.QUICK_STRIKE;
    return patternedBotPicker(favored, isBoss ? 0.5 : 0.4);
  }

  /**
   * v7: combat still resolves instantly inside playerAct (the entire
   * time-slice — player action plus every enemy action until the player's
   * next turn). What changed is presentation: the fresh slice of structured
   * events is replayed over time by the animator BEFORE the outcome is
   * acted on. Battle conclusion (rewards, hearts, screens) is byte-for-byte
   * the v6 path — it just runs after the replay lands.
   */
  async playerChooseSkill(skillType) {
    const bs = this.battleState;
    if (!bs || bs.finished || this.animator.playing) return;

    const before = bs.log.length;
    playerAct(bs, skillType, this.currentEnemyPicker());

    // bs.log is newest-first; the replay wants chronological order.
    const fresh = bs.log.slice(0, bs.log.length - before).reverse();

    this.lockSkillBar();
    await this.animator.play(fresh, this.animRefs);
    // The replay may have outlived the battle DOM (mid-battle HUD navigation
    // is possible in v6 and stays possible). Every animator helper no-ops on
    // dead refs, so we only need to conclude/patch against live state here.

    if (bs.finished) {
      if (this.battleState !== bs) return; // superseded — never conclude a stale battle
      if (this.pvpMode) this.concludePvpBattle();
      else this.concludeNodeBattle();
      return;
    }
    this.patchBattleHud(); // rebuilds the skill bar with correct enabled states
  }

  /** Disable every skill button for the duration of a replay (visual + belt-and-braces; the real lock is in handleClick). */
  lockSkillBar() {
    const bar = this.animRefs && this.animRefs.skillBar;
    if (!bar || !bar.isConnected) return;
    bar.classList.add('anim-lock');
    bar.querySelectorAll('button').forEach((b) => { b.disabled = true; });
  }

  /**
   * v7: everything on the battle screen that changes per turn but isn't
   * worth animating — sig gauge, dot badges, SPD chips (fleetfoot), the
   * skill bar's enabled states, exact final HP numbers, and the HUD's HP
   * readout. Small targeted writes into the stable mount; never innerHTML
   * on this.root.
   */
  patchBattleHud() {
    const r = this.animRefs;
    const bs = this.battleState;
    if (!r || !bs || !r.arena || !r.arena.isConnected) return;

    // Skill bar: rebuild from the same template renderBattle used — the
    // fresh HTML carries the correct disabled/ready/gauge states.
    if (r.skillBar && r.skillBar.isConnected) {
      r.skillBar.classList.remove('anim-lock');
      r.skillBar.innerHTML = this.battleSkillBarHtml();
    }

    // Name rows: SPD chips and burn badges.
    const pName = r.playerCard && r.playerCard.querySelector('.combatant-name');
    const eName = r.enemyCard && r.enemyCard.querySelector('.combatant-name');
    if (pName) pName.innerHTML = this.battleNameHtml('player');
    if (eName) eName.innerHTML = this.battleNameHtml('enemy');

    // Exact final HP (the replay tweened per-event snapshots; this pins the truth).
    const pStats = getEffectiveStats(bs, 'player');
    const eStats = getEffectiveStats(bs, 'enemy');
    if (r.playerHpFill) r.playerHpFill.style.width = `${Math.max(0, (this.player.hp / pStats.maxHp) * 100)}%`;
    if (r.playerHpText) r.playerHpText.textContent = `${this.player.hp} / ${pStats.maxHp}`;
    if (r.enemyHpFill) r.enemyHpFill.style.width = `${Math.max(0, (bs.enemy.hp / eStats.maxHp) * 100)}%`;
    if (r.enemyHpText) r.enemyHpText.textContent = `${bs.enemy.hp} / ${eStats.maxHp}`;

    // The persistent HUD's HP readout (the HUD is outside the battle mount
    // but also isn't re-rendered while the mount is stable).
    const hudHp = this.root.querySelector('.hud-hp');
    if (hudHp) hudHp.innerHTML = `HP <b>${this.player.hp}</b>/${pStats.maxHp}`;
  }

  concludeNodeBattle() {
    const bs = this.battleState;
    const node = this.activeNode;
    const zone = this.currentZone();
    const won = bs.winner === 'player';
    const isAmbush = !!this.ambushNode; // v6
    const isProwler = !!this.prowlerNode; // v9.2: a re-encounter on cleared ground
    // v9: re-running a slain Lord's node pays NORMAL rewards, not boss rewards.
    const wasBossFight = isLiveBossNode(node) && !isProwler;
    const effType = effectiveNodeType(node);
    const rewardNode = { ...node, type: effType };
    const rewards = NODE_REWARDS[effType] || NODE_REWARDS[NodeType.NORMAL];

    // v12 ANTI-GRIND: XP decays to a hard 0 for content trivially below the
    // player's level (zone-map.xpMultiplierFor). Gold and materials are
    // deliberately untouched — farming old zones stays an economy, not a ladder.
    const xpMult = xpMultiplierFor(zone, this.player.level);
    const xp = Math.round((won ? rewards.winXp : rewards.loseXp) * xpMult);
    const leveledUp = this.player.gainXp(xp);
    const gold = goldDropFor(rewardNode, zone, won);
    this.player.gold += gold;
    const matsRolled = materialDropFor(rewardNode, won);
    const mats = matsRolled > 0 ? addMaterial(this.player, zone.index, matsRolled).added : 0; // v14: vault-capped

    if (!won) {
      this.ambushNode = null; // v6
      this.prowlerNode = null; // v9.2
      this.returnToSanctuary(); // sets lastResult = { kind: 'defeat_return', placeName, ... }
      Object.assign(this.lastResult, { xp, gold, opponentName: bs.enemy.name });
      this.goTo('node_result');
      return;
    }

    // Victory: HP persists exactly as the fight left it.
    // Loot is NOT auto-bagged — each piece waits for an equip/take/discard call.
    if (isAmbush) {
      // v6: surviving an ambush guarantees a Rare+ item — not the normal roll.
      this.pendingLoot = [createEquipment(this.randomSlot(), this.player.level, Rarity.RARE)];
    } else {
      this.pendingLoot = generateLoot(this.player.level);
      // v6: Lords, elites, and the deep outer web can also drop something Cursed.
      if (Math.random() < cursedDropChanceFor(rewardNode, zone)) {
        this.pendingLoot.push(createCursedEquipment(this.randomSlot(), this.player.level));
      }
    }

    // v9 BOSS KILL — the single place progression is written. All three of
    // these live inside `world`/`player`, both of which persist() saves, so
    // the unlock is durable by construction.
    let lordSlain = false;
    let unlockedMacroId = null;
    if (wasBossFight) {
      node.bossSlain = true;      // (1) this Lord never respawns; his node becomes a normal one
      zone.lordDefeated = true;   // (2) region-level flag (outer/legacy unlocking, map paint)
      lordSlain = true;
      if (!Array.isArray(zone.defeatedLords)) zone.defeatedLords = [];
      if (node.macroTarget && !zone.defeatedLords.includes(node.macroTarget)) {
        zone.defeatedLords.push(node.macroTarget); // (3) THE unlock: this road is now open forever
      }
      unlockedMacroId = node.macroTarget || null;
      this.player.maxZone = Math.max(this.player.maxZone || 1, zone.index + 1);
      // v11: the ledger remembers every fallen Lord — these counters gate
      // the Secret and Unique classes, and they survive permadeath.
      recordEvent(this.account, 'lordKills');
      if ((zone.dangerTier || 0) >= 6) recordEvent(this.account, 'lordKillsTier6');
      if ((zone.dangerTier || 0) >= 8) recordEvent(this.account, 'lordKillsTier8');
      this.persistAccount();
      // v11: pushing deeper can cross the Sanity threshold mid-run.
      if (checkSanityOnset(this.player)) this.sanityNotice = { kind: 'onset' };
    }

    if (isAmbush) {
      // v6: the campfire itself still does its job — heal + clear, same as an uninterrupted rest.
      const maxHp = this.player.getStats().maxHp;
      this.player.hp = Math.min(maxHp, this.player.hp + Math.round(maxHp * CAMPFIRE_HEAL_PCT));
      this.ambushNode = null;
    }
    this.prowlerNode = null; // v9.2
    this.markNodeCleared(node); // idempotent: a prowler fight leaves the node exactly as cleared as it was

    this.lastResult = {
      kind: 'battle', won: true, xp, gold, mats, lootMsgs: [], leveledUp, lordSlain,
      trivial: xpMult === 0, // v12: the zone has nothing left to teach
      opponentName: bs.enemy.name, zoneIndex: zone.index, ambush: isAmbush, prowler: isProwler,
      unlockedMacroId, // v9: drives the "Continue to the next land" button
      openRoads: lordSlain ? this.openRoadsFromHere() : [], // v9.2: every road this region now offers
    };
    this.persist();
    this.goTo('node_result');
  }

  /** v6/v11: a random equipment slot for guaranteed ambush/cursed drops — now weighted, so accessory scarcity holds everywhere loot is minted. */
  randomSlot() {
    return rollLootSlot();
  }

  /**
   * Resolves the first pending loot item: 'equip' | 'take' | 'discard'.
   * v6 HARDCORE RULE: discard, and any bag-full fallback, now yield
   * NOTHING — no more free gold from the field. See inventory.js's
   * disintegrate().
   */
  decideLoot(choice) {
    const item = this.pendingLoot && this.pendingLoot[0];
    if (!item) return;
    this.pendingLoot.shift();
    const msgs = this.lastResult.lootMsgs || (this.lastResult.lootMsgs = []);
    const displayName = item.curse ? `${item.name} (⚠ ${curseName(item.curse)})` : item.name;

    if (choice === 'equip') {
      const prev = this.player.equip(item);
      msgs.push({ text: t('lootgate.equipped', { item: displayName }), color: item.rarity.color });
      if (prev) {
        if (addToBag(this.player, prev)) {
          msgs.push({ text: t('lootgate.prevToBag', { item: prev.name }), color: prev.rarity.color });
        } else {
          disintegrate(prev);
          msgs.push({ text: t('lootgate.prevLost', { item: prev.name }), color: prev.rarity.color });
        }
      }
      this.checkHiddenAwakening(); // v6: gear just changed — a threshold might have just been crossed
    } else if (choice === 'take') {
      if (addToBag(this.player, item)) {
        msgs.push({ text: t('lootgate.taken', { item: displayName }), color: item.rarity.color });
      } else {
        disintegrate(item);
        msgs.push({ text: t('bag.full.lost', { item: displayName }), color: item.rarity.color });
      }
    } else { // discard — v6: gone. no gold, no materials, no trace.
      disintegrate(item);
      msgs.push({ text: t('lootgate.discarded', { item: displayName }), color: item.rarity.color });
    }
    this.persist();
    this.render();
  }

  finishNodeResult() {
    const r = this.lastResult;
    if (r && (r.kind === 'defeat_return' || (r.kind === 'battle' && !r.won))) {
      this.goTo(this.place.kind === 'town' ? 'town' : 'capital');
      return;
    }
    this.goTo('zone');
  }

  resolveAltar(accept) {
    const outcome = accept ? executeSacrifice(this.player) : null;
    this.lastResult = { kind: 'altar', boon: outcome };
    if (outcome) { recordEvent(this.account, 'altarSacrifices'); this.persistAccount(); } // v11
    if (outcome) this.checkHiddenAwakening(); // v6: +25% to every stat can absolutely cross a threshold
    this.markNodeCleared(this.activeNode);
    this.goTo('event_result');
  }

  // ---------------- Bag / equip ----------------

  equipFromBag(itemId) {
    const item = removeFromBag(this.player, itemId);
    if (!item) return;
    const previous = this.player.equip(item);
    if (previous) addToBag(this.player, previous); // guaranteed space: we just freed one
    this.selectedBagItemId = null;
    this.checkHiddenAwakening(); // v6
    this.persist();
    this.render();
  }

  unequipToBag(slot) {
    if (this.player.bag.length >= bagCapacity(this.player)) return; // no room — keep it on
    const item = this.player.unequip(slot);
    if (item) addToBag(this.player, item);
    this.checkHiddenAwakening(); // v6
    this.persist();
    this.render();
  }

  /** v6/v12: selling needs a merchant — any Town, or the Capital's market. Loot must be physically carried back. */
  sellBagItem(itemId) {
    if (!this.canTradeHere()) return;
    const item = removeFromBag(this.player, itemId);
    if (!item) return;
    this.player.gold += sellPrice(item, this.shopZoneRef());
    if (this.selectedBagItemId === itemId) this.selectedBagItemId = null;
    this.persist();
    this.render();
  }

  // ---------------- Town / shop / travel / NPC ----------------

  openShop() {
    if (!this.canTradeHere()) return;
    if (!this.shopStock) this.shopStock = generateShopStock(this.shopZoneRef(), this.player.level);
    this.goTo('shop');
  }

  buyFromShop(index) {
    const entry = this.shopStock[index];
    if (!entry) return;
    if (this.player.gold < entry.price) return;
    if (!addToBag(this.player, entry.item)) return; // bag full — button is disabled, but guard anyway
    this.player.gold -= entry.price;
    this.shopStock.splice(index, 1);
    this.persist();
    this.render();
  }

  /** v11: Arena Warden purchase — points-gated, bag-space-gated, forged at the buyer's level. */
  buyFromPvpShop(entryId) {
    const entry = PVP_SET.find((e) => e.id === entryId);
    if (!entry) return;
    if ((this.player.pvpPoints || 0) < entry.cost) { this.pvpShopNotice = 'noPoints'; this.render(); return; }
    if (this.player.bag.length >= bagCapacity(this.player)) { this.pvpShopNotice = 'bagFull'; this.render(); return; }
    const item = createPvpSetItem(entry.id, this.player.level);
    if (!item || !addToBag(this.player, item)) { this.pvpShopNotice = 'bagFull'; this.render(); return; }
    spendPvpPoints(this.player, entry.cost);
    this.pvpShopNotice = 'ok';
    this.persist();
    this.render();
  }

  travelTo(dest) {
    const destination = dest === 'capital' ? { kind: 'capital' } : { kind: 'town', zoneIndex: Number(dest) };
    const cost = travelCost(destination.kind === 'capital' ? 'capital' : { zoneIndex: destination.zoneIndex });
    if (this.player.gold < cost) return;
    this.player.gold -= cost;
    if (this.currentZone() && this.place.kind !== 'town') respawnZone(this.currentZone());
    if (destination.kind === 'capital') this.arriveHub('capital', this.place.kind === 'town');
    else this.arriveTown(destination.zoneIndex, { fresh: true });
  }

  doNpcService(service) {
    let result = null;
    if (service === 'bag') result = upgradeBag(this.player);
    else if (service === 'matbag') result = upgradeMaterialVault(this.player); // v14
    else if (service === 'vision') result = upgradeVision(this.player);
    else if (service === 'reforge') result = reforgeWeapon(this.player);
    this.npcNotice = result ? 'ok' : 'fail';
    if (result && service === 'reforge') { recordEvent(this.account, 'reforges'); this.persistAccount(); } // v11
    if (result) { this.checkHiddenAwakening(); this.persist(); } // v6: a reforge can push a stat over a threshold too
    this.render();
  }

  // ---------------- v6: Cleanse Curse (เวสเปอร์, Capital only) ----------------

  /** Finds an item wherever it currently lives — equipped or in the bag. */
  findItemAnywhere(itemId) {
    for (const slot of Object.keys(this.player.equipment)) {
      const item = this.player.equipment[slot];
      if (item && item.id === itemId) return item;
    }
    return this.player.bag.find((i) => i.id === itemId) || null;
  }

  doCleanseCurse(itemId) {
    const item = this.findItemAnywhere(itemId);
    if (!item) return;
    const result = performCleanseCurse(this.player, item);
    this.npcNotice = result ? 'ok' : 'fail';
    if (result) { recordEvent(this.account, 'cleansedCurses'); this.persistAccount(); } // v11: Vesper's hidden service is a secret-class gate
    // v6: removing e.g. speedHalf/dodgeSeal can itself push a total stat over a hidden-skill threshold.
    if (result) { this.checkHiddenAwakening(); this.persist(); }
    this.render();
  }

  // ---------------- v6: Hidden Unique Skill awakening ----------------

  /**
   * Call after ANY stat-affecting mutation (stat allocation, gear change,
   * altar sacrifice, reforge, character creation). Awakening is permanent
   * once true — see classes.js's checkHiddenUnlock for the threshold check
   * itself. Sets a one-time banner notice; returns true if it just fired.
   */
  checkHiddenAwakening() {
    const hidden = checkHiddenUnlock(this.player);
    if (!hidden) return false;
    this.player.hiddenAwakened = true;
    this.hiddenAwakenNotice = { id: hidden.id };
    recordEvent(this.account, 'hiddenAwakenings'); this.persistAccount(); // v11
    return true;
  }

  // ---------------- v6: The Wandering Smuggler's black market ----------------

  buyFromSmuggler(index) {
    const entry = this.smugglerStock && this.smugglerStock[index];
    if (!entry) return;
    if (this.player.gold < entry.price) return;
    if (!addToBag(this.player, entry.item)) return; // bag full — button is disabled, but guard anyway
    this.player.gold -= entry.price;
    this.smugglerStock.splice(index, 1);
    this.persist();
    this.render();
  }

  purchaseSmugglerHeart() {
    const result = buyHeartFromSmuggler(this.player);
    this.npcNotice = result ? 'ok' : 'fail';
    if (result) { recordEvent(this.account, 'smugglerHeartBought'); this.persistAccount(); } // v11
    if (result) this.persist();
    this.render();
  }

  // ---------------- v11: account ledger / Highlander / Sanity plumbing ----------------

  /** Cloud-mirror the ledger (recordEvent already wrote it locally). Fire-and-forget, like the leaderboard. */
  persistAccount() {
    saveAccount(this.account);
    if (this.saveAccountFn) {
      Promise.resolve(this.saveAccountFn(this.user.id, this.account))
        .catch((err) => console.warn('account cloud mirror failed', err));
    }
  }

  /** If this character sits on a Unique throne, return it to the server pool. Fire-and-forget: the strip must never block the death flow. */
  releaseUniqueIfHeld() {
    if (!this.player || !isUniqueClass(this.player.classId)) return;
    const classId = this.player.classId;
    Promise.resolve(this.uniqueRegistry.release(classId, this.user.id))
      .catch((err) => console.error('unique class release failed', err));
  }

  /** Creation-screen prefetch: which Apex thrones are currently occupied. */
  refreshUniqueHolders() {
    this.uniqueHolders = null;
    Promise.resolve(this.uniqueRegistry.fetchAll())
      .then((reg) => { this.uniqueHolders = reg || {}; if (this.screen === 'create_character') this.render(); })
      .catch(() => { this.uniqueHolders = {}; if (this.screen === 'create_character') this.render(); });
  }

  /**
   * In-session Sanity heartbeat (30s): settles a deadline that passes while
   * the tab sits open and keeps the HUD countdown honest. Skipped while a
   * battle is mounted — the stable-mount rule owns that DOM.
   */
  sanityTick() {
    if (this.destroyed || !this.player || this.player.isDead || !this.player.sanityCursed) return;
    if (this.screen === 'battle' && this.battleMounted) return;
    const tax = applySanityTax(this.player);
    if (tax.heartsLost > 0) {
      this.sanityNotice = { kind: 'tax', heartsLost: tax.heartsLost, died: tax.died };
      if (tax.died) {
        this.legacyManager.recordDeath(this.player);
        this.releaseUniqueIfHeld();
        this.persist();
        this.goTo('permadeath');
        return;
      }
      this.persist();
    }
    this.render(); // countdown chip refresh
  }

  // ---------------- PvP (arena in the Capital, unchanged rules) ----------------

  enterPvPQueue() {
    if (this.player.hearts <= 0) return;
    this.matchmaker.enqueue(this.player);
    this.goTo('pvp_searching');
    setTimeout(() => {
      const match = this.matchmaker.findMatch(this.player);
      this.pendingMatchType = match.type;
      this.pvpMode = true;
      this.battleState = startBattle(this.player, match.opponent, patternedBotPicker(SkillType.HEAVY_ATTACK, 0.5), { fullHeal: true });
      this.goTo('battle');
    }, 1100);
  }

  concludePvpBattle() {
    const bs = this.battleState;
    const won = bs.winner === 'player';
    this.player.hp = this.player.getStats().maxHp; // arena magic mends the flesh; the Hearts remember

    let heartsLeft = this.player.hearts;
    let justDied = false;
    if (!won) { heartsLeft = this.player.loseHeart(); justDied = this.player.isDead; }

    // v11: the bout pays PvP Points either way (a loss pays a trickle — the
    // Sanity tax shouldn't punish twice), stamps the account ledger's
    // win/match totals, and feeds the curse's 24h clock in one call.
    const ptsEarned = awardPvpPoints(this.player, this.account, won);
    this.persistAccount();
    this.sanityNotice = null; // fighting IS the cure — clear any lingering warning

    this.lastResult = { kind: 'pvp', won, opponent: bs.enemy, matchType: this.pendingMatchType, heartsLeft, justDied, ptsEarned };
    this.pvpMode = false;

    if (justDied) {
      this.legacyManager.recordDeath(this.player);
      this.releaseUniqueIfHeld(); // v11 HIGHLANDER PENALTY: permadeath in PvP strips the throne back into the pool
      this.persist();
      this.goTo('permadeath');
    } else {
      this.persist();
      this.goTo('pvp_result');
    }
  }

  openLeaderboard() {
    this.screen = 'leaderboard';
    this.lbEntries = null;
    this.render();
    if (!this.leaderboard) { this.lbEntries = []; this.render(); return; }
    this.leaderboard.fetch({ by: this.lbSortBy, limit: 20 })
      .then((entries) => { this.lbEntries = entries; if (this.screen === 'leaderboard') this.render(); })
      .catch(() => { this.lbEntries = []; if (this.screen === 'leaderboard') this.render(); });
  }

  // ---------------- Settings / Link Account ----------------

  async linkAccount() {
    if (!isGuest(this.user)) return;
    this.linkStatus = 'working';
    this.render();
    try {
      const currentState = {
        player: this.player.toJSON(), world: this.world, legacy: this.legacyManager.toJSON(),
        run: { place: this.place, currentZoneIndex: this.currentZoneIndex, currentNodeId: this.currentNodeId, checkpoint: this.checkpoint },
      };
      const result = await migrateGuestToFirebase(this.user, currentState);
      this.user = result.user;
      this.auth = result.auth;
      this.saveFn = result.saveFn;
      this.leaderboard = result.leaderboard;
      if (result.state) {
        // Whichever save actually won the migration (guest's run, or a
        // better one already sitting in the cloud under that account).
        if (result.state.player) this.player = Player.fromJSON(result.state.player);
        if (result.state.world && result.state.world.macro) {
          this.world = result.state.world;
          hydrateOuterZoneRegistry(this.world);
          ensureSmugglerPlaced(this.world.macro, this.world); // v6
          migrateWorldBossGating(this.world);                 // v9
        }
        if (result.state.run) {                               // v9: the winning save's position wins too
          this.place = result.state.run.place || this.place;
          this.currentZoneIndex = result.state.run.currentZoneIndex ?? null;
          this.currentNodeId = result.state.run.currentNodeId ?? null;
          this.checkpoint = result.state.run.checkpoint || this.checkpoint;
        }
        if (result.state.legacy) this.legacyManager = LegacyManager.fromJSON(result.state.legacy);
      }
      this.linkStatus = null;
      this.persist();
      this.goTo(this.placeScreen());
    } catch (err) {
      console.error('link account failed', err);
      this.linkStatus = 'error';
      this.render();
    }
  }

  // ================= Rendering =================

  render() {
    if (this.destroyed) return; // v9.1: a frozen/replaced controller must never repaint (or resurrect) the game UI
    // v7 STABLE MOUNT GUARD: while the battle DOM is mounted, a full
    // innerHTML rebuild would kill every animation mid-flight and orphan
    // this.animRefs. All per-turn battle updates go through patchBattleHud()
    // and the animator instead.
    if (this.screen === 'battle' && this.battleMounted) return;
    // v6: a Hidden Unique Skill awakening banner, shown once above whatever screen is current.
    const awakenBanner = this.hiddenAwakenNotice ? this.renderAwakenBanner() : '';
    const sanityBanner = this.sanityNotice ? this.renderSanityBanner() : ''; // v11
    const saveWarn = this.saveError ? `<div class="save-warning">${t('save.failed', { err: this.saveError })}</div>` : '';
    const recovered = this.recoveryNotice ? `<div class="save-warning save-recovered">${t('save.recovered')}</div>` : '';
    this.root.innerHTML = `${this.screen === 'create_character' ? '' : this.renderHud()}${saveWarn}${recovered}${sanityBanner}${awakenBanner}<main class="screen">${this.renderScreen()}</main>`;
    if (this.screen === 'battle') this.mountBattle();
  }

  /**
   * v7: called exactly once per battle, right after renderBattle()'s HTML
   * lands. Captures live element refs for the animator + patcher, and
   * installs the tap-to-fast-forward listener (a direct listener — it lives
   * and dies with this DOM, and bypasses the data-action input lock).
   */
  mountBattle() {
    const bs = this.battleState;
    if (!bs) return;
    this.battleMounted = true;
    
    // โค้ดดึงตัวแปร q และ animRefs ปล่อยไว้เหมือนเดิมครับ
    const q = (sel) => this.root.querySelector(sel);
    this.animRefs = {
      arena: q('.battle-arena'),
      playerCard: q('.combatant.player'),
      enemyCard: q('.combatant.enemy'),
      playerHpFill: q('.combatant.player .hp-fill'),
      enemyHpFill: q('.combatant.enemy .hp-fill'),
      playerHpText: q('.combatant.player .hp-text'),
      enemyHpText: q('.combatant.enemy .hp-text'),
      logList: q('.battle-log'),
      fxLayer: q('.battle-fx-layer'),
      skillBar: q('.skill-bar'),
      playerMaxHp: getEffectiveStats(bs, 'player').maxHp,
      enemyMaxHp: getEffectiveStats(bs, 'enemy').maxHp,
    };

    const stage = q('.battle-stage');
    if (stage) stage.addEventListener('pointerdown', (e) => {
      // 1. ดักบัค Ghost Click เวลากดข้ามจอเร็วๆ
      if (this.animator.playing) {
        e.preventDefault();
        this.animator.skip();
      }
    });

    // 👇 2. เพิ่มเงื่อนไขนี้ลงไป: ถ้าโดนตีตายตั้งแต่เทิร์น 0 ให้จบการต่อสู้ทันที
    if (bs.finished) {
      this.lockSkillBar(); // ปิดปุ่มกดสกิล
      setTimeout(() => {
        if (this.battleState !== bs) return; // กันบัคหน้าจอซ้อน
        if (this.pvpMode) this.concludePvpBattle();
        else this.concludeNodeBattle();
      }, 1500); // ดีเลย์ 1.5 วินาที ให้เราทันได้เห็นความตายของตัวเอง ก่อนเด้งไปหน้าจอแพ้
    }
  }

  renderAwakenBanner() {
    const n = this.hiddenAwakenNotice;
    return `
      <div class="awaken-banner">
        <span class="awaken-icon">✦</span>
        <div class="awaken-text">
          <b>${t('hidden.awakened.title')}</b><br/>
          ${hiddenSkillName(n.id)} — ${hiddenSkillDesc(n.id)}
        </div>
        <button class="btn btn-tiny" data-action="dismiss-awaken">${t('hidden.awakened.dismiss')}</button>
      </div>`;
  }

  /** v11: the Sanity Curse banner — onset ritual text, or the toll of missed days. */
  renderSanityBanner() {
    const n = this.sanityNotice;
    const body = n.kind === 'onset'
      ? t('sanity.onset.body')
      : n.died ? t('sanity.tax.died', { n: n.heartsLost }) : t('sanity.tax.body', { n: n.heartsLost });
    return `
      <div class="sanity-banner ${n.kind === 'tax' ? 'sanity-banner-tax' : ''}">
        <span class="awaken-icon">🕯</span>
        <div class="awaken-text">
          <b>${n.kind === 'onset' ? t('sanity.onset.title') : t('sanity.tax.title')}</b><br/>
          ${body}
        </div>
        <button class="btn btn-tiny" data-action="dismiss-sanity">${t('hidden.awakened.dismiss')}</button>
      </div>`;
  }

  /** v11: hh:mm left until the curse next feeds. */
  sanityCountdownLabel() {
    const ms = sanityTimeLeft(this.player);
    if (ms === null) return '';
    const h = Math.floor(ms / 3600000);
    const m = Math.floor((ms % 3600000) / 60000);
    return `${h}:${String(m).padStart(2, '0')}`;
  }

  renderHud() {
    const p = this.player;
    const s = p.getStats();
    const hearts = Array.from({ length: STARTING_HEARTS }, (_, i) => `<span class="heart ${i < p.hearts ? 'full' : 'empty'}">${i < p.hearts ? '♥' : '♡'}</span>`).join('');
    return `
      <header class="hud">
        <div class="hud-portrait">${this.renderPortrait(p.portrait, p.equipment, 44)}</div>
        <div class="hud-block hud-name">${p.name}${p.isLegacyChild ? ` <span class="legacy-tag">${t('hud.legacy')}</span>` : ''}<span class="hud-level">${className(p.classId)} · ${t('hud.level', { n: p.level })}</span></div>
        <div class="hud-block hud-cp">CP <b>${p.combatPower}</b></div>
        <div class="hud-block hud-hp">HP <b>${p.hp}</b>/${s.maxHp}</div>
        <div class="hud-block hud-hearts">${hearts}</div>
        <div class="hud-block hud-resources">${t('hud.gold', { n: p.gold })}</div>
        ${(p.pvpPoints || 0) > 0 ? `<div class="hud-block hud-pvp-points">${t('hud.pvpPoints', { n: p.pvpPoints })}</div>` : ''}
        ${p.sanityCursed && !p.isDead ? `<div class="hud-block hud-sanity" title="${t('sanity.hud.tip')}">🕯 ${this.sanityCountdownLabel()}</div>` : ''}
        ${p.statPoints > 0 ? `<button class="btn btn-tiny btn-primary" data-action="goto-allocate">${t('hud.points', { n: p.statPoints })}</button>` : ''}
        <nav class="hud-nav">
          <button class="btn btn-tiny" data-action="goto-bag">${t('hud.gear')}</button>
          ${worldMapNavButton()}
          ${settingsNavButton()}
        </nav>
      </header>
    `;
  }

  renderPortrait(portrait, equipment, size = 96) {
    const tint = portrait.tint;
    const glyph = GLYPHS[portrait.glyph] || GLYPHS.sword;
    const slotColor = (slot) => (equipment && equipment[slot] ? equipment[slot].rarity.color : '#4a4d63');
    return `
      <svg width="${size}" height="${size}" viewBox="0 0 100 100" class="portrait-svg" role="img" aria-label="portrait">
        <defs><radialGradient id="pg-${portrait.glyph}" cx="35%" cy="30%" r="80%">
          <stop offset="0%" stop-color="${tint}" stop-opacity="0.95"/><stop offset="100%" stop-color="${tint}" stop-opacity="0.45"/>
        </radialGradient></defs>
        <circle cx="50" cy="50" r="48" fill="#1b1d29" stroke="#4a4d63" stroke-width="1.5"/>
        <circle cx="50" cy="36" r="15" fill="url(#pg-${portrait.glyph})"/>
        <path d="M28 84 Q50 58 72 84 L72 92 L28 92 Z" fill="url(#pg-${portrait.glyph})" opacity="0.8"/>
        <path d="${glyph}" fill="#f1e8d6" opacity="0.9" transform="translate(14 26) scale(0.55)"/>
        <!-- v11 paper-doll: 8 gear indicators. Head band / chest plate / leg
             plate / boot pair frame the figure; weapon at the right hand;
             ring, necklace, bracelet as small jewels down the left. -->
        <rect x="40" y="20" width="20" height="5" rx="2.5" fill="${slotColor('head')}" opacity="0.9"/>
        <rect x="38" y="70" width="24" height="9" rx="4" fill="${slotColor('armor')}" opacity="0.85"/>
        <rect x="40" y="81" width="20" height="6" rx="3" fill="${slotColor('legs')}" opacity="0.85"/>
        <rect x="41" y="89" width="8" height="5" rx="2" fill="${slotColor('boots')}"/>
        <rect x="51" y="89" width="8" height="5" rx="2" fill="${slotColor('boots')}"/>
        <rect x="70" y="76" width="10" height="14" rx="3" fill="${slotColor('weapon')}"/>
        <circle cx="24" cy="70" r="4" fill="${slotColor('ring')}"/>
        <circle cx="22" cy="80" r="4" fill="${slotColor('necklace')}"/>
        <circle cx="26" cy="90" r="4" fill="${slotColor('bracelet')}"/>
      </svg>
    `;
  }

  renderScreen() {
    switch (this.screen) {
      case 'create_character': return this.renderCreateCharacter();
      case 'capital': return this.renderCapital();
      case 'worldmap': return this.renderWorldMap();
      case 'settings': return this.renderSettings();
      case 'zone': return this.renderZone();
      case 'town': return this.renderTown();
      case 'shop': return this.renderShop();
      case 'npc': return this.renderNpc();
      case 'smuggler': return this.renderSmuggler(); // v6
      case 'bag': return this.renderBag();
      case 'travel': return this.renderTravel();
      case 'allocate': return this.renderAllocate();
      case 'battle': return this.renderBattle();
      case 'node_result': return this.renderNodeResult();
      case 'event_result': return this.renderEventResult();
      case 'altar_event': return this.renderAltarScreen();
      case 'awaken_event': return this.renderAwakenEvent(); // v8
      case 'pvpshop': return this.renderPvpShop(); // v11
      case 'pvp_searching': return this.renderSearching();
      case 'pvp_result': return this.renderPvpResult();
      case 'permadeath': return this.renderPermadeath();
      case 'leaderboard': return this.renderLeaderboard();
      default: return this.renderCapital();
    }
  }

  /** One selectable class card — shared by all three tiers. */
  renderClassCard(c, { tierBadge = '' } = {}) {
    return `
      <button class="class-card ${this.selectedClassId === c.id ? 'selected' : ''} ${c.tier ? `tier-${c.tier}` : ''}" data-action="pick-class" data-class="${c.id}">
        ${tierBadge}
        <div class="class-card-head">${this.renderPortrait(c.portrait, null, 52)}<div><h3>${className(c.id)}</h3><p class="class-tagline">${classTagline(c.id)}</p></div></div>
        <ul class="class-stats">
          <li>${t('stat.maxHp')} ${c.baseStats.maxHp}</li><li>${t('stat.atk')} ${c.baseStats.atk}</li>
          <li>${t('stat.def')} ${c.baseStats.def}</li><li>${t('stat.speed')} ${c.baseStats.speed}</li>
        </ul>
        <p class="class-signature"><b>${signatureName(c.signature.id)}:</b> ${signatureDesc(c.signature.id)}</p>
      </button>
    `;
  }

  /** A still-locked Secret class: nameless silhouette + a cryptic hint. The mystery IS the content. */
  renderLockedCard(classId) {
    return `
      <div class="class-card class-locked">
        <div class="class-card-head">
          <svg width="52" height="52" viewBox="0 0 100 100" class="portrait-svg" aria-hidden="true">
            <circle cx="50" cy="50" r="48" fill="#14121c" stroke="#2a2438" stroke-width="1.5"/>
            <circle cx="50" cy="36" r="15" fill="#221e30"/>
            <path d="M28 84 Q50 58 72 84 L72 92 L28 92 Z" fill="#221e30"/>
            <text x="50" y="58" text-anchor="middle" fill="#56506a" font-size="30">?</text>
          </svg>
          <div><h3>???</h3><p class="class-tagline">${t('create.locked')}</p></div>
        </div>
        <p class="class-hint">${t(`class.${classId}.hint`)}</p>
      </div>
    `;
  }

  renderCreateCharacter() {
    const classes = Object.values(CLASS_DEFINITIONS);
    const legacyNote = this.legacyManager.hasLegacy() ? `<p class="legend-note">${t('create.legacyNote')}</p>` : '';

    // v11 SECRET TIER: earned ones are pickable; the rest sit as locked
    // silhouettes with cryptic hints — visible proof there is more to find.
    const secretIds = new Set(unlockedSecretClasses(this.account));
    const secretCards = Object.values(SECRET_CLASS_DEFINITIONS).map((c) =>
      secretIds.has(c.id)
        ? this.renderClassCard(c, { tierBadge: `<span class="tier-badge tier-badge-secret">${t('create.tier.secret')}</span>` })
        : this.renderLockedCard(c.id)
    ).join('');

    // v11 APEX TIER: shown ONLY once the account qualifies for at least one
    // (ultra-secret — no silhouettes, no hints, no section at all before
    // then). Occupied thrones show their current holder and are unpickable.
    const qualified = qualifiedUniqueClasses(this.account);
    let apexSection = '';
    if (qualified.length > 0) {
      const holders = this.uniqueHolders; // null while the registry fetch is in flight
      const apexCards = qualified.map((id) => {
        const c = UNIQUE_CLASS_DEFINITIONS[id];
        const holder = holders ? holders[id] : undefined;
        if (holders && holder && holder.holderUid && holder.holderUid !== this.user.id) {
          return `
            <div class="class-card class-locked tier-unique">
              <span class="tier-badge tier-badge-unique">${t('create.tier.unique')}</span>
              <div class="class-card-head">${this.renderPortrait(c.portrait, null, 52)}<div><h3>${className(c.id)}</h3><p class="class-tagline">${classTagline(c.id)}</p></div></div>
              <p class="class-hint">${t('create.unique.holder', { name: holder.holderName || '?' })}</p>
            </div>`;
        }
        return this.renderClassCard(c, { tierBadge: `<span class="tier-badge tier-badge-unique">${t('create.tier.unique')}</span>` });
      }).join('');
      apexSection = `
        <h2 class="create-tier-title tier-title-unique">${t('create.unique.title')}</h2>
        <p class="legend-note">${t('create.unique.rule')}${holders === null ? ` — ${t('create.unique.checking')}` : ''}</p>
        <div class="class-grid">${apexCards}</div>`;
    }

    return `
      <h1>${t('app.title')}</h1>
      <p class="tagline">${t('create.tagline', { n: classes.length })}</p>
      ${legacyNote}
      <div class="class-grid">
        ${classes.map((c) => this.renderClassCard(c)).join('')}
      </div>
      <h2 class="create-tier-title tier-title-secret">${t('create.secret.title')}</h2>
      <div class="class-grid">${secretCards}</div>
      ${apexSection}
      ${this.createError ? `<p class="heart-lost">${this.createError}</p>` : ''}
      <input type="text" id="char-name-input" class="name-input" placeholder="${t('create.name.placeholder')}" maxlength="20" />
      <button class="btn btn-primary" data-action="confirm-create" ${this.selectedClassId ? '' : 'disabled'}>${t('create.confirm')}</button>
    `;
  }

  renderCapital() {
    const dead = this.player.hearts <= 0;
    const isCapital = this.place.hubId === 'capital';
    const npcs = isCapital ? npcsAt('capital') : [];
    const title = isCapital ? t('capital.name') : t('world.hub.start.name');
    const lore = isCapital ? t('capital.lore') : t('world.hub.start.lore');
    const rested = isCapital ? t('capital.rested') : t('world.hub.start.rested');
    return `
      <h1>${title}</h1>
      <p class="tagline">${lore}</p>
      <p class="legend-note">${rested}</p>
      <div class="menu-actions">
        <button class="btn btn-primary" data-action="goto-worldmap">${t('capital.depart')}</button>
        <button class="btn btn-secondary" data-action="goto-travel">${t('capital.travel')}</button>
        ${isCapital ? `<button class="btn btn-secondary" data-action="goto-shop">${t('capital.market')}</button>` : ''}
        <button class="btn btn-secondary" data-action="goto-bag">${t('capital.bag')}</button>
        <button class="btn btn-danger" data-action="pvp" ${dead ? 'disabled' : ''}>${t('capital.arena')}</button>
        <button class="btn btn-secondary" data-action="goto-leaderboard">${t('menu.leaderboard')}</button>
      </div>
      ${npcs.length ? `<div class="npc-row">
        ${npcs.map((n) => `<button class="npc-card" data-action="goto-npc" data-npc="${n.id}">
          <div class="npc-card-name">${npcName(n)}</div><div class="npc-card-title">${npcTitle(n)}</div>
        </button>`).join('')}
      </div>` : ''}
    `;
  }

  renderWorldMap() {
    return renderWorldMapViewer({
      macro: this.world.macro,
      world: this.world,
      currentMacroId: this.currentMacroId(),
      worldVisionRange: this.player.worldVisionRange || 1,
    });
  }

  renderSettings() {
    // v6: Settings now also owns Rename (moved here in full from its old standalone screen).
    return renderSettingsPanel({
      user: this.user, linkStatus: this.linkStatus,
      player: this.player,
      renameError: this.renameError, renameSuccess: this.renameSuccess, renameDraft: this.renameDraft,
    });
  }

  computeMapLayout(zone) {
    const COORD_WIDTH = 640;
    const marginX = 60, marginY = 50, floorGap = 100;
    const usableWidth = COORD_WIDTH - marginX * 2;
    const totalHeight = marginY * 2 + (zone.floors.length - 1) * floorGap;
    const pos = {};
    zone.floors.forEach((floor, fi) => {
      const y = marginY + (zone.floors.length - 1 - fi) * floorGap;
      floor.forEach((node, ni) => {
        const x = floor.length === 1 ? COORD_WIDTH / 2 : marginX + (ni / (floor.length - 1)) * usableWidth;
        pos[node.id] = { x, y };
      });
    });
    return { pos, width: COORD_WIDTH, height: totalHeight };
  }

  renderZone() {
    const zone = this.currentZone();
    const available = this.getBidirectionalAvailableNodes(zone);
    const visible = computeVisibleNodeIds(zone, this.currentNodeId, this.player.visionRange);
    const currentNode = this.currentNodeId ? findNode(zone, this.currentNodeId) : null;
    const typeMeta = {
      [NodeType.NORMAL]: '⚔', [NodeType.HARD]: '⚔⚔', [NodeType.ELITE]: '👹', [NodeType.LORD]: '☠',
      [NodeType.EVENT]: '❔', [NodeType.ALTAR]: '🔥', [NodeType.CAMPFIRE]: '🕯', [NodeType.TOWN]: '🏘',
    };
    const { pos, width, height } = this.computeMapLayout(zone);
    const allNodes = zone.floors.flat();
    // v6: Isra's map-vision upgrade doubles as hazard sight — see zone-map.js's HAZARD_SIGHT_VISION.
    const canSeeHazards = (this.player.worldVisionRange || 1) >= HAZARD_SIGHT_VISION;

    const edgesSvg = allNodes.flatMap((node) => node.connectsTo.map((targetId) => {
      if (!visible.has(node.id)) return ''; // fog hides even the roads
      const a = pos[node.id], b = pos[targetId];
      const targetVisible = visible.has(targetId);
      const cls = !targetVisible ? 'locked' : available.has(targetId) ? 'reachable' : node.cleared ? 'traveled' : 'locked';
      return `<line x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}" class="map-edge ${cls}"/>`;
    })).join('');

    const nodesHtml = allNodes.map((node) => {
      const { x, y } = pos[node.id];
      const style = `left:${((x / width) * 100).toFixed(2)}%;top:${((y / height) * 100).toFixed(2)}%`;
      if (!visible.has(node.id)) {
        return `<button class="map-node fog" style="${style}" disabled title="${t('node.fog')}"><span class="node-icon">?</span></button>`;
      }
      // v9.2: cleared nodes are CLICKABLE now — that is what makes walking
      // back possible. They just don't start a fight (see selectNode).
      const isAvailable = available.has(node.id);
      const isCurrent = node.id === this.currentNodeId;
      // v9: a slain Lord's node renders (and fights) as an ordinary combat node.
      const effType = effectiveNodeType(node);
      const slainLord = node.type === NodeType.LORD && node.bossSlain;
      const isBehind = node.cleared && !isCurrent && available.has(node.id) && !(currentNode && currentNode.connectsTo.includes(node.id));
      const label = node.cleared
        ? (slainLord ? t('node.lordSlain') : t('node.clearedPass'))
        : t(`node.${effType}`);
      const cls = ['map-node', effType, slainLord ? 'lord-slain' : '', node.cleared ? 'cleared' : '',
        isAvailable ? 'available' : '', isBehind ? 'behind' : '', isCurrent ? 'current' : ''].join(' ');
      // v6: hazard badge — always visible once cleared (you've already lived it), or earlier if vision is sharp enough.
      const showHazard = node.hazard && (node.cleared || canSeeHazards);
      const hazardBadge = showHazard ? `<span class="hazard-badge" title="${hazardName(node.hazard)}">${hazardIcon(node.hazard)}</span>` : '';
      const titleText = showHazard ? `${label} — ${hazardName(node.hazard)}` : label;
      return `<button class="${cls}" style="${style}" data-action="select-node" data-node="${node.id}" ${isAvailable ? '' : 'disabled'} title="${titleText}">
        <span class="node-icon">${typeMeta[effType]}</span>${hazardBadge}
      </button>`;
    }).join('');

    const gateBtn = currentNode && currentNode.capitalGate && currentNode.cleared && this.zoneGatesToCapital(zone.index)
      ? `<p class="legend-note">${t('gate.toCapital')}</p><button class="btn btn-secondary" data-action="use-gate">${t('gate.use')}</button>` : '';

    return `
      <h2>${zoneName(zone.index)} <span class="zone-index">${t('world.danger')} ${dangerGlyphs(zone.dangerTier)}</span></h2>
      <p class="tagline">${zoneLore(zone.index)}</p>
      <p class="legend-note">${t('zone.softcapWarn')}</p>
      ${canSeeHazards ? `<p class="legend-note">${t('zone.hazardSight')}</p>` : ''}
      <p class="legend-note">${t('zone.backtrackHint')}</p>
      <div class="map-wrap" style="aspect-ratio:${width}/${height}">
        <svg class="map-svg" viewBox="0 0 ${width} ${height}" preserveAspectRatio="none" aria-hidden="true">${edgesSvg}</svg>
        ${nodesHtml}
      </div>
      ${gateBtn}
      <button class="btn btn-secondary" data-action="retreat">${t('zone.retreat')}</button>
    `;
  }

  renderTown() {
    const zoneIndex = this.place.zoneIndex;
    const zone = this.world.zones[zoneIndex];
    const npcs = npcsAt(zoneIndex);
    const discovery = this.firstTownDiscovery ? `<p class="reward-line">${t('town.discovered', { town: townName(zoneIndex) })}</p>` : '';
    this.firstTownDiscovery = false;
    const walkBackToCapital = this.zoneGatesToCapital(zoneIndex) || zone.outer;
    return `
      <h2>${townName(zoneIndex)}</h2>
      <p class="tagline">${zoneName(zoneIndex)}</p>
      ${discovery}
      <p class="legend-note">${t('town.rested')}</p>
      <div class="menu-actions">
        <button class="btn btn-primary" data-action="goto-shop">${t('town.shop')}</button>
        <button class="btn btn-danger" data-action="town-continue">${t('town.continue')}</button>
        <button class="btn btn-secondary" data-action="goto-travel">${t('town.travel')}</button>
        <button class="btn btn-secondary" data-action="goto-bag">${t('capital.bag')}</button>
        <button class="btn btn-secondary" data-action="town-to-capital">${walkBackToCapital ? t('town.toCapital') : t('town.toStart')}</button>
      </div>
      <div class="npc-row">
        ${npcs.map((n) => `<button class="npc-card" data-action="goto-npc" data-npc="${n.id}">
          <div class="npc-card-name">${npcName(n)}</div><div class="npc-card-title">${npcTitle(n)}</div>
        </button>`).join('')}
      </div>
    `;
  }

  /**
   * v8: single source of truth for an item's passive line (Bag/Compare,
   * Shop, Loot Gate). Dormant passives never reveal their name or effect —
   * only a rumor pointing at the Runesmith's town. No inline styles; the
   * .unlocked/.locked looks live in style.css.
   */
  renderItemPassiveHtml(item) {
    if (!item || !item.passive) return '';
    if (this.player && this.player.passivesUnlocked) {
      return `<div class="item-passive unlocked">✦ ${passiveName(item.passive)}: ${passiveDesc(item.passive)}</div>`;
    }
    return `<div class="item-passive locked">${t('passive.dormant', { town: townName(RUNESMITH_ZONE_INDEX) })}</div>`;
  }

  /**
   * v12: the ONE place special item statuses render. Passives and Curses get
   * their own visually distinct rows, cleanly fenced off from the base stat
   * mods — every chip (bag, doll, shop, smuggler, loot gate) calls this
   * instead of hand-rolling its own subset, so nothing pops in one screen
   * and silently vanishes in another.
   */
  renderItemStatusRows(item) {
    if (!item) return '';
    const rows = [];
    if (item.passive) rows.push(this.renderItemPassiveHtml(item));
    if (item.curse) rows.push(`<div class="item-curse">⚠ ${curseName(item.curse)}: ${curseDesc(item.curse)}</div>`);
    return rows.length ? `<div class="item-status">${rows.join('')}</div>` : '';
  }

  /** v8: the Hidden Runesmith awakening event (diverted-to from arriveTown). */
  renderAwakenEvent() {
    return `
      <div class="event-card npc-panel runesmith-card">
        <h2>${t('runesmith.title')}</h2>
        <p class="npc-lore">${t('runesmith.lore')}</p>
        <div class="menu-actions">
          <button class="btn btn-primary" data-action="unlock-passives">${t('runesmith.confirm')}</button>
        </div>
      </div>
    `;
  }

  renderShop() {
    const stock = this.shopStock || [];
    const bagFull = this.player.bag.length >= bagCapacity(this.player);
    const marketName = this.place.kind === 'hub' ? t('capital.name') : townName(this.place.zoneIndex); // v12
    return `
      <h2>${t('shop.title', { town: marketName })}</h2>
      <div class="loot-list">
        ${stock.length ? stock.map((e, i) => `
          <div class="item-chip" style="border-color:${e.item.rarity.color}">
            <div class="item-name" style="color:${e.item.rarity.color}">${e.item.name}</div>
            <div class="item-mods">${Object.entries(e.item.statMods).map(([k, v]) => `+${v} ${t(`stat.${k}`)}`).join(' · ')}</div>
            ${this.renderItemStatusRows(e.item)}
            <button class="btn btn-tiny btn-primary" data-action="buy" data-index="${i}" ${this.player.gold < e.price || bagFull ? 'disabled' : ''}>
              ${t('shop.buy', { n: e.price })}${bagFull ? ` — ${t('shop.bagFull')}` : this.player.gold < e.price ? ` — ${t('shop.noGold')}` : ''}
            </button>
          </div>`).join('') : `<p class="legend-note">${t('shop.stockEmpty')}</p>`}
      </div>
      <h3>${t('shop.yourBag')}</h3>
      <div class="loot-list">
        ${this.player.bag.map((item) => `
          <div class="item-chip ${item.curse ? 'cursed-item' : ''}" style="border-color:${item.rarity.color}">
            <div class="item-name" style="color:${item.rarity.color}">${item.name}</div>
            ${this.renderItemStatusRows(item)}
            <button class="btn btn-tiny btn-secondary" data-action="sell-bag-item" data-item="${item.id}">${t('shop.sell', { n: sellPrice(item, this.shopZoneRef()) })}</button>
          </div>`).join('')}
      </div>
      <button class="btn btn-secondary" data-action="goto-town-from-shop">${t('inv.back')}</button>
    `;
  }

  renderNpc() {
    const npc = NPCS[this.activeNpcId];
    if (!npc) return this.renderCapital();
    const p = this.player;
    let serviceHtml = '';

    if (npc.service === 'bag') {
      const check = canUpgradeBag(p);
      const label = check.reason === 'maxed' ? t('npc.maxed') : t('npc.vesper.cost', { n: bagUpgradeCost(p) });
      // v6: cursed items the player currently holds (equipped OR bagged) — Vesper can cleanse any of them.
      const cursedItems = [...Object.values(p.equipment), ...p.bag].filter((i) => i && i.curse);
      serviceHtml = `
        <p class="npc-svc-name">${t('npc.vesper.svc')} — ${t('bag.title', { used: p.bag.length, cap: bagCapacity(p) })}</p>
        <p class="legend-note">${label}</p>
        <button class="btn btn-primary" data-action="npc-upgrade-bag" ${check.ok ? '' : 'disabled'}>${t('npc.service')}</button>
        <hr class="npc-divider"/>
        <p class="npc-svc-name">${t('npc.vesper.matSvc')} — ${t('bag.matCap', { cap: materialCapacity(p) })}</p>
        <p class="legend-note">${canUpgradeMaterials(p).reason === 'maxed' ? t('npc.vesper.matFull') : t('npc.vesper.matCost', { n: matUpgradeCost(p) })}</p>
        <button class="btn btn-primary" data-action="npc-upgrade-mats" ${canUpgradeMaterials(p).ok ? '' : 'disabled'}>${t('npc.service')}</button>
        <hr class="npc-divider"/>
        <p class="npc-svc-name">${t('npc.vesper.cleanseSvc')}</p>
        <p class="legend-note">${t('npc.vesper.cleanseCost', { gold: cleanseCost(p).gold, mat: cleanseCost(p).materials })}</p>
        ${cursedItems.length ? `<div class="loot-list">${cursedItems.map((item) => {
          const c2 = canCleanseCurse(p, item);
          return `<div class="item-chip cursed-item" style="border-color:${item.rarity.color}">
            <div class="item-name" style="color:${item.rarity.color}">${item.name}</div>
            <div class="item-curse">⚠ ${curseName(item.curse)}: ${curseDesc(item.curse)}</div>
            <button class="btn btn-tiny btn-primary" data-action="npc-cleanse-curse" data-item="${item.id}" ${c2.ok ? '' : 'disabled'}>${t('npc.vesper.cleanseBtn')}</button>
          </div>`;
        }).join('')}</div>` : `<p class="legend-note">${t('npc.vesper.noCursed')}</p>`}
      `;
    } else if (npc.service === 'vision') {
      const check = canUpgradeVision(p);
      const label = check.reason === 'maxed' ? t('npc.maxed') : t('npc.isra.cost', { n: visionUpgradeCost(p) });
      serviceHtml = `
        <p class="npc-svc-name">${t('npc.isra.svc')} (${p.worldVisionRange || 1}/${VISION_MAX})</p>
        <p class="legend-note">${label}</p>
        <button class="btn btn-primary" data-action="npc-upgrade-vision" ${check.ok ? '' : 'disabled'}>${t('npc.service')}</button>`;
    } else if (npc.service === 'reforge') {
      const check = canReforge(p);
      const weapon = p.equipment.weapon;
      const costLabel = weapon
        ? t('npc.krom.cost', { gold: reforgeCost(weapon).gold, mat: reforgeCost(weapon).materials })
        : t('npc.krom.noWeapon');
      serviceHtml = `
        <p class="npc-svc-name">${t('npc.krom.svc')}${weapon ? ` — ${weapon.name}` : ''}</p>
        <p class="legend-note">${costLabel}</p>
        <button class="btn btn-primary" data-action="npc-reforge" ${check.ok ? '' : 'disabled'}>${t('npc.service')}</button>`;
    } else if (npc.service === 'peddler') {
      serviceHtml = `
        <p class="npc-svc-name">${t('npc.mara.svc')}</p>
        <button class="btn btn-primary" data-action="goto-shop">${t('town.shop')}</button>`;
    } else if (npc.service === 'pvpshop') {
      // v11: the Arena Warden — trades PvP Points for the Arena Honor set.
      serviceHtml = `
        <p class="npc-svc-name">${t('npc.warden.svc')}</p>
        <p class="legend-note">${t('pvpshop.balance', { n: p.pvpPoints || 0 })}</p>
        <button class="btn btn-primary" data-action="goto-pvpshop">${t('npc.warden.open')}</button>`;
    }

    const notice = this.npcNotice === 'ok' ? `<p class="reward-line">✓</p>` : this.npcNotice === 'fail' ? `<p class="heart-lost">${t('npc.notEnoughMat')}</p>` : '';

    return `
      <div class="event-card npc-panel">
        <h2>${npcName(npc)}</h2>
        <p class="npc-title">${npcTitle(npc)}</p>
        <p class="npc-lore">${npcLore(npc)}</p>
        ${npcLines(npc).map((l) => `<p class="npc-line">${l}</p>`).join('')}
        <hr class="npc-divider"/>
        ${serviceHtml}
        ${notice}
        <button class="btn btn-secondary" data-action="npc-back">${t('inv.back')}</button>
      </div>
    `;
  }

  // ---------------- v6: The Wandering Smuggler's black market ----------------

  renderSmuggler() {
    const npc = NPCS.smuggler;
    const stock = this.smugglerStock || [];
    const bagFull = this.player.bag.length >= bagCapacity(this.player);
    const heartCheck = canBuyHeartFromSmuggler(this.player);
    const notice = this.npcNotice === 'ok' ? `<p class="reward-line">✓</p>` : this.npcNotice === 'fail' ? `<p class="heart-lost">${t('npc.notEnoughMat')}</p>` : '';

    return `
      <div class="event-card npc-panel smuggler-panel">
        <h2>${npcName(npc)}</h2>
        <p class="npc-title">${npcTitle(npc)}</p>
        <p class="npc-lore">${npcLore(npc)}</p>
        ${npcLines(npc).map((l) => `<p class="npc-line">${l}</p>`).join('')}
        <hr class="npc-divider"/>
        <h3 class="npc-svc-name">${t('smuggler.stockTitle')}</h3>
        <div class="loot-list">
          ${stock.length ? stock.map((e, i) => `
            <div class="item-chip ${e.item.curse ? 'cursed-item' : ''}" style="border-color:${e.item.rarity.color}">
              <div class="item-name" style="color:${e.item.rarity.color}">${e.item.name}</div>
              <div class="item-mods">${Object.entries(e.item.statMods).map(([k, v]) => `+${v} ${t(`stat.${k}`)}`).join(' · ')}</div>
              ${this.renderItemStatusRows(e.item)}
              <button class="btn btn-tiny btn-primary" data-action="smuggler-buy" data-index="${i}" ${this.player.gold < e.price || bagFull ? 'disabled' : ''}>
                ${t('shop.buy', { n: e.price })}${bagFull ? ` — ${t('shop.bagFull')}` : this.player.gold < e.price ? ` — ${t('shop.noGold')}` : ''}
              </button>
            </div>`).join('') : `<p class="legend-note">${t('shop.stockEmpty')}</p>`}
        </div>
        <hr class="npc-divider"/>
        <h3 class="npc-svc-name">${t('smuggler.heartTitle')}</h3>
        <p class="legend-note">${t('smuggler.heartDesc', { n: SMUGGLER_HEART_COST })}</p>
        <button class="btn btn-danger" data-action="smuggler-buy-heart" ${heartCheck.ok ? '' : 'disabled'}>
          ${heartCheck.reason === 'maxHearts' ? t('smuggler.heartMaxed') : t('smuggler.heartBuy', { n: SMUGGLER_HEART_COST })}
        </button>
        ${notice}
        <button class="btn btn-secondary" data-action="smuggler-back">${t('inv.back')}</button>
      </div>
    `;
  }

  /** v12: one compact paper-doll slot chip for the doll grid. */
  renderDollSlot(slot, cap) {
    const p = this.player;
    const item = p.equipment[slot];
    return `<div class="doll-slot">
      <div class="doll-slot-label">${t(`slot.${slot}`)}</div>
      ${item ? `<div class="item-chip doll-chip ${item.curse ? 'cursed-item' : ''}" style="border-color:${item.rarity.color}">
        <div class="item-name" style="color:${item.rarity.color}">${item.name}</div>
        <div class="item-mods">${Object.entries(item.statMods).map(([k, v]) => `+${v} ${t(`stat.${k}`)}`).join(' · ')}</div>
        ${this.renderItemStatusRows(item)}
        <button class="btn btn-tiny btn-secondary" data-action="unequip" data-slot="${slot}" ${p.bag.length >= cap ? 'disabled' : ''}>${t('inv.unequip')}</button>
      </div>` : `<div class="item-chip doll-chip empty">${t('inv.empty')}</div>`}
    </div>`;
  }

  renderBag() {
    const p = this.player;
    const cap = bagCapacity(p);
    const inTown = this.place.kind === 'town'; // v6: selling is town-only now
    const slots = Object.values(EquipmentSlot); // v11: the full 8-slot paper-doll
    const matCap = materialCapacity(p); // v14
    const matChips = Object.entries(p.materials || {})
      .map(([key, count]) => `<span class="material-chip ${count >= matCap ? 'mat-full' : ''}">${materialName(Number(key.slice(1)))} ×${count}/${matCap}</span>`).join('') || `<span class="legend-note">—</span>`;

      // v6: Hidden Unique Skill status card (ซ่อน 100% จนกว่าจะปลดล็อก)
          const classDef = CLASS_DEFINITIONS[p.classId];
          const hiddenCard = classDef && classDef.hidden && p.hiddenAwakened
            ? `<div class="event-card hidden-skill-card awakened"><h3>✦ ${hiddenSkillName(classDef.hidden.id)}</h3><p>${hiddenSkillDesc(classDef.hidden.id)}</p></div>`
            : '';

    const selected = this.selectedBagItemId ? p.bag.find((i) => i.id === this.selectedBagItemId) : null;
    let compareHtml = '';
    if (selected) {
      const equipped = p.equipment[selected.slot];
      const rows = compareItems(selected, equipped);
      compareHtml = `
        <div class="compare-panel">
          <h3>${t('compare.title')} — ${t(`slot.${selected.slot}`)}</h3>
          <div class="compare-grid">
            <div class="compare-col">
              <div class="compare-head" style="color:${selected.rarity.color}">${t('compare.new')}: ${selected.name}</div>
              ${this.renderItemPassiveHtml(selected)}
              ${selected.curse ? `<div class="item-curse">⚠ ${curseName(selected.curse)}: ${curseDesc(selected.curse)}</div>` : ''}
            </div>
            <div class="compare-col">
              <div class="compare-head" style="color:${equipped ? equipped.rarity.color : 'var(--parchment-dim)'}">${t('compare.current')}: ${equipped ? equipped.name : t('compare.none')}</div>
              ${equipped ? this.renderItemPassiveHtml(equipped) : ''}
              ${equipped && equipped.curse ? `<div class="item-curse">⚠ ${curseName(equipped.curse)}: ${curseDesc(equipped.curse)}</div>` : ''}
            </div>
          </div>
          <table class="compare-table">
            ${rows.map((r) => `
              <tr>
                <td>${t(`stat.${r.stat}`)}</td>
                <td>${r.newVal}</td>
                <td>${r.oldVal}</td>
                <td class="${r.delta > 0 ? 'delta-up' : r.delta < 0 ? 'delta-down' : ''}">${r.delta > 0 ? '+' : ''}${r.delta}</td>
              </tr>`).join('')}
          </table>
          <div class="menu-actions">
            <button class="btn btn-primary" data-action="bag-equip" data-item="${selected.id}">${t('bag.equip')}</button>
            <button class="btn btn-secondary" data-action="bag-sell" data-item="${selected.id}" ${inTown ? '' : 'disabled'}>${inTown ? t('bag.sellItem', { n: sellPrice(selected, this.place.zoneIndex) }) : t('bag.sellLocked')}</button>
            <button class="btn btn-secondary" data-action="bag-close-compare">${t('bag.close')}</button>
          </div>
        </div>`;
    }

    return `
      <h2>${t('bag.title', { used: p.bag.length, cap })}</h2>
      ${hiddenCard}
      <!-- v12 PAPER-DOLL GRID: armor pieces frame the portrait's left flank
           top-to-bottom (head→chest→legs→boots), weapon + jewelry take the
           right. On phones the portrait rises to the top and the two columns
           sit side-by-side beneath it (see .doll-grid media query). -->
      <div class="doll-grid">
        <div class="doll-col doll-col-left">
          ${['head', 'armor', 'legs', 'boots'].map((slot) => this.renderDollSlot(slot, cap)).join('')}
        </div>
        <div class="doll-center">
          <div class="portrait-large">${this.renderPortrait(p.portrait, p.equipment, 120)}</div>
        </div>
        <div class="doll-col doll-col-right">
          ${['weapon', 'ring', 'necklace', 'bracelet'].map((slot) => this.renderDollSlot(slot, cap)).join('')}
        </div>
      </div>
      <h3>${t('bag.materials')} <span class="legend-note">${t('bag.matCap', { cap: materialCapacity(p) })}</span></h3>
      <div class="material-row">${matChips}</div>
      ${compareHtml}
      <div class="loot-list">
        ${p.bag.length ? p.bag.map((item) => `
          <div class="item-chip bag-item ${this.selectedBagItemId === item.id ? 'selected' : ''} ${item.curse ? 'cursed-item' : ''}" style="border-color:${item.rarity.color}">
            <div class="item-name" style="color:${item.rarity.color}">${item.name} <span class="legend-note">(${t(`slot.${item.slot}`)})</span></div>
            <div class="item-mods">${Object.entries(item.statMods).map(([k, v]) => `+${v} ${t(`stat.${k}`)}`).join(' · ')}</div>
            ${this.renderItemStatusRows(item)}
            <button class="btn btn-tiny btn-primary" data-action="bag-select" data-item="${item.id}">${t('bag.compare')}</button>
          </div>`).join('') : `<p class="legend-note">${t('bag.empty')}</p>`}
      </div>
      ${!inTown ? `<p class="legend-note">${t('bag.sellLocked')}</p>` : ''}
      <button class="btn btn-secondary" data-action="bag-back">${t('inv.back')}</button>
    `;
  }

    renderTravel() {
        // แก้ไข: แยกแยะระหว่าง Start Village กับ Capital ให้ชัดเจน
        let from;
        if (this.place.kind === 'hub') {
          from = this.place.hubId === 'start' ? 'start' : 'capital';
        } else {
          from = { zoneIndex: this.place.zoneIndex };
        }
        
        const dests = travelDestinations(this.world, from);
        return `
          <div class="event-card">
            <h2>${t('travel.title')}</h2>
            <p class="legend-note">${t('travel.desc')}</p>
            <div class="menu-actions travel-list">
              ${dests.length ? dests.map((d) => {
                const isCap = d.kind === 'capital';
                const cost = travelCost(isCap ? 'capital' : { zoneIndex: d.zoneIndex });
                const label = isCap ? t('travel.capital') : `${townName(d.zoneIndex)} (${zoneName(d.zoneIndex)})`;
                return `<button class="btn btn-secondary" data-action="travel-to" data-dest="${isCap ? 'capital' : d.zoneIndex}" ${this.player.gold < cost ? 'disabled' : ''}>
                  ${t('travel.cost', { place: label, n: cost })}
                </button>`;
              }).join('') : `<p class="legend-note">${t('travel.none')}</p>`}
            </div>
            <button class="btn btn-secondary" data-action="travel-back">${t('inv.back')}</button>
          </div>
        `;
      }

  renderAllocate() {
    const p = this.player;
    const s = p.getStats();
    return `
      <div class="event-card">
        <h2>${t('allocate.title', { n: p.statPoints })}</h2>
        <p class="legend-note">${t('allocate.note')}</p>
        <div class="allocate-grid">
          ${ALL_STATS.map((key) => `
            <div class="allocate-row">
              <span>${t(`stat.${key}`)}</span><span class="allocate-val">${s[key]}</span>
              <button class="btn btn-tiny btn-primary" data-action="allocate-stat" data-stat="${key}" ${p.statPoints > 0 ? '' : 'disabled'}>+1</button>
            </div>`).join('')}
        </div>
        <button class="btn btn-primary" data-action="allocate-done">${t('allocate.done')}</button>
      </div>
    `;
  }

  /** v7: the skill bar's HTML, shared by the one-time renderBattle() and every per-turn patchBattleHud(). */
  battleSkillBarHtml() {
    const bs = this.battleState;
    const p = this.player;
    const skillButtons = [SkillType.HEAVY_ATTACK, SkillType.QUICK_STRIKE, SkillType.BLOCK, SkillType.PARRY].map((tp) => `
      <button class="btn skill-btn" data-action="skill" data-skill="${tp}" title="${skillDesc(tp)}">
        <span class="skill-icon">${SKILL_LIBRARY[tp].icon}</span><span>${skillName(tp)}</span>
      </button>`).join('');
    const sigReady = bs.playerSigGauge >= SIG_GAUGE_MAX;
    const sigLabel = sigReady ? signatureName(p.signature.id) : t('skill.signature.charging', { n: Math.round((bs.playerSigGauge / SIG_GAUGE_MAX) * 100) });
    const sigBtn = `<button class="btn skill-btn signature-btn ${sigReady ? 'ready' : ''}" data-action="skill" data-skill="${SkillType.SIGNATURE}" title="${signatureDesc(p.signature.id)}" ${sigReady ? '' : 'disabled'}>
      <span class="skill-icon">✦</span><span>${sigLabel}</span>
      <span class="sig-gauge"><span class="sig-gauge-fill" style="width:${Math.min(100, (bs.playerSigGauge / SIG_GAUGE_MAX) * 100)}%"></span></span>
    </button>`;
    return `${skillButtons}${sigBtn}`;
  }

  /** v7: a combatant's name row (SPD chip + burn badge), shared by renderBattle() and patchBattleHud(). */
  battleNameHtml(side) {
    const bs = this.battleState;
    const stats = getEffectiveStats(bs, side);
    const name = side === 'player' ? this.player.name : bs.enemy.name;
    const dotBadge = bs.dots[side] ? `<span class="dot-badge">🔥${bs.dots[side].ticks}</span>` : '';
    return `${name} <span class="stat-chip">SPD ${Math.round(stats.speed)}</span>${dotBadge}`;
  }

  renderBattle() {
    const bs = this.battleState;
    const p = this.player;
    const pStats = getEffectiveStats(bs, 'player');
    const eStats = getEffectiveStats(bs, 'enemy');
    const logHtml = bs.log.slice(0, 6).map((l) => `<li class="log-${l.outcome}">${l.text}</li>`).join('');
    // v7: .battle-stage is the stable mount's root — position:relative so the
    // absolutely-positioned .battle-fx-layer (floating numbers, signature
    // banners) overlays exactly this screen and nothing else. Tapping
    // anywhere on the stage fast-forwards a running replay.
    return `
      <div class="battle-stage">
        ${this.pvpMode ? `<p class="pvp-banner">${t('pvp.banner')}</p>` : ''}
        ${this.ambushNode ? `<p class="ambush-banner">${t('ambush.banner')}</p>` : ''}
        ${bs.hazard ? `<p class="hazard-banner">${hazardIcon(bs.hazard)} ${hazardName(bs.hazard)} — ${hazardDesc(bs.hazard)}</p>` : ''}
        <div class="battle-arena">
          <div class="combatant player">
            <div class="combatant-name">${this.battleNameHtml('player')}</div>
            <div class="hp-bar"><div class="hp-fill" style="width:${Math.max(0, (p.hp / pStats.maxHp) * 100)}%"></div></div>
            <div class="hp-text">${p.hp} / ${pStats.maxHp}</div>
          </div>
          <div class="vs">VS</div>
          <div class="combatant enemy">
            <div class="combatant-name">${this.battleNameHtml('enemy')}</div>
            <div class="hp-bar"><div class="hp-fill enemy-fill" style="width:${Math.max(0, (bs.enemy.hp / eStats.maxHp) * 100)}%"></div></div>
            <div class="hp-text">${bs.enemy.hp} / ${eStats.maxHp}</div>
          </div>
        </div>
        <div class="skill-bar">${this.battleSkillBarHtml()}</div>
        <ul class="battle-log">${logHtml || `<li class="log-hint">${t('log.hint')}</li>`}</ul>
        <p class="battle-skip-hint">${t('battle.skipHint')}</p>
        <div class="battle-fx-layer"></div>
      </div>
    `;
  }

  renderNodeResult() {
    const r = this.lastResult;
    if (r.kind === 'defeat_return' || (r.kind === 'battle' && !r.won)) {
      const dr = this.lastResult;
      const placeName = dr.placeName || (dr.toTown ? townName(dr.zoneIndex) : t('capital.name'));
      return `
        <h2>${t('result.lose')}</h2>
        <p>${t('result.lose.body', { name: r.opponentName || '' })}</p>
        <p class="reward-line">${t('result.goldReward', { xp: r.xp || 0, gold: r.gold || 0 })}</p>
        <p class="heart-lost">${t('defeat.returned', { place: placeName })}</p>
        <button class="btn btn-primary" data-action="continue-node">${t('result.continue')}</button>
      `;
    }
    // Decisions already made this battle (equip/take/discard outcomes).
    const decidedHtml = (r.lootMsgs || []).map(({ text, color }) => `
      <div class="item-chip" style="border-color:${color}">
        <div class="item-mods">${text}</div>
      </div>`).join('');

    // Loot gate: the next undecided item, with a stat comparison vs what's equipped.
    const pending = this.pendingLoot || [];
    let lootGate = '';
    if (pending.length) {
      const item = pending[0];
      const equipped = this.player.equipment[item.slot];
      const rows = compareItems(item, equipped);
      const bagFull = this.player.bag.length >= bagCapacity(this.player);
      lootGate = `
        <div class="compare-panel loot-gate">
          <h3>${t('lootgate.title')} — ${t('lootgate.remaining', { n: pending.length })}</h3>
          <div class="item-chip ${item.curse ? 'cursed-item' : ''}" style="border-color:${item.rarity.color}">
            <div class="item-name" style="color:${item.rarity.color}">${item.name} <span class="legend-note">(${t(`slot.${item.slot}`)})</span></div>
            <div class="item-mods">${Object.entries(item.statMods).map(([k, v]) => `+${v} ${t(`stat.${k}`)}`).join(' · ')}</div>
            ${this.renderItemStatusRows(item)}
          </div>
          <table class="compare-table">
            <tr><td></td><td>${t('compare.new')}</td><td>${t('compare.current')}${equipped ? '' : ` (${t('compare.none')})`}</td><td></td></tr>
            ${rows.map((row) => `
              <tr>
                <td>${t(`stat.${row.stat}`)}</td>
                <td>${row.newVal}</td>
                <td>${row.oldVal}</td>
                <td class="${row.delta > 0 ? 'delta-up' : row.delta < 0 ? 'delta-down' : ''}">${row.delta > 0 ? '+' : ''}${row.delta}</td>
              </tr>`).join('')}
          </table>
          <div class="menu-actions">
            <button class="btn btn-primary" data-action="loot-equip">${t('lootgate.equip')}</button>
            <button class="btn btn-secondary" data-action="loot-take" ${bagFull ? 'disabled' : ''}>${t('lootgate.take')}${bagFull ? ` — ${t('lootgate.bagFull')}` : ''}</button>
            <button class="btn btn-danger" data-action="loot-discard">${t('lootgate.discard')}</button>
          </div>
        </div>`;
    }

    // v9.2 POST-BOSS GATE. No auto-warp: after a Lord falls the player chooses.
    // The roads now come from the MACRO LAYER (openRoadsFromHere), not from
    // this one Lord's `macroTarget` — so a legacy save whose Lord carries a
    // null target still gets a working Continue button, and a region with two
    // slain Lords offers both roads. Shown once the loot gate is empty.
    let bossGate = '';
    if (r.lordSlain && !pending.length) {
      const roads = (r.openRoads && r.openRoads.length) ? r.openRoads : this.openRoadsFromHere();
      const roadBtns = roads.map((id) =>
        `<button class="btn btn-primary" data-action="advance-next" data-macro="${id}">${t('lord.advance', { place: this.macroNodeLabel(id) })}</button>`).join('');
      const headline = roads.length
        ? t('lord.roadOpen', { place: roads.map((id) => this.macroNodeLabel(id)).join(' / ') })
        : t('lord.deadEnd'); // a dead-end region's Lord guards treasure, not a road
      bossGate = `
        <div class="boss-gate">
          <p class="reward-line">${headline}</p>
          <div class="menu-actions">
            ${roadBtns}
            <button class="btn btn-secondary" data-action="continue-node">${t('lord.stay')}</button>
          </div>
        </div>`;
    }

    return `
      <h2>${t('result.win')}</h2>
      <p>${t('result.win.body', { name: r.opponentName })}</p>
      ${r.ambush ? `<p class="reward-line">${t('ambush.survived')}</p>` : ''}
      ${r.prowler ? `<p class="reward-line">${t('prowler.encounter')}</p>` : ''}
      <p class="reward-line">${t('result.goldReward', { xp: r.xp, gold: r.gold })}${r.leveledUp ? t('result.levelup') : ''}</p>
      ${r.trivial ? `<p class="legend-note">${t('result.trivial')}</p>` : ''}
      ${r.mats > 0 ? `<p class="altar-note">${t('mat.drop', { n: r.mats, mat: materialName(r.zoneIndex) })}</p>` : ''}
      ${r.lordSlain ? `<p class="reward-line">${t('lord.slain', { zone: zoneName(r.zoneIndex) })}</p>` : ''}
      ${lootGate}
      <div class="loot-list">${decidedHtml}</div>
      ${bossGate}
      ${pending.length || r.lordSlain ? '' : `<button class="btn btn-primary" data-action="continue-node">${t('result.continue')}</button>`}
    `;
  }

  /**
   * v9.2: every macro road currently open FROM the region the player stands
   * in. This is the true answer to "where can I go now?" — it reads the same
   * `defeatedLords` / legacy gating the World Map uses, so the Continue button
   * can never disagree with the map.
   */
  openRoadsFromHere() {
    const here = this.currentMacroId();
    if (!here) return [];
    const open = getAvailableMacroNodeIds(this.world.macro, this.world, here);
    return [...open];
  }

  /** v9: human-readable name of a macro node id (region, Capital, or Start Village). */
  macroNodeLabel(macroId) {
    if (!macroId) return t('world.unknownRoad');
    if (macroId === 'capital') return t('capital.name');
    if (macroId === this.world.macro.startId) return t('world.hub.start.name');
    const node = findMacroNode(this.world.macro, macroId);
    if (!node || node.zoneIndex === undefined) return t('world.unknownRoad');
    const zone = this.world.zones[node.zoneIndex];
    // Fog of war is sacred: an undiscovered land is never named on the button.
    return (zone && zone.townDiscovered) ? zoneName(node.zoneIndex) : t('zone.unknown');
  }

  /**
   * v9: the player CHOOSES to walk the road their kill opened. This is the
   * only place a boss victory leads anywhere new — nothing auto-warps.
   */
  advanceToMacroNode(macroId) {
    const available = getAvailableMacroNodeIds(this.world.macro, this.world, this.currentMacroId());
    if (!available.has(macroId)) { this.goTo('zone'); return; } // stale button — fail closed
    const node = findMacroNode(this.world.macro, macroId);
    if (!node) { this.goTo('zone'); return; }
    this.pendingLoot = null;
    if (node.kind === MacroKind.HUB) { this.arriveHub(node.id, true); return; }
    this.enterZone(node.zoneIndex); // checkpoint stays at the last town — die here and you wake there
  }

  renderEventResult() {
    const r = this.lastResult;
    if (r.kind === 'altar') {
      // v6: the boon is now a list of +25% boosts across every base stat.
      const boonHtml = r.boon
        ? `<p class="altar-note">${t('altar.boonAll', { hearts: r.boon.heartsRemaining })}</p>
           <div class="loot-list">${r.boon.boosts.map((b) => `<div class="item-chip"><div class="item-mods">+${b.boost} ${t(`stat.${b.stat}`)} (${b.before} → ${b.after})</div></div>`).join('')}</div>`
        : `<p>${t('altar.walkaway')}</p>`;
      return `
        <h2>${r.boon ? t('altar.accepted') : t('altar.declined')}</h2>
        ${boonHtml}
        <button class="btn btn-primary" data-action="continue-node">${t('result.continue')}</button>`;
    }
    if (r.kind === 'campfire') {
      return `
        <h2>${t('node.campfire')}</h2>
        <p>${t('campfire.rest')}</p>
        <p class="reward-line">${t('campfire.healed', { n: r.heal })}</p>
        <button class="btn btn-primary" data-action="continue-node">${t('result.continue')}</button>`;
    }
    
    // 👇 จัดการ Event แจกวัตถุดิบ ตรงนี้!
    if (r.kind === 'event_mat') {
      return `
        <h2>${t('event.title')}</h2>
        <p class="reward-line">${t('mat.drop', { n: r.mats, mat: materialName(r.zoneIndex) })}</p>
        ${r.matOverflow ? `<p class="legend-note">${t('event.matFull', { n: r.matOverflow })}</p>` : ''}
        <button class="btn btn-primary" data-action="continue-node">${t('result.continue')}</button>
      `;
    }
    
    return `
      <h2>${t('event.title')}</h2>
      <button class="btn btn-primary" data-action="continue-node">${t('result.continue')}</button>
    `;
  }

  renderAltarScreen() {
    return `
      <div class="event-card altar-card">
        <h2>${t('altar.title')}</h2>
        <p>${t('altar.body')}</p>
        <p class="altar-warning">${t('altar.warning', { n: this.player.hearts })}</p>
        <div class="menu-actions">
          <button class="btn btn-danger" data-action="altar-yes">${t('altar.accept')}</button>
          <button class="btn btn-secondary" data-action="altar-no">${t('altar.decline')}</button>
        </div>
      </div>
    `;
  }

  renderSearching() {
    return `
      <h2>${t('pvp.searching')}</h2>
      <p>${t('pvp.searchingBody', { cp: this.player.combatPower })}</p>
      <div class="spinner"></div>
      <p class="legend-note">${t('pvp.botNote')}</p>
    `;
  }

  renderPvpResult() {
    const r = this.lastResult;
    return `
      <h2>${r.won ? t('result.win') : t('result.lose')}</h2>
      <p>${t('pvp.opponent', { name: r.opponent.name, type: r.matchType === 'bot' ? t('pvp.bot') : t('pvp.human'), cp: r.opponent.combatPower })}</p>
      ${r.won ? `<p class="reward-line">${t('pvp.winBody')}</p>` : `<p class="heart-lost">${t('pvp.heartLost', { n: r.heartsLeft })}</p>`}
      <p class="reward-line">${t('pvp.ptsEarned', { n: r.ptsEarned || 0, total: this.player.pvpPoints || 0 })}</p>
      ${this.player.sanityCursed ? `<p class="legend-note">${t('sanity.fed')}</p>` : ''}
      <button class="btn btn-primary" data-action="capital">${t('result.continue')}</button>
    `;
  }

  /** v11: the Arena Warden's shop — the Arena Honor set, priced in PvP Points. */
  renderPvpShop() {
    const p = this.player;
    const notice = this.pvpShopNotice === 'ok' ? `<p class="reward-line">✓ ${t('pvpshop.bought')}</p>`
      : this.pvpShopNotice === 'noPoints' ? `<p class="heart-lost">${t('pvpshop.noPoints')}</p>`
      : this.pvpShopNotice === 'bagFull' ? `<p class="heart-lost">${t('pvpshop.bagFull')}</p>` : '';
    return `
      <h2>${t('pvpshop.title')}</h2>
      <p class="tagline">${t('pvpshop.tagline')}</p>
      <p class="legend-note">${t('pvpshop.balance', { n: p.pvpPoints || 0 })} · ${t('pvpshop.note')}</p>
      <div class="loot-list">
        ${PVP_SET.map((e) => {
          const affordable = (p.pvpPoints || 0) >= e.cost;
          return `<div class="item-chip" style="border-color:${Rarity.PVP.color}">
            <div class="item-name" style="color:${Rarity.PVP.color}">${t(e.baseNameKey)}${t('rarity.pvp')}</div>
            <div class="legend-note">${t(`slot.${e.slot}`)} · ${t('pvpshop.cost', { n: e.cost })}</div>
            <button class="btn btn-tiny btn-primary" data-action="pvpshop-buy" data-entry="${e.id}" ${affordable ? '' : 'disabled'}>${t('pvpshop.buy')}</button>
          </div>`;
        }).join('')}
      </div>
      ${notice}
      <button class="btn btn-secondary" data-action="npc-back">${t('inv.back')}</button>
    `;
  }

  renderPermadeath() {
    const stone = this.legacyManager.latestTombstone();
    return `
      <div class="event-card tombstone-card">
        <h2>${t('death.title', { name: stone.characterName })}</h2>
        <p>${t('death.body', { cp: stone.finalCP, level: stone.level, cls: className(stone.classId) })}</p>
        <p>${t('death.legacy')}</p>
        <button class="btn btn-primary" data-action="revive">${t('death.revive')}</button>
      </div>
    `;
  }

  renderLeaderboard() {
    const entries = this.lbEntries;
    const sortBtn = (by, label) => `<button class="btn btn-tiny ${this.lbSortBy === by ? 'btn-primary' : 'btn-secondary'}" data-action="lb-sort" data-by="${by}">${label}</button>`;
    let body;
    if (entries === null) body = `<div class="spinner"></div>`;
    else if (!entries.length) body = `<p class="legend-note">${t('lb.empty')}</p>`;
    else body = `
      <table class="lb-table">
        <thead><tr><th>${t('lb.rank')}</th><th>${t('lb.name')}</th><th>${t('lb.class')}</th><th>${t('lb.maxCP')}</th><th>${t('lb.maxZone')}</th></tr></thead>
        <tbody>
          ${entries.map((e, i) => `
            <tr class="${e.userId === this.user.id ? 'lb-me' : ''}">
              <td>${i + 1}</td>
              <td>${e.name}${e.userId === this.user.id ? ` <span class="lb-you">${t('lb.you')}</span>` : ''}</td>
              <td>${e.classId ? className(e.classId) : '—'}</td>
              <td>${e.maxCP || 0}</td><td>${e.maxZone || 0}</td>
            </tr>`).join('')}
        </tbody>
      </table>`;
    const seasonName = t(`season.name.${SEASON.id}`);
    const seasonWhen = SEASON.endsAt
      ? t('season.endsAt', { date: new Date(SEASON.endsAt).toLocaleDateString() })
      : t('season.noEnd');
    return `
      <h2>${t('lb.title')}</h2>
      <p class="legend-note">${t('lb.season', { name: seasonName })} · ${seasonWhen}</p>
      <div class="menu-actions">${sortBtn('maxCP', t('lb.byCP'))}${sortBtn('maxZone', t('lb.byZone'))}</div>
      ${body}
      <button class="btn btn-secondary" data-action="lb-back">${t('lb.back')}</button>
    `;
  }
}
