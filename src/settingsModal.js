// src/settingsModal.js
// "Ayarlar" modalı — Profil Bilgileri, Güvenlik, Bildirim Tercihleri, Görünüm,
// Vero Plus & Ödemeler, Bağlı Hesaplar, Kullanım, Hesabı Sil sekmeleri.
// Profil Bilgileri artık get-profile/save-profile'a bağlı (name + username).
// Bio ve avatar backend'de henüz desteklenmiyor, bilinçli olarak disabled bırakıldı.
// Satın Alma Geçmişi artık profile.js'ten buraya taşındı (Vero Plus & Ödemeler sekmesi).
// Dil seçimi (TR/EN) Görünüm sekmesine eklendi — i18n.js üzerinden çalışır.
//
// i18n: Tüm görünür metinler t() üzerinden okunur. TABS ve ICONS dışında
// hiçbir statik Türkçe metin YOK — panel fonksiyonları her çağrıldığında
// güncel dile göre yeniden üretilir.
import './styles/settings.css';
import { escapeAttr, escapeHtml, unwrap } from './utils.js';
import { authHeaders, renderAuthArea } from './auth.js';
import { GET_PROFILE_URL, SAVE_PROFILE_URL, PURCHASE_HISTORY_URL } from './config.js';
import { getStoredTheme, setStoredTheme, applyTheme, getStoredDensity, setStoredDensity, applyDensity } from './state.js';
import { switchTab } from './tabState.js';
import { t, getLang, setLanguage } from './i18n.js';

const ICONS = {
  profile: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 4-6 8-6s8 2 8 6"/></svg>',
  security: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>',
  notifications: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 8a6 6 0 1 1 12 0c0 5 2 6 2 6H4s2-1 2-6"/><path d="M10 20a2 2 0 0 0 4 0"/></svg>',
  appearance: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><circle cx="8.5" cy="10.5" r="1.2" fill="currentColor" stroke="none"/><circle cx="12" cy="7.5" r="1.2" fill="currentColor" stroke="none"/><circle cx="15.5" cy="10.5" r="1.2" fill="currentColor" stroke="none"/></svg>',
  billing: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2l7 7-7 13-7-13 7-7z"/></svg>',
  connections: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 12a4 4 0 0 1 0-6l2-2a4 4 0 0 1 6 6l-1 1"/><path d="M15 12a4 4 0 0 1 0 6l-2 2a4 4 0 0 1-6-6l1-1"/></svg>',
  usage: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 19h16"/><rect x="6" y="11" width="3" height="8"/><rect x="11" y="6" width="3" height="13"/><rect x="16" y="14" width="3" height="5"/></svg>',
  delete: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2m-8 0 1 13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1l1-13"/></svg>',
  camera: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M9 3l-1.5 2H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-3.5L15 3H9zm3 6a4.5 4.5 0 1 1 0 9 4.5 4.5 0 0 1 0-9z"/></svg>'
};

// TABS artık sadece id/danger taşıyor — label her renderNav() çağrısında t() ile okunuyor.
const TABS = [
  { id: 'profile', labelKey: 'settings.tabs.profile' },
  { id: 'security', labelKey: 'settings.tabs.security' },
  { id: 'notifications', labelKey: 'settings.tabs.notifications' },
  { id: 'appearance', labelKey: 'settings.tabs.appearance' },
  { id: 'billing', labelKey: 'settings.tabs.billing' },
  { id: 'connections', labelKey: 'settings.tabs.connections' },
  { id: 'usage', labelKey: 'settings.tabs.usage' },
  { id: 'delete', labelKey: 'settings.tabs.delete', danger: true }
];

let activeTab = 'profile';
let pendingAvatarDataUrl = null;

// Sunucudan (get-profile) gelen taze veri. Ilk render'da bos, fetch bitince doluyor.
let serverProfile = { loaded: false, name: '', username: '', picture: '' };
let profileSave = { loading: false, error: '' };

// Satın Alma Geçmişi state'i — profile.js'ten taşındı.
let purchaseHistory = { loaded: false, loading: false, error: '', kodGecmisi: [], subTab: 'codes' };

