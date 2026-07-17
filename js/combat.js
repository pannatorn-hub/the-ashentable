// combat.js
// ---------------------------------------------------------------------------
// The combat engine, expanded:
//  - ATB gauge: Speed controls turn order AND action frequency.
//  - Accuracy vs Dodge: missChance = dodge + speedEdge - accuracy (a real
//    evasion roll — a miss deals nothing).
//  - Crit: critRate% chance for x(1.5 + critDamage/100) damage.
//  - DoT (burn): ticks at the start of the burned side's actions; scales
//    with the applier's dotPower.
//  - Lifesteal: heals a % of damage dealt by direct attacks.
//  - Signature gauge: charges every player action at (25 + spellSpeed);
//    a full 100 unleashes the class Signature — spellSpeed = more casts.
//  - Stances (Block/Parry) unchanged: set on your turn, punish a matching
//    incoming attack for 1.75x. Still the "outplay raw stats" layer.
// Signatures are generic effect descriptors from player.js — no per-class
// branches here. Zero DOM dependencies; logs are pre-translated via i18n.
//
// v7 — STRUCTURED EVENT STREAM (no gameplay changes):
//   Every log entry is now also an *event* the animation layer can replay:
//     { side, text, outcome, ...payload, playerHp, enemyHp }
//   - `playerHp` / `enemyHp` are stamped automatically at log time (all HP
//     mutations happen BEFORE their log call — verified per call site), so
//     the animator can tween HP bars to the exact truth per step and a
//     fast-forward can jump straight to the last snapshot.
//   - Damage/heal payloads ({ dmg }, { heal }, { skill }, { targetSide },
//     { stance }, { koSide }) ride along where meaningful; the animator
//     keys its cues off `outcome` and reads payload for float numbers.
//   - checkBattleEnd() now fires exactly one 'ko' event on the first
//     transition to finished (guarded — it used to be re-enterable).
//   Combat remains instant, synchronous, and DOM-free: it emits a script;
//   animationManager.js replays it. A future server-authoritative combat
//   returns the same event stream and the animator won't know the difference.
// ---------------------------------------------------------------------------

import { t } from './i18n.js';
import { signatureName } from './player.js';

export const SkillType = Object.freeze({
  HEAVY_ATTACK: 'heavy_attack',
  QUICK_STRIKE: 'quick_strike',
  BLOCK: 'block',
  PARRY: 'parry',
  SIGNATURE: 'signature',
});

export const BASE_SKILLS = [SkillType.HEAVY_ATTACK, SkillType.QUICK_STRIKE, SkillType.BLOCK, SkillType.PARRY];

export const SKILL_LIBRARY = Object.freeze({
  [SkillType.HEAVY_ATTACK]: { icon: '⚔', power: 1.5 },
  [SkillType.QUICK_STRIKE]: { icon: '🗡', power: 0.95 },
  [SkillType.BLOCK]: { icon: '🛡', power: 0.25 },
  [SkillType.PARRY]: { icon: '✋', power: 0.55 },
});

export function skillName(type) { return t(`skill.${type}`); }
export function skillDesc(type) { return t(`skill.${type}.desc`); }

const STANCE_COUNTERS = Object.freeze({
  [SkillType.PARRY]: SkillType.HEAVY_ATTACK,
  [SkillType.BLOCK]: SkillType.QUICK_STRIKE,
});

const COUNTER_MULTIPLIER = 1.75;
const DEF_CONSTANT = 45;
const ACTION_THRESHOLD = 100;
const SAFETY_TICKS = 500;
export const SIG_GAUGE_MAX = 100;
const SIG_GAUGE_BASE_GAIN = 25;

// ---------------- Stat helpers ----------------

function baseStatsOf(entity) { return entity.getStats ? entity.getStats() : entity.stats; }

function effectiveStats(bs, side) {
  const base = baseStatsOf(bs[side]);
  const s = { ...base };
  for (const k of ['accuracy', 'critRate', 'critDamage', 'spellSpeed', 'dotPower', 'lifesteal']) s[k] = s[k] || 0;
  for (const buff of bs[`${side}Buffs`]) s[buff.stat] = (s[buff.stat] || 0) + buff.amount;
  s.dodge = Math.min(60, Math.max(0, s.dodge));
  s.def = Math.max(0, s.def);
  s.speed = Math.max(1, s.speed);
  return s;
}

