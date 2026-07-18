// character3d.js (v13)
// ---------------------------------------------------------------------------
// Procedural, stylized 2.5D character models for EVERY character in the game
// — all playable classes (base, Secret, Apex), PvP bots, zone monsters and
// bosses — with zero art assets. Each rig is assembled from primitives in an
// AFK-Journey-ish chibi silhouette (big head, compact armored body, cloak),
// then themed entirely by the same data the 2D layer already uses:
//
//   portrait: { tint, glyph }   →   armor palette + weapon archetype
//
// So a class added to classes.js tomorrow gets a 3D model for free, and every
// boss in the bestiary (they all carry portraits too) is covered. Enemies
// without portrait data (plain Combatants) get a deterministic rig hashed
// from their name, scaled up into a "brute" silhouette when they out-mass
// the player.
//
// Exports:
//   rigSpecFromPortrait(portrait)      data → spec
//   rigSpecFromName(name, bulk)        nameless monsters → spec
//   buildCharacterRig(THREE, spec)     spec → THREE.Group (pure, testable)
//   applyGear(rig, equipment)          8-slot paper-doll → visible gear
//   animateRig(rig, t)                 idle breathing/bobbing
//   SnapshotFactory                    ONE shared renderer → dataURL thumbs
//   CharacterStage                     a live rotating showcase in any <div>
//   BattleDiorama                      player-vs-enemy stage w/ hit reactions
//
// Builders receive THREE as an argument (never import it) so the whole
// geometry layer unit-tests headlessly against a stub — same principle that
// keeps combat.js DOM-free.
// ---------------------------------------------------------------------------

import { loadAddons } from './three-loader.js';
import { loadModelRig } from './model-library.js';

const REDUCED = typeof matchMedia !== 'undefined'
  && matchMedia('(prefers-reduced-motion: reduce)').matches;

// ---------------- spec derivation ----------------

/**
 * Weapon/relic archetypes. The first 12 mirror the SVG GLYPHS in
 * gameController; the next 9 are the Secret/Apex-tier glyphs from v11
 * classes.js (which the 2D layer still falls back to a sword for — the 3D
 * layer gives each its true relic).
 */
export const GLYPH_ARCHETYPES = ['sword', 'axe', 'shield', 'dagger', 'staff', 'scythe',
  'bow', 'fist', 'skull', 'lute', 'tower', 'runeblade',
  'crown', 'halo', 'thorn', 'sun', 'banner', 'rune', 'moon', 'flame', 'compass'];

const MONSTER_GLYPHS = ['axe', 'dagger', 'fist', 'scythe', 'skull'];

export function rigSpecFromPortrait(portrait, { bulk = 1 } = {}) {
  return {
    tint: (portrait && portrait.tint) || '#8a8a9a',
    glyph: GLYPH_ARCHETYPES.includes(portrait && portrait.glyph) ? portrait.glyph : 'sword',
    bulk,
  };
}

/**
 * v17: deterministic HUMANOID spec for PvP opponents — bots and ghost
 * players must look like adventurers, not skeleton beasts. Same name-hash
 * determinism, but drawn from the player-class archetypes.
 */
export function humanoidSpecFromName(name) {
  let h = 2166136261;
  const s = String(name || 'ผู้ท้าชิงนิรนาม');
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  h = Math.abs(h);
  return { tint: `hsl(${h % 360}, 42%, 48%)`, glyph: GLYPH_ARCHETYPES[h % GLYPH_ARCHETYPES.length], bulk: 1 };
}

/** Deterministic monster spec: same name → same look, every session. */
export function rigSpecFromName(name, bulk = 1) {
  let h = 2166136261;
  const s = String(name || 'หมอกไร้นาม');
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  h = Math.abs(h);
  const hue = h % 360;
  const glyph = MONSTER_GLYPHS[h % MONSTER_GLYPHS.length];
  return { tint: `hsl(${hue}, 38%, 42%)`, glyph, bulk, monster: true };
}

// ---------------- palette ----------------

function shade(THREE, hex, mul) {
  const c = new THREE.Color(hex);
  c.multiplyScalar(mul);
  return c;
}

// v13.2: shared 4-step toon gradient — one DataTexture per THREE instance.
// This is what turns smooth Lambert falloff into the hard cel bands of a
// manhwa panel ("Surviving the Game as a Barbarian" look).
const gradientCache = new WeakMap();
function toonGradient(THREE) {
  if (gradientCache.has(THREE)) return gradientCache.get(THREE);
  const tex = new THREE.DataTexture(new Uint8Array([70, 128, 200, 255]), 4, 1, THREE.RedFormat);
  tex.minFilter = THREE.NearestFilter;
  tex.magFilter = THREE.NearestFilter;
  tex.needsUpdate = true;
  gradientCache.set(THREE, tex);
  return tex;
}

function makeMats(THREE, spec) {
  const base = new THREE.Color(spec.tint);
  // MeshToonMaterial + gradient map = cel shading. Falls back to Lambert on
  // stripped-down builds (and the headless test stub) transparently.
  const Toon = THREE.MeshToonMaterial || THREE.MeshLambertMaterial;
  const grad = THREE.MeshToonMaterial ? toonGradient(THREE) : null;
  const toon = (color) => {
    const mt = new Toon({ color });
    if (grad) mt.gradientMap = grad;
    return mt;
  };
  return {
    armor: toon(base),
    armorDark: toon(shade(THREE, spec.tint, 0.45)),
    cloth: toon(shade(THREE, spec.tint, 0.3)),
    skin: toon(spec.monster ? shade(THREE, spec.tint, 0.75) : new THREE.Color(0xc9ad8b)),
    metal: toon(new THREE.Color(0x8e8b9e)),
    wood: toon(new THREE.Color(0x4e3a2c)),
    glow: new THREE.MeshBasicMaterial({ color: base.clone().offsetHSL(0, 0.15, 0.25) }),
    bone: toon(new THREE.Color(0xd9d2c0)),
    // ink outline: back-face shells drawn behind every solid mesh
    outline: new THREE.MeshBasicMaterial({ color: 0x0a0810, side: THREE.BackSide }),
  };
}