function getUser() {
  let name = '', email = '', picture = '';
  try {
    name = localStorage.getItem('userName') || '';
    email = localStorage.getItem('userEmail') || '';
    picture = localStorage.getItem('userPicture') || '';
  } catch (e) { }
  return { name, email, picture };
}

function renderNav() {
  const nav = document.getElementById('settingsNav');
  if (!nav) return;
  nav.innerHTML = TABS.map((tab) => `
    <button class="settings-nav-item ${tab.id === activeTab ? 'active' : ''} ${tab.danger ? 'settings-nav-danger' : ''}" data-settings-tab="${tab.id}">
      <span class="settings-nav-icon">${ICONS[tab.id]}</span>
      <span>${escapeHtml(t(tab.labelKey))}</span>
    </button>
  `).join('');
}

function panelProfile() {
  const { name, email, picture } = getUser();
  const displayName = serverProfile.loaded ? serverProfile.name : name;
  const displayUsername = serverProfile.loaded ? serverProfile.username : '';

  return `
    <h3 class="settings-panel-title">${escapeHtml(t('settings.profile.title'))}</h3>
    <p class="settings-panel-sub">${escapeHtml(t('settings.profile.subtitle'))}</p>

    <div class="settings-avatar-row">
      <div class="settings-avatar-wrap">
        <div class="settings-avatar-img" id="settingsAvatarPreview">
          ${picture ? `<img src="${escapeAttr(picture)}" alt="">` : escapeHtml((name || email || 'Vero').charAt(0).toUpperCase())}
        </div>
        <button type="button" class="settings-avatar-camera-btn" id="settingsAvatarBtn" disabled title="${escapeAttr(t('settings.common.soon'))}">${ICONS.camera}</button>
        <input type="file" id="settingsAvatarInput" accept="image/*" style="display:none" disabled>
      </div>
      <p class="settings-avatar-hint">${escapeHtml(t('settings.profile.avatar_hint'))}</p>
    </div>

    <div class="settings-field-row">
      <div class="settings-field-group">
        <label class="settings-field-label">${escapeHtml(t('settings.profile.name_label'))}</label>
        <input type="text" class="settings-input" id="settingsNameInput" value="${escapeAttr(displayName)}" maxlength="50">
      </div>
      <div class="settings-field-group">
        <label class="settings-field-label">${escapeHtml(t('settings.profile.username_label'))}</label>
        <input type="text" class="settings-input" id="settingsUsernameInput" value="${escapeAttr(displayUsername)}" placeholder="${escapeAttr(t('settings.profile.username_placeholder'))}" maxlength="20" ${serverProfile.loaded ? '' : 'disabled'}>
      </div>
    </div>

    <div class="settings-field-group">
      <label class="settings-field-label">${escapeHtml(t('settings.profile.email_label'))}</label>
      <input type="email" class="settings-input" value="${escapeAttr(email)}" disabled title="${escapeAttr(t('settings.profile.email_locked_title'))}">
    </div>

    <div class="settings-field-group">
      <label class="settings-field-label">${escapeHtml(t('settings.profile.bio_label'))}</label>
      <textarea class="settings-textarea" id="settingsBioInput" maxlength="200" placeholder="${escapeAttr(t('settings.profile.bio_placeholder'))}" disabled title="${escapeAttr(t('settings.common.soon'))}"></textarea>
    </div>

    <div class="settings-save-row">
      <button type="button" class="settings-btn" data-settings-close>${escapeHtml(t('settings.common.cancel'))}</button>
      <button type="button" class="settings-btn settings-btn-primary" id="settingsSaveBtn" ${serverProfile.loaded ? '' : 'disabled'}>
        ${profileSave.loading ? escapeHtml(t('settings.profile.saving')) : escapeHtml(t('settings.profile.save_btn'))}
      </button>
    </div>
    <div id="settingsSaveStatus" class="settings-save-status" style="${profileSave.error ? '' : 'display:none;'} color:#e0554a; font-size:13px; margin-top:8px; text-align:right;">
      ${escapeHtml(profileSave.error || '')}
    </div>
  `;
}

