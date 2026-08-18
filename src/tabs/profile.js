// src/tabs/profile.js
import { escapeHtml, escapeAttr, unwrap } from '../utils.js';
import { onTabChange } from '../state.js';
import { isLoggedIn, logout, onBalanceChange, getInitial, authHeaders } from '../auth.js';
import { switchTab } from '../tabState.js';
import { getGalleryRows, getUserInteractionSets } from './gallery.js';
import {
  GENERATED_PROMPTS_URL,
  GENERATED_VISUALS_URL,
  CHARACTERS_LIST_URL
} from '../config.js';
import { onProfileSectionRequest } from '../tabState.js';
import { openSettingsModal } from '../settingsModal.js';
import { openDetailModal } from '../detailModal.js';

// ---- Modern SVG iconlar (Lucide-style, 16px stroke) ----
const ICON = {
  home: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2h-4a1 1 0 0 1-1-1v-6h-4v6a1 1 0 0 1-1 1H5a2 2 0 0 1-2-2z"/></svg>',
  prompts: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="8" y1="13" x2="16" y2="13"/><line x1="8" y1="17" x2="14" y2="17"/></svg>',
  image: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="2"/><path d="M21 15l-5-5L5 21"/></svg>',
  character: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
  social: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>',
  all: '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>',
  heart: '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>',
  bookmark: '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>',
  card: '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg>',
  sparkles: '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1"/></svg>'
};

// activeSection: 'overview' | 'prompts' | 'generated-visuals' | 'characters'
let activeSection = 'overview';

// Overview üst chip filtresi: 'all' | 'prompts' | 'visuals' | 'characters'
let activeOverviewFilter = 'all';

// Promptlar sayfası alt chip filtresi: 'all' | 'liked' | 'saved' | 'purchased' | 'generated'
let activePromptFilter = 'all';

// Cache'ler — sekmeler arası gezinirken tekrar fetch etmeyelim
let cachedGeneratedPrompts = null;
let cachedGeneratedVisuals = null;
let cachedCharacters = null;

let generatedPromptsLoading = false;
let generatedVisualsLoading = false;
let charactersLoading = false;

function getUserInfo() {
  let name = '', email = '', picture = '', username = '';
  try {
    name = localStorage.getItem('userName') || '';
    email = localStorage.getItem('userEmail') || '';
    picture = localStorage.getItem('userPicture') || '';
    username = localStorage.getItem('userUsername') || '';
  } catch (e) { }
  return { name, email, picture, username };
}

function getMostUsedTools() { return []; }
function getRecentActivity() { return []; }

// ---- Sidebar ----

function renderSidebar() {
  const el = document.getElementById('profileSidebar');
  if (!el) return;

  const { name, email, picture, username } = getUserInfo();
  const displayName = name || 'Kullanıcı';
  const handle = username ? '@' + username : (email ? '@' + email.split('@')[0] : '@kullanici');

  el.innerHTML = `
    <div class="profile-card">
      <div class="profile-avatar-lg">
        ${picture ? `<img src="${escapeAttr(picture)}" alt="">` : escapeHtml(getInitial(name, email))}
      </div>
      <div class="profile-name-row">
        <span class="profile-name">${escapeHtml(displayName)}</span>
      </div>
      <div class="profile-handle">${escapeHtml(handle)}</div>
      <div class="profile-email">${escapeHtml(email || '—')}</div>
    </div>

    <nav class="profile-nav">
      <button class="profile-nav-item ${activeSection === 'overview' ? 'active' : ''}" data-section="overview"><span class="nav-icon">${ICON.home}</span> Overview</button>
      <button class="profile-nav-item ${activeSection === 'prompts' ? 'active' : ''}" data-section="prompts"><span class="nav-icon">${ICON.prompts}</span> Promptlar</button>
      <button class="profile-nav-item ${activeSection === 'generated-visuals' ? 'active' : ''}" data-section="generated-visuals"><span class="nav-icon">${ICON.image}</span> Oluşturulan Görseller</button>
      <button class="profile-nav-item ${activeSection === 'characters' ? 'active' : ''}" data-section="characters"><span class="nav-icon">${ICON.character}</span> Karakter Sheet'leri</button>
      <button class="profile-nav-item" disabled title="Yakında aktif olacak"><span class="nav-icon">${ICON.social}</span> Sosyal Medya İçerikleri</button>
    </nav>
  `;

  el.querySelectorAll('[data-section]').forEach((btn) => {
    btn.addEventListener('click', () => {
      activeSection = btn.dataset.section;
      // sekme değişince alt filtreleri resetle
      if (activeSection === 'overview') activeOverviewFilter = 'all';
      if (activeSection === 'prompts') activePromptFilter = 'all';
      renderProfilePage();
    });
  });
}

