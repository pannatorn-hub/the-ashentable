// ui.js (v5 — NEW)
// ---------------------------------------------------------------------------
// Two UI surfaces that don't belong to any single game system:
//   1. The World Map Viewer — the macro-layer graph screen (fog of war,
//      current position, discovered regions, immediate adjacent paths).
//      Opened from anywhere outside combat via the HUD's "ดูแผนที่โลก" button.
//   2. The Settings panel — houses "ผูกบัญชี" (Link Account), the guest's
//      escape hatch into Firebase, plus logout.
//
// This file only returns HTML strings (or small HTML fragments meant to be
// spliced into gameController's HUD). It owns no state and binds no
// listeners — GameController's single delegated click handler still owns
// every data-action. That keeps the "one root listener, one place that
// mutates state" rule intact even as the file count grows.
//
// Expected new data-action values GameController must handle (see the
// integration notes shipped alongside this file):
//   goto-worldmap, worldmap-back, macro-select-node (data-macro="<id>"),
//   goto-settings, settings-back, link-account
//
// Zero DOM dependencies (string templates only — same discipline as every
// render* method in gameController.js).
// ---------------------------------------------------------------------------

import { t } from './i18n.js';
import { MacroKind, getAvailableMacroNodeIds, computeVisibleMacroNodeIds, isMacroNodeConquered, isMacroNodeDiscovered } from './world-map.js';
import { zoneName, zoneAccent, NodeType } from './zone-map.js';
import { isGuest } from './auth.js';

// ---------------- HUD nav fragments ----------------
// Splice these two into gameController's renderHud(), inside <nav class="hud-nav">.

export function worldMapNavButton() {
  return `<button class="btn btn-tiny" data-action="goto-worldmap" title="${t('world.viewer.title')}">${t('world.viewer.navLabel')}</button>`;
}

export function settingsNavButton() {
  return `<button class="btn btn-tiny" data-action="goto-settings" title="${t('settings.title')}">${t('settings.navLabel')}</button>`;
}

// ---------------- World Map Viewer (macro layer) ----------------

const MACRO_ICONS = {
  hubStart: '🏘', hubCapital: '🏰', zone: '⚔', deadEnd: '☠', outer: '🌫',
};

function macroIconFor(node, conquered) {
  if (node.kind === MacroKind.HUB) return node.id === 'capital' ? MACRO_ICONS.hubCapital : MACRO_ICONS.hubStart;
  if (conquered) return '✓';
  if (node.deadEnd) return MACRO_ICONS.deadEnd;
  if (node.outer) return MACRO_ICONS.outer;
  return MACRO_ICONS.zone;
}

function macroLabelFor(node, world) {
  if (node.kind === MacroKind.HUB) return node.id === 'capital' ? t('capital.name') : t('world.hub.start.name');
  return zoneName(node.zoneIndex);
}

/** Row-by-dangerTier layout, stable left-to-right order within a row by numeric id. Start (tier -1) at the bottom, deepest tier at the top — the same "climb upward into danger" convention as the micro map. */
function computeMacroLayout(macro, visibleIds) {
  const visibleNodes = [...visibleIds].map((id) => macro.nodes[id]).filter(Boolean);
  const tiers = [...new Set(visibleNodes.map((n) => n.dangerTier))].sort((a, b) => a - b);
  const rows = tiers.map((tier) => visibleNodes.filter((n) => n.dangerTier === tier).sort((a, b) => (a.id > b.id ? 1 : -1)));

  const COORD_WIDTH = 680;
  const marginX = 70, marginY = 55, rowGap = 105;
  const usableWidth = COORD_WIDTH - marginX * 2;
  const totalHeight = marginY * 2 + Math.max(0, rows.length - 1) * rowGap;

  const pos = {};
  rows.forEach((row, ri) => {
    const y = marginY + (rows.length - 1 - ri) * rowGap;
    row.forEach((node, ni) => {
      const x = row.length === 1 ? COORD_WIDTH / 2 : marginX + (ni / (row.length - 1)) * usableWidth;
      pos[node.id] = { x, y };
    });
  });
  return { pos, width: COORD_WIDTH, height: Math.max(totalHeight, marginY * 2) };
}

/**
 * The full World Map Viewer screen.
 * ctx: { macro, world, currentMacroId, worldVisionRange }
 */