function panelSecurity() {
  return `
    <h3 class="settings-panel-title">${escapeHtml(t('settings.security.title'))}</h3>
    <p class="settings-panel-sub">${escapeHtml(t('settings.security.subtitle'))}</p>

    <div class="settings-security-block">
      <div class="settings-security-row">
        <div>
          <div class="settings-security-label">${escapeHtml(t('settings.security.password_label'))}</div>
          <div class="settings-security-desc">${escapeHtml(t('settings.security.password_desc'))}</div>
        </div>
        <button type="button" class="settings-btn" disabled title="${escapeAttr(t('settings.common.soon'))}">${escapeHtml(t('settings.security.password_btn'))}</button>
      </div>

      <div class="settings-divider"></div>

      <div class="settings-security-row">
        <div>
          <div class="settings-security-label">${escapeHtml(t('settings.security.twofa_label'))}</div>
          <div class="settings-security-desc">${escapeHtml(t('settings.security.twofa_desc'))}</div>
        </div>
        <button type="button" class="settings-toggle" disabled title="${escapeAttr(t('settings.common.soon'))}"><span class="settings-toggle-knob"></span></button>
      </div>

      <div class="settings-divider"></div>

      <div class="settings-security-label" style="margin-bottom:10px;">${escapeHtml(t('settings.security.sessions_label'))}</div>
      <div class="settings-session-row">
        <div>
          <div class="settings-security-label">${escapeHtml(t('settings.security.this_device_label'))}</div>
          <div class="settings-security-desc">${escapeHtml(t('settings.security.this_device_desc'))}</div>
        </div>
        <button type="button" class="settings-btn" disabled title="${escapeAttr(t('settings.common.soon'))}">${escapeHtml(t('settings.security.end_session_btn'))}</button>
      </div>

      <div class="settings-divider"></div>

      <button type="button" class="settings-btn settings-btn-danger" style="width:100%" disabled title="${escapeAttr(t('settings.common.soon'))}">${escapeHtml(t('settings.security.end_all_btn'))}</button>
    </div>
  `;
}

function panelPlaceholder(titleKey, descKey) {
  return `
    <h3 class="settings-panel-title">${escapeHtml(t(titleKey))}</h3>
    <p class="settings-panel-sub">${escapeHtml(t(descKey))}</p>
    <div class="settings-placeholder">${escapeHtml(t('settings.common.coming_soon_section'))}</div>
  `;
}

function panelAppearance() {
  const currentTheme = getStoredTheme();
  const currentDensity = getStoredDensity();
  const currentLang = getLang();

  const themeOptions = [
    { id: 'dark', label: t('settings.appearance.theme_dark') },
    { id: 'system', label: t('settings.appearance.theme_system') },
    { id: 'light', label: t('settings.appearance.theme_light') }
  ];
  const densityOptions = [
    { id: 'compact', label: t('settings.appearance.density_compact') },
    { id: 'standard', label: t('settings.appearance.density_standard') },
    { id: 'comfortable', label: t('settings.appearance.density_comfortable') }
  ];
  const langOptions = [
    { id: 'tr', label: t('settings.appearance.lang_tr') },
    { id: 'en', label: t('settings.appearance.lang_en') }
  ];

  return `
    <h3 class="settings-panel-title">${escapeHtml(t('settings.appearance.title'))}</h3>
    <p class="settings-panel-sub">${escapeHtml(t('settings.appearance.subtitle'))}</p>

    <div class="settings-appearance-block">
      <div class="settings-security-label">${escapeHtml(t('settings.appearance.theme_label'))}</div>
      <div class="settings-radio-group">
        ${themeOptions.map((opt) => `
          <button type="button" class="settings-radio-option ${opt.id === currentTheme ? 'active' : ''}" data-theme-option="${opt.id}">
            <span class="settings-radio-dot"></span> ${escapeHtml(opt.label)}
          </button>
        `).join('')}
      </div>
    </div>

    <div class="settings-divider"></div>

    <div class="settings-appearance-block">
      <div class="settings-security-label">${escapeHtml(t('settings.appearance.density_label'))}</div>
      <div class="settings-radio-group">
        ${densityOptions.map((opt) => `
          <button type="button" class="settings-radio-option ${opt.id === currentDensity ? 'active' : ''}" data-density-option="${opt.id}">
            <span class="settings-radio-dot"></span> ${escapeHtml(opt.label)}
          </button>
        `).join('')}
      </div>
    </div>

    <div class="settings-divider"></div>

    <div class="settings-appearance-block">
      <div class="settings-security-label">${escapeHtml(t('settings.appearance.lang_label'))}</div>
      <div class="settings-radio-group">
        ${langOptions.map((opt) => `
          <button type="button" class="settings-radio-option ${opt.id === currentLang ? 'active' : ''}" data-lang-option="${opt.id}">
            <span class="settings-radio-dot"></span> ${escapeHtml(opt.label)}
          </button>
        `).join('')}
      </div>
    </div>
  `;
}