/**
 * v13.2 manhwa ink lines: every solid mesh gets a slightly-inflated
 * back-face shell in near-black — the classic inverted-hull outline.
 * Shells share the parent's geometry (no extra buffers), are flagged
 * isOutline so applyGear never re-tints them, and inherit visibility by
 * being children of the mesh they outline.
 */
function addOutlines(THREE, rig, mats, thickness = 1.06) {
  const targets = [];
  rig.traverse((o) => {
    if (o.geometry && o.material && o.material !== mats.glow && !o.userData.isOutline) targets.push(o);
  });
  for (const o of targets) {
    const shell = new THREE.Mesh(o.geometry, mats.outline);
    shell.scale.setScalar(thickness);
    shell.userData.isOutline = true;
    o.add(shell);
  }
}

// ---------------- weapon builders (one per glyph) ----------------
// Each returns a Group positioned for the right hand at local origin.

const WEAPONS = {
  sword(THREE, m) {
    const g = new THREE.Group();
    g.add(mesh(THREE, new THREE.BoxGeometry(0.08, 1.1, 0.02), m.metal, 0, 0.62, 0));
    g.add(mesh(THREE, new THREE.BoxGeometry(0.3, 0.06, 0.06), m.armorDark, 0, 0.1, 0));
    g.add(mesh(THREE, new THREE.CylinderGeometry(0.035, 0.035, 0.22, 6), m.wood, 0, -0.06, 0));
    return g;
  },
  axe(THREE, m) {
    const g = new THREE.Group();
    g.add(mesh(THREE, new THREE.CylinderGeometry(0.04, 0.04, 1.0, 6), m.wood, 0, 0.4, 0));
    g.add(mesh(THREE, new THREE.BoxGeometry(0.34, 0.3, 0.05), m.metal, 0.16, 0.82, 0));
    return g;
  },
  shield(THREE, m) { // sword + heater shield on the off hand
    const g = WEAPONS.sword(THREE, m);
    const sh = mesh(THREE, new THREE.CylinderGeometry(0.3, 0.22, 0.06, 6), m.armor, -1.0, 0.2, 0.1);
    sh.rotation.x = Math.PI / 2;
    g.add(sh);
    return g;
  },
  dagger(THREE, m) { // twin blades
    const g = new THREE.Group();
    g.add(mesh(THREE, new THREE.ConeGeometry(0.05, 0.5, 4), m.metal, 0, 0.3, 0));
    g.add(mesh(THREE, new THREE.ConeGeometry(0.05, 0.5, 4), m.metal, -1.0, 0.3, 0));
    return g;
  },
  staff(THREE, m) {
    const g = new THREE.Group();
    g.add(mesh(THREE, new THREE.CylinderGeometry(0.035, 0.05, 1.5, 6), m.wood, 0, 0.55, 0));
    g.add(mesh(THREE, new THREE.SphereGeometry(0.12, 10, 8), m.glow, 0, 1.4, 0));
    return g;
  },
  scythe(THREE, m) {
    const g = new THREE.Group();
    g.add(mesh(THREE, new THREE.CylinderGeometry(0.035, 0.045, 1.5, 6), m.wood, 0, 0.55, 0));
    const blade = mesh(THREE, new THREE.TorusGeometry(0.3, 0.035, 6, 12, Math.PI * 0.9), m.metal, 0.24, 1.28, 0);
    blade.rotation.z = -0.6;
    g.add(blade);
    return g;
  },
  bow(THREE, m) {
    const g = new THREE.Group();
    const arc = mesh(THREE, new THREE.TorusGeometry(0.5, 0.03, 6, 14, Math.PI * 1.15), m.wood, 0, 0.45, 0);
    arc.rotation.z = Math.PI / 2 - 0.55;
    g.add(arc);
    return g;
  },
  fist(THREE, m) { // oversized gauntlets, both hands
    const g = new THREE.Group();
    g.add(mesh(THREE, new THREE.SphereGeometry(0.17, 8, 6), m.metal, 0, 0.05, 0));
    g.add(mesh(THREE, new THREE.SphereGeometry(0.17, 8, 6), m.metal, -1.0, 0.05, 0));
    return g;
  },
  skull(THREE, m) { // a floating servitor skull, hovering off-hand
    const g = new THREE.Group();
    const sk = new THREE.Group();
    sk.add(mesh(THREE, new THREE.SphereGeometry(0.15, 10, 8), m.bone, 0, 0, 0));
    sk.add(mesh(THREE, new THREE.BoxGeometry(0.16, 0.09, 0.1), m.bone, 0, -0.13, 0.03));
    sk.add(mesh(THREE, new THREE.SphereGeometry(0.03, 6, 4), m.glow, -0.05, 0.02, 0.13));
    sk.add(mesh(THREE, new THREE.SphereGeometry(0.03, 6, 4), m.glow, 0.05, 0.02, 0.13));
    sk.position.set(-1.15, 0.9, 0.15);
    sk.name = 'familiar';
    g.add(sk);
    g.add(mesh(THREE, new THREE.CylinderGeometry(0.035, 0.05, 1.3, 6), m.wood, 0, 0.5, 0));
    return g;
  },
  lute(THREE, m) {
    const g = new THREE.Group();
    g.add(mesh(THREE, new THREE.SphereGeometry(0.22, 10, 8), m.wood, 0, 0.15, 0));
    g.add(mesh(THREE, new THREE.BoxGeometry(0.06, 0.6, 0.04), m.wood, 0, 0.55, 0));
    g.add(mesh(THREE, new THREE.BoxGeometry(0.14, 0.08, 0.05), m.armorDark, 0, 0.86, 0));
    return g;
  },
  tower(THREE, m) { // massive tower shield + short mace
    const g = new THREE.Group();
    g.add(mesh(THREE, new THREE.BoxGeometry(0.5, 1.1, 0.07), m.armor, -1.0, 0.4, 0.12));
    g.add(mesh(THREE, new THREE.CylinderGeometry(0.04, 0.04, 0.5, 6), m.wood, 0, 0.2, 0));
    g.add(mesh(THREE, new THREE.SphereGeometry(0.1, 8, 6), m.metal, 0, 0.5, 0));
    return g;
  },
  // ---- v11 Secret/Apex relics ----
  crown(THREE, m) { // a sovereign's floating crown above the hand
    const g = new THREE.Group();
    const ring = mesh(THREE, new THREE.TorusGeometry(0.22, 0.045, 6, 12), m.glow, 0, 0.9, 0);
    ring.rotation.x = Math.PI / 2;
    ring.name = 'familiar';
    g.add(ring);
    for (let i = 0; i < 4; i++) {
      g.add(mesh(THREE, new THREE.ConeGeometry(0.04, 0.14, 4), m.glow,
        Math.cos(i * Math.PI / 2) * 0.22, 0.98, Math.sin(i * Math.PI / 2) * 0.22));
    }
    g.add(mesh(THREE, new THREE.CylinderGeometry(0.035, 0.045, 1.1, 6), m.metal, 0, 0.4, 0));
    return g;
  },
  halo(THREE, m) { // hollow saint — the halo hangs where a weapon would
    const g = new THREE.Group();
    const halo = mesh(THREE, new THREE.TorusGeometry(0.5, 0.03, 8, 20), m.glow, -1.0, 1.55, -0.1);
    halo.rotation.x = Math.PI / 2.6;
    halo.name = 'familiar';
    g.add(halo);
    g.add(mesh(THREE, new THREE.CylinderGeometry(0.03, 0.04, 1.2, 6), m.bone, 0, 0.45, 0));
    return g;
  },
  thorn(THREE, m) { // plague — a barbed lash of thorns
    const g = new THREE.Group();
    const stem = mesh(THREE, new THREE.CylinderGeometry(0.03, 0.05, 1.2, 6), m.armorDark, 0, 0.5, 0);
    stem.rotation.z = -0.35;
    g.add(stem);
    for (let i = 0; i < 5; i++) {
      const th = mesh(THREE, new THREE.ConeGeometry(0.035, 0.14, 4), m.glow,
        0.16 + i * 0.05, 0.25 + i * 0.22, 0);
      th.rotation.z = -1.2;
      g.add(th);
    }
    return g;
  },
  sun(THREE, m) { // dawnbreaker — a blazing orb with rays
    const g = new THREE.Group();
    g.add(mesh(THREE, new THREE.CylinderGeometry(0.04, 0.05, 1.3, 6), m.metal, 0, 0.45, 0));
    g.add(mesh(THREE, new THREE.SphereGeometry(0.16, 10, 8), m.glow, 0, 1.25, 0));
    for (let i = 0; i < 6; i++) {
      const ray = mesh(THREE, new THREE.ConeGeometry(0.03, 0.16, 4), m.glow,
        Math.cos(i * Math.PI / 3) * 0.26, 1.25 + Math.sin(i * Math.PI / 3) * 0.26, 0);
      ray.rotation.z = -i * Math.PI / 3 - Math.PI / 2;
      g.add(ray);
    }
    return g;
  },
  banner(THREE, m) { // grave marshal — a war standard
    const g = new THREE.Group();
    g.add(mesh(THREE, new THREE.CylinderGeometry(0.035, 0.045, 1.7, 6), m.wood, 0, 0.65, 0));
    g.add(mesh(THREE, new THREE.BoxGeometry(0.5, 0.42, 0.02), m.armor, 0.28, 1.25, 0));
    g.add(mesh(THREE, new THREE.SphereGeometry(0.06, 8, 6), m.glow, 0, 1.55, 0));
    return g;
  },
  rune(THREE, m) { // rune prophet — a floating rune tablet
    const g = new THREE.Group();
    const stone = new THREE.Group();
    stone.add(mesh(THREE, new THREE.BoxGeometry(0.3, 0.42, 0.08), m.armorDark, 0, 0, 0));
    stone.add(mesh(THREE, new THREE.BoxGeometry(0.16, 0.05, 0.09), m.glow, 0, 0.08, 0));
    stone.add(mesh(THREE, new THREE.BoxGeometry(0.05, 0.16, 0.09), m.glow, 0, -0.08, 0));
    stone.position.set(-1.0, 0.9, 0.15);
    stone.name = 'familiar';
    g.add(stone);
    g.add(mesh(THREE, new THREE.CylinderGeometry(0.035, 0.05, 1.3, 6), m.wood, 0, 0.5, 0));
    return g;
  },
  moon(THREE, m) { // moonveil — a crescent glaive
    const g = new THREE.Group();
    g.add(mesh(THREE, new THREE.CylinderGeometry(0.035, 0.045, 1.4, 6), m.metal, 0, 0.5, 0));
    const crescent = mesh(THREE, new THREE.TorusGeometry(0.26, 0.04, 6, 14, Math.PI * 1.2), m.glow, 0, 1.3, 0);
    crescent.rotation.z = Math.PI * 0.9;
    g.add(crescent);
    return g;
  },
  flame(THREE, m) { // ash queen — a brazier stave of living fire
    const g = new THREE.Group();
    g.add(mesh(THREE, new THREE.CylinderGeometry(0.04, 0.05, 1.3, 6), m.armorDark, 0, 0.45, 0));
    g.add(mesh(THREE, new THREE.ConeGeometry(0.14, 0.3, 6), m.glow, 0, 1.3, 0));
    g.add(mesh(THREE, new THREE.ConeGeometry(0.08, 0.2, 5), m.glow, 0.06, 1.45, 0.02));
    return g;
  },
  compass(THREE, m) { // world's edge — a spinning astrolabe
    const g = new THREE.Group();
    const orb = new THREE.Group();
    orb.name = 'familiar';
    const r1 = mesh(THREE, new THREE.TorusGeometry(0.24, 0.025, 6, 16), m.glow, 0, 0, 0);
    const r2 = mesh(THREE, new THREE.TorusGeometry(0.24, 0.025, 6, 16), m.metal, 0, 0, 0);
    r2.rotation.y = Math.PI / 2;
    const r3 = mesh(THREE, new THREE.TorusGeometry(0.24, 0.025, 6, 16), m.metal, 0, 0, 0);
    r3.rotation.x = Math.PI / 2;
    orb.add(r1, r2, r3, mesh(THREE, new THREE.SphereGeometry(0.06, 8, 6), m.glow, 0, 0, 0));
    orb.position.set(-1.0, 1.0, 0.15);
    g.add(orb);
    g.add(mesh(THREE, new THREE.CylinderGeometry(0.035, 0.045, 1.2, 6), m.metal, 0, 0.45, 0));
    return g;
  },
  runeblade(THREE, m) { // greatsword with emissive rune studs
    const g = new THREE.Group();
    g.add(mesh(THREE, new THREE.BoxGeometry(0.12, 1.35, 0.03), m.metal, 0, 0.75, 0));
    for (let i = 0; i < 3; i++) {
      g.add(mesh(THREE, new THREE.BoxGeometry(0.05, 0.05, 0.05), m.glow, 0, 0.4 + i * 0.32, 0));
    }
    g.add(mesh(THREE, new THREE.BoxGeometry(0.34, 0.07, 0.07), m.armorDark, 0, 0.06, 0));
    return g;
  },
};

