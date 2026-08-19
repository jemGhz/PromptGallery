// src/main.js — Vite giriş noktası
import './style.css';
import { initI18n } from './i18n.js';
import { initOnboardingModal } from './onboardingModal.js';
import { authHeaders, initAuth } from './auth.js'; import { switchTab } from './tabState.js';
import { initCreditModal } from './credits.js';
import { initWelcomeModal } from './welcomeModal.js';
import { loadData, initGallery } from './tabs/gallery.js';
import { initPromptGenerator } from './tabs/promptGenerator.js';
import { initVisualGenerator } from './tabs/visualGenerator.js';
import { initCharacterGenerator } from './tabs/characterGenerator.js';
import { initProfile } from './tabs/profile.js';
import { initSupportModal } from './support.js';
import { initNotifications } from './notifications.js';
import { initSettingsModal } from './settingsModal.js';
import { initTheme } from './state.js';
import { initVisualDetailFromUrl } from './visualDetail.js';
import { initDetailModal } from './detailModal.js';

initTheme();

function $(id) {
  return document.getElementById(id);
}

function initTabs() {
  document.querySelectorAll('.tab-btn').forEach((btn) => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
  });
}

document.addEventListener('DOMContentLoaded', () => {
  // initAuth önce çağrılıyor ki appState.currentCreditBalance, gen/avatar sekmelerinin
  // ilk render'ında (quota notu metninde) doğru değerle görünsün.
  initI18n();
  initAuth();
  initTabs();
  initGallery();
  initPromptGenerator();
  initVisualGenerator();
  initCharacterGenerator();
  initCreditModal();
  initOnboardingModal(authHeaders);
  initProfile();
  initDetailModal();
  initSupportModal();
  initSettingsModal();
  initNotifications();
  // initAuth'tan sonra çağrılıyor ki isLoggedIn() kontrolü doğru sonucu versin
  // (login olmuş kullanıcıya popup hiç kurulmasın).
  initWelcomeModal();

  loadData();
  initVisualDetailFromUrl();
});