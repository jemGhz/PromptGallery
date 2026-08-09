// src/settingsModal.js
// "Ayarlar" modalı — Profil Bilgileri, Güvenlik, Bildirim Tercihleri, Görünüm,
// JG Plus & Ödemeler, Bağlı Hesaplar, Kullanım, Hesabı Sil sekmeleri.
// Şu an için sadece Profil Bilgileri ve Güvenlik sekmeleri içerik gösteriyor;
// "Değişiklikleri Kaydet" backend'e henüz bağlı değil (bilinçli olarak).
import './styles/settings.css';
import { escapeAttr, escapeHtml } from './utils.js';

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

const TABS = [
  { id: 'profile', label: 'Profil Bilgileri' },
  { id: 'security', label: 'Güvenlik' },
  { id: 'notifications', label: 'Bildirim Tercihleri' },
  { id: 'appearance', label: 'Görünüm' },
  { id: 'billing', label: 'JG Plus & Ödemeler' },
  { id: 'connections', label: 'Bağlı Hesaplar' },
  { id: 'usage', label: 'Kullanım' },
  { id: 'delete', label: 'Hesabı Sil', danger: true }
];

let activeTab = 'profile';
let pendingAvatarDataUrl = null;

function getUser() {
  let name = '', email = '', picture = '';
  try {
    name = localStorage.getItem('userName') || '';
    email = localStorage.getItem('userEmail') || '';
    picture = localStorage.getItem('userPicture') || '';
  } catch (e) {}
  return { name, email, picture };
}

function renderNav() {
  const nav = document.getElementById('settingsNav');
  if (!nav) return;
  nav.innerHTML = TABS.map((t) => `
    <button class="settings-nav-item ${t.id === activeTab ? 'active' : ''} ${t.danger ? 'settings-nav-danger' : ''}" data-settings-tab="${t.id}">
      <span class="settings-nav-icon">${ICONS[t.id]}</span>
      <span>${escapeHtml(t.label)}</span>
    </button>
  `).join('');
}

function panelProfile() {
  const { name, email, picture } = getUser();
  return `
    <h3 class="settings-panel-title">Profil Bilgileri</h3>
    <p class="settings-panel-sub">Hesap profil bilgilerinizi güncel tutun.</p>

    <div class="settings-avatar-row">
      <div class="settings-avatar-wrap">
        <div class="settings-avatar-img" id="settingsAvatarPreview">
          ${picture ? `<img src="${escapeAttr(picture)}" alt="">` : escapeHtml((name || email || 'JG').charAt(0).toUpperCase())}
        </div>
        <button type="button" class="settings-avatar-camera-btn" id="settingsAvatarBtn" title="Fotoğraf değiştir">${ICONS.camera}</button>
        <input type="file" id="settingsAvatarInput" accept="image/*" style="display:none">
      </div>
      <p class="settings-avatar-hint">Profil fotoğrafınızı JPG, PNG formatında maks. 5MB olacak şekilde yükleyebilirsiniz.</p>
    </div>

    <div class="settings-field-row">
      <div class="settings-field-group">
        <label class="settings-field-label">Ad Soyad</label>
        <input type="text" class="settings-input" id="settingsNameInput" value="${escapeAttr(name)}" maxlength="60">
      </div>
      <div class="settings-field-group">
        <label class="settings-field-label">Kullanıcı Adı</label>
        <input type="text" class="settings-input" id="settingsUsernameInput" placeholder="@kullaniciadi" maxlength="30">
      </div>
    </div>

    <div class="settings-field-group">
      <label class="settings-field-label">E-posta</label>
      <input type="email" class="settings-input" value="${escapeAttr(email)}" disabled title="E-posta Google hesabınızdan geliyor, buradan değiştirilemez">
    </div>

    <div class="settings-field-group">
      <label class="settings-field-label">Bio</label>
      <textarea class="settings-textarea" id="settingsBioInput" maxlength="200" placeholder="Kendinden kısaca bahset..."></textarea>
    </div>

    <div class="settings-save-row">
      <button type="button" class="settings-btn" data-settings-close>İptal</button>
      <button type="button" class="settings-btn settings-btn-primary" disabled title="Yakında aktif olacak">Değişiklikleri Kaydet</button>
    </div>
  `;
}

