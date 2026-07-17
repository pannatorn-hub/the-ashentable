// scene3d.js (v13)
// ---------------------------------------------------------------------------
// The 2.5D world backdrop, rebuilt in real WebGL. Same art direction as the
// CSS parallax it upgrades — ashen sky, pale moon, layered mountain
// silhouettes, drifting mist and embers — but with true depth: layers are
// planes at different Z, the camera eases toward the pointer, fog swallows
// the far range, and a particle field of ash motes drifts forever upward.
//
// All textures are painted procedurally onto <canvas> at boot (painterly
// gradients + noise ridgelines), so there are zero image assets to host.
//
// initScene3D() returns a controller { dispose } on success or null on any
// failure, in which case main.js keeps the original CSS parallax running.
// ---------------------------------------------------------------------------

import { loadThree } from './three-loader.js';

const DPR_CAP = 1.5; // painterly style doesn't need retina; battery matters
const REDUCED = typeof matchMedia !== 'undefined'
  && matchMedia('(prefers-reduced-motion: reduce)').matches;

// ---------------- procedural texture painters ----------------

function canvasTexture(THREE, w, h, paint) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  paint(c.getContext('2d'), w, h);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/** Vertical dusk gradient — deep violet to ashen ember at the horizon. */
function paintSky(ctx, w, h) {
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0.0, '#0b0912');
  g.addColorStop(0.45, '#171226');
  g.addColorStop(0.78, '#2a1e33');
  g.addColorStop(1.0, '#3d2733');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  // faint stars in the upper half
  for (let i = 0; i < 90; i++) {
    const x = Math.random() * w, y = Math.random() * h * 0.5;
    ctx.fillStyle = `rgba(220,215,240,${0.15 + Math.random() * 0.4})`;
    ctx.fillRect(x, y, 1.2, 1.2);
  }
}

