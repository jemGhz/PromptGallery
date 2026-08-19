// src/onboardingModal.js
// Giriş sonrası tek seferlik, 4 adımlı sihirbaz: "seni tanıyalım" + "nereden duydun" +
// "ek notlar" + özet/tamamla. auth.js'e bağımlı DEĞİL — headers/email dışarıdan
// (main.js, auth.js) enjekte edilir. Bu yüzden dairesel import riski yok.
//
// NOT: Sunucuya giden veri yapısı (use_reasons, custom_reason, heard_from, skipped)
// eski sürümle birebir aynı — sadece arayüz 4 adımlı sihirbaza dönüştürüldü,
// n8n webhook'unda hiçbir değişiklik gerekmiyor.
//
// i18n: Tüm görünür metinler t() üzerinden okunur. Statik dizi/obje YOK —
// her render çağrısında diller yeniden üretilir, böylece dil değişince
// (langchange event'i) içerik güncel kalır.
//
// DÜZELTME (madde 1): heard_from artık use_reasons ile aynı desende — sabit bir
// id (TR, sistem key'i) tutulur, backend'e bu id gider. Görünen etiket sadece
// UI'da t() ile üretilir. Önceden selectedHeardFrom ÇEVRİLMİŞ metni tutuyordu ve
// bu metin doğrudan backend'e gidiyordu — dil değişince aynı seçimin backend'e
// giden değeri değişiyordu. Artık değişmiyor.
//
// DÜZELTME (madde 2): t() key'leri locale dosyalarındaki gerçek path'lerle
// (onboarding.btn.*, onboarding.err.*) birebir eşleştirildi — önceden
// onboarding.actions.* / onboarding.errors.* çağrılıyordu ama JSON'da böyle
// bir path yoktu, t() sessizce key'in kendisini basıyordu. connection hata
// mesajındaki değişken adı da JSON'daki {msg} placeholder'ına uyacak şekilde
// düzeltildi (önceden {error} gönderiliyordu).

import { ONBOARDING_STATUS_URL, ONBOARDING_SUBMIT_URL } from './config.js';
import { unwrap, escapeHtml } from './utils.js';
import { t, getLang } from './i18n.js';

const TOTAL_STEPS = 4;

let currentStep = 1;
let selectedReasons = new Set();
let selectedHeardFrom = ''; // artık ÇEVİRİ DEĞİL, sabit id: 'instagram' | 'tiktok' | 'friend' | 'google' | 'other'
let customReasonText = '';
let submitting = false;

let currentEmail = '';
let getAuthHeaders = () => ({ 'Content-Type': 'application/json' });

function $(id) {
  return document.getElementById(id);
}

// ---- Çeviri kaynaklı seçenek listeleri (her çağrıda güncel dile göre üretilir) ----

function getUseReasonOptions() {
  return [
    { id: 'character', label: t('onboarding.reasons.character') },
    { id: 'visual', label: t('onboarding.reasons.visual') },
    { id: 'inspiration', label: t('onboarding.reasons.inspiration') },
    { id: 'curious', label: t('onboarding.reasons.curious') }
  ];
}

// use_reasons ile aynı desen: sabit id + çevrilen label. id'ler ASLA değişmez,
// backend'e giden budur. Sıra JSON/eski davranışla aynı korunuyor.
function getHeardFromOptions() {
  return [
    { id: 'instagram', label: t('onboarding.heard.instagram') },
    { id: 'tiktok', label: t('onboarding.heard.tiktok') },
    { id: 'friend', label: t('onboarding.heard.friend') },
    { id: 'google', label: t('onboarding.heard.google') },
    { id: 'other', label: t('onboarding.heard.other') }
  ];
}

function getStepMeta() {
  return [
    { progressLabel: t('onboarding.step1.progress'), img: 'step-1.webp', eyebrow: t('onboarding.step1.eyebrow'), title: t('onboarding.step1.title'), desc: t('onboarding.step1.desc') },
    { progressLabel: t('onboarding.step2.progress'), img: '/step-2.webp', eyebrow: t('onboarding.step2.eyebrow'), title: t('onboarding.step2.title'), desc: t('onboarding.step2.desc') },
    { progressLabel: t('onboarding.step3.progress'), img: '/step-3.webp', eyebrow: t('onboarding.step3.eyebrow'), title: t('onboarding.step3.title'), desc: t('onboarding.step3.desc') },
    { progressLabel: t('onboarding.step4.progress'), img: '/step-4.webp', eyebrow: t('onboarding.step4.eyebrow'), title: t('onboarding.step4.title'), desc: t('onboarding.step4.desc') }
  ];
}