function panelSecurity() {
  return `
    <h3 class="settings-panel-title">Güvenlik</h3>
    <p class="settings-panel-sub">Hesap güvenliğinizi yönetin.</p>

    <div class="settings-security-block">
      <div class="settings-security-row">
        <div>
          <div class="settings-security-label">Şifre</div>
          <div class="settings-security-desc">Google hesabınla giriş yapıyorsun, şifre değişikliği Google üzerinden yönetilir.</div>
        </div>
        <button type="button" class="settings-btn" disabled title="Yakında aktif olacak">Şifreyi Değiştir</button>
      </div>

      <div class="settings-divider"></div>

      <div class="settings-security-row">
        <div>
          <div class="settings-security-label">İki Aşamalı Doğrulama</div>
          <div class="settings-security-desc">Hesabınızı ekstra güvenlik katmanıyla koruyun.</div>
        </div>
        <button type="button" class="settings-toggle" disabled title="Yakında aktif olacak"><span class="settings-toggle-knob"></span></button>
      </div>

      <div class="settings-divider"></div>

      <div class="settings-security-label" style="margin-bottom:10px;">Aktif Oturumlar</div>
      <div class="settings-session-row">
        <div>
          <div class="settings-security-label">Bu cihaz</div>
          <div class="settings-security-desc">Şu anda kullanılıyor</div>
        </div>
        <button type="button" class="settings-btn" disabled title="Yakında aktif olacak">Oturumu Kapat</button>
      </div>

      <div class="settings-divider"></div>

      <button type="button" class="settings-btn settings-btn-danger" style="width:100%" disabled title="Yakında aktif olacak">Tüm Oturumlardan Çıkış Yap</button>
    </div>
  `;
}

function panelPlaceholder(title, desc) {
  return `
    <h3 class="settings-panel-title">${escapeHtml(title)}</h3>
    <p class="settings-panel-sub">${escapeHtml(desc)}</p>
    <div class="settings-placeholder">Bu bölüm yakında eklenecek.</div>
  `;
}

function panelAppearance() {
  return `
    <h3 class="settings-panel-title">Görünüm</h3>
    <p class="settings-panel-sub">Tema ve görünüm tercihlerini özelleştir.</p>

    <div class="settings-appearance-block">
      <div class="settings-security-label">Tema</div>
      <div class="settings-radio-group">
        <button type="button" class="settings-radio-option active" disabled title="Yakında aktif olacak">
          <span class="settings-radio-dot"></span> Koyu
        </button>
        <button type="button" class="settings-radio-option" disabled title="Yakında aktif olacak">
          <span class="settings-radio-dot"></span> Sistem
        </button>
        <button type="button" class="settings-radio-option" disabled title="Yakında aktif olacak">
          <span class="settings-radio-dot"></span> Açık
        </button>
      </div>
    </div>

    <div class="settings-divider"></div>

    <div class="settings-appearance-block">
      <div class="settings-security-label">Arayüz Yoğunluğu</div>
      <div class="settings-radio-group">
        <button type="button" class="settings-radio-option" disabled title="Yakında aktif olacak">
          <span class="settings-radio-dot"></span> Kompakt
        </button>
        <button type="button" class="settings-radio-option active" disabled title="Yakında aktif olacak">
          <span class="settings-radio-dot"></span> Standart
        </button>
        <button type="button" class="settings-radio-option" disabled title="Yakında aktif olacak">
          <span class="settings-radio-dot"></span> Rahat
        </button>
      </div>
    </div>

    <div class="settings-divider"></div>

    <div class="settings-appearance-block">
      <div class="settings-security-row">
        <div class="settings-security-label" style="margin-bottom:0;">Animasyonlar</div>
        <button type="button" class="settings-toggle settings-toggle-on" disabled title="Yakında aktif olacak">
          <span class="settings-toggle-knob"></span>
        </button>
      </div>
    </div>
  `;
}

