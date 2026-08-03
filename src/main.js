// src/main.js — Vite giriş noktası
import './style.css';

import { switchTab } from './tabState.js';
import { initAuth } from './auth.js';
import { initCreditModal } from './credits.js';
import { loadData, initGallery } from './tabs/gallery.js';
import { initPromptGenerator, triggerMakerUpload } from './tabs/promptGenerator.js';
import { initVisualGenerator } from './tabs/visualGenerator.js';
import { initCharacterGenerator } from './tabs/characterGenerator.js';
import { initProfile } from './tabs/profile.js';

function $(id) {
  return document.getElementById(id);
}

function initTabs() {
  document.querySelectorAll('.tab-btn').forEach((btn) => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
  });

  $('uploadCtaBtn').addEventListener('click', () => {
    switchTab('maker');
    triggerMakerUpload();
  });
}

document.addEventListener('DOMContentLoaded', () => {
  // initAuth önce çağrılıyor ki appState.currentCreditBalance, gen/avatar sekmelerinin
  // ilk render'ında (quota notu metninde) doğru değerle görünsün.
  initAuth();
  initTabs();
  initGallery();
  initPromptGenerator();
  initVisualGenerator();
  initCharacterGenerator();
  initCreditModal();
  initProfile();


  loadData();
});
