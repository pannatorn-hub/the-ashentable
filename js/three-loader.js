// three-loader.js (v13)
// ---------------------------------------------------------------------------
// Loads three.js as an ES module from a CDN — no build step, no bundler,
// exactly like the rest of the project. Everything 3D in the game funnels
// through loadThree(); if the CDN is unreachable or the device has no WebGL,
// it resolves to null and every caller silently keeps the existing 2D
// presentation (CSS parallax + SVG portraits). The game NEVER breaks because
// of this layer — 3D is strictly progressive enhancement.
// ---------------------------------------------------------------------------

const THREE_URLS = [
  // Primary + fallback. Pinned version: never float on "latest" in prod.
  'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js',
  'https://unpkg.com/three@0.160.0/build/three.module.js',
];

const OPT_OUT_KEY = 'ashen_3d'; // set to 'off' to force the classic 2D look

let threePromise = null;

/** True when this device can actually create a WebGL context. */
export function hasWebGL() {
  try {
    const c = document.createElement('canvas');
    return !!(window.WebGLRenderingContext
      && (c.getContext('webgl2') || c.getContext('webgl') || c.getContext('experimental-webgl')));
  } catch { return false; }
}

/** Player/device opt-out — respected everywhere. */
export function is3DDisabled() {
  try { return localStorage.getItem(OPT_OUT_KEY) === 'off'; } catch { return false; }
}

export function set3DDisabled(off) {
  try { localStorage.setItem(OPT_OUT_KEY, off ? 'off' : 'on'); } catch { /* private mode */ }
}

/**
 * Resolve the THREE namespace, or null when 3D can't/shouldn't run.
 * Cached: every module shares one download and one decision.
 */
export function loadThree() {
  if (threePromise) return threePromise;
  threePromise = (async () => {
    if (is3DDisabled() || !hasWebGL()) return null;
    // v15: the import map in index.html resolves bare 'three' — try it first
    // so the whole page shares ONE three instance (addons require this).
    try {
      const mod = await import('three');
      if (mod && mod.Scene) return mod;
    } catch { /* no import map (embeds?) — fall through to direct URLs */ }
    for (const url of THREE_URLS) {
      try {
        const mod = await import(/* @vite-ignore */ url);
        // Some CDNs export the namespace directly, some under default.
        const THREE = mod.Scene ? mod : (mod.default && mod.default.Scene ? mod.default : null);
        if (THREE) return THREE;
      } catch (err) {
        console.warn(`three.js load failed from ${url}:`, err.message);
      }
    }
    return null; // all CDNs down — fall back to 2D silently
  })();
  return threePromise;
}


let addonsPromise = null;

/**
 * v15: loads the glTF toolchain (GLTFLoader + SkeletonUtils) through the
 * import map. Resolves null when unavailable — model-based characters then
 * fall back to the procedural rigs automatically.
 */
export function loadAddons() {
  if (addonsPromise) return addonsPromise;
  addonsPromise = (async () => {
    if (!(await loadThree())) return null;
    try {
      const [g, s] = await Promise.all([
        import('three/addons/loaders/GLTFLoader.js'),
        import('three/addons/utils/SkeletonUtils.js'),
      ]);
      return { GLTFLoader: g.GLTFLoader, SkeletonUtils: s };
    } catch (err) {
      console.warn('three addons unavailable — using procedural rigs:', err.message);
      return null;
    }
  })();
  return addonsPromise;
}
