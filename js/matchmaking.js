// matchmaking.js
// ---------------------------------------------------------------------------
// PvP matchmaking strictly by Combat Power (CP), with a Bot Fallback at
// ~+10% CP. Updated for the expanded stat block (bots also roll a little
// accuracy/crit so they don't feel flat) and Thai bot names.
// PRODUCTION NOTE: runs on an authoritative server in a real deployment —
// firebase-service.js provides the Firestore-backed opponent search.
// ---------------------------------------------------------------------------

import { Combatant } from './combatant.js';

const CP_MATCH_TOLERANCE = 0.15;
// v12 BALANCE: the fallback bot now spawns slightly WEAKER than the player
// (-20%..-5% CP, was a flat +10%). The old bot guaranteed a Heart loss for
// anyone who couldn't out-parry the stat gap; the arena should teach the
// Counter/Parry dance, not execute students. Human matches stay CP-fair.
const BOT_CP_RANGE = [0.80, 0.95];

export class Matchmaker {
  constructor() { this.queue = []; }

  enqueue(player) { this.dequeue(player.id); this.queue.push({ player, enqueuedAt: Date.now() }); }
  dequeue(playerId) { this.queue = this.queue.filter((e) => e.player.id !== playerId); }

  findMatch(player) {
    const myCP = player.combatPower;
    const candidates = this.queue.filter(
      (e) => e.player.id !== player.id && Math.abs(e.player.combatPower - myCP) / myCP <= CP_MATCH_TOLERANCE
    );
    if (candidates.length > 0) {
      candidates.sort((a, b) => Math.abs(a.player.combatPower - myCP) - Math.abs(b.player.combatPower - myCP));
      const opponent = candidates[0].player;
      this.dequeue(opponent.id);
      return { type: 'human', opponent };
    }
    return { type: 'bot', opponent: Matchmaker.generateBot(player) };
  }

  /** Reverse-engineers stats from the CP formula so the bot lands at -20%..-5% of the player's CP. */
  static generateBot(player) {
    const mult = BOT_CP_RANGE[0] + Math.random() * (BOT_CP_RANGE[1] - BOT_CP_RANGE[0]);
    const targetCP = Math.round(player.combatPower * mult);

    // Small slices for dodge (~10%), accuracy (~4%), crit rate (~4%) so the
    // bot uses the new stat layer too; the rest goes to the core four.
    const dodgeBudget = targetCP * (0.08 + Math.random() * 0.04);
    const accBudget = targetCP * 0.04;
    const critBudget = targetCP * 0.04;
    const dodge = Math.min(35, Math.round(dodgeBudget / 3));
    const accuracy = Math.max(2, Math.round(accBudget / 2));
    const critRate = Math.min(25, Math.max(2, Math.round(critBudget / 2.5)));
    const critDamage = 15;
    // Subtract every fixed/derived stat's CP contribution so the core-four
    // split lands the total at exactly the target.
    const remaining = Math.max(targetCP - dodge * 3 - accuracy * 2 - critRate * 2.5 - critDamage * 0.8, 20);

    const weights = [Math.random() + 0.35, Math.random() + 0.35, Math.random() + 0.35, Math.random() + 0.35];
    const sum = weights.reduce((a, b) => a + b, 0);
    const [wAtk, wDef, wHp, wSpd] = weights.map((w) => w / sum);

    return new Combatant({
      name: Matchmaker._botName(),
      stats: {
        atk: Math.max(4, Math.round((remaining * wAtk) / 2)),
        def: Math.max(4, Math.round((remaining * wDef) / 1.8)),
        maxHp: Math.max(30, Math.round((remaining * wHp) / 0.4)),
        speed: Math.max(4, Math.round((remaining * wSpd) / 1.5)),
        dodge, accuracy, critRate, critDamage,
      },
    });
  }

  static _botName() {
    const prefixes = ['มัจจุราช', 'อสูร', 'ภูต', 'นักล่า', 'เพชฌฆาต', 'ปีศาจ'];
    const suffixes = ['เงามืด', 'เหล็กกล้า', 'โลหิต', 'เถ้าธุลี', 'พายุ', 'เพลิงคลั่ง'];
    const p = prefixes[Math.floor(Math.random() * prefixes.length)];
    const s = suffixes[Math.floor(Math.random() * suffixes.length)];
    return `${p}${s} (บอท)`;
  }
}