// ---- Ortak yardımcılar ----

function getInteractionRowsWithTypes() {
  const rows = getGalleryRows();
  const { likes, saves, purchases } = getUserInteractionSets();
  const out = [];
  rows.forEach((r) => {
    const source = r.isPremium ? 'premium' : 'public';
    const key = `${source}:${r.id}`;
    const types = [];
    if (purchases.has(key)) types.push('purchased');
    if (saves.has(key)) types.push('saved');
    if (likes.has(key)) types.push('liked');
    if (types.length) out.push({ row: r, types });
  });
  return out;
}

const typeLabel = {
  liked: `<span class="tile-badge-icon">${ICON.heart}</span> Beğenildi`,
  saved: `<span class="tile-badge-icon">${ICON.bookmark}</span> Kaydedildi`,
  purchased: `<span class="tile-badge-icon">${ICON.card}</span> Satın Alındı`
};

function galleryTileHtml(row, extraLabels) {
  const tags = row.etiketler.split(',').map((t) => t.trim()).filter(Boolean);
  const source = row.isPremium ? 'premium' : 'public';
  const labels = extraLabels && extraLabels.length ? extraLabels : [tags[0] || (row.isPremium ? 'Premium' : '')];
  // NOT: labels typeLabel'dan geliyorsa SVG içerir; tag'leri değil, plain string ise escape et.
  const hintHtml = labels.map((l) => {
    const isHtml = /<span|<svg/.test(l);
    return `<span class="profile-tile-badge">${isHtml ? l : escapeHtml(l)}</span>`;
  }).join('');
  return `
    <div class="profile-collection-tile" data-row-id="${escapeAttr(row.id)}" data-row-source="${source}">
      <img src="${escapeAttr(row.gorselLink || '')}" alt="" loading="lazy">
      <div class="profile-collection-tile-hint">${hintHtml}</div>
    </div>`;
}

function generatedPromptTileHtml(r) {
  const tags = (r.style_tags || '').split(',').map((t) => t.trim()).filter(Boolean);
  const hint = r.category || tags[0] || 'Prompt';
  return `
    <div class="profile-collection-tile" data-generated-prompt-id="${escapeAttr(r.id)}" title="Prompt metnini kopyalamak için tıkla">
      <img src="${escapeAttr(r.image_url || '')}" alt="" loading="lazy">
      <div class="profile-collection-tile-hint"><span class="profile-tile-badge"><span class="tile-badge-icon">${ICON.sparkles}</span> ${escapeHtml(hint)}</span></div>
    </div>`;
}

function generatedVisualTileHtml(r, idx) {
  const hint = r.provider || r.aspect_ratio || 'Görsel';
  return `
    <div class="profile-collection-tile" data-generated-visual-idx="${idx}" title="Prompt metnini kopyalamak için tıkla">
      <img src="${escapeAttr(r.image_url || '')}" alt="" loading="lazy">
      <div class="profile-collection-tile-hint"><span class="profile-tile-badge"><span class="tile-badge-icon">${ICON.image}</span> ${escapeHtml(hint)}</span></div>
    </div>`;
}

function characterTileHtml(r) {
  const hint = r.name || 'Karakter';
  return `
    <div class="profile-collection-tile" data-character-id="${escapeAttr(r.id)}" title="${escapeAttr(hint)}">
      <img src="${escapeAttr(r.image_url || '')}" alt="" loading="lazy">
      <div class="profile-collection-tile-hint"><span class="profile-tile-badge"><span class="tile-badge-icon">${ICON.character}</span> ${escapeHtml(hint)}</span></div>
    </div>`;
}

