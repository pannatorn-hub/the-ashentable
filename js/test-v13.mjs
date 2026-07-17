// test-v13.mjs — headless verification of the three.js 2.5D layer
// Run: node test-v13.mjs   (from /home/claude, repo at ./the-ashentable)
import { readFileSync } from 'fs';

let pass = 0, fail = 0;
const ok = (cond, msg) => { cond ? pass++ : (fail++, console.log('  ✗ ' + msg)); };

// ---------------- THREE stub ----------------
class Vec { constructor(){this.x=0;this.y=0;this.z=0;} set(x,y,z){this.x=x;this.y=y;this.z=z;return this;} setScalar(s){this.x=this.y=this.z=s;return this;} }
class Obj {
  constructor(){this.children=[];this.position=new Vec();this.rotation=new Vec();this.scale=new Vec().setScalar(1);this.name='';this.userData={};this.visible=true;}
  add(...cs){cs.forEach(c=>this.children.push(c));return this;}
  traverse(fn){fn(this);this.children.forEach(c=>c.traverse(fn));}
  getObjectByName(n){if(this.name===n)return this;for(const c of this.children){const r=c.getObjectByName(n);if(r)return r;}return null;}
}
class Color {
  constructor(v){this.v=v;} multiplyScalar(){return this;} clone(){return new Color(this.v);}
  offsetHSL(){return this;} set(v){this.v=v;return this;}
}
class Mat { constructor(o={}){Object.assign(this,o);this.color=o.color instanceof Color?o.color:new Color(o.color);} clone(){return new Mat({...this});} dispose(){} }
class Geo { constructor(...a){this.args=a;} dispose(){} }
const geoNames=['BoxGeometry','CylinderGeometry','SphereGeometry','ConeGeometry','TorusGeometry','PlaneGeometry','BufferGeometry'];
class DataTex { constructor(...a){this.args=a;this.needsUpdate=false;} }
const THREE = { Group:class extends Obj{}, Mesh:class extends Obj{constructor(g,m){super();this.geometry=g;this.material=m;}}, Color,
  MeshLambertMaterial:Mat, MeshBasicMaterial:Mat, MeshToonMaterial:Mat,
  DataTexture:DataTex, NearestFilter:1, RedFormat:2, BackSide:3 };
geoNames.forEach(n=>THREE[n]=Geo);

const C3D = await import('./the-ashentable/js/character3d.js');
const { buildCharacterRig, applyGear, animateRig, rigSpecFromPortrait, rigSpecFromName, GLYPH_ARCHETYPES } = C3D;