// ---- Skip / durum hatırlama (davranış değişmedi) ----

function markSkippedLocally() {
  try {
    localStorage.setItem('jg_onboarding_skipped', '1');
  } catch (e) { }
}

function wasSkippedLocally() {
  try {
    return localStorage.getItem('jg_onboarding_skipped') === '1';
  } catch (e) {
    return false;
  }
}

// ---- Sol panel: fotoğraf + başlık ----

function setStepImage(src) {
  const img = $('onboardingStepImg');
  if (!img) return;
  const preload = new Image();
  preload.onload = () => {
    img.style.opacity = '0';
    setTimeout(() => {
      img.src = src;
      img.style.opacity = '1';
    }, 150);
  };
  preload.onerror = () => {
    img.src = src; // dosya henüz eklenmemişse bile en azından src değişsin
    img.style.opacity = '1';
  };
  preload.src = src;
}

function renderCaption() {
  const meta = getStepMeta()[currentStep - 1];
  setStepImage(meta.img);
  $('onboardingCaptionEyebrow').textContent = meta.eyebrow;
  $('onboardingCaptionTitle').innerHTML = meta.title;
  $('onboardingCaptionDesc').textContent = meta.desc;
}

// ---- İlerleme göstergesi ----

function renderProgress() {
  const el = $('onboardingProgress');
  if (!el) return;
  const meta = getStepMeta();
  el.innerHTML = meta.map((m, i) => {
    const stepNum = i + 1;
    const cls = stepNum < currentStep ? 'done' : stepNum === currentStep ? 'active' : '';
    const dotContent = stepNum < currentStep ? '✓' : String(stepNum);
    return `
      <div class="onboarding-progress-step ${cls}">
        <div class="onboarding-progress-line"></div>
        <div class="onboarding-progress-dot">${dotContent}</div>
        <div class="onboarding-progress-label">${escapeHtml(m.progressLabel)}</div>
      </div>`;
  }).join('');
}

// ---- Adım gövdeleri ----

function reasonLabel(id) {
  const opt = getUseReasonOptions().find((o) => o.id === id);
  return opt ? opt.label : id;
}

// heard_from id -> görünen etiket (özet ekranı ve seçili durumunu göstermek için)
function heardFromLabel(id) {
  const opt = getHeardFromOptions().find((o) => o.id === id);
  return opt ? opt.label : id;
}