function bindGalleryClicks(container) {
  const rows = getGalleryRows();
  container.querySelectorAll('[data-row-id]').forEach((tile) => {
    tile.addEventListener('click', () => {
      const { rowId, rowSource } = tile.dataset;
      const row = rows.find(
        (r) => String(r.id) === rowId && (r.isPremium ? 'premium' : 'public') === rowSource
      );
      if (row) {
        // Modal'da göster (koleksiyon = gallery context)
        openDetailModal([row], 0, { context: 'gallery' });
      }
    });
  });
}

function bindCopyClicks(container, rowsById, promptField) {
  const rowsArray = Array.from(rowsById.values());
  container.querySelectorAll('[data-generated-prompt-id]').forEach((tile) => {
    const id = tile.dataset.generatedPromptId;
    const row = rowsById.get(id);
    if (!row) return;
    const idx = rowsArray.indexOf(row);
    tile.addEventListener('click', () => {
      openDetailModal(rowsArray, idx, {
        context: 'generated-prompts',
        onDelete: () => invalidateProfileCache('prompts')
      });
    });
  });
}

function bindVisualCopyClicks(container, rows) {
  container.querySelectorAll('[data-generated-visual-idx]').forEach((tile) => {
    const idx = Number(tile.dataset.generatedVisualIdx);
    const row = rows[idx];
    if (!row) return;
    tile.addEventListener('click', () => {
      openDetailModal(rows, idx, {
        context: 'generated-visuals',
        onDelete: () => invalidateProfileCache('visuals')
      });
    });
  });
}

// ---- Fetch (cache'li) ----

async function fetchGeneratedPrompts(force = false) {
  if (cachedGeneratedPrompts && !force) return cachedGeneratedPrompts;
  if (!GENERATED_PROMPTS_URL || GENERATED_PROMPTS_URL.includes('YOUR-N8N-URL')) {
    return { error: 'Servis henüz bağlanmadı.', rows: [] };
  }
  try {
    const res = await fetch(GENERATED_PROMPTS_URL, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({})
    });
    const raw = await res.json();
    const data = unwrap(Array.isArray(raw) ? raw[0] : raw) || {};
    cachedGeneratedPrompts = { rows: Array.isArray(data.rows) ? data.rows : [] };
    return cachedGeneratedPrompts;
  } catch (err) {
    return { error: err.message, rows: [] };
  }
}

async function fetchGeneratedVisuals(force = false) {
  if (cachedGeneratedVisuals && !force) return cachedGeneratedVisuals;
  if (!GENERATED_VISUALS_URL || GENERATED_VISUALS_URL.includes('YOUR-N8N-URL')) {
    return { error: 'Servis henüz bağlanmadı.', rows: [] };
  }
  try {
    const res = await fetch(GENERATED_VISUALS_URL, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({})
    });
    const raw = await res.json();
    const data = unwrap(Array.isArray(raw) ? raw[0] : raw) || {};
    cachedGeneratedVisuals = { rows: Array.isArray(data.rows) ? data.rows : [] };
    return cachedGeneratedVisuals;
  } catch (err) {
    return { error: err.message, rows: [] };
  }
}

async function fetchCharacters(force = false) {
  if (cachedCharacters && !force) return cachedCharacters;
  if (!CHARACTERS_LIST_URL || CHARACTERS_LIST_URL.includes('YOUR-N8N-URL')) {
    return { error: 'Servis henüz bağlanmadı.', rows: [] };
  }
  try {
    const res = await fetch(CHARACTERS_LIST_URL, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({})
    });
    const raw = await res.json();
    const data = unwrap(Array.isArray(raw) ? raw[0] : raw) || {};
    cachedCharacters = { rows: Array.isArray(data.rows) ? data.rows : [] };
    return cachedCharacters;
  } catch (err) {
    return { error: err.message, rows: [] };
  }
}

// ---- Overview paneli (widget'ların üstünde) ----

function ensureOverviewCollectionPanel() {
  let panel = document.getElementById('profileOverviewCollection');
  if (panel) return panel;

  const widgetsRow = document.querySelector('.profile-widgets-row');
  const placeholder = document.querySelector('.profile-content-placeholder');
  if (!widgetsRow || !widgetsRow.parentElement) return null;

  if (placeholder) placeholder.style.display = 'none';

  panel = document.createElement('div');
  panel.id = 'profileOverviewCollection';
  panel.className = 'profile-collection-panel';
  widgetsRow.parentElement.insertBefore(panel, widgetsRow);
  return panel;
}