/** Pale moon with a soft radial halo. */
function paintMoon(ctx, w, h) {
  const cx = w / 2, cy = h / 2;
  let g = ctx.createRadialGradient(cx, cy, 4, cx, cy, w / 2);
  g.addColorStop(0, 'rgba(236,230,220,0.95)');
  g.addColorStop(0.25, 'rgba(220,208,200,0.55)');
  g.addColorStop(1, 'rgba(200,190,190,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  g = ctx.createRadialGradient(cx - 6, cy - 6, 2, cx, cy, w * 0.16);
  g.addColorStop(0, '#efe9dd');
  g.addColorStop(1, '#c9beb4');
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(cx, cy, w * 0.16, 0, Math.PI * 2); ctx.fill();
}

/**
 * One mountain silhouette band. seed varies the ridge; color sets the
 * distance mood (far = lighter, hazier; near = darker, sharper).
 */
function paintRidge(seed, color, jag) {
  return (ctx, w, h) => {
    ctx.clearRect(0, 0, w, h);
    let x = 0, y = h * 0.55;
    let s = seed;
    const rand = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(0, h);
    ctx.lineTo(0, y);
    while (x < w) {
      x += 18 + rand() * 46;
      y = h * (0.28 + rand() * 0.42) + Math.sin(x * 0.01 + seed) * h * jag;
      ctx.lineTo(x, y);
    }
    ctx.lineTo(w, h);
    ctx.closePath();
    ctx.fill();
    // a few dead-tree / spire accents on the near ridge
    if (jag > 0.08) {
      for (let i = 0; i < 7; i++) {
        const tx = rand() * w, th = 14 + rand() * 26;
        ctx.fillRect(tx, h * 0.55 - th, 2, th);
        ctx.fillRect(tx - 4, h * 0.55 - th * 0.7, 10, 2);
      }
    }
  };
}

/** Soft horizontal mist streaks. */
function paintMist(ctx, w, h) {
  ctx.clearRect(0, 0, w, h);
  for (let i = 0; i < 5; i++) {
    const y = h * (0.2 + Math.random() * 0.6);
    const g = ctx.createLinearGradient(0, y - 26, 0, y + 26);
    g.addColorStop(0, 'rgba(150,140,170,0)');
    g.addColorStop(0.5, `rgba(150,140,170,${0.05 + Math.random() * 0.07})`);
    g.addColorStop(1, 'rgba(150,140,170,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, y - 26, w, 52);
  }
}

// ---------------- scene ----------------

export async function initScene3D() {
  const THREE = await loadThree();
  if (!THREE) return null;

  let canvas = document.getElementById('scene3d-canvas');
  if (!canvas) {
    canvas = document.createElement('canvas');
    canvas.id = 'scene3d-canvas';
    document.body.prepend(canvas);
  }

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
  } catch (err) {
    console.warn('WebGLRenderer failed — keeping CSS parallax:', err.message);
    return null;
  }
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, DPR_CAP));
  renderer.setSize(innerWidth, innerHeight);

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0x171226, 30, 150);

  const camera = new THREE.PerspectiveCamera(48, innerWidth / innerHeight, 0.1, 400);
  camera.position.set(0, 2.5, 26);

  const disposables = [];
  const track = (o) => { disposables.push(o); return o; };

  const layerPlane = (tex, w, h, z, y = 0, opacity = 1) => {
    const mat = track(new THREE.MeshBasicMaterial({
      map: track(tex), transparent: true, opacity, fog: z < -20, depthWrite: false,
    }));
    const mesh = new THREE.Mesh(track(new THREE.PlaneGeometry(w, h)), mat);
    mesh.position.set(0, y, z);
    scene.add(mesh);
    return mesh;
  };

  // Back-to-front: sky → moon → far ridge → near ridge → mist sheets.
  layerPlane(canvasTexture(THREE, 1024, 512, paintSky), 320, 160, -140, 20);
  const moon = layerPlane(canvasTexture(THREE, 256, 256, paintMoon), 34, 34, -120, 26, 0.95);
  layerPlane(canvasTexture(THREE, 1024, 256, paintRidge(7, '#1d1830', 0.05)), 260, 64, -90, -6, 0.98);
  layerPlane(canvasTexture(THREE, 1024, 256, paintRidge(31, '#120f1e', 0.12)), 200, 52, -55, -10);
  const mistA = layerPlane(canvasTexture(THREE, 1024, 256, paintMist), 180, 40, -40, -6, 0.8);
  const mistB = layerPlane(canvasTexture(THREE, 1024, 256, paintMist), 180, 40, -28, -10, 0.6);

  // Drifting ash motes — the signature of the Ashen Table.
  const ASH_COUNT = REDUCED ? 0 : 320;
  let ash = null;
  if (ASH_COUNT) {
    const pos = new Float32Array(ASH_COUNT * 3);
    for (let i = 0; i < ASH_COUNT; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 120;
      pos[i * 3 + 1] = Math.random() * 40 - 12;
      pos[i * 3 + 2] = -Math.random() * 60;
    }
    const geo = track(new THREE.BufferGeometry());
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const mat = track(new THREE.PointsMaterial({
      color: 0xc9b8a6, size: 0.28, transparent: true, opacity: 0.55,
      sizeAttenuation: true, depthWrite: false,
    }));
    ash = new THREE.Points(geo, mat);
    scene.add(ash);
  }

  // ---------------- motion ----------------

  let targetX = 0, targetY = 0, curX = 0, curY = 0;
  const onPointer = (e) => {
    targetX = e.clientX / innerWidth - 0.5;
    targetY = e.clientY / innerHeight - 0.5;
  };
  const onLeave = () => { targetX = 0; targetY = 0; };
  const onResize = () => {
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight);
  };
  addEventListener('pointermove', onPointer, { passive: true });
  document.addEventListener('pointerleave', onLeave);
  addEventListener('resize', onResize);

  let raf = 0;
  let disposed = false;
  const clock = new THREE.Clock();

  function frame() {
    if (disposed) return;
    raf = requestAnimationFrame(frame);
    if (document.hidden) return; // pause when tab is in the background
    const t = clock.getElapsedTime();

    if (!REDUCED) {
      curX += (targetX - curX) * 0.04;
      curY += (targetY - curY) * 0.04;
    }
    // True parallax: move the CAMERA, let perspective do the layer offsets.
    camera.position.x = curX * 6 + (REDUCED ? 0 : Math.sin(t * 0.07) * 0.8);
    camera.position.y = 2.5 - curY * 3;
    camera.lookAt(0, 1.5, -60);

    moon.position.y = 26 + Math.sin(t * 0.18) * 0.5;
    mistA.position.x = Math.sin(t * 0.05) * 8;
    mistB.position.x = Math.cos(t * 0.04) * 10;

    if (ash) {
      const p = ash.geometry.attributes.position;
      for (let i = 0; i < ASH_COUNT; i++) {
        let y = p.getY(i) + 0.008 + (i % 5) * 0.002;
        let x = p.getX(i) + Math.sin(t * 0.5 + i) * 0.004;
        if (y > 30) { y = -12; x = (Math.random() - 0.5) * 120; }
        p.setY(i, y); p.setX(i, x);
      }
      p.needsUpdate = true;
    }
    renderer.render(scene, camera);
  }
  frame();

  // The WebGL sky replaces the CSS one — hide the fallback, don't remove it.
  const cssScene = document.querySelector('.parallax-scene');
  if (cssScene) cssScene.style.display = 'none';
  canvas.classList.add('scene3d-live');

  return {
    dispose() {
      disposed = true;
      cancelAnimationFrame(raf);
      removeEventListener('pointermove', onPointer);
      document.removeEventListener('pointerleave', onLeave);
      removeEventListener('resize', onResize);
      disposables.forEach((d) => d.dispose && d.dispose());
      renderer.dispose();
      canvas.remove();
      if (cssScene) cssScene.style.display = '';
    },
  };
}
