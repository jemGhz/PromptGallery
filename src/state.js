// src/state.js
// promptGenerator.js ve visualGenerator.js birbirini import etmeden veri paylaşabilsin
// diye (ör. "Prompt Üretici'den Al" butonu) ortak, tek bir mutable state nesnesi.
export const appState = {
  makerGeneratedPrompt: '',
  currentCreditBalance: 0
};