function rollMiss(attackerStats, defenderStats) {
  const speedEdge = Math.max(0, defenderStats.speed - attackerStats.speed) * 0.15;
  const missChance = Math.min(60, Math.max(0, defenderStats.dodge + speedEdge - attackerStats.accuracy));
  return Math.random() * 100 < missChance;
}

function computeDamage(attackerStats, skillType, defenderStats, { isCounter = false, forceCrit = false } = {}) {
  const skill = SKILL_LIBRARY[skillType];
  const variance = 0.9 + Math.random() * 0.2;
  const raw = attackerStats.atk * skill.power * variance;
  const mitigation = defenderStats.def / (defenderStats.def + DEF_CONSTANT);
  let dmg = raw * (1 - mitigation);
  if (isCounter) dmg *= COUNTER_MULTIPLIER;
  let crit = false;
  if (!isCounter && (forceCrit || Math.random() * 100 < attackerStats.critRate)) {
    crit = true;
    dmg *= 1.5 + attackerStats.critDamage / 100;
  }
  return { dmg: Math.max(1, Math.round(dmg)), crit };
}

function other(side) { return side === 'player' ? 'enemy' : 'player'; }

/**
 * v7: every log entry doubles as a structured animation event. All HP
 * mutations happen before their log call, so stamping the snapshot here
 * is always post-effect truth for this step of the replay.
 */
function log(bs, side, text, outcome, payload = {}) {
  bs.log.unshift({ side, text, outcome, ...payload, playerHp: bs.player.hp, enemyHp: bs.enemy.hp });
}

// ---------------- Passives (equipment only) ----------------

function passivesOf(bs, side) {
  const entity = bs[side];
  if (!entity.equipment) return [];
  // v8: equipment passives are DORMANT until the Hidden Runesmith awakens
  // them. Gate strictly on `=== false` so only entities that carry the flag
  // (Players) are affected — Combatants (monsters/PvP bots) have no flag
  // (undefined) and keep behaving as before, and a human PvP opponent is
  // gated by their OWN flag, not the local player's.
  if (entity.passivesUnlocked === false) return [];
  return Object.values(entity.equipment).filter(Boolean).map((i) => i.passive).filter(Boolean);
}
function hasPassive(bs, side, id) { return passivesOf(bs, side).some((p) => p.id === id); }

function onDodge(bs, side) {
  const flag = `${side}FleetfootUsed`;
  if (hasPassive(bs, side, 'fleetfoot') && !bs[flag]) {
    bs[flag] = true;
    bs[`${side}Buffs`].push({ stat: 'speed', amount: 12, turns: 999 });
    log(bs, side, t('log.passive.fleetfoot', { name: bs[side].name }), 'passive');
  }
}

function onCounter(bs, side, dmgDealt) {
  if (hasPassive(bs, side, 'vampiric')) {
    const heal = Math.max(1, Math.round(dmgDealt * 0.08));
    healEntity(bs, side, heal);
    log(bs, side, t('log.passive.vampiric', { name: bs[side].name, heal }), 'passive', { heal });
  }
}

function onHitTaken(bs, side, dmgTaken, attackerSide) {
  if (hasPassive(bs, side, 'thorns')) {
    const reflect = Math.max(1, Math.round(dmgTaken * 0.15));
    bs[attackerSide].hp = Math.max(0, bs[attackerSide].hp - reflect);
    log(bs, side, t('log.passive.thorns', { name: bs[side].name, dmg: reflect }), 'passive', { dmg: reflect, targetSide: attackerSide });
  }
}

function healEntity(bs, side, amount) {
  const maxHp = effectiveStats(bs, side).maxHp;
  bs[side].hp = Math.min(maxHp, bs[side].hp + amount);
}

function applyLifesteal(bs, side, dmgDealt) {
  const ls = effectiveStats(bs, side).lifesteal;
  if (ls <= 0) return;
  const heal = Math.round(dmgDealt * (ls / 100));
  if (heal >= 1) {
    healEntity(bs, side, heal);
    log(bs, side, t('log.lifesteal', { name: bs[side].name, heal }), 'passive', { heal });
  }
}

// ---------------- DoT ----------------