// ---- Satın Alma Geçmişi (profile.js'ten taşındı) ----

function formatPurchaseDate(iso) {
  if (!iso) return t('onboarding.empty');
  const locale = getLang() === 'en' ? 'en-US' : 'tr-TR';
  return new Date(iso).toLocaleDateString(locale, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

async function fetchPurchaseHistoryData() {
  if (!PURCHASE_HISTORY_URL || PURCHASE_HISTORY_URL.includes('YOUR-N8N-URL')) {
    return { error: t('settings.billing.not_connected') };
  }
  try {
    const res = await fetch(PURCHASE_HISTORY_URL, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({})
    });
    if (res.status === 401) return { error: t('settings.billing.session_expired') };
    const raw = await res.json();
    const data = unwrap(Array.isArray(raw) ? raw[0] : raw) || {};
    return {
      kodGecmisi: Array.isArray(data.kodGecmisi) ? data.kodGecmisi : [],
      unlockGecmisi: Array.isArray(data.unlockGecmisi) ? data.unlockGecmisi : [],
      gorselGecmisi: Array.isArray(data.gorselGecmisi) ? data.gorselGecmisi : []
    };
  } catch (err) {
    return { error: err.message };
  }
}

async function loadPurchaseHistoryIfNeeded() {
  if (purchaseHistory.loaded || purchaseHistory.loading) return;
  purchaseHistory.loading = true;

  const data = await fetchPurchaseHistoryData();
  purchaseHistory.loading = false;

  if (data.error) {
    purchaseHistory.error = data.error;
  } else {
    purchaseHistory.loaded = true;
    purchaseHistory.error = '';
    purchaseHistory.kodGecmisi = data.kodGecmisi;
  }

  if (activeTab === 'billing') renderPanel();
}

function purchaseHistoryBodyHtml() {
  if (purchaseHistory.subTab === 'codes') {
    return purchaseHistory.kodGecmisi.length
      ? `<table class="settings-history-table">
          <thead><tr><th>${escapeHtml(t('settings.billing.history_col_code'))}</th><th>${escapeHtml(t('settings.billing.history_col_credit'))}</th><th>${escapeHtml(t('settings.billing.history_col_date'))}</th></tr></thead>
          <tbody>${purchaseHistory.kodGecmisi.map((r) => `
            <tr><td>${escapeHtml(r.kod || '')}</td><td>${escapeHtml(String(r.puan ?? ''))}</td><td>${formatPurchaseDate(r.used_at)}</td></tr>
          `).join('')}</tbody>
        </table>`
      : `<div class="settings-placeholder">${escapeHtml(t('settings.billing.history_empty'))}</div>`;
  }
  return `
    <div class="settings-placeholder" style="text-align:left;">
      ${escapeHtml(t('settings.billing.spending_prefix'))}<a href="#" id="settingsGoToPurchasedPrompts">${escapeHtml(t('settings.billing.spending_link'))}</a>${escapeHtml(t('settings.billing.spending_suffix'))}<br><br>
      ${escapeHtml(t('settings.billing.spending_note'))}
    </div>`;
}

function purchaseHistorySectionHtml() {
  if (purchaseHistory.loading || (!purchaseHistory.loaded && !purchaseHistory.error)) {
    return `<div class="settings-placeholder">${escapeHtml(t('settings.common.loading'))}</div>`;
  }
  if (purchaseHistory.error) {
    return `<div class="settings-placeholder">${escapeHtml(t('settings.billing.history_load_error', { msg: purchaseHistory.error }))}</div>`;
  }
  return `
    <div class="settings-subtabs">
      <button class="settings-subtab ${purchaseHistory.subTab === 'codes' ? 'active' : ''}" data-history-subtab="codes">${escapeHtml(t('settings.billing.subtab_codes'))}</button>
      <button class="settings-subtab ${purchaseHistory.subTab === 'spending' ? 'active' : ''}" data-history-subtab="spending">${escapeHtml(t('settings.billing.subtab_spending'))}</button>
    </div>
    ${purchaseHistoryBodyHtml()}
  `;
}

function panelBilling() {
  let balance = 0;
  try { balance = parseInt(localStorage.getItem('jg_credit_balance') || '0', 10) || 0; } catch (e) { }
  return `
    <h3 class="settings-panel-title">${escapeHtml(t('settings.billing.title'))}</h3>
    <p class="settings-panel-sub">${escapeHtml(t('settings.billing.subtitle'))}</p>
    <div class="settings-billing-box">
      <div>
        <div class="settings-security-label">${escapeHtml(t('settings.billing.balance_label'))}</div>
        <div class="settings-billing-amount">💎 ${balance} VSP</div>
      </div>
      <button type="button" class="settings-btn settings-btn-primary" id="settingsBillingBtn">${escapeHtml(t('settings.billing.buy_btn'))}</button>
    </div>

    <div class="settings-divider"></div>

    <div class="settings-security-label" style="margin-bottom:10px;">${escapeHtml(t('settings.billing.history_label'))}</div>
    <div id="settingsPurchaseHistory">${purchaseHistorySectionHtml()}</div>
  `;
}

function panelDelete() {
  return `
    <h3 class="settings-panel-title settings-panel-title-danger">${escapeHtml(t('settings.delete.title'))}</h3>
    <p class="settings-panel-sub">${escapeHtml(t('settings.delete.subtitle'))}</p>
    <div class="settings-danger-box">
      ${escapeHtml(t('settings.delete.warning'))}
    </div>
    <button type="button" class="settings-btn settings-btn-danger" disabled title="${escapeAttr(t('settings.common.soon'))}">${escapeHtml(t('settings.delete.btn'))}</button>
  `;
}

function renderPanel() {
  const body = document.getElementById('settingsPanelBody');
  if (!body) return;

  const renderers = {
    profile: panelProfile,
    security: panelSecurity,
    notifications: () => panelPlaceholder('settings.notifications.title', 'settings.notifications.subtitle'),
    appearance: panelAppearance,
    billing: panelBilling,
    connections: () => panelPlaceholder('settings.connections.title', 'settings.connections.subtitle'),
    usage: () => panelPlaceholder('settings.usage.title', 'settings.usage.subtitle'),
    delete: panelDelete
  };

  body.innerHTML = (renderers[activeTab] || panelProfile)();
  wirePanelEvents();

  if (activeTab === 'profile' && !serverProfile.loaded) {
    loadProfileFromServer();
  }
  if (activeTab === 'billing') {
    loadPurchaseHistoryIfNeeded();
  }
}

async function loadProfileFromServer() {
  if (!GET_PROFILE_URL || GET_PROFILE_URL.includes('YOUR-N8N-URL')) return;
  try {
    const res = await fetch(GET_PROFILE_URL, {
      method: 'GET',
      headers: authHeaders()
    });
    const raw = await res.json();
    const data = unwrap(Array.isArray(raw) ? raw[0] : raw) || {};

    if (!res.ok || !data.success) {
      profileSave.error = t('settings.profile.load_error');
      if (activeTab === 'profile') renderPanel();
      return;
    }

    serverProfile = {
      loaded: true,
      name: data.name || '',
      username: data.username || '',
      picture: data.picture || ''
    };
    if (activeTab === 'profile') renderPanel();
  } catch (err) {
    profileSave.error = t('settings.profile.load_error');
    if (activeTab === 'profile') renderPanel();
    console.warn('get-profile hatası:', err.message);
  }
}

function getSaveErrorMessages() {
  return {
    invalid_username: t('settings.errors.invalid_username'),
    username_taken: t('settings.errors.username_taken'),
    invalid_name: t('settings.errors.invalid_name'),
    unknown_error: t('settings.errors.unknown_error')
  };
}

async function handleSaveProfile() {
  if (profileSave.loading) return;

  const nameInput = document.getElementById('settingsNameInput');
  const usernameInput = document.getElementById('settingsUsernameInput');
  const name = (nameInput?.value || '').trim();
  const username = (usernameInput?.value || '').trim();

  profileSave.loading = true;
  profileSave.error = '';
  renderPanel();

  const errorMessages = getSaveErrorMessages();

  try {
    const res = await fetch(SAVE_PROFILE_URL, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ name, username })
    });
    const raw = await res.json();
    const data = unwrap(Array.isArray(raw) ? raw[0] : raw) || {};

    if (!res.ok || !data.success) {
      profileSave.loading = false;
      profileSave.error = errorMessages[data.error] || errorMessages.unknown_error;
      renderPanel();
      return;
    }

    try {
      localStorage.setItem('userName', data.name || name);
      localStorage.setItem('userUsername', data.username || username);
    } catch (e) { }

    serverProfile = { loaded: true, name: data.name || name, username: data.username || username, picture: serverProfile.picture };
    profileSave.loading = false;
    profileSave.error = '';
    renderPanel();
    renderAuthArea();
  } catch (err) {
    profileSave.loading = false;
    profileSave.error = errorMessages.unknown_error;
    renderPanel();
    console.warn('save-profile hatası:', err.message);
  }
}