export function renderWorldMapViewer(ctx) {
  const { macro, world, currentMacroId, worldVisionRange = 1 } = ctx;
  const visible = computeVisibleMacroNodeIds(macro, world, currentMacroId, worldVisionRange);
  const available = getAvailableMacroNodeIds(macro, world, currentMacroId);
  const { pos, width, height } = computeMacroLayout(macro, visible);

  const allIds = Object.keys(macro.nodes);

  const edgesSvg = allIds.flatMap((id) => {
    const node = macro.nodes[id];
    if (!visible.has(id) || !pos[id]) return [];
    return node.connectsTo.map((targetId) => {
      if (!pos[targetId]) return '';
      const a = pos[id], b = pos[targetId];
      const targetVisible = visible.has(targetId);
      const cls = !targetVisible ? 'locked' : available.has(targetId) ? 'reachable' : isMacroNodeDiscovered(macro.nodes[targetId], world) ? 'traveled' : 'locked';
      return `<line x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}" class="map-edge macro-edge ${cls}"/>`;
    });
  }).join('');

  const nodesHtml = allIds.map((id) => {
    if (!visible.has(id) || !pos[id]) return '';
    const node = macro.nodes[id];
    const { x, y } = pos[id];
    const style = `left:${((x / width) * 100).toFixed(2)}%;top:${((y / height) * 100).toFixed(2)}%`;
    const discovered = isMacroNodeDiscovered(node, world);
    const conquered = isMacroNodeConquered(node, world);
    const isAvailable = available.has(id) && id !== currentMacroId;
    const isCurrent = id === currentMacroId;
    const accent = node.kind === MacroKind.ZONE ? zoneAccent(node.zoneIndex) : 'var(--accent, #b9924f)';

    if (!discovered && !isAvailable && !isCurrent) {
      // Seen in the fog-of-war radius but never actually walked to: shape known, nothing more.
      return `<button class="map-node macro-node scouted" style="${style};--node-accent:${accent}" disabled title="${macroLabelFor(node, world)}">
        <span class="node-icon">${node.deadEnd ? MACRO_ICONS.deadEnd : '?'}</span>
      </button>`;
    }

    const cls = ['map-node', 'macro-node', node.kind, conquered ? 'cleared' : '', isAvailable ? 'available' : '', isCurrent ? 'current' : ''].join(' ');
    return `<button class="${cls}" style="${style};--node-accent:${accent}" data-action="macro-select-node" data-macro="${id}" ${isAvailable || isCurrent ? '' : 'disabled'} title="${macroLabelFor(node, world)}">
      <span class="node-icon">${macroIconFor(node, conquered)}</span>
      <span class="node-label">${macroLabelFor(node, world)}</span>
    </button>`;
  }).join('');

  return `
    <h2>${t('world.viewer.title')}</h2>
    <p class="tagline">${t('world.viewer.subtitle')}</p>
    <p class="legend-note">${t('zone.softcapWarn')}</p>
    <div class="map-wrap macro-map-wrap" style="aspect-ratio:${width}/${height}">
      <svg class="map-svg" viewBox="0 0 ${width} ${height}" preserveAspectRatio="none" aria-hidden="true">${edgesSvg}</svg>
      ${nodesHtml}
    </div>
    <div class="macro-legend">
      <span><i class="legend-dot cleared"></i>${t('world.viewer.legend.conquered')}</span>
      <span><i class="legend-dot available"></i>${t('world.viewer.legend.available')}</span>
      <span><i class="legend-dot scouted"></i>${t('world.viewer.legend.scouted')}</span>
    </div>
    <button class="btn btn-secondary" data-action="worldmap-back">${t('world.viewer.back')}</button>
  `;
}

// ---------------- Settings panel (Link Account lives here) ----------------

/**
 * ctx: { user, linkStatus } where linkStatus is null | 'working' | 'error'.
 * (On success GameController leaves the settings screen entirely, so
 * there's no 'done' state to render here.)
 */
// ---------------- Settings panel ----------------

export function renderSettingsPanel(ctx) {
  // v6: Unpacked player and rename variables from gameController
  const { user, linkStatus, player, renameError, renameSuccess, renameDraft } = ctx;
  const guest = isGuest(user);

  // 1. Rename Section (Fixed)
  let renameSection = '';
  if (player) {
    const canRename = (player.renameCount || 0) < 1; // 1 Free rename
    renameSection = `
      <div class="event-card">
        <h3>เปลี่ยนชื่อตัวละคร</h3>
        ${canRename ? `
          <p class="legend-note">คุณสามารถเปลี่ยนชื่อตัวละครได้ฟรี 1 ครั้ง</p>
          <input type="text" id="rename-input" class="name-input" placeholder="กรอกชื่อใหม่..." maxlength="20" value="${renameDraft || ''}" style="margin-bottom: 12px; display: block; width: 100%; text-align: center;">
          ${renameError ? `<p class="auth-error" style="color: #ff6b6b; font-size: 0.9em; margin-bottom: 10px;">${renameError}</p>` : ''}
          <button class="btn btn-primary" data-action="rename-confirm">ยืนยันการเปลี่ยนชื่อ</button>
        ` : `
          <p>ชื่อปัจจุบัน: <b>${player.name}</b></p>
          ${renameSuccess ? `<p class="reward-line" style="color: #7fbf4d;">${renameSuccess}</p>` : ''}
          <p class="legend-note">คุณใช้สิทธิ์การเปลี่ยนชื่อไปแล้ว</p>
        `}
      </div>
    `;
  }

  // 2. Link Account Section
  const linkSection = guest ? `
    <div class="event-card">
      <h3>${t('settings.link.title')}</h3>
      <p>${t('settings.link.body')}</p>
      ${linkStatus === 'working' ? `<div class="spinner"></div><p class="legend-note">${t('settings.link.working')}</p>` : ''}
      ${linkStatus === 'error' ? `<p class="auth-error">${t('settings.link.error')}</p>` : ''}
      <button class="btn btn-primary" data-action="link-account" ${linkStatus === 'working' ? 'disabled' : ''}>${t('settings.link.button')}</button>
    </div>
  ` : `
    <div class="event-card">
      <h3>${t('settings.linked.title')}</h3>
      <p>${t('settings.linked.body', { name: user.username || '' })}</p>
    </div>
  `;

  return `
    <h2>${t('settings.title')}</h2>
    ${renameSection}
    ${linkSection}
    <div class="menu-actions">
      <button class="btn btn-danger" data-action="logout">${t('menu.logout')}</button>
      <button class="btn btn-secondary" data-action="settings-back">${t('settings.back')}</button>
    </div>
  `;
}