function mesh(THREE, geo, mat, x = 0, y = 0, z = 0) {
  const me = new THREE.Mesh(geo, mat);
  me.position.set(x, y, z);
  return me;
}

// ---------------- the rig ----------------

/**
 * Build one character. Pure THREE — no DOM, no renderer. The returned Group
 * carries named parts (head/body/armL/armR/cloak/gear_*) so animateRig and
 * applyGear can address them, plus userData.spec for cache keys.
 *
 * v13.2 SILHOUETTE REWORK: chibi is gone. Proportions are now heroic
 * (~1:8 head-to-height), with a V-tapered torso, wide pauldron line,
 * muscular arms, long legs and a squared jaw under a shadowing hood —
 * the gritty manhwa read, sealed by cel shading + ink outlines above.
 * Standing height ≈ 2.3 units before rig scale.
 */
export function buildCharacterRig(THREE, spec) {
  const m = makeMats(THREE, spec);
  const rig = new THREE.Group();
  rig.userData.spec = spec;
  rig.userData.mats = m;
  const b = spec.bulk || 1;

  // Legs — long, planted wide.
  rig.add(mesh(THREE, new THREE.CylinderGeometry(0.12 * b, 0.15 * b, 0.8, 8), m.armorDark, -0.19 * b, 0.5, 0));
  rig.add(mesh(THREE, new THREE.CylinderGeometry(0.12 * b, 0.15 * b, 0.8, 8), m.armorDark, 0.19 * b, 0.5, 0));
  // Hips
  rig.add(mesh(THREE, new THREE.CylinderGeometry(0.3 * b, 0.33 * b, 0.28, 10), m.cloth, 0, 0.98, 0));

  // Torso — inverted taper: broad chest down to a tight waist.
  const body = mesh(THREE, new THREE.CylinderGeometry(0.44 * b, 0.27 * b, 0.75, 10), m.cloth, 0, 1.42, 0);
  body.name = 'body';
  rig.add(body);
  // chest slab pushes the pecs forward — reads muscular even in silhouette
  rig.add(mesh(THREE, new THREE.BoxGeometry(0.56 * b, 0.3, 0.18), m.cloth, 0, 1.6, 0.14));

  // Neck + head — SMALL. A quarter of the old chibi sphere.
  rig.add(mesh(THREE, new THREE.CylinderGeometry(0.09, 0.11, 0.16, 8), m.skin, 0, 1.86, 0));
  const head = new THREE.Group();
  head.name = 'head';
  head.position.set(0, 2.06, 0);
  head.userData.baseY = 2.06;
  head.add(mesh(THREE, new THREE.SphereGeometry(0.24, 12, 10), m.skin));
  // squared jaw — the single strongest anti-chibi cue
  head.add(mesh(THREE, new THREE.BoxGeometry(0.26, 0.14, 0.2), m.skin, 0, -0.12, 0.03));
  // deep hood + brow shadow: eyes sit in darkness, manhwa-style
  const cap = mesh(THREE, new THREE.SphereGeometry(0.28, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.6), m.armorDark, 0, 0.02, -0.03);
  cap.name = 'cap';
  head.add(cap);
  head.add(mesh(THREE, new THREE.BoxGeometry(0.4, 0.08, 0.2), m.armorDark, 0, 0.08, 0.14));
  if (spec.monster) { // glowing eyes burn out of the hood shadow
    head.add(mesh(THREE, new THREE.SphereGeometry(0.035, 6, 4), m.glow, -0.09, 0.0, 0.21));
    head.add(mesh(THREE, new THREE.SphereGeometry(0.035, 6, 4), m.glow, 0.09, 0.0, 0.21));
  }
  rig.add(head);

  // Shoulders + arms — heavy pauldron line, thick upper arms, gauntleted fists.
  const mkArm = (side) => {
    const arm = new THREE.Group();
    arm.name = side > 0 ? 'armR' : 'armL';
    arm.position.set(0.52 * b * side, 1.68, 0);
    arm.add(mesh(THREE, new THREE.SphereGeometry(0.2 * b, 8, 6), m.armor)); // pauldron
    const upper = mesh(THREE, new THREE.CylinderGeometry(0.12 * b, 0.1 * b, 0.75, 8), m.cloth, 0.06 * side, -0.42, 0);
    upper.rotation.z = -0.12 * side;
    arm.add(upper);
    arm.add(mesh(THREE, new THREE.SphereGeometry(0.11 * b, 8, 6), m.skin, 0.12 * side, -0.78, 0.02)); // fist
    return arm;
  };
  rig.add(mkArm(1), mkArm(-1));

  // Cloak — longer, heavier, hanging off the pauldron line.
  const cloak = mesh(THREE, new THREE.ConeGeometry(0.55 * b, 1.6, 8, 1, true), m.armorDark, 0, 1.15, -0.18);
  cloak.name = 'cloak';
  rig.add(cloak);

  // Weapon into the right hand, scaled up ~35% to match the taller frame.
  // Off-hand pieces (shields, twin blades, the servitor skull) are authored
  // at local x ≤ -0.9; snap them to mirror the left hand.
  const weapon = WEAPONS[spec.glyph](THREE, m);
  weapon.name = 'weapon';
  weapon.position.set(0.66 * b, 0.9, 0.12);
  weapon.scale.setScalar(1.35);
  weapon.children.forEach((c) => {
    if (c.position.x <= -0.9) c.position.x = (c.name === 'familiar' ? -1.05 : -0.98) * b;
  });
  rig.add(weapon);

  // --- paper-doll gear meshes: hidden until applyGear() shows them ---
  // Slot keys match EquipmentSlot exactly (chest = legacy 'armor').
  // v13.2: repositioned onto the tall frame.
  const gear = {
    head: (() => { // a proper dome helm with a crest, sitting over the hood
      const helm = new THREE.Group();
      helm.add(mesh(THREE, new THREE.SphereGeometry(0.3, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.62), m.metal, 0, 0, 0));
      helm.add(mesh(THREE, new THREE.BoxGeometry(0.06, 0.16, 0.36), m.metal, 0, 0.2, 0));
      helm.position.set(0, 2.12, 0);
      return helm;
    })(),
    armor: (() => { // chest plate + belt line, following the V-taper
      const pl = new THREE.Group();
      pl.add(mesh(THREE, new THREE.CylinderGeometry(0.47 * b, 0.3 * b, 0.62, 10), m.armor, 0, 0, 0));
      pl.add(mesh(THREE, new THREE.CylinderGeometry(0.33 * b, 0.35 * b, 0.1, 10), m.metal, 0, -0.38, 0));
      pl.position.set(0, 1.45, 0);
      return pl;
    })(),
    legs: mesh(THREE, new THREE.CylinderGeometry(0.34 * b, 0.4 * b, 0.42, 10), m.armor, 0, 0.78, 0),
    boots: (() => {
      const bo = new THREE.Group();
      bo.add(mesh(THREE, new THREE.BoxGeometry(0.2 * b, 0.2, 0.34), m.metal, -0.19 * b, 0, 0.05));
      bo.add(mesh(THREE, new THREE.BoxGeometry(0.2 * b, 0.2, 0.34), m.metal, 0.19 * b, 0, 0.05));
      bo.position.set(0, 0.1, 0);
      return bo;
    })(),
    necklace: mesh(THREE, new THREE.TorusGeometry(0.17, 0.03, 6, 14), m.glow, 0, 1.74, 0.24),
    ring: mesh(THREE, new THREE.TorusGeometry(0.08, 0.028, 6, 10), m.glow, 0.66 * b, 0.88, 0.14),
    bracelet: mesh(THREE, new THREE.TorusGeometry(0.12, 0.035, 6, 10), m.metal, -0.62 * b, 1.0, 0.02),
    weapon: (() => { // an aura ring around the held weapon — rarity-colored
      const ring = mesh(THREE, new THREE.TorusGeometry(0.3, 0.03, 6, 16), m.glow, 0.66 * b, 1.5, 0.12);
      ring.rotation.x = Math.PI / 2;
      return ring;
    })(),
  };
  gear.necklace.rotation.x = Math.PI / 2.4;
  gear.bracelet.rotation.z = Math.PI / 2;
  // glow-based pieces must never go dark from a muted rarity color —
  // applyGear lifts their lightness (common-grey aura was invisible before)
  [gear.necklace, gear.ring, gear.weapon].forEach((g) => { g.userData.keepBright = true; });
  Object.entries(gear).forEach(([slot, g]) => {
    g.name = `gear_${slot}`;
    g.visible = false;
    rig.add(g);
  });

  // Ink every solid surface LAST, so gear pieces get outlines too.
  addOutlines(THREE, rig, m);

  rig.scale.setScalar(0.78 + 0.22 * (b - 1));
  return rig;
}