async function renderOverviewCollection() {
  const panel = ensureOverviewCollectionPanel();
  if (!panel) return;

  // Loading state
  panel.innerHTML = `
    <div class="profile-collection-header">
      <h2>Tümü</h2>
      <span class="profile-collection-count">…</span>
    </div>
    <div class="profile-empty-note">Yükleniyor...</div>
  `;

  // Filtreye göre paralel fetch
  const wantPrompts = activeOverviewFilter === 'all' || activeOverviewFilter === 'prompts';
  const wantVisuals = activeOverviewFilter === 'all' || activeOverviewFilter === 'visuals';
  const wantCharacters = activeOverviewFilter === 'all' || activeOverviewFilter === 'characters';

  const [gp, gv, gc] = await Promise.all([
    wantPrompts ? fetchGeneratedPrompts() : Promise.resolve({ rows: [] }),
    wantVisuals ? fetchGeneratedVisuals() : Promise.resolve({ rows: [] }),
    wantCharacters ? fetchCharacters() : Promise.resolve({ rows: [] })
  ]);

  const interactions = wantPrompts ? getInteractionRowsWithTypes() : [];

  // Filter değiştiyse iptal
  if (activeSection !== 'overview') return;

  const tiles = [];

  if (wantPrompts) {
    // Koleksiyon (beğenilen/kaydedilen/satın alınan)
    interactions.forEach(({ row, types }) => {
      tiles.push({ kind: 'gallery', html: galleryTileHtml(row, types.map((t) => typeLabel[t])) });
    });
    // Oluşturulan promptlar
    (gp.rows || []).forEach((r) => {
      tiles.push({ kind: 'gen-prompt', html: generatedPromptTileHtml(r), row: r });
    });
  }

  if (wantVisuals) {
    (gv.rows || []).forEach((r, i) => {
      tiles.push({ kind: 'gen-visual', html: generatedVisualTileHtml(r, i), row: r });
    });
  }

  if (wantCharacters) {
    (gc.rows || []).forEach((r) => {
      tiles.push({ kind: 'character', html: characterTileHtml(r), row: r });
    });
  }

  const headerLabel = {
    all: 'Tümü',
    prompts: 'Promptlar',
    visuals: 'Görseller',
    characters: 'Karakterler'
  }[activeOverviewFilter] || 'Tümü';

  const gridHtml = tiles.length
    ? `<div class="profile-collection-grid">${tiles.map((t) => t.html).join('')}</div>`
    : `<div class="profile-empty-note">Henüz burada bir şey yok.</div>`;

  panel.innerHTML = `
    <div class="profile-collection-header">
      <h2>${escapeHtml(headerLabel)}</h2>
      <span class="profile-collection-count">${tiles.length} öğe</span>
    </div>
    ${gridHtml}
  `;

  // Bindings
  bindGalleryClicks(panel);

  const gpMap = new Map((gp.rows || []).map((r) => [String(r.id), r]));
  bindCopyClicks(panel, gpMap, 'prompt_text');
  bindVisualCopyClicks(panel, gv.rows || []);
}

// Overview üst chip'leri (Tümü/Promptlar/Görseller/Karakterler) — HTML'de var, JS ile aktif hale getir
function bindOverviewFilterChips() {
  const row = document.querySelector('.profile-filter-row');
  if (!row || row.dataset.bound === '1') return;
  row.dataset.bound = '1';

  const chipMap = {
    'Tümü': 'all',
    'Promptlar': 'prompts',
    'Görseller': 'visuals',
    'Karakterler': 'characters'
  };

  row.querySelectorAll('.profile-filter-chip').forEach((chip) => {
    const label = chip.textContent.trim();
    const filterKey = chipMap[label];
    if (!filterKey) return; // disabled chip
    chip.disabled = false;
    chip.removeAttribute('title');
    chip.addEventListener('click', () => {
      activeOverviewFilter = filterKey;
      row.querySelectorAll('.profile-filter-chip').forEach((c) => c.classList.remove('active'));
      chip.classList.add('active');
      renderOverviewCollection();
    });
  });
}

