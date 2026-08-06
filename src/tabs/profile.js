// src/tabs/profile.js
import { escapeHtml, escapeAttr, unwrap } from '../utils.js';
import { onTabChange } from '../state.js';
import { isLoggedIn, logout, onBalanceChange, getInitial, authHeaders } from '../auth.js';
import { switchTab } from '../tabState.js';
import { getGalleryRows, getUserInteractionSets, openModalForRow } from './gallery.js';
import { GENERATED_PROMPTS_URL } from '../config.js';

let activeSection = 'overview'; // 'overview' | 'liked' | 'saved-purchased' | 'generated-prompts'
let generatedPromptsLoading = false;

// ---- Veri katmanı (backend hazır olana kadar gerçek/sıfır değer döner) ----

function getStorageUsage() {
  return { usedGB: 0, totalGB: 20, percent: 0 };
}
function getMostUsedTools() {
  return [];
}
function getRecentActivity() {
  return [];
}

// ---- Gerçek kullanıcı verisi ----

function getUserInfo() {
  let name = '', email = '', picture = '';
  try {
    name = localStorage.getItem('userName') || '';
    email = localStorage.getItem('userEmail') || '';
    picture = localStorage.getItem('userPicture') || '';
  } catch (e) {}
  return { name, email, picture };
}

function renderSidebar() {
  const el = document.getElementById('profileSidebar');
  if (!el) return;

  const { name, email, picture } = getUserInfo();
  const displayName = name || 'Kullanıcı';
  const handle = email ? '@' + email.split('@')[0] : '@kullanici';

  el.innerHTML = `
    <div class="profile-card">
      <div class="profile-avatar-lg">
        ${picture ? `<img src="${escapeHtml(picture)}" alt="">` : escapeHtml(getInitial(name, email))}
      </div>
      <div class="profile-name-row">
        <span class="profile-name">${escapeHtml(displayName)}</span>
        <span class="profile-plan-badge">Pro</span>
      </div>
      <div class="profile-handle">${escapeHtml(handle)}</div>
      <div class="profile-email">${escapeHtml(email || '—')}</div>
    </div>

    <div class="profile-plus-card">
      <div class="profile-plus-title">👑 JG Plus</div>
      <div class="profile-plus-status"><span class="dot"></span> Aktif Üyelik</div>
      <button class="btn primary" style="width:100%; margin-top:10px;" disabled title="Yakında aktif olacak">Planı Yönet</button>
    </div>

    <nav class="profile-nav">
      <button class="profile-nav-item ${activeSection === 'overview' ? 'active' : ''}" data-section="overview">🏠 Overview</button>
      <button class="profile-nav-item ${activeSection === 'saved-purchased' ? 'active' : ''}" data-section="saved-purchased">🔖 Satın Alınan / Kaydedilen Promptlar</button>
      <button class="profile-nav-item ${activeSection === 'liked' ? 'active' : ''}" data-section="liked">❤️ Beğenilen Promptlar</button>
      <button class="profile-nav-item" disabled title="Yakında aktif olacak">📤 Yüklenen Görseller</button>
      <button class="profile-nav-item ${activeSection === 'generated-prompts' ? 'active' : ''}" data-section="generated-prompts">📝 Oluşturulan Promptlar</button>
      <button class="profile-nav-item" disabled title="Yakında aktif olacak">🖼️ Oluşturulan Görseller</button>
      <button class="profile-nav-item" disabled title="Yakında aktif olacak">🧬 Karakter Sheet'leri</button>
      <button class="profile-nav-item" disabled title="Yakında aktif olacak">📱 Sosyal Medya İçerikleri</button>
    </nav>

    <nav class="profile-nav profile-nav-secondary">
      <button class="profile-nav-item" disabled title="Yakında aktif olacak">⚙️ Ayarlar</button>
      <button class="profile-nav-item" disabled title="Yakında aktif olacak">👤 Hesap Ayarları</button>
      <button class="profile-nav-item" disabled title="Yakında aktif olacak">💳 Fatura ve Ödemeler</button>
      <button class="profile-nav-item" disabled title="Yakında aktif olacak">❓ Destek & Yardım</button>
      <button class="profile-nav-item profile-logout" id="profileLogoutBtn">↩ Çıkış Yap</button>
    </nav>

    <div class="profile-storage">
      <div class="profile-storage-row">
        <span>Depolama Kullanımı</span>
        <span id="profileStorageLabel"></span>
      </div>
      <div class="profile-storage-bar"><div class="profile-storage-fill" id="profileStorageFill"></div></div>
    </div>
  `;

  document.getElementById('profileLogoutBtn').addEventListener('click', logout);

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
}

