// src/auth.js
// Google Sign-In + kredi bakiyesi + oturum token'ı.
// Gerçek yetkilendirme artık jg_session_token'a dayanıyor; email sadece UI için.
import { maybeShowOnboarding } from './onboardingModal.js';
import {
  CREDIT_BALANCE_URL,
  GOOGLE_CLIENT_ID,
  GOOGLE_LOGIN_VERIFY_URL
} from './config.js';
import { escapeAttr, escapeHtml, unwrap } from './utils.js';
import { appState } from './state.js';
import { switchTab, requestProfileSection } from './tabState.js';
import { resetNotifications } from './notifications.js';

const balanceListeners = new Set();
/** Bakiye her değiştiğinde çağrılacak fonksiyonları kaydet (ör. gen/avatar quota notu güncellemesi). */
export function onBalanceChange(fn) {
  balanceListeners.add(fn);
}

export function getSessionToken() {
  try {
    return localStorage.getItem('jg_session_token') || '';
  } catch (e) {
    return '';
  }
}

export function isLoggedIn() {
  return !!getSessionToken();
}

/** Korunan endpoint'lere gidecek her fetch çağrısı bu header'ı taşımalı. */
export function authHeaders() {
  return {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer ' + getSessionToken()
  };
}

export function getLocalCreditBalance() {
  try {
    return parseInt(localStorage.getItem('jg_credit_balance') || '0', 10) || 0;
  } catch (e) {
    return 0;
  }
}

export function setLocalCreditBalance(n) {
  appState.currentCreditBalance = Math.max(0, n);
  try {
    localStorage.setItem('jg_credit_balance', String(appState.currentCreditBalance));
  } catch (e) {}
  renderCreditPill();
  balanceListeners.forEach((fn) => fn(appState.currentCreditBalance));
}

function renderCreditPill() {
  const el = document.getElementById('creditAmountText');
  if (el) el.textContent = String(appState.currentCreditBalance);
}

export async function refreshCreditBalanceFromServer() {
  if (!isLoggedIn()) return;
  if (!CREDIT_BALANCE_URL || CREDIT_BALANCE_URL.includes('YOUR-N8N-URL')) return;
  try {
    const email = localStorage.getItem('userEmail') || '';
    const res = await fetch(CREDIT_BALANCE_URL, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ email }) // email sadece UX/log amaçlı; sunucu token'daki email'i esas alır
    });
    const raw = await res.json();
    const data = unwrap(Array.isArray(raw) ? raw[0] : raw) || {};
    if (typeof data.balance === 'number') setLocalCreditBalance(data.balance);
  } catch (err) {
    console.warn('Kredi bakiyesi alınamadı:', err.message);
  }
}

async function handleGoogleCredential(response) {
  try {
    const res = await fetch(GOOGLE_LOGIN_VERIFY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ credential: response.credential })
    });
    const raw = await res.json();
    const data = unwrap(Array.isArray(raw) ? raw[0] : raw) || {};

    if (!data.verified || !data.token) {
      console.warn('Giriş doğrulanamadı:', data.message);
      return;
    }

    localStorage.setItem('userEmail', data.email || '');
    localStorage.setItem('userName', data.name || '');
    localStorage.setItem('userPicture', data.picture || '');
    localStorage.setItem('jg_session_token', data.token);
  } catch (err) {
    console.warn('Giriş doğrulama hatası:', err.message);
    return;
  }
  renderAuthArea();
  refreshCreditBalanceFromServer();
  maybeShowOnboarding(data.email, authHeaders());
}

export function logout() {
  try {
    localStorage.removeItem('userEmail');
    localStorage.removeItem('userName');
    localStorage.removeItem('userPicture');
    localStorage.removeItem('jg_session_token');
  } catch (e) {}
  if (window.google && google.accounts && google.accounts.id) {
    google.accounts.id.disableAutoSelect();
  }
  setLocalCreditBalance(0);
  resetNotifications();
  renderAuthArea();
  switchTab('gallery');
}

