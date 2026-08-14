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

import { escapeAttr, escapeHtml } from './utils.js';

/**
 * @param {HTMLElement} container - chip'lerin render edileceği element
 * @param {string[]} options - seçenek listesi
 * @param {(selected: Set<string>) => void} [onChange] - her değişiklikte çağrılır
 * @param {Record<string,string>} [images] - verilirse chip'ler görsel önizlemeli olarak render edilir
 */
export function createChipGroup(container, options, onChange, images) {
  const selected = new Set();

  if (images) container.classList.add('chip-img-grid');

  function render() {
    container.innerHTML = options
      .map((opt) =>
        images
          ? `<button type="button" class="chip-img ${selected.has(opt) ? 'active' : ''}" data-opt="${escapeAttr(opt)}">
              <img src="${escapeAttr(images[opt] || '')}" alt="">
              <span class="chip-img-check">✓</span>
              <span class="chip-img-label">${escapeHtml(opt)}</span>
            </button>`
          : `<button type="button" class="chip ${selected.has(opt) ? 'active' : ''}" data-opt="${escapeAttr(opt)}">${escapeHtml(opt)}</button>`
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

  return {
    selected, // Set<string> — canlı referans
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
