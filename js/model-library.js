// model-library.js (v15)
// ---------------------------------------------------------------------------
// Real sculpted characters. Every rig in the game is now a professionally
// modeled, rigged and animated glTF (KayKit packs, CC0 — see
// assets/models/LICENSE.md), themed by the exact same data as before:
//
//   portrait: { tint, glyph }  →  base model + visible weapon set + clips
//
// Four adventurer bodies cover all 21 class glyphs (weapon meshes ship
// INSIDE each GLB, parented to hand slots — we just toggle visibility), and
// three skeletons cover every monster/boss via the same name-hash. Class
// tint is applied as a material grade so 26 classes stay distinguishable on
// shared bodies.
//
// PURE MAPPING (modelForSpec, monsterModelForName) is separated from
// LOADING (loadModelRig) so the mapping is headless-testable, and so the
// procedural rig in character3d.js remains the automatic fallback when a
// GLB or the loaders can't be fetched.
// ---------------------------------------------------------------------------

const MODEL_DIR = 'assets/models';

// clip name shorthands (shared across every KayKit character)
const CLIPS = {
  idle1h: 'Idle', idle2h: '2H_Melee_Idle', idleUnarmed: 'Unarmed_Idle',
  melee1h: '1H_Melee_Attack_Slice_Diagonal', melee2h: '2H_Melee_Attack_Slice',
  cast: 'Spellcast_Shoot', shoot: '2H_Ranged_Shoot',
  hit: 'Hit_A', death: 'Death_A', cheer: 'Cheer',
};

/**
 * glyph → { file, show: [weapon-mesh names to keep visible], idle, attack }
 * Any weapon mesh in the GLB that is NOT listed is hidden. Meshes are listed
 * from each model's actual node inventory (verified against the GLBs).
 */
export const GLYPH_MODELS = Object.freeze({
  // Knight — swords & shields
  sword:     { file: 'Knight', show: ['1H_Sword'], idle: CLIPS.idle1h, attack: CLIPS.melee1h },
  shield:    { file: 'Knight', show: ['1H_Sword', 'Round_Shield'], idle: CLIPS.idle1h, attack: CLIPS.melee1h },
  tower:     { file: 'Knight', show: ['1H_Sword', 'Rectangle_Shield'], idle: CLIPS.idle1h, attack: CLIPS.melee1h },
  banner:    { file: 'Knight', show: ['1H_Sword', 'Spike_Shield'], idle: CLIPS.idle1h, attack: CLIPS.melee1h },
  sun:       { file: 'Knight', show: ['1H_Sword', 'Badge_Shield'], idle: CLIPS.idle1h, attack: CLIPS.melee1h },
  runeblade: { file: 'Knight', show: ['2H_Sword'], idle: CLIPS.idle2h, attack: CLIPS.melee2h },
  // Mage — staves, wands, grimoires
  staff:     { file: 'Mage', show: ['2H_Staff'], idle: CLIPS.idle2h, attack: CLIPS.cast },
  moon:      { file: 'Mage', show: ['2H_Staff'], idle: CLIPS.idle2h, attack: CLIPS.cast },
  rune:      { file: 'Mage', show: ['2H_Staff', 'Spellbook'], idle: CLIPS.idle2h, attack: CLIPS.cast },
  flame:     { file: 'Mage', show: ['1H_Wand'], idle: CLIPS.idle1h, attack: CLIPS.cast },
  skull:     { file: 'Mage', show: ['1H_Wand', 'Spellbook_open'], idle: CLIPS.idle1h, attack: CLIPS.cast },
  halo:      { file: 'Mage', show: ['Spellbook_open'], idle: CLIPS.idleUnarmed, attack: CLIPS.cast },
  compass:   { file: 'Mage', show: ['1H_Wand', 'Spellbook'], idle: CLIPS.idle1h, attack: CLIPS.cast },
  // Hooded Rogue — knives & crossbows
  dagger:    { file: 'Rogue_Hooded', show: ['Knife', 'Knife_Offhand'], idle: CLIPS.idle1h, attack: CLIPS.melee1h },
  bow:       { file: 'Rogue_Hooded', show: ['2H_Crossbow'], idle: CLIPS.idle2h, attack: CLIPS.shoot },
  lute:      { file: 'Rogue_Hooded', show: ['Knife', 'Throwable'], idle: CLIPS.idle1h, attack: CLIPS.melee1h },
  // Barbarian — axes & fists
  axe:       { file: 'Barbarian', show: ['1H_Axe'], idle: CLIPS.idle1h, attack: CLIPS.melee1h },
  thorn:     { file: 'Barbarian', show: ['1H_Axe', '1H_Axe_Offhand'], idle: CLIPS.idle1h, attack: CLIPS.melee1h },
  scythe:    { file: 'Barbarian', show: ['2H_Axe'], idle: CLIPS.idle2h, attack: CLIPS.melee2h },
  crown:     { file: 'Barbarian', show: ['2H_Axe'], idle: CLIPS.idle2h, attack: CLIPS.melee2h },
  fist:      { file: 'Barbarian', show: [], idle: CLIPS.idleUnarmed, attack: 'Unarmed_Melee_Attack_Punch_A' },
});

