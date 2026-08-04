// src/welcomeModal.js — giriş yapmamış kullanıcıya 15sn sonra açılan karşılama modalı
// main.js'ten initAuth() sonrasında bir kez çağrılır.

import { isLoggedIn, renderGoogleButton } from './auth.js';

const DISMISS_KEY = 'jg_welcome_dismissed_at';
const DISMISS_TTL_MS = 24 * 60 * 60 * 1000; // 24 saat
const SHOW_DELAY_MS = 15000;

let timerId = null;

function $(id) {
  return document.getElementById(id);
}

function wasRecentlyDismissed() {
  const raw = localStorage.getItem(DISMISS_KEY);
  if (!raw) return false;
  const ts = Number(raw);
  if (!Number.isFinite(ts)) return false;
  return Date.now() - ts < DISMISS_TTL_MS;
}

function markDismissed() {
  localStorage.setItem(DISMISS_KEY, String(Date.now()));
}

function openWelcomeModal() {
  // Kullanıcı bu sırada giriş yapmış olabilir (başka bir sekmeden vb.) — son anda kontrol.
  if (isLoggedIn()) return;
  $('welcomeModalBackdrop').classList.add('open');
}

function closeWelcomeModal() {
  $('welcomeModalBackdrop').classList.remove('open');
  markDismissed();
  if (timerId) {
    clearTimeout(timerId);
    timerId = null;
  }
}

export function initWelcomeModal() {
  // Google'ın resmi butonunu görünmez şekilde overlay kutularının üzerine render ediyoruz.
  // NOT [Low Confidence]: renderGoogleButton'ın signin_with/signup_with metin varyasyonunu
  // destekleyip desteklemediği doğrulanmadı (auth.js görülmedi). Şimdilik ikisi de aynı
  // varsayılan görünümle render ediliyor — ikisi de aynı handleGoogleCredential akışına gider.
  renderGoogleButton('welcomeGoogleSigninBtn');
  renderGoogleButton('welcomeGoogleSignupBtn');

  $('welcomeCloseBtn').addEventListener('click', closeWelcomeModal);

  $('welcomeModalBackdrop').addEventListener('click', (e) => {
    if (e.target === $('welcomeModalBackdrop')) closeWelcomeModal();
  });

  if (isLoggedIn() || wasRecentlyDismissed()) return;

  timerId = setTimeout(openWelcomeModal, SHOW_DELAY_MS);
}