function panelBilling() {
  let balance = 0;
  try { balance = parseInt(localStorage.getItem('jg_credit_balance') || '0', 10) || 0; } catch (e) {}
  return `
    <h3 class="settings-panel-title">JG Plus & Ödemeler</h3>
    <p class="settings-panel-sub">JG Puanı bakiyeni yönet ve ödeme geçmişine göz at.</p>
    <div class="settings-billing-box">
      <div>
        <div class="settings-security-label">Mevcut Bakiye</div>
        <div class="settings-billing-amount">💎 ${balance} JG Puanı</div>
      </div>
      <button type="button" class="settings-btn settings-btn-primary" id="settingsBillingBtn">Kredi Satın Al</button>
    </div>
    <div class="settings-placeholder">Fatura geçmişi yakında burada listelenecek.</div>
  `;
}

function panelDelete() {
  return `
    <h3 class="settings-panel-title settings-panel-title-danger">Hesabı Sil</h3>
    <p class="settings-panel-sub">Bu işlem geri alınamaz; tüm verileriniz kalıcı olarak silinir.</p>
    <div class="settings-danger-box">
      Hesabını silmeden önce bilmen gerekenler: tüm promptların, görsellerin ve JG Puanı bakiyen silinecek. Bu özellik şu an aktif değil.
    </div>
    <button type="button" class="settings-btn settings-btn-danger" disabled title="Yakında aktif olacak">Hesabımı Kalıcı Olarak Sil</button>
  `;
}

function renderPanel() {
  const body = document.getElementById('settingsPanelBody');
  if (!body) return;

  const renderers = {
    profile: panelProfile,
    security: panelSecurity,
    notifications: () => panelPlaceholder('Bildirim Tercihleri', 'Hangi bildirimleri almak istediğini seç.'),
    appearance: panelAppearance,
    billing: panelBilling,
    connections: () => panelPlaceholder('Bağlı Hesaplar', 'Hesabına bağlı diğer servisleri yönet.'),
    usage: () => panelPlaceholder('Kullanım', 'JG Puanı ve araç kullanım istatistiklerini gör.'),
    delete: panelDelete
  };

  body.innerHTML = (renderers[activeTab] || panelProfile)();
  wirePanelEvents();
}

function wirePanelEvents() {
  document.querySelectorAll('[data-settings-close]').forEach((btn) => {
    btn.addEventListener('click', closeSettingsModal);
  });

  const avatarBtn = document.getElementById('settingsAvatarBtn');
  const avatarInput = document.getElementById('settingsAvatarInput');
  if (avatarBtn && avatarInput) {
    avatarBtn.addEventListener('click', () => avatarInput.click());
    avatarInput.addEventListener('change', () => {
      const file = avatarInput.files && avatarInput.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        pendingAvatarDataUrl = reader.result;
        const preview = document.getElementById('settingsAvatarPreview');
        if (preview) preview.innerHTML = `<img src="${pendingAvatarDataUrl}" alt="">`;
      };
      reader.readAsDataURL(file);
    });
  }

  const billingBtn = document.getElementById('settingsBillingBtn');
  if (billingBtn) {
    billingBtn.addEventListener('click', () => {
      closeSettingsModal();
      const trigger = document.getElementById('creditAddBtn');
      if (trigger) trigger.click();
    });
  }
}

export function openSettingsModal(tab = 'profile') {
  activeTab = TABS.some((t) => t.id === tab) ? tab : 'profile';
  pendingAvatarDataUrl = null;
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
}