function syncOverviewFilterActiveChip() {
  const row = document.querySelector('.profile-filter-row');
  if (!row) return;
  const chipMap = {
    'all': 'Tümü',
    'prompts': 'Promptlar',
    'visuals': 'Görseller',
    'characters': 'Karakterler'
  };
  const wantLabel = chipMap[activeOverviewFilter] || 'Tümü';
  row.querySelectorAll('.profile-filter-chip').forEach((c) => {
    c.classList.toggle('active', c.textContent.trim() === wantLabel);
  });
}

function renderOverview() {
  const { name } = getUserInfo();
  const headerEl = document.getElementById('profileWelcomeName');
  if (headerEl) headerEl.textContent = name ? name.split(' ')[0] : 'Kullanıcı';

  const toolsEl = document.getElementById('profileToolsList');
  if (toolsEl) {
    const tools = getMostUsedTools();
    toolsEl.innerHTML = tools.length
      ? tools.map((t) => `
        <div class="profile-tool-row">
          <div class="profile-tool-label"><span>${t.icon}</span> ${escapeHtml(t.name)} <span class="profile-tool-pct">${t.percent}%</span></div>
          <div class="profile-tool-bar"><div class="profile-tool-fill" style="width:${t.percent}%"></div></div>
        </div>
      `).join('')
      : `<div class="profile-empty-note">Henüz araç kullanım verisi yok.</div>`;
  }

  const activityEl = document.getElementById('profileActivityList');
  if (activityEl) {
    const activity = getRecentActivity();
    activityEl.innerHTML = activity.length
      ? activity.map((a) => `
        <div class="profile-activity-row">
          <span class="profile-activity-icon">${a.icon}</span>
          <span class="profile-activity-text">${escapeHtml(a.text)}</span>
          <span class="profile-activity-time">${escapeHtml(a.time)}</span>
        </div>
      `).join('')
      : `<div class="profile-empty-note">Henüz aktivite yok.</div>`;
  }

  bindOverviewFilterChips();
  syncOverviewFilterActiveChip();
  renderOverviewCollection();
}

// ---- Promptlar sekmesi (birleşik + alt chip filtresi) ----

function ensureCollectionPanel() {
  let panel = document.getElementById('profileCollectionPanel');
  if (panel) return panel;

  const view = document.getElementById('profileView');
  if (!view) return null;

  panel = document.createElement('div');
  panel.id = 'profileCollectionPanel';
  panel.style.display = 'none';
  panel.className = 'profile-collection-panel';
  view.appendChild(panel);
  return panel;
}

const promptFilterChips = [
  { key: 'all', label: 'Tümü', icon: ICON.all },
  { key: 'liked', label: 'Beğenilen', icon: ICON.heart },
  { key: 'saved', label: 'Kaydedilen', icon: ICON.bookmark },
  { key: 'purchased', label: 'Satın Alınan', icon: ICON.card },
  { key: 'generated', label: 'Oluşturulan', icon: ICON.sparkles }
];

function renderPromptChipsHtml() {
  return promptFilterChips.map((c) => `
    <button class="profile-filter-chip ${c.key === activePromptFilter ? 'active' : ''}" data-prompt-filter="${c.key}"><span class="chip-icon">${c.icon}</span> ${escapeHtml(c.label)}</button>
  `).join('');
}

