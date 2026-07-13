// parallax.js
// ---------------------------------------------------------------------------
// A lightweight 2.5D parallax effect. Layers move at different speeds
// relative to the pointer (controlled by each layer's data-depth), which
// fakes depth on flat 2D art. A second, independent ambient drift keeps far
// background layers gently alive even with no pointer input.
// ---------------------------------------------------------------------------

export function initParallax(containerSelector = '.parallax-scene') {
  const scene = document.querySelector(containerSelector);
  if (!scene) return;

  const layers = Array.from(scene.querySelectorAll('.parallax-layer'));
  if (layers.length === 0) return;

  let targetX = 0;
  let targetY = 0;
  let currentX = 0;
  let currentY = 0;

  scene.addEventListener('pointermove', (e) => {
    const rect = scene.getBoundingClientRect();
    targetX = (e.clientX - rect.left) / rect.width - 0.5; // -0.5 .. 0.5
    targetY = (e.clientY - rect.top) / rect.height - 0.5;
  });

  scene.addEventListener('pointerleave', () => {
    targetX = 0;
    targetY = 0;
  });

  function animate() {
    // Ease toward the target for a smooth, slightly-lagged feel.
    currentX += (targetX - currentX) * 0.06;
    currentY += (targetY - currentY) * 0.06;

    layers.forEach((layer) => {
      const depth = parseFloat(layer.dataset.depth || '0.1');
      const moveX = currentX * depth * 40;
      const moveY = currentY * depth * 24;
      layer.style.transform = `translate3d(${moveX}px, ${moveY}px, 0) scale(${1 + depth * 0.06})`;
    });

    requestAnimationFrame(animate);
  }

  requestAnimationFrame(animate);
}

/** Slow ambient drift (e.g. mist / stars) independent of pointer input. */
export function initAmbientDrift(containerSelector = '.parallax-scene') {
  const scene = document.querySelector(containerSelector);
  if (!scene) return;
  const driftLayers = Array.from(scene.querySelectorAll('[data-drift="true"]'));
  if (driftLayers.length === 0) return;

  let t = 0;
  function loop() {
    t += 0.0015;
    driftLayers.forEach((layer, i) => {
      const offset = Math.sin(t + i) * 12;
      layer.style.backgroundPositionX = `${offset}px`;
    });
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
}
