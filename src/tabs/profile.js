// src/tabs/profile.js
import { escapeHtml, escapeAttr, unwrap } from '../utils.js';
import { onTabChange } from '../state.js';
import { isLoggedIn, logout, onBalanceChange, getInitial, authHeaders } from '../auth.js';
import { switchTab } from '../tabState.js';
import { getGalleryRows, getUserInteractionSets, openModalForRow } from './gallery.js';
import { GENERATED_PROMPTS_URL, GENERATED_VISUALS_URL } from '../config.js';
import { onProfileSectionRequest } from '../tabState.js';
import { openSettingsModal } from '../settingsModal.js';

let activeSection = 'overview'; // 'overview' | 'liked' | 'saved' | 'purchased' | 'generated-prompts' | 'generated-visuals'
let generatedPromptsLoading = false;
let generatedVisualsLoading = false;

function getStorageUsage() {
  return { usedGB: 0, totalGB: 20, percent: 0 };
}
function getMostUsedTools() {
  return [];
}
function getRecentActivity() {
  return [];
}

function getUserInfo() {
  let name = '', email = '', picture = '', username = '';
  try {
    name = localStorage.getItem('userName') || '';
    email = localStorage.getItem('userEmail') || '';
    picture = localStorage.getItem('userPicture') || '';
    // DÜZELTME: settingsModal.js artık kaydedilen username'i localStorage'a
    // 'userUsername' anahtarıyla yazıyor. Öncesinde bu alan hiç okunmuyordu,
    // bu yüzden alttaki handle hep email'in @ öncesinden türetiliyordu.
    username = localStorage.getItem('userUsername') || '';
  } catch (e) {}
  return { name, email, picture, username };
}