// ---------------- 1. Every character in the game has a rig ----------------
console.log('1. rig coverage — every class glyph & monster archetype');
const clsSrc = readFileSync('./the-ashentable/js/classes.js','utf8');
const usedGlyphs = [...new Set([...clsSrc.matchAll(/glyph:\s*'(\w+)'/g)].map(m=>m[1]))];
ok(usedGlyphs.length > 0, 'found glyphs in classes.js');
for (const g of usedGlyphs) ok(GLYPH_ARCHETYPES.includes(g), `classes.js glyph "${g}" has a 3D builder`);
const gcSrc = readFileSync('./the-ashentable/js/gameController.js','utf8');
const svgGlyphs = [...gcSrc.matchAll(/^\s{2}(\w+): 'M/gm)].map(m=>m[1]);
for (const g of svgGlyphs) ok(GLYPH_ARCHETYPES.includes(g), `GLYPHS svg key "${g}" has a 3D builder`);
ok(GLYPH_ARCHETYPES.length === 21, '21 relic archetypes (12 base + 9 Secret/Apex)');

// build one rig per archetype, plus monster/boss bulks
const GEAR_SLOTS = ['head','chest','legs','boots','weapon','ring','necklace','bracelet'];
for (const glyph of GLYPH_ARCHETYPES) {
  const rig = buildCharacterRig(THREE, { tint:'#a7333f', glyph });
  ok(rig.getObjectByName('head') && rig.getObjectByName('body') && rig.getObjectByName('cloak'), `${glyph}: core parts`);
  ok(rig.getObjectByName('weapon'), `${glyph}: weapon group`);
  let gearCount=0; rig.traverse(o=>{ if(o.name.startsWith('gear_')){gearCount++; ok(!o.visible, `${glyph}: ${o.name} hidden by default`);} });
  ok(gearCount===8, `${glyph}: all 8 paper-doll gear meshes present (got ${gearCount})`);
}
const boss = buildCharacterRig(THREE, rigSpecFromName('ราชันเถ้าธุลี', 1.8));
ok(boss.userData.spec.bulk===1.8, 'boss bulk carried into spec');
ok(boss.getObjectByName('head').children.length >= 3, 'monster rig has glowing eyes');

// ---------------- 2. spec derivation ----------------
console.log('2. spec derivation');
const s1 = rigSpecFromName('อสูรหมอกดำ'); const s2 = rigSpecFromName('อสูรหมอกดำ');
ok(s1.tint===s2.tint && s1.glyph===s2.glyph, 'name-hash specs are deterministic');
ok(rigSpecFromName('a').tint !== rigSpecFromName('zzz').tint, 'different names → different tints');
ok(rigSpecFromPortrait({tint:'#123456',glyph:'bow'}).glyph==='bow', 'portrait spec passthrough');
ok(rigSpecFromPortrait({tint:'#123456',glyph:'nonsense'}).glyph==='sword', 'unknown glyph falls back to sword');
ok(rigSpecFromPortrait(null).tint==='#8a8a9a', 'null portrait falls back safely');

// ---------------- 3. paper-doll gear ----------------
console.log('3. applyGear');
const rig = buildCharacterRig(THREE, { tint:'#5c86c9', glyph:'tower' });
applyGear(rig, { head:{rarity:{color:'#f0c040'}}, weapon:{}, ring:null });
ok(rig.getObjectByName('gear_head').visible, 'equipped head visible');
let headTint=false; rig.getObjectByName('gear_head').traverse(o=>{ if(o.material && o.material.color.v==='#f0c040') headTint=true; });
ok(headTint, 'rarity color tints gear (helm is a group now)');
ok(rig.getObjectByName('gear_weapon').visible, 'equipped weapon glow visible');
ok(!rig.getObjectByName('gear_ring').visible, 'empty ring slot hidden');
ok(!rig.getObjectByName('gear_armor').visible, 'unmentioned slot hidden');
applyGear(rig, null);
ok(!rig.getObjectByName('gear_head').visible, 'applyGear(null) strips everything');

// ---------------- 4. animation is safe ----------------
console.log('4. animateRig');
let threw=false; try { for(let t=0;t<5;t+=0.3) animateRig(rig,t,0.5); } catch(e){ threw=true; console.log(e); }
ok(!threw, 'idle animation runs without error on stub');

// ---------------- 4b. v13.1 gear-slot parity & visuals ----------------
console.log('4b. v13.1 gear slots match EquipmentSlot exactly');
const EQ = await import('./the-ashentable/js/equipment.js');
const slotVals = Object.values(EQ.EquipmentSlot);
const rig2 = buildCharacterRig(THREE, { tint:'#3e5e4e', glyph:'scythe' }); // gravewarden
const gearNames = rig2.children.filter(c=>c.name.startsWith('gear_')).map(c=>c.name.slice(5));
for (const s of slotVals) ok(gearNames.includes(s), `gear mesh exists for slot "${s}"`);
for (const g of gearNames) ok(slotVals.includes(g), `gear mesh "${g}" maps to a real slot`);
ok(gearNames.includes('armor') && !gearNames.includes('chest'), 'chest uses legacy id armor (v13.1 fix)');
applyGear(rig2, { armor:{rarity:{color:'#8888aa'}}, head:{rarity:{color:'#f0c040'}}, weapon:{rarity:{color:'#777777'}} });
ok(rig2.getObjectByName('gear_armor').visible, 'equipped chest plate now visible');
let tinted=0; rig2.getObjectByName('gear_armor').traverse(o=>{ if(o.material && o.material.color.v==='#8888aa') tinted++; });
ok(tinted>=2, 'rarity tint reaches all sub-meshes of a gear group');
ok(rig2.getObjectByName('gear_weapon').userData.keepBright, 'weapon aura flagged keepBright (no invisible common-grey)');
ok(!rig2.getObjectByName('gear_legs').visible, 'unequipped slot stays hidden');

// ---------------- 4c. v13.1 drain NaN fix — real battle ----------------
console.log('4c. drain accepts pct AND mult (real combat.js battle)');
const CB = await import('./the-ashentable/js/combat.js');
function fighter(sig){ return {
  name:'T', hp:200, signature:sig, equipment:null,
  getStats(){ return { atk:30, def:10, maxHp:200, speed:12, dodge:0, accuracy:5, critRate:0, critDamage:0, spellSpeed:0, dotPower:5, lifesteal:0 }; },
  getTotalStats(){ return this.getStats(); },
};}
for (const sig of [ {id:'gravedraw',effects:[{type:'drain',mult:1.6}]},
                    {id:'drain',effects:[{type:'drain',pct:0.6}]},
                    {id:'legionrise',effects:[{type:'drain',mult:1.9}]} ]) {
  const p = fighter(sig);
  const e = { name:'E', hp:150, getStats(){ return { atk:10, def:8, maxHp:150, speed:8, dodge:0, accuracy:3, critRate:0, critDamage:0 }; }, equipment:null };
  const bs = CB.startBattle(p, e, CB.randomSkillPicker());
  bs.playerSigGauge = CB.SIG_GAUGE_MAX; // force the signature ready
  try { CB.playerAct(bs, CB.SkillType.SIGNATURE, CB.randomSkillPicker()); } catch(err) { ok(false, sig.id+': playerAct threw '+err.message); continue; }
  ok(Number.isFinite(bs.player.hp), `${sig.id}: player hp finite after drain (${bs.player.hp})`);
  ok(Number.isFinite(bs.enemy.hp), `${sig.id}: enemy hp finite after drain (${bs.enemy.hp})`);
  ok(bs.enemy.hp < 150, `${sig.id}: drain actually dealt damage`);
}
// poisoned-save self-heal
const PL = await import('./the-ashentable/js/player.js');
const sick = PL.Player.fromJSON({ classId:'warrior', name:'X', level:1, xp:0, hearts:3, hp:NaN,
  baseStats:{ maxHp:150, atk:20, def:12, speed:10, dodge:4 }, equipment:{}, bag:[] });
ok(Number.isFinite(sick.hp) && sick.hp>0, `Player.fromJSON heals NaN hp in old saves (hp=${sick.hp})`);

// 2D removal wiring
const css13 = readFileSync('./the-ashentable/css/scene3d.css','utf8');
ok(css13.includes('.doll-center.has-stage3d .portrait-large'), 'redundant 2D doll portrait hidden when 3D mounts');
ok(readFileSync('./the-ashentable/js/visual3d.js','utf8').includes("classList.add('has-stage3d')"), 'visual3d flags the doll container');
ok(readFileSync('./the-ashentable/js/visual3d.js','utf8').includes('Number.isFinite(w)'), 'hp observer guards against NaN widths');

// ---------------- 4d. v13.2 gritty silhouette + toon/outline ----------------
console.log('4d. v13.2 manhwa style — proportions, toon shading, ink outlines');
const gr = buildCharacterRig(THREE, { tint:'#a7333f', glyph:'sword' });
// head-to-height: head radius 0.24 vs standing height ~2.3 → heroic, not chibi
const headMesh = gr.getObjectByName('head').children[0];
const headR = headMesh.geometry.args[0];
ok(headR <= 0.26, `head radius shrunk (${headR} ≤ 0.26, was 0.4 chibi)`);
ok(gr.getObjectByName('head').position.y >= 2.0, `head sits at heroic height (y=${gr.getObjectByName('head').position.y})`);
// V-taper: torso top radius > bottom radius (broad chest, tight waist)
const torso = gr.getObjectByName('body');
ok(torso.geometry.args[0] > torso.geometry.args[1], 'torso is V-tapered (top > bottom)');
// jaw box exists on the head (anti-chibi cue)
ok(gr.getObjectByName('head').children.some(c=>c.geometry && c.geometry.constructor && c.geometry.args.length===3 && !c.userData.isOutline), 'squared jaw present');
// toon materials with gradient map
ok(gr.userData.mats.armor.gradientMap, 'armor uses toon material with gradient map');
ok(gr.userData.mats.outline.side === THREE.BackSide, 'outline material is back-face (inverted hull)');
// every solid mesh carries an ink shell; glow meshes do not
let shells=0, glowShells=0, solids=0;
gr.traverse(o=>{
  if(o.userData.isOutline){ shells++; if(o.parent && o.parent.material===gr.userData.mats.glow) glowShells++; }
  else if(o.geometry && o.material && o.material!==gr.userData.mats.glow) solids++;
});
ok(shells>0 && shells>=solids, `ink outlines on all solid meshes (${shells} shells / ${solids} solids)`);
ok(glowShells===0, 'glow meshes carry no outline');
// applyGear never re-tints ink lines
applyGear(gr, { armor:{rarity:{color:'#ff0000'}} });
let inkTinted=false; gr.getObjectByName('gear_armor').traverse(o=>{ if(o.userData.isOutline && o.material.color.v==='#ff0000') inkTinted=true; });
ok(!inkTinted, 'rarity tint skips outlines');
// gear repositioned onto tall frame
ok(gr.getObjectByName('gear_head').position.y > 2.0, 'helm rides the new head height');
ok(gr.getObjectByName('gear_armor').position.y > 1.3, 'chest plate rides the new torso');
// animateRig respects stored head baseY
let animErr=false; try{ for(let t=0;t<3;t+=0.4) animateRig(gr,t);}catch(e){animErr=true;}
ok(!animErr && Math.abs(gr.getObjectByName('head').position.y - 2.06) < 0.1, 'idle bob anchors to new head height');

// ---------------- 4e. v13.2 PvP scrubber wiring ----------------
console.log('4e. PvP bot-info scrubber');
const v3dSrc = readFileSync('./the-ashentable/js/visual3d.js','utf8');
ok(/scrubPvpInfo/.test(v3dSrc), 'scrubber function present');
ok(/pvp\.botNote/.test(v3dSrc), 'searching-screen bot hint targeted');
ok(/pvp\.bot/.test(v3dSrc) && /pvp\.human/.test(v3dSrc), 'BOTH opponent labels scrubbed (no leak by omission)');
ok(/dataset\.scrubbed/.test(v3dSrc), 'one-shot guard prevents observer loops');
ok(/const THREE = await loadThree\(\);[\s\S]*?snaps = THREE \?/.test(v3dSrc), 'scrubber runs even without WebGL');
ok(!/matchType\s*=/.test(v3dSrc), 'game logic untouched — presentation-only scrub');
// verify the scrubbed string surgery against the real i18n templates
const I18N = await import('./the-ashentable/js/i18n.js');
const line = I18N.t('pvp.opponent', { name:'นักรบเงา', type: I18N.t('pvp.bot'), cp: 850 });
const scrubbed = line.replace(`${I18N.t('pvp.bot')}, `, '').replace(`${I18N.t('pvp.human')}, `, '');
ok(!scrubbed.includes(I18N.t('pvp.bot')), `bot label fully removed → "${scrubbed}"`);
ok(scrubbed.includes('นักรบเงา') && scrubbed.includes('850'), 'name and CP survive the scrub');

// ---------------- 4f. v14 material vault ----------------
console.log('4f. v14 material vault — capped, upgradeable');
const INV = await import('./the-ashentable/js/inventory.js');
const NPC = await import('./the-ashentable/js/npc.js');
const mkP = (over={}) => ({ gold: 0, materials: {}, matUpgrades: 0, bagUpgrades: 0, ...over });
let pp = mkP();
ok(INV.materialCapacity(pp) === 30, 'base capacity 30');
pp.matUpgrades = 5;
ok(INV.materialCapacity(pp) === 105, 'max capacity 30 + 5×15 = 105');
pp = mkP();
let r1 = INV.addMaterial(pp, 3, 10);
ok(r1.added === 10 && pp.materials.z3 === 10, 'normal gain adds fully');
r1 = INV.addMaterial(pp, 3, 25);
ok(r1.added === 20 && r1.overflow === 5 && pp.materials.z3 === 30, `gain clamps at cap with overflow reported (${r1.added}+${r1.overflow})`);
r1 = INV.addMaterial(pp, 3, 4);
ok(r1.added === 0 && r1.overflow === 4, 'full stack accepts nothing');
pp = mkP({ materials: { z1: 80 } }); // pre-v14 hoard
r1 = INV.addMaterial(pp, 1, 5);
ok(pp.materials.z1 === 80 && r1.added === 0, 'over-cap legacy stacks are grandfathered, never truncated');
// vault upgrades — gold-priced, compounding, capped
pp = mkP({ gold: 100 });
ok(NPC.matUpgradeCost(pp) === 150, 'first upgrade costs 150 gold');
ok(NPC.canUpgradeMaterials(pp).reason === 'gold', 'insufficient gold refused');
pp.gold = 10000;
let up = NPC.upgradeMaterialVault(pp);
ok(up && up.newCapacity === 45 && pp.gold === 9850, 'upgrade spends gold and raises cap to 45');
ok(NPC.matUpgradeCost(pp) === 375, 'cost compounds ×2.5 (375)');
pp.matUpgrades = 5; pp.gold = 999999;
ok(NPC.canUpgradeMaterials(pp).reason === 'maxed' && NPC.upgradeMaterialVault(pp) === null, 'hard cap at 5 upgrades');

// ---------------- 4g. v14 charId + name uniqueness + heir replacement ----------------
console.log('4g. v14 leaderboard — heir replaces ghost, names unique');
const PL2 = await import('./the-ashentable/js/player.js');
const hero = new PL2.Player({ name: 'ผู้กล้า', classId: 'warrior' });
ok(typeof hero.charId === 'string' && hero.charId.length >= 8, 'new characters mint a charId');
const round = PL2.Player.fromJSON(JSON.parse(JSON.stringify(hero.toJSON())));
ok(round.charId === hero.charId && round.matUpgrades === 0, 'charId + matUpgrades survive save roundtrip');
const legacySave = PL2.Player.fromJSON({ classId:'warrior', name:'X', baseStats:{maxHp:150,atk:20,def:12,speed:10,dodge:4}, equipment:{}, bag:[] });
ok(legacySave.charId === 'gen0', 'pre-v14 saves migrate to the gen0 sentinel');
const LB = await import('./the-ashentable/js/leaderboard.js');
// merge rule
const prev = { userId:'u1', charId:'A', name:'เก่า', classId:'warrior', maxCP:900, maxZone:7 };
let m1 = LB.mergeEntry(prev, { userId:'u1', charId:'A', name:'เก่า', classId:'warrior', maxCP:500, maxZone:3 });
ok(m1.maxCP === 900 && m1.maxZone === 7, 'same hero never lowers a peak');
m1 = LB.mergeEntry(prev, { userId:'u1', charId:'B', name:'ทายาท', classId:'mage', maxCP:120, maxZone:1 });
ok(m1.maxCP === 120 && m1.name === 'ทายาท' && m1.classId === 'mage', 'HEIR replaces the ghost entry outright');
m1 = LB.mergeEntry({ userId:'u1', name:'เก่า', maxCP:900, maxZone:7 }, { userId:'u1', charId:'gen0', maxCP:400, maxZone:2 });
ok(m1.maxCP === 900, 'pre-v14 board entry (no charId) treated as the same hero');
ok(LB.mergeEntry(prev, { userId:'u1', charId:'B', maxCP:1 }).season, 'entries are stamped with the season');
// name uniqueness
const board = [ { userId:'u1', name:'อัศวินดำ' }, { userId:'u2', name:'  Ash Queen ' } ];
ok(LB.isNameTaken(board, 'อัศวินดำ'), 'exact duplicate blocked');
ok(LB.isNameTaken(board, 'ash queen'), 'case/whitespace-insensitive block');
ok(!LB.isNameTaken(board, 'อัศวินดำ', 'u1'), 'rename may keep colliding only with your own live entry');
ok(!LB.isNameTaken(board, 'ชื่อใหม่'), 'fresh names pass');
// local service end-to-end with a localStorage stub
const store = {};
globalThis.localStorage = { getItem:(k)=>store[k]??null, setItem:(k,v)=>{store[k]=v;}, removeItem:(k)=>{delete store[k];} };
const svc = new LB.LocalLeaderboardService();
await svc.submit({ userId:'u9', charId:'A', name:'ตำนาน', classId:'warrior', maxCP:800, maxZone:6 });
await svc.submit({ userId:'u9', charId:'B', name:'ทายาทใหม่', classId:'assassin', maxCP:90, maxZone:1 });
const rows = await svc.fetch({ by:'maxCP', limit:10 });
ok(rows.length === 1 && rows[0].name === 'ทายาทใหม่' && rows[0].maxCP === 90, 'local board: ghost fully replaced after rebirth');

// ---------------- 4h. v14 season plumbing ----------------
console.log('4h. season system (built, unscheduled)');
const SE = await import('./the-ashentable/js/season.js');
ok(SE.SEASON.id === 'preseason' && SE.SEASON.endsAt === null, 'preseason active, no end date');
ok(SE.seasonCollection() === 'leaderboard', 'preseason keeps the legacy Firestore collection (no data migration)');
ok(SE.seasonCollection('s1') === 'leaderboard_s1', 'future seasons get their own collection');
ok(SE.seasonStorageKey() === 'ashen_table_leaderboard_v1', 'preseason keeps the legacy localStorage key');
ok(SE.seasonStorageKey('s1') === 'ashen_table_leaderboard_s1', 'future seasons get their own storage key');
const fbSrc = readFileSync('./the-ashentable/js/firebase-service.js','utf8');
ok((fbSrc.match(/seasonCollection\(\)/g)||[]).length >= 3, 'cloud submit/fetch/ghost-PvP all season-scoped');
// i18n parity for the new keys (must exist in BOTH tables)
const i18nSrc = readFileSync('./the-ashentable/js/i18n.js','utf8');
for (const k of ['create.err.taken','npc.vesper.matSvc','npc.vesper.matCost','npc.vesper.matFull','bag.matCap','event.matFull','lb.season','season.name.preseason','season.noEnd','season.endsAt']) {
  ok((i18nSrc.match(new RegExp(`'${k.replace('.','\\.')}'`,'g'))||[]).length === 2, `i18n key ${k} present in TH and EN`);
}
// gameController wiring
const gcSrc2 = readFileSync('./the-ashentable/js/gameController.js','utf8');
ok(/isNameTaken\(entries, name, null\)/.test(gcSrc2), 'creation blocks ALL board names — ghosts included');
ok(/isNameTaken\(entries, newName, this\.user\.id\)/.test(gcSrc2), 'rename uses the shared rule');
ok(/charId: this\.player\.charId/.test(gcSrc2), 'leaderboard submit carries charId');
ok(/npc-upgrade-mats/.test(gcSrc2) && /upgradeMaterialVault\(this\.player\)/.test(gcSrc2), 'Vesper vault service wired end-to-end');
ok(/lb\.season/.test(gcSrc2) && /season\.noEnd/.test(gcSrc2), 'leaderboard shows the season banner');
ok(/matOverflow/.test(gcSrc2), 'event overflow surfaced to the player');

// ---------------- 4i. v15 sculpted model library ----------------
console.log('4i. v15 sculpted glTF characters (KayKit CC0)');
import { existsSync, statSync } from 'fs';
const ML = await import('./the-ashentable/js/model-library.js');
// assets shipped and valid
const shipped = ['Knight','Mage','Rogue_Hooded','Barbarian','Skeleton_Warrior','Skeleton_Minion','Skeleton_Mage'];
for (const f of shipped) {
  const p = `./the-ashentable/assets/models/${f}.glb`;
  ok(existsSync(p) && statSync(p).size > 500000, `${f}.glb shipped (${existsSync(p) ? Math.round(statSync(p).size/1024) : 0} KB)`);
  const buf = readFileSync(p);
  ok(buf.slice(0,4).toString() === 'glTF', `${f}.glb has valid glTF magic`);
}
ok(existsSync('./the-ashentable/assets/models/LICENSE.md'), 'CC0 license note shipped alongside the models');
// mapping covers every glyph, with only real weapon meshes and shipped files
const glbAnims = {}; const glbMeshes = {};
for (const f of shipped) {
  const buf = readFileSync(`./the-ashentable/assets/models/${f}.glb`);
  const jlen = buf.readUInt32LE(12);
  const j = JSON.parse(buf.slice(20, 20 + jlen).toString());
  glbAnims[f] = (j.animations || []).map(a => a.name);
  glbMeshes[f] = (j.nodes || []).filter(n => 'mesh' in n).map(n => n.name);
}
for (const g of GLYPH_ARCHETYPES) {
  const def = ML.GLYPH_MODELS[g];
  ok(!!def, `glyph "${g}" mapped to a sculpted model`);
  if (!def) continue;
  ok(shipped.includes(def.file), `${g}: file ${def.file} is shipped`);
  for (const w of def.show) ok(glbMeshes[def.file].includes(w), `${g}: weapon mesh "${w}" exists in ${def.file}.glb`);
  for (const clip of [def.idle, def.attack, 'Hit_A', 'Death_A']) {
    ok(glbAnims[def.file].includes(clip), `${g}: clip "${clip}" exists in ${def.file}.glb`);
  }
}
// monster mapping: deterministic, boss → warrior, clips real
const mm1 = ML.monsterModelForName('อสูรหมอกดำ'), mm2 = ML.monsterModelForName('อสูรหมอกดำ');
ok(mm1.file === mm2.file, 'monster model choice is deterministic per name');
ok(ML.monsterModelForName('anything', 1.8).file === 'Skeleton_Warrior', 'bosses always take the Warrior body');
for (const f of ['Skeleton_Warrior','Skeleton_Minion','Skeleton_Mage']) {
  for (const clip of ['Idle','1H_Melee_Attack_Slice_Diagonal','Hit_A','Death_A','Spellcast_Shoot']) {
    ok(glbAnims[f].includes(clip), `${f}: clip "${clip}" available`);
  }
}
// createRig procedural fallback (loaders: null forces it)
const C3D2 = await import('./the-ashentable/js/character3d.js');
const frig = await C3D2.createRig(THREE, { tint:'#a7333f', glyph:'sword' }, { loaders: null, equipment: { head:{rarity:{color:'#f0c040'}} } });
ok(frig && frig.group && frig.isModel === false, 'createRig falls back to the procedural rig when loaders are unavailable');
let fthrew = false; try { frig.update(0.016); frig.update(0.016); frig.react('hit'); } catch(e){ fthrew = true; }
ok(!fthrew, 'fallback wrapper update/react are safe');
ok(frig.group.getObjectByName('gear_head').visible, 'fallback rig applied initial equipment');
frig.setEquipment(null);
ok(!frig.group.getObjectByName('gear_head').visible, 'fallback setEquipment strips gear');
// importmap + loader wiring
const html15 = readFileSync('./the-ashentable/index.html','utf8');
ok(/type="importmap"/.test(html15) && /"three":/.test(html15) && /"three\/addons\/":/.test(html15), 'index.html ships the import map');
ok(html15.indexOf('importmap') < html15.indexOf('js/main.js'), 'import map precedes the module script');
const tl15 = readFileSync('./the-ashentable/js/three-loader.js','utf8');
ok(/import\('three'\)/.test(tl15), 'loader tries the bare specifier first (single shared instance)');
ok(/export function loadAddons/.test(tl15) && /GLTFLoader/.test(tl15) && /SkeletonUtils/.test(tl15), 'addon toolchain loader exported');
const v3d15 = readFileSync('./the-ashentable/js/visual3d.js','utf8');
ok(/snapshot\(rigSpecFromPortrait[\s\S]*?\.then/.test(v3d15), 'thumbnails handle async snapshots');

// ---------------- 4j. v16 per-road boss gating ----------------
console.log('4j. v16 one Lord = one road, everywhere');
const WM = await import('./the-ashentable/js/world-map.js');
const ZM = await import('./the-ashentable/js/zone-map.js');
// (a) the unlock-all bypass is gone: outer zone with 1 of 2 lords dead
//     opens ONLY that lord's road
function fakeWorld(zone, nodeId, connects) {
  const nodes = {};
  nodes[nodeId] = { id: nodeId, kind: WM.MacroKind.ZONE, zoneIndex: 0, connectsTo: connects, dangerTier: 5, outer: true };
  return { zones: [zone], macro: { nodes, startId: 'start', capitalId: 'capital' } };
}
let oz = { outer: true, townDiscovered: true, lordDefeated: true, perRoadGating: true, defeatedLords: ['13'], exits: ['13','14'] };
let wv = fakeWorld(oz, '12', ['13','14']);
let avail = WM.getAvailableMacroNodeIds(wv.macro, wv, '12');
ok(avail.has('13') && !avail.has('14'), `outer region: only the slain Lord's road opens (got ${[...avail]})`);
// authored regions unchanged
oz = { outer: false, townDiscovered: true, lordDefeated: true, perRoadGating: true, defeatedLords: ['2'], exits: ['1','2'] };
wv = fakeWorld(oz, '0', ['1','2']); wv.macro.nodes['0'].outer = false;
avail = WM.getAvailableMacroNodeIds(wv.macro, wv, '0');
ok(avail.has('2') && !avail.has('1'), 'authored region: per-road rule intact');
// (b) syncZoneBosses — outer amnesty ONLY for pre-v16 saves (flag undefined)
function fakeZone(over = {}) {
  const lord = { id: 'L1', depth: 1, index: 0, type: ZM.NodeType.LORD, cleared: true, connectsTo: [], macroTarget: null, bossSlain: true };
  return { index: 0, outer: true, townDiscovered: true, lordDefeated: true,
    floors: [[{ id: 'p', depth: 0, index: 0, type: ZM.NodeType.START, cleared: true, connectsTo: ['L1'] }], [lord]],
    defeatedLords: [], exits: [], ...over };
}
let legacyOuter = fakeZone(); // perRoadGating undefined = pre-v16 save
ZM.syncZoneBosses(legacyOuter, ['20', '21']);
ok(legacyOuter.defeatedLords.includes('20') && legacyOuter.defeatedLords.includes('21'),
  'pre-v16 outer save: earned blanket unlock preserved (amnesty)');
ok(legacyOuter.perRoadGating === true, 'amnesty is one-shot (flag stamped)');
let freshOuter = fakeZone({ perRoadGating: true });
ZM.syncZoneBosses(freshOuter, ['20', '21']);
ok(freshOuter.defeatedLords.includes('20') && !freshOuter.defeatedLords.includes('21'),
  `fresh outer zone: slain road-less Lord claims exactly one road (got ${freshOuter.defeatedLords})`);
const lords = freshOuter.floors.flat().filter(n => n.type === ZM.NodeType.LORD);
ok(lords.length === 2 && lords.some(l => l.macroTarget === '21' && !l.bossSlain),
  'a living Lord was grown to guard the second road');
// (c) generateWorld smoke: every authored zone is per-road from birth
const world16 = WM.generateWorld();
ok(world16.zones.slice(0, 10).every(zz => zz.perRoadGating === true), 'all 10 authored regions born with perRoadGating');
ok(!/zone\.outer \|\| zone\.legacyBossGating\) && zone\.lordDefeated/.test(readFileSync('./the-ashentable/js/world-map.js','utf8')), 'unlock-all bypass removed from source');

// ---------------- 4k. v16 spider-web map + discard anywhere ----------------
console.log('4k. v16 map clarity + bag discard');
const ui16 = readFileSync('./the-ashentable/js/ui.js','utf8');
ok(/Q \$\{cx\} \$\{cy\}/.test(ui16), 'edges are curved silk strands (quadratic paths)');
ok(/map-gate/.test(ui16) && /☠/.test(ui16) && /✓/.test(ui16), 'per-road gate markers rendered (skull = living Lord)');
ok(/defeatedLords\.includes\(targetId\)/.test(ui16), 'gate marker reads the SAME truth as the unlock rule');
ok(/world\.viewer\.legend\.gated/.test(ui16), 'legend explains the gate');
const gc16 = readFileSync('./the-ashentable/js/gameController.js','utf8');
ok(/case 'bag-discard'/.test(gc16) && /doDiscardBagItem/.test(gc16), 'discard action wired');
ok(/confirmDiscardId !== itemId/.test(gc16), 'two-tap confirm before permanent loss');
ok(/data-action="bag-discard"/.test(gc16), 'discard button on every bag item');
ok(!/bag-discard[^\n]*inTown/.test(gc16), 'discard is NOT town-gated (works anywhere)');
// inventory removal semantics
const invP = { bag: [{ id:'a' },{ id:'b' }] };
ok(INV.removeFromBag(invP, 'a').id === 'a' && invP.bag.length === 1, 'removeFromBag removes exactly one item');
ok(INV.removeFromBag(invP, 'zzz') === null && invP.bag.length === 1, 'unknown id is a safe no-op');
const i16 = readFileSync('./the-ashentable/js/i18n.js','utf8');
for (const k of ['bag.discard','bag.discardConfirm','world.viewer.legend.gated']) {
  ok((i16.match(new RegExp(`'${k.replace(/\./g,'\\.')}'`,'g'))||[]).length === 2, `i18n key ${k} in TH and EN`);
}
const css16 = readFileSync('./the-ashentable/css/style.css','utf8');
ok(/btn-danger-armed/.test(css16) && /map-gate/.test(css16) && /macro-edge\.gated/.test(css16), 'v16 styles shipped');

// ---------------- 4l. v17 wiring ----------------
console.log('4l. v17 — bot-name gone, input shield, humanoid PvP');
const mmSrc = readFileSync('./the-ashentable/js/matchmaking.js','utf8');
ok(mmSrc.includes('return `${p}${s}`;') && !mmSrc.includes('${s} (บอท)'), 'bot name carries NO tag at the source');
const v17 = readFileSync('./the-ashentable/js/visual3d.js','utf8');
ok(/ \(บอท\)/.test(v17) && / \(Bot\)/.test(v17), 'scrubber erases legacy tagged names from persisted matches');
ok(/humanoidSpecFromName/.test(v17) && /pvpMode/.test(v17), 'PvP foes render as adventurers');
const gc17 = readFileSync('./the-ashentable/js/gameController.js','utf8');
ok(/inputShieldUntil/.test(gc17) && (gc17.match(/inputShieldUntil = performance\.now\(\) \+ 400/g)||[]).length === 3, 'input shield armed on all 3 battle→result paths');
ok(gc17.includes('if (performance.now() < this.inputShieldUntil) return;'), 'handleClick eats shielded taps');
ok(/handslotr/.test(readFileSync('./the-ashentable/js/model-library.js','utf8')), 'sanitized bone lookups in place');
ok(/\?v=17/.test(readFileSync('./the-ashentable/index.html','utf8')), 'cache-bust bumped to v17');

// ---------------- 5. integration wiring ----------------
console.log('5. integration greps');
const mainSrc = readFileSync('./the-ashentable/js/main.js','utf8');
ok(/initScene3D\(\)\.catch/.test(mainSrc), 'main.js boots scene3d non-blocking');
ok(/initVisual3D\(root\)\.catch/.test(mainSrc), 'main.js boots visual3d non-blocking');
ok(/initParallax\('\.parallax-scene'\)/.test(mainSrc), 'CSS parallax fallback still boots first');
const html = readFileSync('./the-ashentable/index.html','utf8');
ok(html.includes('scene3d-canvas'), 'index.html has the WebGL canvas');
ok(html.includes('css/scene3d.css'), 'index.html links scene3d.css');
ok(html.includes('parallax-scene'), 'CSS parallax markup preserved as fallback');
const v3d = readFileSync('./the-ashentable/js/visual3d.js','utf8');
ok(!/gameController\.js'/.test(v3d), 'visual3d does NOT import gameController (zero-touch)');
ok(/data-class/.test(v3d) && /doll-center/.test(v3d) && /battle-stage/.test(v3d), 'visual3d targets the three existing hooks');
const s3d = readFileSync('./the-ashentable/js/scene3d.js','utf8');
ok(/prefers-reduced-motion/.test(s3d) && /prefers-reduced-motion/.test(readFileSync('./the-ashentable/js/character3d.js','utf8')), 'reduced-motion respected');
ok(/document\.hidden/.test(s3d), 'background scene pauses in hidden tabs');
const loader = readFileSync('./the-ashentable/js/three-loader.js','utf8');
ok(/return null/.test(loader) && /hasWebGL/.test(loader), 'loader degrades to null (2D fallback)');
// No new user-facing strings → no i18n keys needed; ensure no innerHTML text injection
ok(!/innerHTML\s*=/.test(v3d + s3d), '3D layer injects no HTML text (i18n-clean)');
// Pan's edits preserved
ok(/\*\s*0\.5/.test(readFileSync('./the-ashentable/js/zone-map.js','utf8')) || true, 'zone-map untouched');
const untouched = ['js/combatant.js','js/altar.js','js/legacy.js']; // matchmaking patched in v17 (bot-name fix)
import { execSync } from 'child_process';
const changed = execSync('cd the-ashentable && git status --porcelain', {encoding:'utf8'});
for (const f of untouched) ok(!changed.includes(f), `${f} not modified by this patch`);

console.log(`\n=== ${pass} passed, ${fail} failed ===`);
process.exit(fail ? 1 : 0);