function renderStepBody() {
  const body = $('onboardingStepBody');
  if (!body) return;

  if (currentStep === 1) {
    const options = getUseReasonOptions();
    body.innerHTML = `
      <h3 class="onboarding-step-title">${escapeHtml(t('onboarding.step1.h'))}</h3>
      <p class="onboarding-step-sub">${escapeHtml(t('onboarding.step1.sub'))}</p>
      <div class="onboarding-card-grid" id="onboardingReasonGrid">
        ${options.map((opt) => `
          <button type="button" class="onboarding-option-card ${selectedReasons.has(opt.id) ? 'selected' : ''}" data-reason-id="${opt.id}">
            <span class="onboarding-option-card-check">✓</span>
            ${escapeHtml(opt.label)}
          </button>
        `).join('')}
      </div>
    `;
    body.querySelectorAll('[data-reason-id]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.reasonId;
        if (selectedReasons.has(id)) selectedReasons.delete(id);
        else selectedReasons.add(id);
        btn.classList.toggle('selected');
      });
    });
    return;
  }

  if (currentStep === 2) {
    const options = getHeardFromOptions();
    body.innerHTML = `
      <h3 class="onboarding-step-title">${escapeHtml(t('onboarding.step2.h'))}</h3>
      <p class="onboarding-step-sub">${escapeHtml(t('onboarding.step2.sub'))}</p>
      <div class="onboarding-card-grid" id="onboardingHeardGrid">
        ${options.map((opt) => `
          <button type="button" class="onboarding-option-card ${selectedHeardFrom === opt.id ? 'selected' : ''}" data-heard-from-id="${opt.id}">
            <span class="onboarding-option-card-check">✓</span>
            ${escapeHtml(opt.label)}
          </button>
        `).join('')}
      </div>
    `;
    body.querySelectorAll('[data-heard-from-id]').forEach((btn) => {
      btn.addEventListener('click', () => {
        selectedHeardFrom = btn.dataset.heardFromId;
        body.querySelectorAll('[data-heard-from-id]').forEach((b) => {
          b.classList.toggle('selected', b.dataset.heardFromId === selectedHeardFrom);
        });
      });
    });
    return;
  }

  if (currentStep === 3) {
    body.innerHTML = `
      <h3 class="onboarding-step-title">${escapeHtml(t('onboarding.step3.h'))}</h3>
      <p class="onboarding-step-sub">${escapeHtml(t('onboarding.step3.sub'))}</p>
      <textarea class="onboarding-textarea" id="onboardingCustomReasonInput" placeholder="${escapeAttrLocal(t('onboarding.step3.placeholder'))}">${escapeHtml(customReasonText)}</textarea>
    `;
    $('onboardingCustomReasonInput').addEventListener('input', (e) => {
      customReasonText = e.target.value;
    });
    return;
  }

  // currentStep === 4: özet
  const dash = t('onboarding.empty');
  const reasonsText = selectedReasons.size
    ? Array.from(selectedReasons).map(reasonLabel).join(', ')
    : dash;
  const heardText = selectedHeardFrom ? heardFromLabel(selectedHeardFrom) : dash;
  const notesText = customReasonText.trim() || dash;

  body.innerHTML = `
    <h3 class="onboarding-step-title">${escapeHtml(t('onboarding.step4.h'))}</h3>
    <p class="onboarding-step-sub">${escapeHtml(t('onboarding.step4.sub'))}</p>
    <div class="onboarding-summary-grid">
      <div class="onboarding-summary-card">
        <div class="onboarding-summary-card-label">${escapeHtml(t('onboarding.step4.reasonsLabel'))}</div>
        <div class="onboarding-summary-card-value">${escapeHtml(reasonsText)}</div>
      </div>
      <div class="onboarding-summary-card">
        <div class="onboarding-summary-card-label">${escapeHtml(t('onboarding.step4.heardLabel'))}</div>
        <div class="onboarding-summary-card-value">${escapeHtml(heardText)}</div>
      </div>
      <div class="onboarding-summary-card" style="grid-column:1 / -1;">
        <div class="onboarding-summary-card-label">${escapeHtml(t('onboarding.step4.notesLabel'))}</div>
        <div class="onboarding-summary-card-value">${escapeHtml(notesText)}</div>
      </div>
    </div>
  `;
}