function applyDot(bs, targetSide, dmg, ticks) {
  bs.dots[targetSide] = { dmg: Math.max(1, Math.round(dmg)), ticks };
  log(bs, other(targetSide), t('log.dot.apply', { target: bs[targetSide].name, dmg: bs.dots[targetSide].dmg, ticks }), 'dot');
}

/** Ticks the acting side's burn at the start of its action. Returns true if it died. */
function tickDot(bs, side) {
  const dot = bs.dots[side];
  if (!dot) return false;
  bs[side].hp = Math.max(0, bs[side].hp - dot.dmg);
  dot.ticks -= 1;
  if (dot.ticks <= 0) bs.dots[side] = null;
  log(bs, side, t('log.dot.tick', { name: bs[side].name, dmg: dot.dmg }), 'dot', { dmg: dot.dmg, targetSide: side });
  checkBattleEnd(bs);
  return bs.finished;
}

// ---------------- Signatures (generic executor) ----------------

function applySignature(bs) {
  const player = bs.player;
  const sig = player.signature;
  const sigName = signatureName(sig.id);
  const stats = effectiveStats(bs, 'player');

  for (const fx of sig.effects) {
    switch (fx.type) {
      case 'heal': {
        const heal = Math.round(stats.maxHp * fx.pct);
        healEntity(bs, 'player', heal);
        log(bs, 'player', t('log.sig.heal', { name: player.name, sig: sigName, heal }), 'signature', { heal });
        break;
      }
      case 'buff': {
        const amount = Math.max(1, Math.round((baseStatsOf(player)[fx.stat] || 0) * fx.pct));
        bs.playerBuffs.push({ stat: fx.stat, amount, turns: fx.turns });
        log(bs, 'player', t('log.sig.buff', { name: player.name, sig: sigName, stat: t(`stat.${fx.stat}`), n: fx.turns }), 'signature');
        break;
      }
      case 'multibuff': {
        for (const stat of ['atk', 'def', 'speed']) {
          const amount = Math.max(1, Math.round((baseStatsOf(player)[stat] || 0) * fx.pct));
          bs.playerBuffs.push({ stat, amount, turns: fx.turns });
        }
        log(bs, 'player', t('log.sig.multibuff', { name: player.name, sig: sigName, n: fx.turns }), 'signature');
        break;
      }
      case 'vanish':
        bs.playerVanish = true;
        log(bs, 'player', t('log.sig.vanish', { name: player.name, sig: sigName }), 'signature');
        break;
      case 'overcharge':
        bs.playerOvercharge = true;
        log(bs, 'player', t('log.sig.overcharge', { name: player.name, sig: sigName }), 'signature');
        break;
      case 'dot': {
        const dmg = stats.atk * 0.4 + stats.dotPower * fx.mult;
        applyDot(bs, 'enemy', dmg, fx.ticks);
        log(bs, 'player', t('log.sig.dot', { name: player.name, sig: sigName }), 'signature');
        break;
      }
      case 'surecrit':
        bs.playerSureCrit = true;
        log(bs, 'player', t('log.sig.sureCrit', { name: player.name, sig: sigName }), 'signature');
        break;
      case 'drain': {
        const eStats = effectiveStats(bs, 'enemy');
        // v13.1 NaN FIX: the base necromancer drain ships `pct: 0.6`, but the
        // v11 Secret/Apex drains (gravedraw, legionrise) ship `mult` — reading
        // only fx.pct made raw = atk × undefined = NaN, and healEntity then
        // poisoned BOTH hp pools with NaN for the rest of the battle (and the
        // save, if it persisted). Accept either key, with a sane fallback.
        const raw = stats.atk * (fx.pct ?? fx.mult ?? 1);
        const dmg = Math.max(1, Math.round(raw * (1 - eStats.def / (eStats.def + DEF_CONSTANT))));
        bs.enemy.hp = Math.max(0, bs.enemy.hp - dmg);
        healEntity(bs, 'player', dmg);
        log(bs, 'player', t('log.sig.drain', { name: player.name, sig: sigName, dmg, heal: dmg }), 'signature', { dmg, heal: dmg, targetSide: 'enemy' });
        checkBattleEnd(bs);
        break;
      }
      case 'burnOnHit':
        bs.playerBurnOnHitTurns = fx.turns;
        log(bs, 'player', t('log.sig.burnOnHit', { name: player.name, sig: sigName, n: fx.turns }), 'signature');
        break;
      default: break;
    }
  }
}

