# The Ashen Table — Game Design Document (v2)

*A rogue-lite RPG strategy game: classes and deep stats drive PvE map runs;
loot and levels feed a Heart-limited, permadeath PvP Arena.*

This version supersedes the v1 GDD. Systems carried over from v1 (Hearts,
Legacy/Tombstones, Bot Fallback matchmaking) are noted briefly; new systems
are covered in full.

---

## 1. Art Direction & Fashion

- **Reference:** AFK Journey — stylized, painterly fantasy UI with clean,
  legible overlays rather than busy chrome.
- **Implementation in this prototype:** gold-trimmed "frame panels" (glass,
  blurred, gold hairline border) for the HUD and all cards; a painted radial-
  gradient sky instead of a flat dark background; the same layered parallax
  mountains from v1, retuned to the warmer palette. See `css/style.css`.
- **Paper-doll / fashion concept:** `GameController.renderPortrait()`
  generates a compact SVG silhouette per character — head, body, and three
  slot markers (weapon / armor / accessory). Each marker's fill color is
  read live from the equipped item's rarity color, so equipping a Rare or
  Epic piece visibly changes the portrait immediately, without needing
  painted art per item. Swapping in real per-item sprite art later means
  replacing the shape generation inside `renderPortrait()` — the equip/
  unequip logic in `player.js` doesn't change.

## 2. Character Creation & Classes

Three selectable classes, each with a distinct stat spread, an identical
base skill loadout (see §3), and one unique **Signature** ability
(`player.js: CLASS_DEFINITIONS`):

| Class | HP | ATK | DEF | SPD | Dodge | Signature |
|---|---|---|---|---|---|---|
| **Warrior** | 140 | 14 | 15 | 8 | 4% | **Rally** — heal 15% HP, +30% DEF for 2 turns |
| **Rogue** | 95 | 13 | 7 | 17 | 16% | **Vanish** — guaranteed dodge, then a free counter-strike |
| **Mage** | 80 | 19 | 6 | 11 | 8% | **Overcharge** — next Heavy Attack deals double damage |

Class is chosen once at character creation (`gameController.js:
renderCreateCharacter`) alongside a name. A class's identity comes from
*how its stats and Signature play*, not from a different card pool — this
keeps the combat engine simple while still giving each class a real
tactical signature (a Rogue's evasion-plus-counter loop plays nothing like
a Warrior's brace-and-outlast loop, even though both have the same four
base actions available).

## 3. Deep Stat-Based Combat

Two layers, deliberately:

1. **A real RPG stat system** — HP, ATK, DEF, Speed, Dodge — replaces v1's
   simultaneous rock-paper-scissors clash as the primary decision-maker.
2. **A thin tactical layer on top** (Block/Parry stances) so a well-read
   opponent can still be out-played, not just out-statted — this preserves
   the "Power Level is a baseline, not a guarantee" pillar from v1.

### 3.1 Turn order & frequency — the ATB gauge

