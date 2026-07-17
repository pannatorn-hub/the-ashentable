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

function makeMats(THREE, spec) {
  const base = new THREE.Color(spec.tint);
  return {
    armor: new THREE.MeshLambertMaterial({ color: base }),
    armorDark: new THREE.MeshLambertMaterial({ color: shade(THREE, spec.tint, 0.55) }),
    cloth: new THREE.MeshLambertMaterial({ color: shade(THREE, spec.tint, 0.35) }),
    skin: new THREE.MeshLambertMaterial({ color: spec.monster ? shade(THREE, spec.tint, 0.8) : 0xd8c2a8 }),
    metal: new THREE.MeshLambertMaterial({ color: 0x9a97a8 }),
    wood: new THREE.MeshLambertMaterial({ color: 0x5a4232 }),
    glow: new THREE.MeshBasicMaterial({ color: base.clone().offsetHSL(0, 0.15, 0.25) }),
    bone: new THREE.MeshLambertMaterial({ color: 0xd9d2c0 }),
  };
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
 */
export function buildCharacterRig(THREE, spec) {
  const m = makeMats(THREE, spec);
  const rig = new THREE.Group();
  rig.userData.spec = spec;
  rig.userData.mats = m;
  const b = spec.bulk || 1;

  // Body — chibi proportions: the head is nearly half the height.
  const body = mesh(THREE, new THREE.CylinderGeometry(0.34 * b, 0.42 * b, 0.85, 10), m.cloth, 0, 0.62, 0);
  body.name = 'body';
  rig.add(body);

  const head = new THREE.Group();
  head.name = 'head';
  head.position.set(0, 1.35, 0);
  head.add(mesh(THREE, new THREE.SphereGeometry(0.4, 14, 12), m.skin));
  // hood/hair cap
  const cap = mesh(THREE, new THREE.SphereGeometry(0.42, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.55), m.armorDark, 0, 0.03, -0.02);
  cap.name = 'cap';
  head.add(cap);
  if (spec.monster) { // glowing eyes read as "monster" instantly at any size
    head.add(mesh(THREE, new THREE.SphereGeometry(0.045, 6, 4), m.glow, -0.13, 0.02, 0.36));
    head.add(mesh(THREE, new THREE.SphereGeometry(0.045, 6, 4), m.glow, 0.13, 0.02, 0.36));
  }
  rig.add(head);

  // Shoulders + arms
  const mkArm = (side) => {
    const arm = new THREE.Group();
    arm.name = side > 0 ? 'armR' : 'armL';
    arm.position.set(0.42 * b * side, 1.0, 0);
    arm.add(mesh(THREE, new THREE.SphereGeometry(0.16 * b, 8, 6), m.armor)); // pauldron
    arm.add(mesh(THREE, new THREE.CylinderGeometry(0.09, 0.08, 0.5, 8), m.cloth, 0.03 * side, -0.3, 0));
    return arm;
  };
  const armR = mkArm(1), armL = mkArm(-1);
  rig.add(armR, armL);

  // Legs
  rig.add(mesh(THREE, new THREE.CylinderGeometry(0.11 * b, 0.13 * b, 0.4, 8), m.armorDark, -0.16 * b, 0.2, 0));
  rig.add(mesh(THREE, new THREE.CylinderGeometry(0.11 * b, 0.13 * b, 0.4, 8), m.armorDark, 0.16 * b, 0.2, 0));

  // Cloak — the dark-fantasy silhouette maker.
  const cloak = mesh(THREE, new THREE.ConeGeometry(0.5 * b, 1.1, 8, 1, true), m.armorDark, 0, 0.75, -0.14);
  cloak.name = 'cloak';
  cloak.material = m.armorDark;
  rig.add(cloak);

  // Weapon into the right hand. Off-hand pieces (shields, twin blades, the
  // servitor skull) are authored at local x ≤ -0.9; snap them to mirror the
  // left hand, scaled by bulk so brutes hold their gear wider.
  const weapon = WEAPONS[spec.glyph](THREE, m);
  weapon.name = 'weapon';
  weapon.position.set(0.55 * b, 0.55, 0.1);
  weapon.children.forEach((c) => {
    if (c.position.x <= -0.9) c.position.x = (c.name === 'familiar' ? -1.15 : -1.05) * b;
  });
  rig.add(weapon);

  // --- v13 paper-doll gear meshes: hidden until applyGear() shows them ---
  const gear = {
    head: mesh(THREE, new THREE.CylinderGeometry(0.43, 0.45, 0.16, 12), m.metal, 0, 1.5, 0),
    chest: mesh(THREE, new THREE.CylinderGeometry(0.37 * b, 0.44 * b, 0.5, 10), m.armor, 0, 0.78, 0),
    legs: mesh(THREE, new THREE.CylinderGeometry(0.36 * b, 0.44 * b, 0.28, 10), m.armor, 0, 0.42, 0),
    boots: mesh(THREE, new THREE.BoxGeometry(0.5 * b, 0.12, 0.34), m.armorDark, 0, 0.04, 0.04),
    necklace: mesh(THREE, new THREE.TorusGeometry(0.18, 0.03, 6, 12), m.glow, 0, 1.05, 0.3),
    ring: mesh(THREE, new THREE.TorusGeometry(0.06, 0.02, 6, 10), m.glow, 0.55 * b, 0.52, 0.1),
    bracelet: mesh(THREE, new THREE.TorusGeometry(0.11, 0.025, 6, 10), m.metal, -0.45 * b, 0.72, 0),
    weapon: mesh(THREE, new THREE.SphereGeometry(0.09, 8, 6), m.glow, 0.55 * b, 1.2, 0.1),
  };
  gear.necklace.rotation.x = Math.PI / 2.4;
  gear.bracelet.rotation.z = Math.PI / 2;
  Object.entries(gear).forEach(([slot, g]) => {
    g.name = `gear_${slot}`;
    g.visible = false;
    rig.add(g);
  });

  rig.scale.setScalar(0.9 + 0.25 * (b - 1));
  return rig;
}

/**
 * Reflect the 8-slot paper-doll on the model: equipping shows the slot's
 * mesh, tinted by the item's rarity color when available. Passing null
 * hides everything (fresh characters, class-select previews).
 */
export function applyGear(rig, equipment) {
  rig.traverse((o) => {
    if (!o.name || !o.name.startsWith('gear_')) return;
    const slot = o.name.slice(5);
    const item = equipment && equipment[slot];
    o.visible = !!item;
    if (item && item.rarity && item.rarity.color && o.material && o.material.color) {
      o.material = o.material.clone();
      o.material.color.set(item.rarity.color);
    }
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
  if (head) head.position.y = 1.35 + Math.sin(t * 1.7 + phase) * 0.025;
  if (cloak) cloak.rotation.z = Math.sin(t * 0.9 + phase) * 0.05;
  if (weapon) {
    weapon.rotation.z = Math.sin(t * 1.1 + phase) * 0.04;
    const fam = weapon.getObjectByName('familiar');
    if (fam) fam.position.y = 0.9 + Math.sin(t * 2.1 + phase) * 0.08;
  }
}

// ---------------- shared lighting recipe ----------------

function addStageLights(THREE, scene, tint) {
  scene.add(new THREE.HemisphereLight(0x7a6f9a, 0x1a1420, 0.9));
  const key = new THREE.DirectionalLight(0xf0e6d8, 1.15);
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

  /** spec → PNG dataURL (cached). */
  snapshot(spec) {
    const key = this.keyOf(spec);
    if (this.cache.has(key)) return this.cache.get(key);
    const THREE = this.THREE;
    const scene = new THREE.Scene();
    addStageLights(THREE, scene, spec.tint);
    const rig = buildCharacterRig(THREE, spec);
    rig.rotation.y = -0.35; // three-quarter hero angle
    scene.add(rig);
    const cam = new THREE.PerspectiveCamera(34, 1, 0.1, 20);
    cam.position.set(0.15, 1.15, 3.4);
    cam.lookAt(0, 0.85, 0);
    this.renderer.render(scene, cam);
    const url = this.canvas.toDataURL('image/png');
    rig.traverse((o) => { o.geometry && o.geometry.dispose(); });
    Object.values(rig.userData.mats || {}).forEach((mat) => mat.dispose && mat.dispose());
    this.cache.set(key, url);
    return url;
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
    this.rig = buildCharacterRig(THREE, spec);
    applyGear(this.rig, equipment);
    this.scene.add(this.rig);
    // pedestal disc grounds the figure
    const disc = new THREE.Mesh(
      new THREE.CylinderGeometry(0.8, 0.9, 0.08, 24),
      new THREE.MeshLambertMaterial({ color: 0x241d33 }),
    );
    disc.position.y = -0.05;
    this.scene.add(disc);

    this.camera = new THREE.PerspectiveCamera(34, w / h, 0.1, 20);
    this.camera.position.set(0, 1.2, 3.6);
    this.camera.lookAt(0, 0.85, 0);

    this.clock = new THREE.Clock();
    this.alive = true;
    this._frame = this._frame.bind(this);
    this._frame();
  }

  setEquipment(equipment) { applyGear(this.rig, equipment); }

  _frame() {
    if (!this.alive) return;
    requestAnimationFrame(this._frame);
    if (document.hidden || !this.host.isConnected) return;
    const t = this.clock.getElapsedTime();
    this.rig.rotation.y = REDUCED ? -0.35 : Math.sin(t * 0.4) * 0.55 - 0.1;
    animateRig(this.rig, t);
    this.renderer.render(this.scene, this.camera);
  }

  dispose() {
    this.alive = false;
    this.rig.traverse((o) => { o.geometry && o.geometry.dispose(); });
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

    this.player = buildCharacterRig(THREE, playerSpec);
    applyGear(this.player, playerEquipment);
    this.player.position.set(-1.7, 0, 0);
    this.player.rotation.y = 0.9; // face the enemy

    this.enemy = buildCharacterRig(THREE, enemySpec);
    this.enemy.position.set(1.7, 0, 0);
    this.enemy.rotation.y = -0.9;

    const ground = new THREE.Mesh(
      new THREE.CylinderGeometry(3.4, 3.7, 0.2, 28),
      new THREE.MeshLambertMaterial({ color: 0x201a2e }),
    );
    ground.position.y = -0.12;
    this.scene.add(this.player, this.enemy, ground);

    this.camera = new THREE.PerspectiveCamera(38, w / h, 0.1, 30);
    this.camera.position.set(0, 1.9, 5.4);
    this.camera.lookAt(0, 0.7, 0);

    // transient reaction state: { side, kind, until }
    this.fx = [];
    this.hp = { player: 1, enemy: 1 };
    this.clock = new THREE.Clock();
    this.alive = true;
    this._frame = this._frame.bind(this);
    this._frame();

    this._onResize = () => {
      const nw = host.clientWidth, nh = host.clientHeight;
      if (!nw || !nh) return;
      this.camera.aspect = nw / nh;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(nw, nh);
    };
    addEventListener('resize', this._onResize);
  }

  /** side: 'player'|'enemy' — a lunge toward the foe. */
  attack(side) { this.fx.push({ side, kind: 'attack', t0: this.clock.getElapsedTime() }); }

  /** side took damage — recoil + flash. */
  hit(side) { this.fx.push({ side, kind: 'hit', t0: this.clock.getElapsedTime() }); }

  setHp(side, ratio) { this.hp[side] = Math.max(0, Math.min(1, ratio)); }

  _rigOf(side) { return side === 'player' ? this.player : this.enemy; }

  _frame() {
    if (!this.alive) return;
    requestAnimationFrame(this._frame);
    if (document.hidden || !this.host.isConnected) return;
    const t = this.clock.getElapsedTime();

    animateRig(this.player, t, 0);
    animateRig(this.enemy, t, 1.7);

    // low HP reads as a slump; death as a collapse
    for (const side of ['player', 'enemy']) {
      const rig = this._rigOf(side);
      const hp = this.hp[side];
      const slump = hp <= 0 ? 1.35 : (1 - hp) * 0.35;
      rig.rotation.x = REDUCED ? 0 : slump * 0.6;
      rig.position.y = -slump * 0.25;
    }

    // play transient fx (350ms each)
    const home = { player: -1.7, enemy: 1.7 };
    this.player.position.x = home.player;
    this.enemy.position.x = home.enemy;
    this.fx = this.fx.filter((fx) => {
      const age = t - fx.t0;
      if (age > 0.35) return false;
      const rig = this._rigOf(fx.side);
      const dir = fx.side === 'player' ? 1 : -1;
      const k = Math.sin((age / 0.35) * Math.PI); // out-and-back
      if (fx.kind === 'attack' && !REDUCED) rig.position.x = home[fx.side] + dir * k * 0.9;
      if (fx.kind === 'hit' && !REDUCED) {
        rig.position.x = home[fx.side] - dir * k * 0.35;
        rig.rotation.z = -dir * k * 0.2;
      }
      return true;
    });
    if (!this.fx.length) { this.player.rotation.z = 0; this.enemy.rotation.z = 0; }

    this.renderer.render(this.scene, this.camera);
  }

  dispose() {
    this.alive = false;
    removeEventListener('resize', this._onResize);
    [this.player, this.enemy].forEach((rig) => rig.traverse((o) => { o.geometry && o.geometry.dispose(); }));
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }
}