function wirePanelEvents() {
  document.querySelectorAll('[data-settings-close]').forEach((btn) => {
    btn.addEventListener('click', closeSettingsModal);
  });

  const saveBtn = document.getElementById('settingsSaveBtn');
  if (saveBtn) {
    saveBtn.addEventListener('click', handleSaveProfile);
  }

  const billingBtn = document.getElementById('settingsBillingBtn');
  if (billingBtn) {
    billingBtn.addEventListener('click', () => {
      closeSettingsModal();
      const trigger = document.getElementById('creditAddBtn');
      if (trigger) trigger.click();
    });
  }

  document.querySelectorAll('[data-theme-option]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const theme = btn.dataset.themeOption;
      setStoredTheme(theme);
      applyTheme(theme);
      renderPanel();
    });
  });

  document.querySelectorAll('[data-density-option]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const density = btn.dataset.densityOption;
      setStoredDensity(density);
      applyDensity(density);
      renderPanel();
    });
  });

  document.querySelectorAll('[data-lang-option]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const lang = btn.dataset.langOption;
      setLanguage(lang).then(() => {
        renderNav();
        renderPanel();
      });
    });
  });

  document.querySelectorAll('[data-history-subtab]').forEach((btn) => {
    btn.addEventListener('click', () => {
      purchaseHistory.subTab = btn.dataset.historySubtab;
      renderPanel();
    });
  });

  document.getElementById('settingsGoToPurchasedPrompts')?.addEventListener('click', (e) => {
    e.preventDefault();
    closeSettingsModal();
    switchTab('profile');
  });
}