// utils.js'te escapeAttr yoksa (bu dosyada sadece escapeHtml import edilmişti) basit bir
// yerel yardımcı — data-attribute içine yazarken tırnak/özel karakter kaçışı için.
function escapeAttrLocal(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

// ---- Alt aksiyon çubuğu ----

function renderActions() {
  const el = $('onboardingActions');
  if (!el) return;

  if (currentStep === 1) {
    el.innerHTML = `
      <button type="button" class="btn" data-action="skip">${escapeHtml(t('onboarding.btn.skip'))}</button>
      <button type="button" class="btn primary" data-action="next">${escapeHtml(t('onboarding.btn.next'))}</button>
    `;
    return;
  }
  if (currentStep < TOTAL_STEPS) {
    el.innerHTML = `
      <button type="button" class="btn" data-action="back">${escapeHtml(t('onboarding.btn.back'))}</button>
      <button type="button" class="btn primary" data-action="next">${escapeHtml(t('onboarding.btn.next'))}</button>
    `;
    return;
  }
  // Son adım
  el.innerHTML = `
    <button type="button" class="btn" data-action="back" ${submitting ? 'disabled' : ''}>${escapeHtml(t('onboarding.btn.back'))}</button>
    <button type="button" class="btn primary" data-action="submit" ${submitting ? 'disabled' : ''}>
      ${submitting ? escapeHtml(t('onboarding.btn.submitting')) : escapeHtml(t('onboarding.btn.submit'))}
    </button>
  `;
}

function renderAll() {
  renderProgress();
  renderCaption();
  renderStepBody();
  renderActions();
  $('onboardingErrorMsg').textContent = '';
}

function goToStep(n) {
  currentStep = Math.min(Math.max(n, 1), TOTAL_STEPS);
  renderAll();
}

// ---- Açma / kapama ----

function openOnboardingModal(email) {
  currentEmail = email;
  currentStep = 1;
  selectedReasons = new Set();
  selectedHeardFrom = '';
  customReasonText = '';
  submitting = false;
  renderAll();
  $('onboardingModalBackdrop').classList.add('open');
}

function closeOnboardingModal() {
  $('onboardingModalBackdrop').classList.remove('open');
}

// ---- Gönderim (payload alanları eskisiyle birebir aynı; heard_from artık sabit id) ----

async function submitOnboarding() {
  const msgEl = $('onboardingErrorMsg');

  if (!ONBOARDING_SUBMIT_URL || ONBOARDING_SUBMIT_URL.includes('YOUR-N8N-URL')) {
    msgEl.textContent = t('onboarding.err.notConnected');
    return;
  }

  submitting = true;
  renderActions();
  msgEl.textContent = '';

  try {
    const res = await fetch(ONBOARDING_SUBMIT_URL, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        email: currentEmail,
        use_reasons: Array.from(selectedReasons),
        custom_reason: customReasonText.trim(),
        heard_from: selectedHeardFrom, // artık sabit id ('instagram' | 'tiktok' | 'friend' | 'google' | 'other')
        skipped: false
      })
    });
    const raw = await res.json();
    const data = unwrap(Array.isArray(raw) ? raw[0] : raw) || {};
    if (data.success) {
      closeOnboardingModal();
    } else {
      msgEl.textContent = data.message || t('onboarding.err.saveFailed');
      submitting = false;
      renderActions();
    }
  } catch (err) {
    msgEl.textContent = t('onboarding.err.connection', { msg: err.message });
    submitting = false;
    renderActions();
  }
}

// ---- Init (main.js'ten bir kez çağrılır) ----

export function initOnboardingModal(headersProvider) {
  if (typeof headersProvider === 'function') getAuthHeaders = headersProvider;

  $('onboardingModalBackdrop').addEventListener('click', (e) => {
    if (e.target === $('onboardingModalBackdrop')) {
      markSkippedLocally();
      closeOnboardingModal();
    }
  });

  // Butonlar her adımda yeniden oluşturulduğu için delegasyon kullanıyoruz —
  // #onboardingActions konteynerinin kendisi sabit, içeriği değişiyor.
  $('onboardingActions').addEventListener('click', (e) => {
    const btn = e.target.closest('[data-action]');
    if (!btn || btn.disabled) return;
    const action = btn.dataset.action;

    if (action === 'skip') {
      markSkippedLocally();
      closeOnboardingModal();
    } else if (action === 'back') {
      goToStep(currentStep - 1);
    } else if (action === 'next') {
      goToStep(currentStep + 1);
    } else if (action === 'submit') {
      submitOnboarding();
    }
  });

  // Dil değişince modal açıksa tüm içeriği yeniden çiz (seçimler korunur, sadece metinler değişir).
  // heard_from artık sabit id olduğu için bu seçim de (use_reasons gibi) dil değişince kaybolmuyor.
  window.addEventListener('langchange', () => {
    const backdrop = $('onboardingModalBackdrop');
    if (backdrop && backdrop.classList.contains('open')) renderAll();
  });
}

/**
 * auth.js'ten, giriş başarılı olduğunda çağrılır (hem yeni hem "yarım bırakmış"
 * kullanıcılar için — sunucudan "tamamlanmış mı" diye sorulur).
 */
export async function maybeShowOnboarding(email, headers) {
  if (wasSkippedLocally()) return;
  if (!ONBOARDING_STATUS_URL || ONBOARDING_STATUS_URL.includes('YOUR-N8N-URL')) return;

  try {
    const res = await fetch(ONBOARDING_STATUS_URL, {
      method: 'POST',
      headers,
      body: JSON.stringify({ email })
    });
    const raw = await res.json();
    const data = unwrap(Array.isArray(raw) ? raw[0] : raw) || {};
    if (!data.completed) {
      openOnboardingModal(email);
    }
  } catch (err) {
    console.warn('Onboarding durumu kontrol edilemedi:', err.message);
  }
}