async function renderPromptsPanel() {
  const panel = ensureCollectionPanel();
  if (!panel) return;

  // Loading state
  panel.innerHTML = `
    <div class="profile-collection-header">
      <h2>Promptlar</h2>
      <span class="profile-collection-count">…</span>
    </div>
    <div class="profile-filter-row" id="promptSubFilterRow">
      ${renderPromptChipsHtml()}
    </div>
    <div class="profile-empty-note">Yükleniyor...</div>
  `;

  // Alt chip bindings
  panel.querySelectorAll('[data-prompt-filter]').forEach((chip) => {
    chip.addEventListener('click', () => {
      activePromptFilter = chip.dataset.promptFilter;
      renderPromptsPanel();
    });
  });

  const wantGenerated = activePromptFilter === 'all' || activePromptFilter === 'generated';
  const wantInteractions = activePromptFilter === 'all' || ['liked', 'saved', 'purchased'].includes(activePromptFilter);

  const gp = wantGenerated ? await fetchGeneratedPrompts() : { rows: [] };

  if (activeSection !== 'prompts') return;

  const tiles = [];

  if (wantInteractions) {
    const { likes, saves, purchases } = getUserInteractionSets();
    const rows = getGalleryRows();
    rows.forEach((r) => {
      const source = r.isPremium ? 'premium' : 'public';
      const key = `${source}:${r.id}`;
      const types = [];
      if (purchases.has(key)) types.push('purchased');
      if (saves.has(key)) types.push('saved');
      if (likes.has(key)) types.push('liked');

      if (!types.length) return;

      // Alt filtre uygula
      if (activePromptFilter === 'liked' && !types.includes('liked')) return;
      if (activePromptFilter === 'saved' && !types.includes('saved')) return;
      if (activePromptFilter === 'purchased' && !types.includes('purchased')) return;

      tiles.push({ html: galleryTileHtml(r, types.map((t) => typeLabel[t])) });
    });
  }

  if (wantGenerated) {
    (gp.rows || []).forEach((r) => {
      tiles.push({ html: generatedPromptTileHtml(r) });
    });
  }

  const gridHtml = tiles.length
    ? `<div class="profile-collection-grid">${tiles.map((t) => t.html).join('')}</div>`
    : `<div class="profile-empty-note">Bu filtrede gösterilecek bir şey yok.</div>`;

  panel.innerHTML = `
    <div class="profile-collection-header">
      <h2>Promptlar</h2>
      <span class="profile-collection-count">${tiles.length} öğe</span>
    </div>
    <div class="profile-filter-row" id="promptSubFilterRow">
      ${renderPromptChipsHtml()}
    </div>
    ${gridHtml}
  `;

  // Rebind chip'ler (innerHTML overwrite ettiği için)
  panel.querySelectorAll('[data-prompt-filter]').forEach((chip) => {
    chip.addEventListener('click', () => {
      activePromptFilter = chip.dataset.promptFilter;
      renderPromptsPanel();
    });
  });

  bindGalleryClicks(panel);
  const gpMap = new Map((gp.rows || []).map((r) => [String(r.id), r]));
  bindCopyClicks(panel, gpMap, 'prompt_text');
}

// ---- Oluşturulan Görseller paneli ----

async function renderGeneratedVisualsPanel() {
  const panel = ensureCollectionPanel();
  if (!panel) return;

  if (generatedVisualsLoading) return;
  generatedVisualsLoading = true;

  panel.innerHTML = `
    <div class="profile-collection-header">
      <h2>Oluşturulan Görseller</h2>
      <span class="profile-collection-count">…</span>
    </div>
    <div class="profile-empty-note">Yükleniyor...</div>
  `;

  const { rows, error } = await fetchGeneratedVisuals();
  generatedVisualsLoading = false;

  if (activeSection !== 'generated-visuals') return;

  if (error) {
    panel.innerHTML = `
      <div class="profile-collection-header">
        <h2>Oluşturulan Görseller</h2>
        <span class="profile-collection-count">0 öğe</span>
      </div>
      <div class="profile-empty-note">Yüklenemedi: ${escapeHtml(error)}</div>
    `;
    return;
  }

  const gridHtml = rows.length
    ? `<div class="profile-collection-grid">
        ${rows.map((r, i) => generatedVisualTileHtml(r, i)).join('')}
      </div>`
    : `<div class="profile-empty-note">Henüz görsel üretmedin. "Görsel Oluşturucu" sekmesinden başlayabilirsin.</div>`;

  panel.innerHTML = `
    <div class="profile-collection-header">
      <h2>Oluşturulan Görseller</h2>
      <span class="profile-collection-count">${rows.length} öğe</span>
    </div>
    ${gridHtml}
  `;

  bindVisualCopyClicks(panel, rows);
}

// ---- Karakter Sheet'leri paneli ----