export function openSettingsModal(tab = 'profile') {
  activeTab = TABS.some((t) => t.id === tab) ? tab : 'profile';
  pendingAvatarDataUrl = null;
  serverProfile = { loaded: false, name: '', username: '', picture: '' };
  profileSave = { loading: false, error: '' };
  renderNav();
  renderPanel();
  const backdrop = document.getElementById('settingsModalBackdrop');
  if (backdrop) backdrop.classList.add('open');
  document.body.style.overflow = 'hidden';
}

export function closeSettingsModal() {
  const backdrop = document.getElementById('settingsModalBackdrop');
  if (backdrop) backdrop.classList.remove('open');
  document.body.style.overflow = '';
}

export function initSettingsModal() {
  const backdrop = document.getElementById('settingsModalBackdrop');
  if (!backdrop) return;

  document.getElementById('settingsCloseBtn')?.addEventListener('click', closeSettingsModal);

  backdrop.addEventListener('click', (e) => {
    if (e.target === backdrop) closeSettingsModal();
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && backdrop.classList.contains('open')) closeSettingsModal();
  });

  document.getElementById('settingsNav')?.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-settings-tab]');
    if (!btn) return;
    activeTab = btn.dataset.settingsTab;
    renderNav();
    renderPanel();
  });

  // Dil değişince modal açıksa yeniden çiz (onboardingModal.js'teki pattern ile tutarlı).
  window.addEventListener('langchange', () => {
    if (backdrop.classList.contains('open')) {
      renderNav();
      renderPanel();
    }
  });
}