// ---- Beğenilen / Kaydedilen-Satın Alınan panel ----

function getSectionRows(section) {
  const rows = getGalleryRows();
  const { likes, saves, purchases } = getUserInteractionSets();

  let keySet;
  if (section === 'liked') keySet = likes;
  else if (section === 'saved-purchased') keySet = new Set([...saves, ...purchases]);
  else return [];

  return rows.filter((r) => {
    const source = r.isPremium ? 'premium' : 'public';
    return keySet.has(`${source}:${r.id}`);
  });
}

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

  // Tile'lara tıklayınca ilgili satırı bulup galerideki modalı açan tek seferlik delegation
  // (yalnızca 'liked' / 'saved-purchased' bölümlerindeki gallery-row tile'ları için geçerli;
  // 'generated-prompts' tile'ları kendi click handler'ını ayrıca bağlıyor, bkz. renderGeneratedPromptsPanel)
  panel.addEventListener('click', (e) => {
    const tile = e.target.closest('[data-row-id]');
    if (!tile || tile.dataset.rowSource === 'generated') return;
    const { rowId, rowSource } = tile.dataset;
    const row = getGalleryRows().find(
      (r) => String(r.id) === rowId && (r.isPremium ? 'premium' : 'public') === rowSource
    );
    if (row) openModalForRow(row);
  });

  return panel;
}

function renderCollectionPanel(section) {
  const panel = ensureCollectionPanel();
  if (!panel) return;

  const rows = getSectionRows(section);
  const title = section === 'liked' ? 'Beğenilen Promptlar' : 'Satın Alınan / Kaydedilen Promptlar';

  const gridHtml = rows.length
    ? `<div class="profile-collection-grid">
        ${rows.map((r) => {
          const tags = r.etiketler.split(',').map((t) => t.trim()).filter(Boolean);
          const firstTag = tags[0] || (r.isPremium ? 'Premium' : '');
          const source = r.isPremium ? 'premium' : 'public';
          return `
          <div class="profile-collection-tile" data-row-id="${escapeAttr(r.id)}" data-row-source="${source}">
            <img src="${r.gorselLink || ''}" alt="" loading="lazy">
            <div class="profile-collection-tile-hint">${escapeHtml(firstTag)}</div>
          </div>`;
        }).join('')}
      </div>`
    : `<div class="profile-empty-note">Henüz burada bir şey yok.</div>`;

  panel.innerHTML = `
    <div class="profile-collection-header">
      <h2>${escapeHtml(title)}</h2>
      <span class="profile-collection-count">${rows.length} öğe</span>
    </div>
    ${gridHtml}
  `;
}

// ---- Oluşturulan Promptlar paneli (Supabase'den kullanıcıya özel) ----

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

  // Kullanıcı bu sırada başka bir sekmeye geçmiş olabilir; eski isteğin sonucunu göstermeyelim.
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

export function initProfile() {
  bindQuickActions();
  onTabChange((tab) => {
    if (tab === 'profile') renderProfilePage();
  });
  onBalanceChange(() => {
    const view = document.getElementById('profileView');
    if (view && view.style.display !== 'none') renderProfilePage();
  });
}