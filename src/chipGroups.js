// src/chipGroups.js
//
// ESKİ KOD NEDEN DEĞİŞTİ:
// Monolitik dosyada characterGenerator, visualGenerator'ın toggleChip/getSetByKey/
// getOptionsByKey/getContainerByKey fonksiyonlarını global scope'ta yeniden atayarak
// (`getSetByKey = function(...)`) genişletiyordu. Bu, ES modüllerinde çalışmaz:
// import edilen bir binding'i yeniden atamak derleme hatası verir, ve zaten iki farklı
// sekmenin aynı global fonksiyonları paylaşması modüler yapının amacına aykırı.
//
// Bunun yerine: her acordeon paneli kendi bağımsız "chip group" örneğini alır.
// State (Set) component'in içinde tutulur, dışa sadece okuma/erişim verilir.
//
// i18n NOTU: `options` dizisindeki değerler (ör. 'Bohem', 'Ön çekim') sistem key'i
// olarak kullanılıyor — `images` map'inin key'i bu, `selected` Set'ine giren değer bu,
// n8n'e giden payload da muhtemelen bu. BUNLAR ASLA DEĞİŞMEZ / ÇEVRİLMEZ.
// Sadece kullanıcıya GÖRÜNEN metin çevrilir — bunun için opsiyonel `labelFor`
// parametresi eklendi. `labelFor` verilmezse eskisi gibi `opt`'un kendisi gösterilir
// (geriye dönük uyumlu).

import { escapeAttr, escapeHtml } from './utils.js';

/**
 * @param {HTMLElement} container - chip'lerin render edileceği element
 * @param {string[]} options - seçenek listesi (sistem key'leri — TR, sabit, çevrilmez)
 * @param {(selected: Set<string>) => void} [onChange] - her değişiklikte çağrılır
 * @param {Record<string,string>} [images] - verilirse chip'ler görsel önizlemeli render edilir (key = opt)
 * @param {(opt: string) => string} [labelFor] - verilirse chip üzerinde gösterilecek metni
 *   üretir (ör. `(opt) => t(LABEL_KEYS[opt])`). Verilmezse `opt` doğrudan gösterilir.
 *   labelFor genelde i18n'in t() fonksiyonuna bağlı olduğundan, verildiğinde dil
 *   değişince (langchange event'i) otomatik yeniden render edilir.
 */
export function createChipGroup(container, options, onChange, images, labelFor) {
  const selected = new Set();
  const getLabel = typeof labelFor === 'function' ? labelFor : (opt) => opt;

  if (images) container.classList.add('chip-img-grid');

  function render() {
    container.innerHTML = options
      .map((opt) =>
        images
          ? `<button type="button" class="chip-img ${selected.has(opt) ? 'active' : ''}" data-opt="${escapeAttr(opt)}">
              <img src="${escapeAttr(images[opt] || '')}" alt="">
              <span class="chip-img-check">✓</span>
              <span class="chip-img-label">${escapeHtml(getLabel(opt))}</span>
            </button>`
          : `<button type="button" class="chip ${selected.has(opt) ? 'active' : ''}" data-opt="${escapeAttr(opt)}">${escapeHtml(getLabel(opt))}</button>`
      )
      .join('');
  }

  container.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-opt]');
    if (!btn) return;
    const opt = btn.dataset.opt;
    if (selected.has(opt)) selected.delete(opt);
    else selected.add(opt);
    render();
    if (onChange) onChange(selected);
  });

  render();

  // labelFor verilmişse dil değişince görünen metinleri güncelle.
  // NOT: bu listener chip group yok edilirken kaldırılmıyor (mevcut kod tabanında
  // hiçbir modül/component için destroy/cleanup mekanizması yok — welcomeModal,
  // onboardingModal vb. de aynı şekilde kalıcı listener kullanıyor). Sekmeler
  // sayfa ömrü boyunca bir kez init edildiği için bu şu an sorun yaratmıyor;
  // ileride chip group'lar dinamik olarak yaratılıp yok edilmeye başlarsa
  // (ör. bir modal içinde tekrar tekrar açılıp kapanıyorsa) bu satır leak'e döner.
  if (typeof labelFor === 'function') {
    window.addEventListener('langchange', render);
  }

  return {
    selected, // Set<string> — canlı referans, sistem key'lerini içerir (TR, sabit)
    render
  };
}

/** Accordion (aç/kapa panel) davranışını bağlar. Panel id'si trigger'ın data-acc-target'ından okunur. */
export function bindAccordions(root) {
  root.querySelectorAll('.acc-trigger[data-acc-target]').forEach((trigger) => {
    trigger.addEventListener('click', () => {
      const panel = document.getElementById(trigger.dataset.accTarget);
      if (!panel) return;
      const isOpen = panel.classList.contains('open');
      panel.classList.toggle('open', !isOpen);
      trigger.classList.toggle('open', !isOpen);
    });
  });
}

export function updateAccCount(badgeEl, size) {
  if (!badgeEl) return;
  if (size > 0) {
    badgeEl.textContent = String(size);
    badgeEl.classList.add('show');
  } else {
    badgeEl.classList.remove('show');
  }
}