Every combatant has a gauge that fills at a rate equal to their **Speed**.
Whoever reaches the threshold first acts. A combatant significantly faster
than its opponent can act **more than once** before the other gets a single
turn — Speed genuinely controls *frequency*, not just who goes first.
Implemented in `combat.js: startBattle` / `tickToNextPlayerTurn` (an
Active-Time-Battle loop, capped by a safety counter so an extreme speed gap
can't hang the loop).

### 3.2 Dodge / Evasion

Before any Heavy Attack or Quick Strike lands, the defender rolls their
**Dodge%** (plus a small bonus if they're faster than the attacker, capped
at 60% total). A successful dodge means **zero damage**, full stop — not
mitigation. Verified in testing: a defender with 45% Dodge actually evaded
~47% of incoming Heavy Attacks over 300 trials; a defender with 0% Dodge
evaded 0%.

### 3.3 Damage & mitigation

```
mitigation = DEF / (DEF + 45)
damage     = ATK × skillPower × variance(0.9–1.1) × (1 − mitigation) [× 1.75 if it's a counter]
```

The DEF/(DEF+K) curve gives diminishing returns on stacking Defense — a
standard RPG mitigation shape — rather than v1's flat subtraction.

### 3.4 Block / Parry as stances, not simultaneous choices

Because only one side acts per ATB tick, the old "both pick a skill, then
compare" clash doesn't fit. Instead: **Block and Parry are stances.**
Setting one on your turn does a little direct damage and then stays "live"
— if the *next* attack aimed at you is the type it counters, you punish it
for 1.75× damage instead of taking the hit:

```
Parry  live →  incoming Heavy Attack  →  countered, damage flows back to attacker
Block  live →  incoming Quick Strike  →  countered, damage flows back to attacker
```

A stance clears the moment it either lands a counter or absorbs a
non-matching hit. Combined with the ATB gauge, this creates a real
prediction game: if a fast boss keeps opening with Heavy Attack, setting
Parry ahead of its next turn is a read the player has to make and time —
not a menu option that resolves itself.

### 3.5 Signature abilities

Once per battle, player-only (`combat.js: applySignature`), see §2 for
effects. Enemies and PvP bots never use one — Signature is what makes a
*class* feel different in the moment, and only the player has a class.

## 4. EXP, Leveling, and Stat Points

- `Player.gainXp()` awards XP from every PvE node and PvP match (win or
  lose — see v1's "always progress" pillar, retained).
- On level-up, the player receives **3 Stat Points** (not automatic stat
  growth, per this expansion's requirement) — `STAT_POINTS_PER_LEVEL` in
  `player.js`.
- Points are spent manually via the Allocate screen
  (`gameController.js: renderAllocate`), one at a time, on ATK / DEF / Speed
  / Max HP / Dodge. Point values are tuned per stat (`STAT_POINT_VALUE`) so
  a "point" feels roughly comparable in CP-formula weight across stats.

## 5. Post-Combat Loot & Equipment (`equipment.js`)

- Three slots: **Weapon, Armor, Accessory** — matches the paper-doll
  markers in §1.
- Three rarities — **Common / Rare / Epic** — each with a stat multiplier
  and a chance to roll a **passive synergy**:

| Passive | Trigger | Effect |
|---|---|---|
| **Vampiric Edge** | On a successful counter | Heal 8% of the damage dealt |
| **Thornmail** | On taking a direct hit | Reflect 15% of that damage back |
| **Fleetfoot** | First dodge of the fight | +12 Speed for the rest of the battle |

Passives are read live off equipped items by `combat.js`'s `onDodge` /
`onCounter` / `onHitTaken` hooks — equipping or swapping gear changes
battle behavior immediately, no separate "sync" step.

- Loot drops after a PvE win (`generateLoot`, 0–2 items, tier/level-scaled).
  At the result screen the player either **Equips** (auto-salvaging
  whatever was previously in that slot for resources) or **Salvages**
  outright. Anything left unresolved is auto-salvaged on Continue — nothing
  is ever stranded.

## 6. Rogue-lite PvE Map Progression (`map.js`)

PvE farming is no longer one flat battle button — it's a branching node
map, generated fresh per **Zone**:

- **5 floors** per Zone: 2 → 3 → 3 → 2 → **1 (always Boss)**.
- Each non-final floor rolls a mix of node types: mostly Normal/Hard
  battles, with Event, Altar, and Rest nodes sprinkled in
  (`rollNodeType`).
- Nodes connect to 1–2 nodes on the next floor (a Slay-the-Spire-style
  lattice, `generateZone`'s connection step) — the player picks a path, not
  a single line.
- **Biomes** — Ember Wastes, Verdant Hollow, Frostpeak Reaches, Ashen
  Ruins — are chosen randomly per Zone (never repeating the immediately
  previous one) and flavor enemy names and map accent color.

### 6.1 Node types

| Type | What happens |
|---|---|
| **Normal / Hard** | A battle against a generated `Combatant`, scaled by tier × player level × Zone depth. |
| **Boss** | The single node on the final floor. Tougher scaling; **only a win advances the Zone.** |
| **Event** | Immediate "Fortune's Favor" — a flat resource reward, no fight. |
| **Rest** | A quieter version of the same — smaller flat resources. |
| **Altar** | The Heart Sacrifice Altar (§7), now a real map location instead of a random post-battle roll. |

### 6.2 Design pillar: PvE never hard-fails

Losing a Normal/Hard/Event/Altar/Rest node still marks it cleared and lets
the player continue forward, with a smaller reward — carried directly from
v1's "no permadeath, always progress" philosophy. **The Boss is the one
exception:** losing to it leaves the node uncleared, so the player can
retry it, but the Zone doesn't advance until it's won. This keeps a Boss
meaningful without ever punishing the player by taking anything away.

### 6.3 Zone completion

Beating the Boss generates the next Zone (`zoneIndex + 1`, a new Biome,
slightly higher difficulty scaling) and resets the player's map position —
this is what makes the PvE loop endless while still feeling like discrete
"runs" through a map, matching the brief's Slay-the-Spire-acts framing.

## 7. Heart Sacrifice Altar (`altar.js`)

Unchanged in effect from v1, relocated: visiting an Altar node offers the
same trade — sacrifice 1 Heart for +35% to a random base stat, permanently.
A character can never sacrifice their last Heart
(`canSacrifice`/`sacrificeHeart` guard this).

## 8. PvP — Matchmaking, Bot Fallback, Hearts (carried over from v1)

- Matchmaking by Combat Power (CP) within ±15%; Bot Fallback generates an
  opponent at **~+10% CP** when no human is queued
  (`matchmaking.js: Matchmaker`). Verified over 200 trials at 1.10 CP ratio
  on average, using the new 5-stat CP formula (§9).
- **3 Hearts** at all times; a PvP loss removes one; **0 Hearts is
  permanent death** (`Player.loseHeart`/`isDead`).
- On permadeath: `LegacyManager.recordDeath()` snapshots a Tombstone; the
  next character created inherits 10% of the fallen hero's stats + 15% of
  their resources (`legacy.js`), same ratios as v1, extended to cover the
  new Dodge stat.

## 9. Combat Power (CP) Formula (updated)

```
CP = ATK×2 + DEF×1.8 + MaxHP×0.4 + Speed×1.5 + Dodge×3 + Level×4
```

Dodge is weighted heavily (×3) on purpose — a point of Dodge is worth more
CP than a point of most other stats, reflecting how strong "zero damage on
a hit" is in this combat model. Still purely a matchmaking baseline, not a
balance guarantee — see §3's tactical layer for why a lower-CP character
can still win.

## 10. Authentication (`auth.js`)

- Simple username-based identity, no password — the point is a **stable
  user id to key save data against**, not real security.
- `AuthProvider` is the abstract contract (`register`, `login`, `logout`,
  `getCurrentUser`); `LocalStorageAuthProvider` is the only implementation,
  backed by two localStorage keys (a `username → user` map, and a session
  pointer).
- **Swapping to Google/Firebase login later is a one-class change:** write
  a `FirebaseAuthProvider` implementing the same four methods against
  Firebase OAuth, change one line in `main.js`
  (`new LocalStorageAuthProvider()` → `new FirebaseAuthProvider()`), and
  nothing else in the codebase needs to know. No other file talks to auth
  directly.
- Per-user save data (`saveGameState`/`loadGameState`, keyed by user id)
  stores the serialized Player, current Zone, map position, and Legacy
  graveyard — `GameController.persist()` writes this after every
  meaningful state change (node clear, equip, level-up, PvP result,
  permadeath).

## 11. Tech Stack & Architecture

Same direction as v1, reaffirmed: vanilla HTML/CSS/JS with native ES
modules, zero build step, deployable to any static host. The logic layer —
`player.js`, `combat.js`, `combatant.js`, `equipment.js`, `map.js`,
`matchmaking.js`, `legacy.js`, `altar.js` — remains **completely DOM-free**,
so it's still a short hop onto a Node.js backend for production (see the
v1 GDD's architecture diagram — the shape hasn't changed, just what's
inside the client box). `auth.js` is the one new file with the same
constraint in spirit: it depends on `localStorage`/`window`, but nothing
else in the logic layer depends on *it*, so replacing it doesn't ripple
outward.

The production case for a real server is, if anything, stronger now:

| Concern | Why it still needs a server |
|---|---|
| PvP results & Heart deduction | Unchanged from v1 — a modified client shouldn't be trusted to self-report a win. |
| Loot rolls | A client could roll its own Epic drops. Rarity/stat rolls should happen server-side and be pushed to the client, not computed locally and trusted. |
| Save data | localStorage is per-browser. A real account needs server-side save storage (Postgres) so progress follows the player, not the device. |
| Auth | `LocalStorageAuthProvider` has no password and is trivially spoofable — fine for a solo prototype, not for anything with real accounts. |

## 12. Project File Structure

```
ashen-table/
├── index.html                # entry point, parallax layer markup, mounts #app
├── css/
│   └── style.css              # painterly/AFK-Journey theme: frames, portraits, map, battle, loot UI
├── js/
│   ├── main.js                 # entry script: auth gate -> boots GameController
│   ├── auth.js                  # AuthProvider contract + LocalStorageAuthProvider + save/load
│   ├── player.js                  # Player class, CLASS_DEFINITIONS, leveling/stat points, Hearts
│   ├── combat.js                    # ATB engine: Speed/Dodge/DEF math, stances, signatures, passivehooks
│   ├── combatant.js                   # lightweight enemy/bot entity (no class/equipment)
│   ├── equipment.js                     # loot generation, rarity, passive synergy library
│   ├── map.js                             # Zone/Biome/Node generation, node graph, enemy scaling
│   ├── matchmaking.js                       # PvP CP matching + 10% Bot Fallback
│   ├── legacy.js                              # Tombstone + LegacyManager
│   ├── altar.js                                 # Heart Sacrifice Altar logic
│   ├── parallax.js                                # pointer-driven + ambient background motion
│   └── gameController.js                           # UI state machine + rendering (imports everything above)
├── docs/
│   └── GDD.md                                        # this document
└── README.md                                          # how to run it locally
```

## 13. Known Simplifications (roadmap)

- All gameplay logic runs client-side; see §11 for what a production server
  should own instead.
- Auth has no password — a username alone reopens any save. Acceptable for
  a solo local prototype only.
- The map graph is regenerated (not persisted node-by-node beyond
  cleared/uncleared + current position) — reloading mid-Zone keeps your
  progress on the *current* Zone's graph since the whole `zone` object is
  serialized, but a future save-format change should keep this in mind.
- Equipment is capped at exactly one item per slot with immediate equip/
  salvage — there's no multi-item bag/stash yet.
- Only three Biomes' worth of enemy flavor text exists; stat scaling is
  smooth but named enemy variety is intentionally small for this prototype.

---

# v3 Addendum — Online Release Preparation

This addendum extends the v2 GDD with: full Thai localization, a leaderboard,
Firebase (BaaS) backend preparation, 12 playable classes, and an expanded
stat system. Where v2 sections conflict with this addendum, v3 wins.

## 14. Thai Localization (`js/i18n.js`)

- Every player-facing string — menus, buttons, HUD, battle logs, item names,
  class/signature names, biomes, enemies, events — is Thai, sourced from a
  single table in `i18n.js` keyed by stable English ids (`'menu.map'`,
  `'log.crit'`, …) with `{param}` interpolation.
- **Code identifiers and save data stay English** (`classId: 'warlock'`,
  `stat: 'critRate'`) so saves are language-independent; only display goes
  through `t()`. Combat logs are translated *at emit time* inside
  `combat.js` (i18n has no DOM dependency, so the logic layer may use it).
- Adding another language later = adding a second table + a `setLanguage()`
  switch in `i18n.js`; no other file changes.
- `Noto Sans Thai` is loaded alongside the existing display fonts and leads
  the body font stack.
- **Save-compatibility note:** v2 saves that used the removed `rogue` class
  id will not restore a working signature — v3 renamed it `assassin` as part
  of the class expansion. Fresh characters are recommended (it's a
  prototype; there is no migration shim).

## 15. Classes — expanded to 12 (`js/player.js`)

Each class = a distinct stat spread + one Signature. Signatures are now
**generic effect descriptors** (heal / buff / multibuff / vanish /
overcharge / dot / surecrit / drain / burnOnHit) executed by a single
interpreter in `combat.js` — adding class #13 is pure data, no new combat
code.

| Class (Thai) | Identity | Signature |
|---|---|---|
| นักรบ Warrior | balanced bruiser | ปลุกใจ — heal 15% + DEF +30% (2 turns) |
| เบอร์เซิร์กเกอร์ Berserker | glass hammer, high crit dmg | โลหิตคลั่ง — ATK +40% (2 turns) |
| พาลาดิน Paladin | tanky sustain | เขตศักดิ์สิทธิ์ — heal 25% |
| มือสังหาร Assassin | speed/dodge/crit | หายวับ — guaranteed dodge + counter |
| จอมเวท Mage | burst caster, fast gauge | อัดพลังเวท — next Heavy Attack ×2 |
| วอร์ล็อก Warlock | DoT specialist | คำสาปมรณะ — heavy burn (3 ticks) |
| เรนเจอร์ Ranger | accuracy/crit sniper | ยิงเล็งเป้า — next attack sure-hit + crit |
| นักบวชหมัดเหล็ก Monk | tempo (speed) | กระแสธาร — Speed +40% (2 turns) |
| เนโครแมนเซอร์ Necromancer | lifesteal drain | ดูดวิญญาณ — instant dmg, heal = dmg |
| กวีศึก Bard | all-round buffer | บทเพลงศึก — ATK/DEF/SPD +15% (2 turns) |
| ผู้พิทักษ์ Guardian | extreme tank | เปลือกเหล็กกล้า — DEF +60% (2 turns) |
| นักดาบเวท Spellblade | hybrid burn-on-hit | คมอักขระ — attacks apply burn (3 attacks) |

## 16. Expanded Stat System (`js/combat.js`)

New stats join HP/ATK/DEF/Speed/Dodge; every one is allocatable on level-up
and rollable on equipment:

| Stat | Effect |
|---|---|
| **Accuracy** (ความแม่นยำ) | Directly counters Dodge: `missChance = clamp(0..60, dodge + speedEdge − accuracy)` |
| **Crit Rate / Crit Damage** | `critRate%` chance for `×(1.5 + critDamage/100)` damage (attacks only, not counters) |
| **Spell Speed** (ความเร็วเวท) | Signature gauge gains `25 + spellSpeed` per player action; a full 100 casts the Signature. Signatures are no longer once-per-battle — Spell Speed is cast *frequency*. Gauge starts each battle at 50. |
| **DoT Power** (พลังดาเมจต่อเนื่อง) | Scales burn damage from Curse / Runic Edge. Burns tick at the start of the burned side's actions and can kill. |
| **Lifesteal** (ดูดเลือด) | Heals that % of direct attack damage dealt (capped 50%). |

Verified numerically: a 40-accuracy attacker reduced a 40-dodge defender's
evasion from ~38% to ~0%; a 50-critRate attacker landed ~46-50% crits over
400 trials; a Warlock's Curse burned a frail target to death through ticks
alone; the ~+10% Bot Fallback still averages 1.099 CP ratio under the new
formula.

Updated CP formula (matchmaking baseline only, as ever):
```
CP = ATK×2 + DEF×1.8 + HP×0.4 + SPD×1.5 + Dodge×3 + Accuracy×2
   + CritRate×2.5 + CritDmg×0.8 + SpellSpeed×1.2 + DoT×2 + Lifesteal×2 + Level×4
```

## 17. Leaderboard (`js/leaderboard.js`, screen in `gameController.js`)

- Ranks by **Max CP** or **Max Zone** (toggle), top 20, own row highlighted.
- `Player` now tracks `maxCP` / `maxZone` high-water marks; `persist()`
  submits them after every meaningful change. Records never decrease — a
  fresh character can't erase a fallen legend's peak.
- Two interchangeable services with the same async `submit()/fetch()`
  interface: `LocalLeaderboardService` (localStorage, device-wide) and
  `FirebaseLeaderboardService` (Firestore, global).

## 18. Backend / BaaS Architecture (`js/firebase-service.js`)

`main.js` now selects the whole backend with one flag (`USE_FIREBASE`):

```
                      main.js (USE_FIREBASE?)
                       /                  \
         local (default)                   firebase
  LocalStorageAuthProvider          FirebaseAuthProvider (Google popup)
  saveGameState/loadGameState       savePlayerData/loadPlayerData (Firestore saves/{uid})
  LocalLeaderboardService           FirebaseLeaderboardService (leaderboard/{uid})
  Matchmaker (in-memory)            findPvpOpponent() (Firestore CP-range query)
```

- `firebase-service.js` is complete and ready: SDK loaded on demand from the
  official CDN (modular v10), `firebaseConfig` placeholder at the top,
  activation steps + suggested Firestore structure + security rules in the
  header comment. GameController takes `saveFn`/`leaderboard` by injection,
  so it never knows which backend it's on.
- **PvP online model: "ghost PvP"** — `findPvpOpponent()` fetches a real
  player's snapshot within ±15% CP and you fight their build asynchronously
  (the standard BaaS pattern; no live sockets). No candidate → the same
  +10% `Matchmaker.generateBot()` fallback as offline.
- **Anti-cheat honesty:** Firestore rules stop players touching *each
  other's* data, but a modified client can still inflate its *own* maxCP or
  save. Real trust requires Cloud Functions (or the Node server from §11)
  validating combat results, loot rolls, and Heart deductions server-side.
  This module is the correct data layer for that future; it is not itself
  the trust layer.

## 19. Art & Fashion pipeline

- Portraits are parameterized painterly-tinted SVGs: class-tinted radial-
  gradient silhouette + a class weapon glyph (sword, scythe, lute, …) + the
  three paper-doll slot markers that recolor live by equipped rarity.
- **Real painted art drop-in:** generate portraits externally (e.g. the
  prompt "character portrait of a fantasy <class>, stylized 2.5D painterly
  texture, soft blending, clean UI background, vibrant fantasy colors, AFK
  Journey game art style" in an image tool), save as
  `assets/portraits/<classId>.png`, and swap the shape generation inside
  `renderPortrait()` for an `<image>` element — equip logic and slot
  markers are untouched by design. (Code generation here can't produce
  raster painterly art, so the SVG is the shipped placeholder tier.)

## 20. Updated file structure (delta from §12)

```
js/
├── i18n.js               # NEW — Thai string table + t()
├── leaderboard.js         # NEW — LocalLeaderboardService
├── firebase-service.js     # NEW — Google Auth + Firestore save/leaderboard/PvP search
├── player.js                # 12 classes, expanded stats, maxCP/maxZone
├── combat.js                  # accuracy/crit/DoT/lifesteal/signature gauge
├── main.js                      # backend selection (USE_FIREBASE flag)
└── (everything else as in §12, localized where user-facing)
```

---

# v4 Addendum — The Dark World (Elden Ring-inspired)

Narrative reframe: the run-based rogue-lite becomes a persistent, bleak open
world. เวลันทีร์ นครหลวงแห่งเถ้า (the Capital of Ash) sits at the center; ten
named wilds radiate outward, each hiding a town, a Lord, and a reason to
turn back. Core combat (ATB/stances/signatures) and PvP Hearts are UNCHANGED.

## 21. World structure (`js/map.js`, rewritten)

- **Capital + 10 zones**, generated once per character and persisted whole.
  Zones are depth-graphs (depths 0–7): all paths converge on the **Town at
  depth 3**, then fan back out to the **Zone Lord at depth 7**.
- **Soft-cap difficulty:** `depthMultiplier = 1.12^min(d,4) × 1.6^(d−4 if d>4)`
  — gentle to the town, then a wall (measured: depth-7 enemies ≈4.1× depth-4;
  zone 0 deep ≈4.6× its entrance). `zoneMultiplier = 1 + index×0.4` makes
  zone 9's *entrance* lethal to a fresh hero — you *can* walk in, Elden Ring
  style; the world just doesn't care.
- **Fog of War:** `computeVisibleNodeIds()` reveals cleared nodes, the
  discovered town, and only `visionRange` forward steps (default 1; the
  Scout sells 2 and 3). Fogged nodes render as "?" with hidden roads.
- **Weaving paths:** one depth-4 node per zone carries a `capitalGate` — a
  free shortcut back to the Capital once reached.
- **Persistent HP & Campfires:** HP carries between nodes (`startBattle`'s
  new `fullHeal:false` — the only combat.js change). Guaranteed campfires at
  depths 2 and 5 heal 60% max HP once per expedition. Capital and towns
  fully heal on arrival.
- **Expedition respawns:** leaving a zone (retreat, defeat, travel, gate)
  resets its cleared nodes — enemies return for farming. Town discovery and
  Lord kills are permanent. Defeat returns you to the zone's town (if
  discovered) or the Capital at 40% HP, keeping the loss's small rewards —
  the "no permadeath in PvE" pillar survives the tone shift.
- Leaderboard `maxZone` now means: deepest zone whose Lord has fallen.

## 22. Towns, gold, fast travel (`js/town.js`, NEW)

- Each zone's **Town** (unique Thai name) is met after ~3 fights; a safe
  hub with full heal, shop, resident NPC (if any), and warp candle.
- **Gold** replaces the old resources currency everywhere (drops scale with
  depth×zone; defeats pay 25%). v3 saves migrate `resources → gold`.
- **Shops** stock 4 level-scaled items (`buyPrice ≈ 6× salvage + level`);
  selling pays salvage. The zone-4 town is มารา's post: 3 guaranteed
  rare/epic items at a 1.6× markup.
- **Paid fast travel:** Capital ↔ any discovered town. Fare: 25 gold to the
  Capital; `30 + zoneIndex×20` outward. Walking (gate/retreat/town exit) is
  free.

## 23. Dimensional Bag (`js/inventory.js`, NEW)

- Loot lands in the bag (base 6 slots) — full bag auto-salvages the drop to
  gold with a notice. Equipping swaps: the displaced item returns to the bag.
- **Compare UI (required):** selecting a bag item shows a side-by-side table
  — every stat either item touches, ชิ้นใหม่ vs ที่สวมอยู่, with green/red
  deltas (`compareItems()`).
- **Zone materials** (10 Thai-named types, e.g. น้ำตาเงา, เศษจันทร์ดับ):
  45% drop on normal wins, 2 from elites, 4 from Lords. NPC services charge
  "N of one kind", spent greedily from the largest stack.

## 24. Unique NPCs & lore (`js/npc.js`, NEW — all text Thai, in i18n.js)

| NPC | Where | Lore hook | Service |
|---|---|---|---|
| **เวสเปอร์** ปราชญ์ต้องสาปแห่งหอสมุดล่ม | Capital ONLY | read a book that shouldn't exist; half his body lives in another dimension | Bag +2 slots, cost 4/8/12/16 materials of one kind (max +8) |
| **อิศรา** ผู้สอดแนมเนตรดับ | Town, zone 6 | saw the thing at the world's edge; her eyes burned white — now she reads unwalked roads | Vision range 1→2→3, cost 6 then 12 materials |
| **ครอม** ช่างตีเหล็กแขนเดียว | Town, zone 1 | forged a blade too good to accept an owner; buried it under his anvil — the forge never cools | Weapon reforge +2 ATK, 80 gold ×1.5 each time + 3+ materials |
| **มารา** แม่ค้าเร่เงาคืนเดือน | Town, zone 4 | nobody sees her arrive; wheels never touch the ground; former owners "no longer need" her wares | Rare/epic stock at 1.6× (the town shop itself) |

NPCs are data + service functions; adding one = a new entry in `NPCS`,
i18n keys, and (if needed) a service case.

## 25. Integration map (what changed where)

- `map.js` **rewritten** — world/fog/soft-cap/economy drops.
- `inventory.js`, `npc.js`, `town.js` **new** — pure logic, DOM-free.
- `gameController.js` **rewritten** — capital/world/zone/town/shop/npc/bag/
  travel screens; PvE battles start with `fullHeal:false`.
- `player.js` — +gold, materials, bag, bagUpgrades, visionRange (with v3
  save migration); `combat.js` — one optional `fullHeal` parameter;
  `i18n.js` — ~120 new Thai strings; `css/style.css` — v4 component styles.
- Untouched: `combat.js` mechanics, `equipment.js`, `matchmaking.js`,
  `legacy.js`, `altar.js` (altars are now field nodes), `leaderboard.js`,
  `auth.js`, `firebase-service.js`, `main.js`.