/**
 * Reflect the 8-slot paper-doll on the model: equipping shows the slot's
 * mesh (or mesh group), tinted by the item's rarity color when available.
 * Glow pieces marked keepBright get a lightness lift so a muted common-grey
 * rarity can never render them invisible. Passing null hides everything
 * (fresh characters, class-select previews).
 */
export function applyGear(rig, equipment) {
  const roots = [];
  rig.traverse((o) => { if (o.name && o.name.startsWith('gear_')) roots.push(o); });
  roots.forEach((root) => {
    const slot = root.name.slice(5);
    const item = equipment && equipment[slot];
    root.visible = !!item;
    const color = item && item.rarity && item.rarity.color;
    if (!color) return;
    const bright = !!root.userData.keepBright;
    root.traverse((o) => {
      if (!o.material || !o.material.color || o.userData.isOutline) return; // never tint ink lines
      o.material = o.material.clone();
      o.material.color.set(color);
      if (bright) o.material.color.offsetHSL(0, 0.1, 0.22);
    });
  });
}

/** Idle life: breathing body, bobbing head, swaying cloak, hovering familiar. */
export function animateRig(rig, t, phase = 0) {
  if (REDUCED) return;
  const head = rig.getObjectByName('head');
  const cloak = rig.getObjectByName('cloak');
  const weapon = rig.getObjectByName('weapon');
  const body = rig.getObjectByName('body');
  if (body) body.scale.y = 1 + Math.sin(t * 1.7 + phase) * 0.02;
  if (head) head.position.y = (head.userData.baseY || 2.06) + Math.sin(t * 1.7 + phase) * 0.02;
  if (cloak) cloak.rotation.z = Math.sin(t * 0.9 + phase) * 0.05;
  if (weapon) {
    weapon.rotation.z = Math.sin(t * 1.1 + phase) * 0.04;
    const fam = weapon.getObjectByName('familiar');
    if (fam) fam.position.y = 0.9 + Math.sin(t * 2.1 + phase) * 0.08;
  }
}

