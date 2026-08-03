// src/auth.js
// Google Sign-In + kredi bakiyesi (sadece UI göstergesi — gerçek doğrulama n8n/Supabase'de).

import {
  CREDIT_BALANCE_URL,
  GOOGLE_CLIENT_ID
} from './config.js';
import { escapeAttr, escapeHtml, unwrap } from './utils.js';
import { appState } from './state.js';

const balanceListeners = new Set();
/** Bakiye her değiştiğinde çağrılacak fonksiyonları kaydet (ör. gen/avatar quota notu güncellemesi). */
export function onBalanceChange(fn) {
  balanceListeners.add(fn);
}

export function isLoggedIn() {
  try {
    return !!localStorage.getItem('userEmail');
  } catch (e) {
    return false;
  }
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
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    });
    const raw = await res.json();
    const data = unwrap(Array.isArray(raw) ? raw[0] : raw) || {};
    if (typeof data.balance === 'number') setLocalCreditBalance(data.balance);
  } catch (err) {
    console.warn('Kredi bakiyesi alınamadı:', err.message);
  }
}

function decodeJwt(token) {
  try {
    const payload = token.split('.')[1];
    const decoded = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(decoded);
  } catch (e) {
    return null;
  }
}

function handleGoogleCredential(response) {
  const data = decodeJwt(response.credential);
  if (!data) return;
  try {
    localStorage.setItem('userEmail', data.email || '');
    localStorage.setItem('userName', data.name || '');
    localStorage.setItem('userPicture', data.picture || '');
  } catch (e) {}
  renderAuthArea();
  refreshCreditBalanceFromServer();
}

export function logout() {
  try {
    localStorage.removeItem('userEmail');
    localStorage.removeItem('userName');
    localStorage.removeItem('userPicture');
  } catch (e) {}
  if (window.google && google.accounts && google.accounts.id) {
    google.accounts.id.disableAutoSelect();
  }
  setLocalCreditBalance(0);
  renderAuthArea();
}

export function requestGoogleLogin() {
  if (window.google && google.accounts && google.accounts.id) {
    google.accounts.id.prompt();
  }
}

function getInitial(name, email) {
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

  if (email) {
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
      <button class="avatar-circle" id="authAvatarBtn" title="${escapeAttr(name || email)} — çıkış için tıkla">
        ${picture ? `<img src="${escapeAttr(picture)}" alt="">` : escapeHtml(getInitial(name, email))}
      </button>`;
    document.getElementById('authAvatarBtn').addEventListener('click', logout);
  } else {
    area.innerHTML = '<button class="avatar-circle" id="googlePromptBtn" title="Giriş yap">JG</button>';
    if (window.google && google.accounts && google.accounts.id) {
      google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: handleGoogleCredential
      });
      const promptBtn = document.getElementById('googlePromptBtn');
      if (promptBtn) {
        promptBtn.addEventListener('click', () => google.accounts.id.prompt());
      }
    }
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
    } else {
      setTimeout(tryRender, 200);
    }
  };
  tryRender();
}