/** Every weapon mesh that exists across the adventurer GLBs — hidden unless listed in show. */
const ALL_WEAPON_MESHES = Object.freeze([
  '1H_Sword', '1H_Sword_Offhand', '2H_Sword', 'Badge_Shield', 'Rectangle_Shield', 'Round_Shield', 'Spike_Shield',
  'Spellbook', 'Spellbook_open', '1H_Wand', '2H_Staff',
  'Knife', 'Knife_Offhand', '1H_Crossbow', '2H_Crossbow', 'Throwable',
  '1H_Axe', '1H_Axe_Offhand', '2H_Axe', 'Mug',
]);

const MONSTER_FILES = Object.freeze(['Skeleton_Minion', 'Skeleton_Rogue_placeholder', 'Skeleton_Mage', 'Skeleton_Warrior']);
// (Skeleton_Rogue isn't shipped to keep the repo lean — the hash skips it.)
const SHIPPED_MONSTERS = Object.freeze(['Skeleton_Minion', 'Skeleton_Mage', 'Skeleton_Warrior']);

export function modelForSpec(spec) {
  if (spec.monster) return monsterModelForName(spec.hashName || spec.tint, spec.bulk || 1);
  const def = GLYPH_MODELS[spec.glyph] || GLYPH_MODELS.sword;
  return { ...def, url: `${MODEL_DIR}/${def.file}.glb` };
}

export function monsterModelForName(seed, bulk = 1) {
  let h = 2166136261;
  const s = String(seed || 'x');
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  // bosses (bulk-scaled brutes) always take the Warrior body
  const file = bulk >= 1.4 ? 'Skeleton_Warrior' : SHIPPED_MONSTERS[Math.abs(h) % SHIPPED_MONSTERS.length];
  return {
    file, url: `${MODEL_DIR}/${file}.glb`, show: null, // skeletons keep their built-in arms
    idle: CLIPS.idle1h, attack: file === 'Skeleton_Mage' ? CLIPS.cast : CLIPS.melee1h,
  };
}

// ---------------- loading & instancing ----------------

const gltfCache = new Map(); // url -> Promise<gltf>

function loadGltf(loaders, url) {
  if (!gltfCache.has(url)) {
    gltfCache.set(url, new Promise((resolve, reject) => {
      new loaders.GLTFLoader().load(url, resolve, undefined, reject);
    }));
  }
  return gltfCache.get(url);
}

/** Class tint as a material grade — 25% toward the class color, so shared
 * bodies stay tellable apart without murdering the painted texture. */