function renderSidebar() {
  const el = document.getElementById('profileSidebar');
  if (!el) return;

  const { name, email, picture, username } = getUserInfo();
  const displayName = name || 'Kullanıcı';
  // DÜZELTME: önce gerçek kaydedilmiş username'e bak; o yoksa (henüz hiç
  // ayarlardan kaydedilmemişse) email'in @ öncesine düş, eskisi gibi.
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
      <button class="profile-nav-item ${activeSection === 'overview' ? 'active' : ''}" data-section="overview">🏠 Overview</button>
      <button class="profile-nav-item ${activeSection === 'purchased' ? 'active' : ''}" data-section="purchased">💳 Satın Alınan Promptlar</button>
      <button class="profile-nav-item ${activeSection === 'saved' ? 'active' : ''}" data-section="saved">🔖 Kaydedilen Promptlar</button>
      <button class="profile-nav-item ${activeSection === 'liked' ? 'active' : ''}" data-section="liked">❤️ Beğenilen Promptlar</button>
      <button class="profile-nav-item" disabled title="Yakında aktif olacak">📤 Yüklenen Görseller</button>
      <button class="profile-nav-item ${activeSection === 'generated-prompts' ? 'active' : ''}" data-section="generated-prompts">📝 Oluşturulan Promptlar</button>
      <button class="profile-nav-item ${activeSection === 'generated-visuals' ? 'active' : ''}" data-section="generated-visuals">🖼️ Oluşturulan Görseller</button>
      <button class="profile-nav-item" disabled title="Yakında aktif olacak">🧬 Karakter Sheet'leri</button>
      <button class="profile-nav-item" disabled title="Yakında aktif olacak">📱 Sosyal Medya İçerikleri</button>
    </nav>


    <div class="profile-storage">
      <div class="profile-storage-row">
        <span>Depolama Kullanımı</span>
        <span id="profileStorageLabel"></span>
      </div>
      <div class="profile-storage-bar"><div class="profile-storage-fill" id="profileStorageFill"></div></div>
    </div>
  `;


  el.querySelectorAll('[data-section]').forEach((btn) => {
    btn.addEventListener('click', () => {
      activeSection = btn.dataset.section;
      renderProfilePage();
    });
  });

  const storage = getStorageUsage();
  document.getElementById('profileStorageLabel').textContent = `${storage.usedGB} / ${storage.totalGB} GB`;
  document.getElementById('profileStorageFill').style.width = `${storage.percent}%`;
}

// ---- Ortak: satır + tip listesi üretme ----

function getAllCollectionRowsWithTypes() {
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

function getSectionRows(section) {
  const rows = getGalleryRows();
  const { likes, saves, purchases } = getUserInteractionSets();

  let keySet;
  if (section === 'liked') keySet = likes;
  else if (section === 'saved') keySet = saves;
  else if (section === 'purchased') keySet = purchases;
  else return [];

  return rows.filter((r) => {
    const source = r.isPremium ? 'premium' : 'public';
    return keySet.has(`${source}:${r.id}`);
  });
}

const typeLabel = { liked: '❤️ Beğenildi', saved: '🔖 Kaydedildi', purchased: '💳 Satın Alındı' };

function tileHtml(row, extraLabels) {
  const tags = row.etiketler.split(',').map((t) => t.trim()).filter(Boolean);
  const source = row.isPremium ? 'premium' : 'public';
  const labels = extraLabels && extraLabels.length ? extraLabels : [tags[0] || (row.isPremium ? 'Premium' : '')];
  const hintHtml = labels.map((l) => `<span class="profile-tile-badge">${escapeHtml(l)}</span>`).join('');
  return `
    <div class="profile-collection-tile" data-row-id="${escapeAttr(row.id)}" data-row-source="${source}">
      <img src="${escapeAttr(row.gorselLink || '')}" alt="" loading="lazy">
      <div class="profile-collection-tile-hint">${hintHtml}</div>
    </div>`;
}

function bindRowTileClicks(container) {
  container.querySelectorAll('[data-row-id]').forEach((tile) => {
    if (tile.dataset.rowSource === 'generated') return;
    tile.addEventListener('click', () => {
      const { rowId, rowSource } = tile.dataset;
      const row = getGalleryRows().find(
        (r) => String(r.id) === rowId && (r.isPremium ? 'premium' : 'public') === rowSource
      );
      if (row) openModalForRow(row);
    });
  });
}

// ---- Overview: "Tümü" grid'i (widget kutularının ÜSTÜNE yerleşir) ----

function ensureOverviewCollectionPanel() {
  let panel = document.getElementById('profileOverviewCollection');
  if (panel) return panel;

  const widgetsRow = document.querySelector('.profile-widgets-row');
  const placeholder = document.querySelector('.profile-content-placeholder');
  if (!widgetsRow || !widgetsRow.parentElement) return null;

  // Artık gerçek içerik göstereceğimiz için "yakında burada görünecek" placeholder'ı gizle
  if (placeholder) placeholder.style.display = 'none';

  panel = document.createElement('div');
  panel.id = 'profileOverviewCollection';
  panel.className = 'profile-collection-panel';
  widgetsRow.parentElement.insertBefore(panel, widgetsRow);
  return panel;
}

function renderOverviewCollection() {
  const panel = ensureOverviewCollectionPanel();
  if (!panel) return;

  const items = getAllCollectionRowsWithTypes();

  const gridHtml = items.length
    ? `<div class="profile-collection-grid">
        ${items.map(({ row, types }) => tileHtml(row, types.map((t) => typeLabel[t]))).join('')}
      </div>`
    : `<div class="profile-empty-note">Henüz beğenilen, kaydedilen veya satın alınan bir prompt yok.</div>`;

  panel.innerHTML = `
    <div class="profile-collection-header">
      <h2>Tümü</h2>
      <span class="profile-collection-count">${items.length} öğe</span>
    </div>
    ${gridHtml}
  `;
  bindRowTileClicks(panel);
}

function renderMain() {
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

  renderOverviewCollection();
}

// ---- Beğenilen / Kaydedilen / Satın Alınan paneli (ayrı sekmeler) ----

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

const sectionTitle = {
  liked: 'Beğenilen Promptlar',
  saved: 'Kaydedilen Promptlar',
  purchased: 'Satın Alınan Promptlar',
  'generated-visuals': 'Oluşturulan Görseller'
};

function renderCollectionPanel(section) {
  const panel = ensureCollectionPanel();
  if (!panel) return;

  const rows = getSectionRows(section);
  const title = sectionTitle[section] || '';

  const gridHtml = rows.length
    ? `<div class="profile-collection-grid">${rows.map((r) => tileHtml(r)).join('')}</div>`
    : `<div class="profile-empty-note">Henüz burada bir şey yok.</div>`;

  panel.innerHTML = `
    <div class="profile-collection-header">
      <h2>${escapeHtml(title)}</h2>
      <span class="profile-collection-count">${rows.length} öğe</span>
    </div>
    ${gridHtml}
  `;
  bindRowTileClicks(panel);
}

// ---- Oluşturulan Promptlar paneli ----

async function fetchGeneratedPrompts() {
  if (!GENERATED_PROMPTS_URL || GENERATED_PROMPTS_URL.includes('YOUR-N8N-URL')) {
    return { error: 'Servis henüz bağlanmadı.' };
  }
  try {
    const res = await fetch(GENERATED_PROMPTS_URL, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({})
    });
    const raw = await res.json();
    const data = unwrap(Array.isArray(raw) ? raw[0] : raw) || {};
    return { rows: Array.isArray(data.rows) ? data.rows : [] };
  } catch (err) {
    return { error: err.message };
  }
}

function tileHintForRow(row) {
  const tags = (row.style_tags || '').split(',').map((t) => t.trim()).filter(Boolean);
  return row.category || tags[0] || 'Prompt';
}

function copyGeneratedPromptText(tile, promptText) {
  if (!promptText) return;
  navigator.clipboard.writeText(promptText).then(() => {
    const hint = tile.querySelector('.profile-collection-tile-hint');
    if (!hint) return;
    const original = hint.textContent;
    hint.textContent = 'Kopyalandı ✓';
    setTimeout(() => {
      hint.textContent = original;
    }, 1400);
  });
}

async function renderGeneratedPromptsPanel() {
  const panel = ensureCollectionPanel();
  if (!panel) return;

  if (generatedPromptsLoading) return;
  generatedPromptsLoading = true;

  panel.innerHTML = `
    <div class="profile-collection-header">
      <h2>Oluşturulan Promptlar</h2>
      <span class="profile-collection-count">…</span>
    </div>
    <div class="profile-empty-note">Yükleniyor...</div>
  `;

  const { rows, error } = await fetchGeneratedPrompts();
  generatedPromptsLoading = false;

  if (activeSection !== 'generated-prompts') return;

  if (error) {
    panel.innerHTML = `
      <div class="profile-collection-header">
        <h2>Oluşturulan Promptlar</h2>
        <span class="profile-collection-count">0 öğe</span>
      </div>
      <div class="profile-empty-note">Yüklenemedi: ${escapeHtml(error)}</div>
    `;
    return;
  }

  const gridHtml = rows.length
    ? `<div class="profile-collection-grid">
        ${rows.map((r) => `
          <div class="profile-collection-tile" data-row-id="${escapeAttr(r.id)}" data-row-source="generated" title="Prompt metnini kopyalamak için tıkla">
            <img src="${escapeAttr(r.image_url || '')}" alt="" loading="lazy">
            <div class="profile-collection-tile-hint">${escapeHtml(tileHintForRow(r))}</div>
          </div>`).join('')}
      </div>`
    : `<div class="profile-empty-note">Henüz prompt üretmedin. "Prompt Üretici" sekmesinden başlayabilirsin.</div>`;

  panel.innerHTML = `
    <div class="profile-collection-header">
      <h2>Oluşturulan Promptlar</h2>
      <span class="profile-collection-count">${rows.length} öğe</span>
    </div>
    ${gridHtml}
  `;

  panel.querySelectorAll('[data-row-source="generated"]').forEach((tile) => {
    const row = rows.find((r) => String(r.id) === tile.dataset.rowId);
    if (!row) return;
    tile.addEventListener('click', () => copyGeneratedPromptText(tile, row.prompt_text));
  });
}

// ---- Oluşturulan Görseller paneli ----

async function fetchGeneratedVisuals() {
  if (!GENERATED_VISUALS_URL || GENERATED_VISUALS_URL.includes('YOUR-N8N-URL')) {
    return { error: 'Servis henüz bağlanmadı.' };
  }
  try {
    const res = await fetch(GENERATED_VISUALS_URL, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({})
    });
    const raw = await res.json();
    const data = unwrap(Array.isArray(raw) ? raw[0] : raw) || {};
    return { rows: Array.isArray(data.rows) ? data.rows : [] };
  } catch (err) {
    return { error: err.message };
  }
}

function tileHintForVisualRow(row) {
  return row.provider || row.aspect_ratio || 'Görsel';
}

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
        ${rows.map((r, i) => `
          <div class="profile-collection-tile" data-row-id="${i}" data-row-source="generated-visual" title="Prompt metnini kopyalamak için tıkla">
            <img src="${escapeAttr(r.image_url || '')}" alt="" loading="lazy">
            <div class="profile-collection-tile-hint">${escapeHtml(tileHintForVisualRow(r))}</div>
          </div>`).join('')}
      </div>`
    : `<div class="profile-empty-note">Henüz görsel üretmedin. "Görsel Oluşturucu" sekmesinden başlayabilirsin.</div>`;

  panel.innerHTML = `
    <div class="profile-collection-header">
      <h2>Oluşturulan Görseller</h2>
      <span class="profile-collection-count">${rows.length} öğe</span>
    </div>
    ${gridHtml}
  `;

  panel.querySelectorAll('[data-row-source="generated-visual"]').forEach((tile) => {
    const row = rows[Number(tile.dataset.rowId)];
    if (!row) return;
    tile.addEventListener('click', () => copyGeneratedPromptText(tile, row.prompt_text));
  });
}

// ---- Sayfa görünürlük / yönlendirme ----

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
    renderMain();
  } else if (activeSection === 'generated-prompts') {
    setMainVisibility(false);
    renderGeneratedPromptsPanel();
  } else if (activeSection === 'generated-visuals') {
    setMainVisibility(false);
    renderGeneratedVisualsPanel();
  } else {
    setMainVisibility(false);
    renderCollectionPanel(activeSection);
  }
}

function bindQuickActions() {
  document.querySelectorAll('.profile-quick-action[data-tab]').forEach((btn) => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
  });
}

// Satın Alma Geçmişi artık Ayarlar > JG Plus & Ödemeler altında yaşıyor.
// Bu fonksiyonu çağıran eski yerler (örn. bildirimlerden bir link) kırılmasın diye
// silmek yerine yeni konuma yönlendiriyoruz.
export function openPurchaseHistorySection() {
  openSettingsModal('billing');
}

export function initProfile() {
  bindQuickActions();
  onProfileSectionRequest((section) => {
    activeSection = section;
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