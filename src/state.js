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