function applyTint(THREE, root, tint) {
  const target = new THREE.Color(tint);
  root.traverse((o) => {
    if (!o.isMesh || !o.material) return;
    o.material = o.material.clone();
    if (o.material.color) o.material.color.lerp(target, 0.25);
  });
}

/**
 * An animated character instance. One shared GLTF per file (cached), cloned
 * per stage with SkeletonUtils so skinned meshes get their own bones.
 *
 * interface (same one the procedural fallback wrapper implements):
 *   group      — add to scene
 *   update(dt) — advance the mixer
 *   idle()     — return to the glyph's idle stance
 *   react(kind)— 'attack' | 'hit' | 'death' | 'cheer' (one-shot, auto-idle)
 *   anchors    — { head, handR, handL } bones for gear attachments (or null)
 */
export async function loadModelRig(THREE, loaders, spec) {
  const def = modelForSpec(spec);
  const gltf = await loadGltf(loaders, def.url);
  const group = loaders.SkeletonUtils.clone(gltf.scene);

  // weapon visibility per glyph (skeletons pass show: null → keep as-authored)
  if (def.show) {
    group.traverse((o) => {
      if (ALL_WEAPON_MESHES.includes(o.name)) o.visible = def.show.includes(o.name);
    });
  }
  if (!spec.monster) applyTint(THREE, group, spec.tint);
  const scale = 0.92 * (spec.bulk && spec.bulk > 1 ? 0.9 + 0.35 * (spec.bulk - 1) + 0.1 : 1);
  group.scale.setScalar(scale);

  const mixer = new THREE.AnimationMixer(group);
  const clipByName = (name) => THREE.AnimationClip.findByName(gltf.animations, name)
    || THREE.AnimationClip.findByName(gltf.animations, 'Idle');

  let idleAction = mixer.clipAction(clipByName(def.idle));
  idleAction.play();
  let dead = false;

  const rig = {
    group,
    spec,
    // v17 ROOT-CAUSE FIX for "sculpted models never appeared": three's
    // GLTFLoader sanitizes bone names for animation tracks — dots are
    // stripped, so the GLB's `handslot.r` becomes `handslotr` in the scene
    // graph. The old dotted lookups returned null, the gear-anchor step
    // then threw, and EVERY character silently fell back to primitives.
    // Look up both spellings (sanitized first, authored as belt-and-braces).
    anchors: {
      head: group.getObjectByName('head') || null,
      handR: group.getObjectByName('handslotr') || group.getObjectByName('handslot.r')
        || group.getObjectByName('handr') || group.getObjectByName('hand.r') || null,
      handL: group.getObjectByName('handslotl') || group.getObjectByName('handslot.l')
        || group.getObjectByName('handl') || group.getObjectByName('hand.l') || null,
    },
    update(dt) { mixer.update(dt); },
    idle() {
      if (dead) return;
      mixer.stopAllAction();
      idleAction = mixer.clipAction(clipByName(def.idle));
      idleAction.reset().play();
    },
    react(kind) {
      if (dead && kind !== 'cheer') return;
      const name = kind === 'attack' ? def.attack
        : kind === 'hit' ? CLIPS.hit
        : kind === 'death' ? CLIPS.death
        : CLIPS.cheer;
      const clip = clipByName(name);
      const act = mixer.clipAction(clip);
      act.reset();
      act.setLoop(THREE.LoopOnce, 1);
      act.clampWhenFinished = true;
      idleAction.crossFadeTo(act, 0.12, false);
      act.play();
      if (kind === 'death') { dead = true; return; }
      const onDone = (e) => {
        if (e.action !== act) return;
        mixer.removeEventListener('finished', onDone);
        if (!dead) { act.crossFadeTo(idleAction.reset().play(), 0.15, false); }
      };
      mixer.addEventListener('finished', onDone);
    },
    dispose() {
      mixer.stopAllAction();
      group.traverse((o) => {
        if (o.geometry) o.geometry.dispose();
        if (o.material && o.material.dispose) o.material.dispose();
      });
    },
  };
  return rig;
}