export function renderGoogleButton(containerId, options = {}) {
  const container = document.getElementById(containerId);
  if (!container) return;
  if (!(window.google && google.accounts && google.accounts.id)) {
    setTimeout(() => renderGoogleButton(containerId, options), 200);
    return;
  }
  google.accounts.id.initialize({
    client_id: GOOGLE_CLIENT_ID,
    callback: handleGoogleCredential
  });
  google.accounts.id.renderButton(container, {
    type: 'standard',
    theme: 'outline',
    size: 'medium',
    shape: 'pill',
    text: 'signin',
    ...options
  });
}

export function getInitial(name, email) {
  const src = (name || email || 'JG').trim();
  return src.charAt(0).toUpperCase();
}

export function renderAuthArea() {
  const area = document.getElementById('authArea');
  if (!area) return;
  let email = '';
  try {
    email = localStorage.getItem('userEmail') || '';
  } catch (e) {}

  if (email && isLoggedIn()) {
    const name = (() => {
      try {
        return localStorage.getItem('userName') || '';
      } catch (e) {
        return '';
      }
    })();
    const picture = (() => {
      try {
        return localStorage.getItem('userPicture') || '';
      } catch (e) {
        return '';
      }
    })();
    area.innerHTML = `
      <div class="avatar-menu-wrap" id="avatarMenuWrap">
        <button class="avatar-circle" id="authAvatarBtn" title="${escapeAttr(name || email)} — profiline git">
          ${picture ? `<img src="${escapeAttr(picture)}" alt="">` : escapeHtml(getInitial(name, email))}
        </button>
        <div class="avatar-dropdown" id="avatarDropdown">
          <div class="avatar-dropdown-header">
            <div class="avatar-dropdown-name">${escapeHtml(name || 'Kullanıcı')}</div>
            <div class="avatar-dropdown-email">${escapeHtml(email)}</div>
          </div>
          <button class="avatar-dropdown-item" data-action="profile">👤 Profilim</button>
          <div class="avatar-dropdown-sep"></div>
          <button class="avatar-dropdown-item" disabled title="Yakında aktif olacak">⚙️ Ayarlar</button>
          <button class="avatar-dropdown-item" disabled title="Yakında aktif olacak">👤 Hesap Ayarları</button>
          <button class="avatar-dropdown-item" data-action="purchase-history">💳 Fatura ve Ödemeler</button>
          <button class="avatar-dropdown-item" id="avatarSupportBtn">❓ Destek & Yardım</button>
          <div class="avatar-dropdown-sep"></div>
          <button class="avatar-dropdown-item avatar-dropdown-logout" id="avatarLogoutBtn">↩ Çıkış Yap</button>
        </div>
      </div>`;

    document.getElementById('authAvatarBtn').addEventListener('click', () => switchTab('profile'));
    area.querySelector('[data-action="profile"]').addEventListener('click', () => switchTab('profile'));
    area.querySelector('[data-action="purchase-history"]').addEventListener('click', () => {
      requestProfileSection('purchase-history');
    });
    document.getElementById('avatarLogoutBtn').addEventListener('click', logout);
  } 
  else {
    area.innerHTML = '<div id="googleSignInBtn"></div>';
  renderGoogleButton('googleSignInBtn', { type: 'icon', shape: 'circle', size: 'medium' });
  }
}

/** Google GSI script'i yüklendikten sonra auth alanını başlatır. main.js'ten çağrılır. */
export function initAuth() {
  appState.currentCreditBalance = getLocalCreditBalance();
  renderCreditPill();
  const tryRender = () => {
    if (window.google && google.accounts && google.accounts.id) {
      renderAuthArea();
      refreshCreditBalanceFromServer();
       if (isLoggedIn()) {
  maybeShowOnboarding(localStorage.getItem('userEmail') || '', authHeaders());
}
    } else {
      setTimeout(tryRender, 200);
    }
  };
  tryRender();
}