async function renderCharactersPanel() {
  const panel = ensureCollectionPanel();
  if (!panel) return;

  if (charactersLoading) return;
  charactersLoading = true;

  panel.innerHTML = `
    <div class="profile-collection-header">
      <h2>Karakter Sheet'leri</h2>
      <span class="profile-collection-count">…</span>
    </div>
    <div class="profile-empty-note">Yükleniyor...</div>
  `;

  const { rows, error } = await fetchCharacters();
  charactersLoading = false;

  if (activeSection !== 'characters') return;

  if (error) {
    panel.innerHTML = `
      <div class="profile-collection-header">
        <h2>Karakter Sheet'leri</h2>
        <span class="profile-collection-count">0 öğe</span>
      </div>
      <div class="profile-empty-note">Yüklenemedi: ${escapeHtml(error)}</div>
    `;
    return;
  }

  const gridHtml = rows.length
    ? `<div class="profile-collection-grid">
        ${rows.map((r) => characterTileHtml(r)).join('')}
      </div>`
    : `<div class="profile-empty-note">Henüz karakter oluşturmadın. "AI Avatar / Karakter Oluşturucu" sekmesinden başlayabilirsin.</div>`;

  panel.innerHTML = `
    <div class="profile-collection-header">
      <h2>Karakter Sheet'leri</h2>
      <span class="profile-collection-count">${rows.length} öğe</span>
    </div>
    ${gridHtml}
  `;

  // Karakter tıklama - detail modal
  panel.querySelectorAll('[data-character-id]').forEach((tile) => {
    const id = tile.dataset.characterId;
    const idx = rows.findIndex((r) => String(r.id) === id);
    if (idx < 0) return;
    tile.addEventListener('click', () => {
      openDetailModal(rows, idx, {
        context: 'characters',
        onDelete: () => invalidateProfileCache('characters')
      });
    });
  });
}

// ---- Görünürlük / router ----

function setMainVisibility(showOverview) {
  const view = document.getElementById('profileView');
  const sidebar = document.getElementById('profileSidebar');
  const panel = document.getElementById('profileCollectionPanel');
  if (!view || !sidebar) return;

  Array.from(view.children).forEach((child) => {
    if (child === sidebar || child === panel) return;
    child.style.display = showOverview ? '' : 'none';
  });
  if (panel) panel.style.display = showOverview ? 'none' : '';
}

function renderProfilePage() {
  if (!isLoggedIn()) return;
  renderSidebar();

  if (activeSection === 'overview') {
    setMainVisibility(true);
    renderOverview();
  } else if (activeSection === 'prompts') {
    setMainVisibility(false);
    renderPromptsPanel();
  } else if (activeSection === 'generated-visuals') {
    setMainVisibility(false);
    renderGeneratedVisualsPanel();
  } else if (activeSection === 'characters') {
    setMainVisibility(false);
    renderCharactersPanel();
  } else {
    // Eski section adları (liked/saved/purchased/generated-prompts) — Promptlar'a yönlendir
    activeSection = 'prompts';
    if (['liked', 'saved', 'purchased'].includes(activePromptFilter) === false) {
      // eski isim gelirse map et
    }
    setMainVisibility(false);
    renderPromptsPanel();
  }
}

function bindQuickActions() {
  document.querySelectorAll('.profile-quick-action[data-tab]').forEach((btn) => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
  });
}

export function openPurchaseHistorySection() {
  openSettingsModal('billing');
}

// Cache invalidation — dışarıdan çağrılabilir (yeni prompt/görsel/karakter üretilince)
export function invalidateProfileCache(kind) {
  if (!kind || kind === 'prompts') cachedGeneratedPrompts = null;
  if (!kind || kind === 'visuals') cachedGeneratedVisuals = null;
  if (!kind || kind === 'characters') cachedCharacters = null;
}

export function initProfile() {
  bindQuickActions();
  onProfileSectionRequest((section) => {
    // Eski section isimlerini map et
    const legacyMap = {
      'liked': { section: 'prompts', filter: 'liked' },
      'saved': { section: 'prompts', filter: 'saved' },
      'purchased': { section: 'prompts', filter: 'purchased' },
      'generated-prompts': { section: 'prompts', filter: 'generated' }
    };
    if (legacyMap[section]) {
      activeSection = legacyMap[section].section;
      activePromptFilter = legacyMap[section].filter;
    } else {
      activeSection = section;
    }
    renderProfilePage();
  });
  onTabChange((tab) => {
    if (tab === 'profile') renderProfilePage();
  });
  onBalanceChange(() => {
    const view = document.getElementById('profileView');
    if (view && view.style.display !== 'none') renderProfilePage();
  });
}