// ---------------- v15 unified rig factory ----------------

/**
 * The ONE way stages obtain a character now. Tries the sculpted glTF model
 * first (model-library.js); if the loaders or the GLB can't be fetched, the
 * procedural primitive rig from this file steps back in — same wrapper
 * interface either way, so stages never know which one they got:
 *
 *   { group, isModel, update(dt), react(kind), setEquipment(eq), dispose() }
 */
export async function createRig(THREE, spec, { loaders = undefined, equipment = null } = {}) {
  const lo = loaders === undefined ? await loadAddons() : loaders;
  if (lo) {
    try {
      const model = await loadModelRig(THREE, lo, spec);
      attachGearAnchors(THREE, model, spec);
      applyGear(model.group, equipment);
      return {
        group: model.group,
        isModel: true,
        update(dt) { if (!REDUCED) model.update(dt); },
        react(kind) { model.react(kind); },
        setEquipment(eq) { applyGear(model.group, eq); },
        dispose() { model.dispose(); },
      };
    } catch (err) {
      console.warn(`model rig failed for ${spec.glyph || 'monster'} — procedural fallback:`, err.message);
    }
  }
  // procedural fallback (the v13.2 toon rig)
  const group = buildCharacterRig(THREE, spec);
  applyGear(group, equipment);
  let t = 0;
  return {
    group,
    isModel: false,
    update(dt) { t += dt; animateRig(group, t, spec.bulk || 0); },
    react() { /* stages provide positional fx for primitive rigs */ },
    setEquipment(eq) { applyGear(group, eq); },
    dispose() {
      group.traverse((o) => { o.geometry && o.geometry.dispose(); });
      Object.values(group.userData.mats || {}).forEach((m2) => m2.dispose && m2.dispose());
    },
  };
}

