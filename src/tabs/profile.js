// src/tabs/profile.js
// Profil sayfası: kullanıcı bilgisi (auth.js/localStorage'dan gerçek), geri kalan
// widget verileri (depolama, en çok kullanılan araçlar, son aktiviteler) backend henüz
// hazır olmadığı için MOCK. Her biri ayrı fonksiyon — backend gelince tek fonksiyonu
// fetch/Supabase çağrısına çevirmek yeterli olacak.

import { escapeHtml } from '../utils.js';
import { onTabChange } from '../state.js';
import { isLoggedIn, logout, onBalanceChange, getInitial } from '../auth.js';
import { switchTab } from '../tabState.js';

// ---- Mock veri katmanı (TODO backend) ----

function getStorageUsage() {
  // TODO(backend): Supabase storage bucket boyutu — n8n webhook.
  return { usedGB: 4.2, totalGB: 20, percent: 21 };
}

function getMostUsedTools() {
  // TODO(backend): kullanım loglarından hesaplanacak.
  return [
    { icon: '🖼️', name: 'Görsel Oluşturucu', percent: 72 },
    { icon: '📝', name: 'Prompt Üretici', percent: 18 },
    { icon: '🧬', name: 'Karakter Oluşturucu', percent: 10 }
  ];
}

function getRecentActivity() {
  // TODO(backend): kullanıcıya özel event log tablosundan çekilecek.
  return [
    { icon: '👜', text: 'Leather Bag – Product Shot görselini oluşturdun', time: '2 saat önce' },
    { icon: '🖼️', text: 'Minimalist Interior Prompt kaydedildi', time: '4 saat önce' },
    { icon: '🧬', text: 'Elara karakter sheet\u2019i oluşturuldu', time: 'Dün' }
  ];
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
      <button class="profile-nav-item active">🏠 Overview</button>
      <button class="profile-nav-item" disabled title="Yakında aktif olacak">🔖 Satın Alınan / Kaydedilen Promptlar</button>
      <button class="profile-nav-item" disabled title="Yakında aktif olacak">❤️ Beğenilen Promptlar</button>
      <button class="profile-nav-item" disabled title="Yakında aktif olacak">📤 Yüklenen Görseller</button>
      <button class="profile-nav-item" disabled title="Yakında aktif olacak">📝 Oluşturulan Promptlar</button>
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
    toolsEl.innerHTML = getMostUsedTools().map((t) => `
      <div class="profile-tool-row">
        <div class="profile-tool-label"><span>${t.icon}</span> ${escapeHtml(t.name)} <span class="profile-tool-pct">${t.percent}%</span></div>
        <div class="profile-tool-bar"><div class="profile-tool-fill" style="width:${t.percent}%"></div></div>
      </div>
    `).join('');
  }

  const activityEl = document.getElementById('profileActivityList');
  if (activityEl) {
    activityEl.innerHTML = getRecentActivity().map((a) => `
      <div class="profile-activity-row">
        <span class="profile-activity-icon">${a.icon}</span>
        <span class="profile-activity-text">${escapeHtml(a.text)}</span>
        <span class="profile-activity-time">${escapeHtml(a.time)}</span>
      </div>
    `).join('');
  }
}

function renderProfilePage() {
  if (!isLoggedIn()) return; // avatar zaten sadece giriş yapılınca göründüğü için normalde buraya düşülmez
  renderSidebar();
  renderMain();
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