// ---------------- Core action resolution ----------------

function performAction(bs, side, skillType) {
  if (tickDot(bs, side)) return; // burn can kill before the action happens

  if (skillType === SkillType.SIGNATURE) {
    // Gauge check happens in playerAct; this is the execution path.
    applySignature(bs);
    return;
  }

  const opp = other(side);
  const actor = bs[side];
  const defender = bs[opp];

  if (skillType === SkillType.BLOCK || skillType === SkillType.PARRY) {
    bs[`${side}Stance`] = skillType;
    log(bs, side, t('log.stance', { name: actor.name, stance: skillName(skillType) }), 'stance', { stance: skillType });
    return;
  }

  const actorStats = effectiveStats(bs, side);
  const defenderStats = effectiveStats(bs, opp);

  const sureHit = side === 'player' && bs.playerSureCrit;
  const forcedVanish = side === 'enemy' && bs.playerVanish;
  const missed = forcedVanish || (!sureHit && rollMiss(actorStats, defenderStats));

  if (missed) {
    // Event side = the dodger (opp); the animator plays the slip on ev.side.
    log(bs, opp, t('log.miss', { name: defender.name, target: actor.name, skill: skillName(skillType) }), 'dodge', { skill: skillType });
    onDodge(bs, opp);
    if (forcedVanish) {
      bs.playerVanish = false;
      const { dmg } = computeDamage(effectiveStats(bs, 'player'), SkillType.QUICK_STRIKE, effectiveStats(bs, 'enemy'), { isCounter: true });
      bs.enemy.hp = Math.max(0, bs.enemy.hp - dmg);
      log(bs, 'player', t('log.sig.vanishCounter', { dmg }), 'counter', { dmg, targetSide: 'enemy' });
      onCounter(bs, 'player', dmg);
      applyLifesteal(bs, 'player', dmg);
    }
    checkBattleEnd(bs);
    return;
  }

  const defStance = bs[`${opp}Stance`];
  if (defStance && STANCE_COUNTERS[defStance] === skillType) {
    const { dmg } = computeDamage(defenderStats, defStance, actorStats, { isCounter: true });
    actor.hp = Math.max(0, actor.hp - dmg);
    bs[`${opp}Stance`] = null;
    log(bs, opp, t('log.counter', { name: defender.name, stance: skillName(defStance), skill: skillName(skillType), target: actor.name, dmg }), 'counter', { dmg, targetSide: side, stance: defStance });
    onCounter(bs, opp, dmg);
    applyLifesteal(bs, opp, dmg);
  } else {
    let { dmg, crit } = computeDamage(actorStats, skillType, defenderStats, { forceCrit: sureHit });
    if (side === 'player' && bs.playerSureCrit) bs.playerSureCrit = false;
    if (side === 'player' && bs.playerOvercharge && skillType === SkillType.HEAVY_ATTACK) {
      dmg = Math.round(dmg * 2);
      bs.playerOvercharge = false;
      log(bs, 'player', t('log.sig.overchargeBoom'), 'signature');
    }
    defender.hp = Math.max(0, defender.hp - dmg);
    if (defStance) bs[`${opp}Stance`] = null; // stance is spent even on a wrong guess
    const key = crit ? 'log.crit' : 'log.hit';
    log(bs, side, t(key, { name: actor.name, target: defender.name, skill: skillName(skillType), dmg }), crit ? 'crit' : 'hit', { dmg, skill: skillType, targetSide: opp });
    onHitTaken(bs, opp, dmg, side);
    applyLifesteal(bs, side, dmg);
    // Spellblade's Runic Edge: landed player attacks apply burn while active.
    if (side === 'player' && bs.playerBurnOnHitTurns > 0) {
      bs.playerBurnOnHitTurns -= 1;
      applyDot(bs, 'enemy', actorStats.atk * 0.15 + actorStats.dotPower * 1.5, 2);
    }
  }

  checkBattleEnd(bs);
}

