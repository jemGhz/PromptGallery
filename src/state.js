// src/state.js
// promptGenerator.js ve visualGenerator.js birbirini import etmeden veri paylaşabilsin
// diye (ör. "Prompt Üretici'den Al" butonu) ortak, tek bir mutable state nesnesi.
export const appState = {
  makerGeneratedPrompt: '',
  currentCreditBalance: 0
};

// ---- Sekme değişikliği pub/sub ----
// tabState.js her sekme değiştiğinde notifyTabChange çağırır; profile.js gibi modüller
// onTabChange ile bunu dinleyip kendini günceller. Bu sayede auth.js/tabState.js profile.js'i
// import etmek zorunda kalmaz (döngüsel import oluşmaz).
const tabChangeListeners = new Set();
export function onTabChange(fn) {
  tabChangeListeners.add(fn);
}
export function notifyTabChange(tab) {
  tabChangeListeners.forEach((fn) => fn(tab));
}

// ---- Tema ----
export const THEME_STORAGE_KEY = 'jg_theme';

export function getStoredTheme() {
  try {
    return localStorage.getItem(THEME_STORAGE_KEY) || 'dark';
  } catch (e) {
    return 'dark';
  }
}

export function setStoredTheme(theme) {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch (e) {}
}

function resolveTheme(theme) {
  if (theme === 'system') {
    return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
  }
  return theme;
}

export function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', resolveTheme(theme));
}

let systemListenerAttached = false;
export function initTheme() {
  applyTheme(getStoredTheme());
  if (!systemListenerAttached) {
    systemListenerAttached = true;
    window.matchMedia('(prefers-color-scheme: light)').addEventListener('change', () => {
      if (getStoredTheme() === 'system') applyTheme('system');
    });
  }
}

// ---- Yoğunluk ----
export const DENSITY_STORAGE_KEY = 'jg_density';

export function getStoredDensity() {
  try {
    return localStorage.getItem(DENSITY_STORAGE_KEY) || 'standard';
  } catch (e) {
    return 'standard';
  }
}

export function setStoredDensity(density) {
  try {
    localStorage.setItem(DENSITY_STORAGE_KEY, density);
  } catch (e) {}
}

export function applyDensity(density) {
  const grid = document.getElementById('grid');
  if (grid) {
    grid.classList.remove('wide', 'compact');
    if (density === 'comfortable') grid.classList.add('wide');
    if (density === 'compact') grid.classList.add('compact');
  }
  const topbarBtn = document.getElementById('densityToggleBtn');
  if (topbarBtn) topbarBtn.classList.toggle('active', density !== 'standard');
}