/**
 * v15 gear on sculpted models: glow accents anchored to REAL BONES where
 * possible (helm on the head bone, ring on the right hand, bracelet on the
 * left) so they ride the animations; torso/leg pieces hang at fixed heights
 * on the group. Same gear_<slot> naming, so applyGear works unchanged.
 */
function attachGearAnchors(THREE, model, spec) {
  const glow = new THREE.MeshBasicMaterial({ color: new THREE.Color(spec.tint).offsetHSL(0, 0.15, 0.28) });
  const metal = new THREE.MeshBasicMaterial({ color: 0xb9b4c6 });
  const put = (parent, name, geo, mat, x = 0, y = 0, z = 0, keepBright = false) => {
    if (!parent) return;
    const me = new THREE.Mesh(geo, mat);
    me.position.set(x, y, z);
    me.name = name;
    me.visible = false;
    if (keepBright) me.userData.keepBright = true;
    parent.add(me);
    return me;
  };
  const g = model.group, a = model.anchors;
  // v17: NEVER chain off put() — a missing bone (skeleton bodies, future
  // packs) returns undefined, and one throw here used to sink the whole
  // model into the primitive fallback. Missing anchor = that accent simply
  // doesn't render; the model itself must always survive.
  const rotX = (me, v) => { if (me) me.rotation.x = v; return me; };
  rotX(put(a.head || g, 'gear_head', new THREE.TorusGeometry(0.24, 0.035, 6, 14), metal, 0, a.head ? 0.16 : 1.55, 0), Math.PI / 2);
  put(a.handR, 'gear_ring', new THREE.TorusGeometry(0.07, 0.025, 6, 10), glow, 0, 0.02, 0, true);
  rotX(put(a.handR, 'gear_weapon', new THREE.TorusGeometry(0.2, 0.028, 6, 16), glow, 0, 0.05, 0, true), Math.PI / 2);
  put(a.handL, 'gear_bracelet', new THREE.TorusGeometry(0.09, 0.028, 6, 10), metal, 0, 0.02, 0);
  const neck = put(g, 'gear_necklace', new THREE.TorusGeometry(0.14, 0.028, 6, 14), glow, 0, 1.32, 0.14, true);
  if (neck) neck.rotation.x = Math.PI / 2.3;
  put(g, 'gear_armor', new THREE.TorusGeometry(0.34, 0.03, 6, 18), metal, 0, 1.0, 0);
  put(g, 'gear_legs', new THREE.TorusGeometry(0.28, 0.03, 6, 18), metal, 0, 0.55, 0);
  put(g, 'gear_boots', new THREE.TorusGeometry(0.3, 0.03, 6, 18), metal, 0, 0.12, 0);
  ['gear_armor', 'gear_legs', 'gear_boots'].forEach((n) => {
    const o = g.getObjectByName(n);
    if (o) o.rotation.x = Math.PI / 2;
  });
}

// ---------------- v17.3 auto-framing ----------------

/**
 * Fit a camera to a measured bounding box — the durable fix for cropped
 * helms. Every body/pose/weapon has a different height (a Spellblade's
 * raised greatsword tops a Rogue by half a metre), so hand-tuned camera
 * constants kept clipping someone. Now the stage MEASURES the rig and
 * solves the camera distance from the vertical FOV (and the horizontal one
 * via aspect, so narrow hosts fit by width instead of cropping shoulders).
 * Pure math — no renderer — so test-models.mjs can prove, per body, that
 * the box's top projects inside the frustum.
 */
export function frameCameraToBox(camera, box, { vMargin = 1.22, hMargin = 1.18, lift = 0.04 } = {}) {
  const h = Math.max(0.001, box.max.y - box.min.y);
  const w = Math.max(box.max.x - box.min.x, box.max.z - box.min.z);
  const centerY = (box.max.y + box.min.y) / 2;
  const vfov = (camera.fov * Math.PI) / 180;
  const distV = (h * vMargin / 2) / Math.tan(vfov / 2);
  const distH = (w * hMargin / 2) / (Math.tan(vfov / 2) * Math.max(0.2, camera.aspect));
  const dist = Math.max(distV, distH, h * 0.8);
  camera.position.set(0, centerY + h * lift, dist);
  camera.lookAt(0, centerY, 0);
  camera.updateProjectionMatrix();
  return dist;
}

/** Waist-up bust: anchor at the TOP of the box (helm always in frame), show ~58% down. */
export function frameCameraToBust(camera, box) {
  const h = Math.max(0.001, box.max.y - box.min.y);
  const visH = h * 0.58;
  // v17.3.1: center the window so the box top sits at 88% of the frame —
  // the first formula put it at 105% and the frustum test caught it.
  const cy = box.max.y - visH * 0.44;
  const vfov = (camera.fov * Math.PI) / 180;
  const dist = (visH / 2) / Math.tan(vfov / 2);
  camera.position.set(0.12, cy, dist);
  camera.lookAt(0, cy, 0);
  camera.updateProjectionMatrix();
}

// ---------------- shared lighting recipe ----------------