function checkBattleEnd(bs) {
  if (bs.finished) return; // v7: fire the transition (and its 'ko' event) exactly once
  if (bs.player.hp <= 0 || bs.enemy.hp <= 0) {
    bs.finished = true;
    if (bs.enemy.hp <= 0 && bs.player.hp > 0) bs.winner = 'player';
    else if (bs.player.hp <= 0 && bs.enemy.hp > 0) bs.winner = 'enemy';
    else bs.winner = 'draw';
    // v7: the fallen side's death is itself an event the animator replays.
    // (On a draw both fell — the player's fall is the one that matters on screen.)
    const koSide = bs.winner === 'player' ? 'enemy' : 'player';
    log(bs, koSide, t('log.ko', { name: bs[koSide].name }), 'ko', { koSide });
  }
}

// ---------------- ATB gauge loop ----------------

function tickToNextPlayerTurn(bs, enemyPicker) {
  let safety = SAFETY_TICKS;
  while (!bs.finished && bs.playerGauge < ACTION_THRESHOLD && safety-- > 0) {
    bs.playerGauge += effectiveStats(bs, 'player').speed;
    bs.enemyGauge += effectiveStats(bs, 'enemy').speed;
    if (bs.enemyGauge >= ACTION_THRESHOLD) {
      bs.enemyGauge -= ACTION_THRESHOLD;
      performAction(bs, 'enemy', enemyPicker());
    }
  }
}

export function startBattle(player, enemy, enemyPicker, { fullHeal = true } = {}) {
  const bs = {
    player, enemy,
    playerGauge: 0, enemyGauge: 0,
    playerStance: null, enemyStance: null,
    playerBuffs: [], enemyBuffs: [],
    dots: { player: null, enemy: null },
    playerFleetfootUsed: false, enemyFleetfootUsed: false,
    playerOvercharge: false, playerVanish: false, playerSureCrit: false,
    playerBurnOnHitTurns: 0,
    playerSigGauge: 50, // half-charged at battle start so the first cast isn't too far away
    log: [], finished: false, winner: null,
  };
  // v4: PvE passes fullHeal:false — HP persists between nodes (Elden Ring
  // style); PvP keeps the full-heal arena convention. Enemies always start fresh.
  const pMax = baseStatsOf(player).maxHp;
  player.hp = fullHeal ? pMax : Math.max(1, Math.min(player.hp ?? pMax, pMax));
  enemy.hp = baseStatsOf(enemy).maxHp;
  tickToNextPlayerTurn(bs, enemyPicker);
  return bs;
}

/** The player takes their turn, then time fast-forwards to their next one. */
export function playerAct(bs, skillType, enemyPicker) {
  if (bs.finished) return bs;

  if (skillType === SkillType.SIGNATURE) {
    if (bs.playerSigGauge < SIG_GAUGE_MAX) {
      log(bs, 'player', t('log.sig.notready'), 'info');
      return bs; // not a turn — nothing spent, no time passes
    }
    bs.playerSigGauge = 0;
  }

  performAction(bs, 'player', skillType);

  // Gauge charges with every player action; spellSpeed accelerates it.
  if (skillType !== SkillType.SIGNATURE) {
    bs.playerSigGauge = Math.min(SIG_GAUGE_MAX, bs.playerSigGauge + SIG_GAUGE_BASE_GAIN + effectiveStats(bs, 'player').spellSpeed);
  }

  // Buffs tick down per player turn.
  for (const buff of bs.playerBuffs) buff.turns -= 1;
  bs.playerBuffs = bs.playerBuffs.filter((b) => b.turns > 0);

  bs.playerGauge = Math.max(0, bs.playerGauge - ACTION_THRESHOLD);
  if (!bs.finished) tickToNextPlayerTurn(bs, enemyPicker);
  return bs;
}

export function getEffectiveStats(bs, side) { return effectiveStats(bs, side); }

// ---------------- AI skill pickers ----------------

export function randomSkillPicker() {
  return () => BASE_SKILLS[Math.floor(Math.random() * BASE_SKILLS.length)];
}

/** Patterned, semi-predictable AI — the exploitable habit that lets a lower-CP player win with reads. */
export function patternedBotPicker(favoredSkill = SkillType.HEAVY_ATTACK, favorWeight = 0.45) {
  const others = BASE_SKILLS.filter((s) => s !== favoredSkill);
  return () => (Math.random() < favorWeight ? favoredSkill : others[Math.floor(Math.random() * others.length)]);
}