function addStageLights(THREE, scene, tint) {
  // v13.1: lifted ~15% — dark class tints (gravewarden green, warlock
  // violet) were reading as near-black silhouettes on the doll screen.
  scene.add(new THREE.HemisphereLight(0x8a7fae, 0x201a28, 1.05));
  const key = new THREE.DirectionalLight(0xf0e6d8, 1.35);
  key.position.set(2.5, 4, 3);
  scene.add(key);
  const rim = new THREE.DirectionalLight(new THREE.Color(tint || '#8a7ad0'), 0.8);
  rim.position.set(-3, 2, -3);
  scene.add(rim);
}

// ---------------- snapshot factory (thumbnails, class cards) ----------------

/**
 * ONE hidden renderer serves every thumbnail in the game. Browsers cap live
 * WebGL contexts (~8-16); rendering 26 class cards each with their own
 * context would silently kill the background scene. Render → toDataURL →
 * dispose keeps us at a constant single context.
 */
export class SnapshotFactory {
  constructor(THREE, size = 160) {
    this.THREE = THREE;
    this.size = size;
    this.cache = new Map();
    this.canvas = document.createElement('canvas');
    this.renderer = new this.THREE.WebGLRenderer({ canvas: this.canvas, antialias: true, alpha: true });
    this.renderer.setSize(size, size);
  }

  keyOf(spec) { return `${spec.tint}|${spec.glyph}|${spec.bulk || 1}|${spec.monster ? 1 : 0}`; }

  /** v15: spec → Promise<PNG dataURL> (cached). Renders the sculpted model
   * when available, the procedural rig otherwise. Serialized through a
   * queue — one hidden renderer serves every thumbnail in the game. */
  snapshot(spec) {
    const key = this.keyOf(spec);
    if (this.cache.has(key)) return this.cache.get(key);
    const job = (this._queue = (this._queue || Promise.resolve()).then(async () => {
      const THREE = this.THREE;
      const scene = new THREE.Scene();
      addStageLights(THREE, scene, spec.tint);
      const rig = await createRig(THREE, spec);
      rig.update(0.001); // settle the idle pose
      rig.group.rotation.y = -0.35; // three-quarter hero angle
      scene.add(rig.group);
      // v17.3: measured bust — anchored to the rig's REAL top so no helm
      // crest or raised blade is ever clipped, on any body.
      const cam = new THREE.PerspectiveCamera(34, 1, 0.1, 20);
      frameCameraToBust(cam, new THREE.Box3().setFromObject(rig.group));
      this.renderer.render(scene, cam);
      const url = this.canvas.toDataURL('image/png');
      rig.dispose();
      return url;
    }));
    this.cache.set(key, job);
    return job;
  }

  dispose() { this.renderer.dispose(); this.cache.clear(); }
}

// ---------------- live single-character stage ----------------

/** A slowly-turning live model inside any host element (paper-doll screen). */
export class CharacterStage {
  constructor(THREE, host, spec, { equipment = null } = {}) {
    this.THREE = THREE;
    this.host = host;
    const w = host.clientWidth || 160, h = host.clientHeight || 200;
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.5));
    this.renderer.setSize(w, h);
    this.renderer.domElement.classList.add('stage3d-canvas');
    host.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();
    addStageLights(THREE, this.scene, spec.tint);
    this.rig = null; // v15: arrives async — the pedestal renders alone until then
    this.ready = createRig(THREE, spec, { equipment }).then((rig) => {
      if (!this.alive) { rig.dispose(); return; }
      this.rig = rig;
      this.scene.add(rig.group);
      // v17.3: measure THIS rig and fit the camera to it (see frameCameraToBox)
      this._rigBox = new THREE.Box3().setFromObject(rig.group);
      frameCameraToBox(this.camera, this._rigBox);
    });
    // pedestal disc grounds the figure
    const disc = new THREE.Mesh(
      new THREE.CylinderGeometry(0.95, 1.05, 0.08, 24),
      new THREE.MeshLambertMaterial({ color: 0x241d33 }),
    );
    disc.position.y = -0.05;
    this.scene.add(disc);

    // v17.3: these are just the pre-measure defaults — the moment the rig
    // resolves, frameCameraToBox() refits the camera to its true bounds.
    this.camera = new THREE.PerspectiveCamera(34, w / h, 0.1, 20);
    this.camera.position.set(0, 1.25, 3.85);
    this.camera.lookAt(0, 0.92, 0);

    this.clock = new THREE.Clock();
    this.alive = true;
    this._frame = this._frame.bind(this);
    this._frame();
    this._observeResize();
  }

  /**
   * v17.1 RESPONSIVE: the drawing buffer and camera aspect must track the
   * HOST, not the window — scene3d.css stretches the canvas element to 100%
   * of its container, so any mismatch between buffer aspect and container
   * aspect literally squashes the character. A ResizeObserver keeps the two
   * in lock-step through rotations, keyboard popups and layout reflows
   * (with a window-resize fallback for older browsers).
   */
  _observeResize() {
    const apply = () => {
      const w = this.host.clientWidth, h = this.host.clientHeight;
      if (!w || !h) return;
      this.camera.aspect = w / h;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(w, h, false); // false: CSS owns the display size
      if (this._rigBox) frameCameraToBox(this.camera, this._rigBox); // v17.3: refit on new aspect
    };
    if (typeof ResizeObserver !== 'undefined') {
      this._ro = new ResizeObserver(apply);
      this._ro.observe(this.host);
    } else {
      this._onWinResize = apply;
      addEventListener('resize', this._onWinResize);
    }
    apply();
  }

  setEquipment(equipment) { if (this.rig) this.rig.setEquipment(equipment); }

  _frame() {
    if (!this.alive) return;
    requestAnimationFrame(this._frame);
    if (document.hidden || !this.host.isConnected) return;
    const dt = this.clock.getDelta();
    const t = this.clock.getElapsedTime();
    if (this.rig) {
      this.rig.group.rotation.y = REDUCED ? -0.35 : Math.sin(t * 0.4) * 0.55 - 0.1;
      this.rig.update(dt);
    }
    this.renderer.render(this.scene, this.camera);
  }

  dispose() {
    this.alive = false;
    if (this._ro) this._ro.disconnect();
    if (this._onWinResize) removeEventListener('resize', this._onWinResize);
    if (this.rig) this.rig.dispose();
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }
}

// ---------------- battle diorama ----------------

/**
 * The combat backdrop: player left, enemy right, on a fog-wrapped stone
 * table. Purely presentational — combat.js stays the single source of truth;
 * this just mirrors HP/hits the DOM already announces.
 */
export class BattleDiorama {
  constructor(THREE, host, playerSpec, enemySpec, { playerEquipment = null } = {}) {
    this.THREE = THREE;
    this.host = host;
    const w = host.clientWidth || 640, h = host.clientHeight || 220;
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.5));
    this.renderer.setSize(w, h);
    this.renderer.domElement.classList.add('stage3d-canvas');
    host.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.Fog(0x171226, 6, 16);
    addStageLights(THREE, this.scene, playerSpec.tint);

    // v15: both fighters arrive async; the arena renders and each combatant
    // steps onto the table the moment their model resolves.
    this.player = null;
    this.enemy = null;
    this.ready = Promise.all([
      createRig(THREE, playerSpec, { equipment: playerEquipment }).then((rig) => {
        if (!this.alive) { rig.dispose(); return; }
        this.player = rig;
        rig.group.position.set(-1.45, 0, 0); // v17.1: closer duel
        rig.group.rotation.y = 0.9; // face the enemy
        this.scene.add(rig.group);
      }),
      createRig(THREE, enemySpec).then((rig) => {
        if (!this.alive) { rig.dispose(); return; }
        this.enemy = rig;
        rig.group.position.set(1.45, 0, 0);
        rig.group.rotation.y = -0.9;
        this.scene.add(rig.group);
      }),
    ]);

    const ground = new THREE.Mesh(
      new THREE.CylinderGeometry(2.7, 3.0, 0.2, 28), // v17.1: tighter stage
      new THREE.MeshLambertMaterial({ color: 0x201a2e }),
    );
    ground.position.y = -0.12;
    this.scene.add(ground);

    // v17.1 FRAMING: fighters stand at ±1.45 and the camera sits at 4.6 —
    // the pair spans most of the band instead of floating in dead space,
    // with enough margin left for the 0.9-unit attack lunge.
    this.camera = new THREE.PerspectiveCamera(40, w / h, 0.1, 30);
    this.camera.position.set(0, 1.65, 4.6);
    this.camera.lookAt(0, 0.8, 0);

    // transient reaction state: { side, kind, until }
    this.fx = [];
    this.hp = { player: 1, enemy: 1 };
    this.clock = new THREE.Clock();
    this.alive = true;
    this._frame = this._frame.bind(this);
    this._frame();

    // v17.1: host-tracking resize (see CharacterStage._observeResize for why)
    this._onResize = () => {
      const nw = host.clientWidth, nh = host.clientHeight;
      if (!nw || !nh) return;
      this.camera.aspect = nw / nh;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(nw, nh, false);
    };
    if (typeof ResizeObserver !== 'undefined') {
      this._ro = new ResizeObserver(this._onResize);
      this._ro.observe(host);
    }
    addEventListener('resize', this._onResize);
  }

  /** side: 'player'|'enemy' — swing at the foe (real clip on models). */
  attack(side) {
    const rig = this._rigOf(side);
    if (rig && rig.isModel) rig.react('attack');
    this.fx.push({ side, kind: 'attack', t0: this.clock.getElapsedTime(), soft: !!(rig && rig.isModel) });
  }

  /** side took damage — flinch clip on models, recoil either way. */
  hit(side) {
    const rig = this._rigOf(side);
    if (rig && rig.isModel) rig.react('hit');
    this.fx.push({ side, kind: 'hit', t0: this.clock.getElapsedTime(), soft: !!(rig && rig.isModel) });
  }

  setHp(side, ratio) {
    const r = Math.max(0, Math.min(1, ratio));
    const was = this.hp[side];
    this.hp[side] = r;
    const rig = this._rigOf(side);
    if (rig && rig.isModel && r <= 0 && was > 0) rig.react('death'); // v15: a real death animation
  }

  _rigOf(side) { return side === 'player' ? this.player : this.enemy; }

  _frame() {
    if (!this.alive) return;
    requestAnimationFrame(this._frame);
    if (document.hidden || !this.host.isConnected) return;
    const dt = this.clock.getDelta();
    const t = this.clock.getElapsedTime();

    for (const side of ['player', 'enemy']) {
      const rig = this._rigOf(side);
      if (!rig) continue;
      rig.update(dt);
      if (!rig.isModel) {
        // primitive fallback keeps the v13 slump/collapse posing
        const hp = this.hp[side];
        const slump = hp <= 0 ? 1.35 : (1 - hp) * 0.35;
        rig.group.rotation.x = REDUCED ? 0 : slump * 0.6;
        rig.group.position.y = -slump * 0.25;
      }
    }

    // positional fx — full lunge/recoil for primitive rigs, a SOFT nudge for
    // models (their clips carry the motion; a hint of travel sells contact)
    const home = { player: -1.45, enemy: 1.45 }; // v17.1
    if (this.player) this.player.group.position.x = home.player;
    if (this.enemy) this.enemy.group.position.x = home.enemy;
    this.fx = this.fx.filter((fx) => {
      const age = t - fx.t0;
      if (age > 0.35) return false;
      const rig = this._rigOf(fx.side);
      if (!rig) return false;
      const dir = fx.side === 'player' ? 1 : -1;
      const mag = fx.soft ? 0.35 : 1;
      const k = Math.sin((age / 0.35) * Math.PI); // out-and-back
      if (fx.kind === 'attack' && !REDUCED) rig.group.position.x = home[fx.side] + dir * k * 0.9 * mag;
      if (fx.kind === 'hit' && !REDUCED) {
        rig.group.position.x = home[fx.side] - dir * k * 0.35 * mag;
        if (!fx.soft) rig.group.rotation.z = -dir * k * 0.2;
      }
      return true;
    });
    if (!this.fx.length) {
      if (this.player) this.player.group.rotation.z = 0;
      if (this.enemy) this.enemy.group.rotation.z = 0;
    }

    this.renderer.render(this.scene, this.camera);
  }

  dispose() {
    this.alive = false;
    if (this._ro) this._ro.disconnect();
    removeEventListener('resize', this._onResize);
    [this.player, this.enemy].forEach((rig) => rig && rig.dispose());
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }
}
