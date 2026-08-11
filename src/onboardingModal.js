// src/onboardingModal.js
// Giriş sonrası tek seferlik, 4 adımlı sihirbaz: "seni tanıyalım" + "nereden duydun" +
// "ek notlar" + özet/tamamla. auth.js'e bağımlı DEĞİL — headers/email dışarıdan
// (main.js, auth.js) enjekte edilir. Bu yüzden dairesel import riski yok.
//
// NOT: Sunucuya giden veri yapısı (use_reasons, custom_reason, heard_from, skipped)
// eski sürümle birebir aynı — sadece arayüz 4 adımlı sihirbaza dönüştürüldü,
// n8n webhook'unda hiçbir değişiklik gerekmiyor.

import { ONBOARDING_STATUS_URL, ONBOARDING_SUBMIT_URL } from './config.js';
import { unwrap, escapeHtml } from './utils.js';

const USE_REASON_OPTIONS = [
  { id: 'character', label: 'Karakter tasarımı' },
  { id: 'visual', label: 'Görsel üretimi' },
  { id: 'inspiration', label: 'Prompt / ilham arıyorum' },
  { id: 'curious', label: 'Sadece merak ettim, deniyorum' }
];

const HEARD_FROM_OPTIONS = ['Instagram', 'TikTok', 'Arkadaş tavsiyesi', 'Google araması', 'Diğer'];

// Adım başına: soldaki fotoğraf, üst yazı ve ilerleme etiketi.
// Fotoğrafları /public/onboarding/step-1.jpg .. step-4.jpg altına koyman yeterli;
// farklı bir yol/isim kullanırsan aşağıdaki "img" alanlarını güncelle.
const STEP_META = [
  {
    progressLabel: 'Seni Tanıyalım',
    img: 'public\step-2.webp',
    eyebrow: '👋 Hoş geldin',
    title: 'Seni <strong>tanıyalım</strong>',
    desc: 'Deneyimini sana göre şekillendirelim.'
  },
  {
    progressLabel: 'Kaynak',
    img: '/step-2.webp',
    eyebrow: '🔍 Neredeyse bitti',
    title: 'Bizi <strong>nereden</strong> duydun?',
    desc: 'Bu bilgi bize çok yardımcı oluyor.'
  },
  {
    progressLabel: 'Notlar',
    img: '/step-3.webp',
    eyebrow: '✍️ İsteğe bağlı',
    title: 'Eklemek istediğin <strong>bir şey</strong> var mı?',
    desc: 'Bu adımı boş bırakıp devam edebilirsin.'
  },
  {
    progressLabel: 'Tamamlandı',
    img: '/step-4.webp',
    eyebrow: '🎉 Son adım',
    title: 'Neredeyse <strong>hazırsın</strong>!',
    desc: 'Seçimlerini gözden geçir ve başla.'
  }
];

const TOTAL_STEPS = 4;

let currentStep = 1;
let selectedReasons = new Set();
let selectedHeardFrom = '';
let customReasonText = '';
let submitting = false;

let currentEmail = '';
let getAuthHeaders = () => ({ 'Content-Type': 'application/json' });

function $(id) {
  return document.getElementById(id);
}

// ---- Skip / durum hatırlama (davranış değişmedi) ----

function markSkippedLocally() {
  try {
    localStorage.setItem('jg_onboarding_skipped', '1');
  } catch (e) {}
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
  const meta = STEP_META[currentStep - 1];
  setStepImage(meta.img);
  $('onboardingCaptionEyebrow').textContent = meta.eyebrow;
  $('onboardingCaptionTitle').innerHTML = meta.title;
  $('onboardingCaptionDesc').textContent = meta.desc;
}

// ---- İlerleme göstergesi ----

function renderProgress() {
  const el = $('onboardingProgress');
  if (!el) return;
  el.innerHTML = STEP_META.map((meta, i) => {
    const stepNum = i + 1;
    const cls = stepNum < currentStep ? 'done' : stepNum === currentStep ? 'active' : '';
    const dotContent = stepNum < currentStep ? '✓' : String(stepNum);
    return `
      <div class="onboarding-progress-step ${cls}">
        <div class="onboarding-progress-line"></div>
        <div class="onboarding-progress-dot">${dotContent}</div>
        <div class="onboarding-progress-label">${escapeHtml(meta.progressLabel)}</div>
      </div>`;
  }).join('');
}

// ---- Adım gövdeleri ----

function reasonLabel(id) {
  const opt = USE_REASON_OPTIONS.find((o) => o.id === id);
  return opt ? opt.label : id;
}

function renderStepBody() {
  const body = $('onboardingStepBody');
  if (!body) return;

  if (currentStep === 1) {
    body.innerHTML = `
      <h3 class="onboarding-step-title">Seni nasıl tanımlarsın?</h3>
      <p class="onboarding-step-sub">Bizi ne için kullanmayı düşünüyorsun? Birden fazla seçebilirsin.</p>
      <div class="onboarding-card-grid" id="onboardingReasonGrid">
        ${USE_REASON_OPTIONS.map((opt) => `
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
    body.innerHTML = `
      <h3 class="onboarding-step-title">Bizi nereden duydun?</h3>
      <p class="onboarding-step-sub">Tek bir seçenek işaretleyebilirsin.</p>
      <div class="onboarding-card-grid" id="onboardingHeardGrid">
        ${HEARD_FROM_OPTIONS.map((label) => `
          <button type="button" class="onboarding-option-card ${selectedHeardFrom === label ? 'selected' : ''}" data-heard-from="${escapeHtml(label)}">
            <span class="onboarding-option-card-check">✓</span>
            ${escapeHtml(label)}
          </button>
        `).join('')}
      </div>
    `;
    body.querySelectorAll('[data-heard-from]').forEach((btn) => {
      btn.addEventListener('click', () => {
        selectedHeardFrom = btn.dataset.heardFrom;
        body.querySelectorAll('[data-heard-from]').forEach((b) => {
          b.classList.toggle('selected', b.dataset.heardFrom === selectedHeardFrom);
        });
      });
    });
    return;
  }

  if (currentStep === 3) {
    body.innerHTML = `
      <h3 class="onboarding-step-title">Eklemek istediğin bir şey var mı?</h3>
      <p class="onboarding-step-sub">İsteğe bağlı — boş bırakıp devam edebilirsin.</p>
      <textarea class="onboarding-textarea" id="onboardingCustomReasonInput" placeholder="Aklından geçeni yazabilirsin...">${escapeHtml(customReasonText)}</textarea>
    `;
    $('onboardingCustomReasonInput').addEventListener('input', (e) => {
      customReasonText = e.target.value;
    });
    return;
  }

  // currentStep === 4: özet
  const reasonsText = selectedReasons.size
    ? Array.from(selectedReasons).map(reasonLabel).join(', ')
    : '—';
  const heardText = selectedHeardFrom || '—';
  const notesText = customReasonText.trim() || '—';

  body.innerHTML = `
    <h3 class="onboarding-step-title">Her şey hazır! 🎉</h3>
    <p class="onboarding-step-sub">Seçimlerini aşağıda görebilirsin. Bunları daha sonra hesap ayarlarından değiştirebilirsin.</p>
    <div class="onboarding-summary-grid">
      <div class="onboarding-summary-card">
        <div class="onboarding-summary-card-label">Kullanım Amacın</div>
        <div class="onboarding-summary-card-value">${escapeHtml(reasonsText)}</div>
      </div>
      <div class="onboarding-summary-card">
        <div class="onboarding-summary-card-label">Bizi Duyduğun Yer</div>
        <div class="onboarding-summary-card-value">${escapeHtml(heardText)}</div>
      </div>
      <div class="onboarding-summary-card" style="grid-column:1 / -1;">
        <div class="onboarding-summary-card-label">Ek Notların</div>
        <div class="onboarding-summary-card-value">${escapeHtml(notesText)}</div>
      </div>
    </div>
  `;
}

// ---- Alt aksiyon çubuğu ----

function renderActions() {
  const el = $('onboardingActions');
  if (!el) return;

  if (currentStep === 1) {
    el.innerHTML = `
      <button type="button" class="btn" data-action="skip">Şimdi değil</button>
      <button type="button" class="btn primary" data-action="next">Devam Et →</button>
    `;
    return;
  }
  if (currentStep < TOTAL_STEPS) {
    el.innerHTML = `
      <button type="button" class="btn" data-action="back">← Geri</button>
      <button type="button" class="btn primary" data-action="next">Devam Et →</button>
    `;
    return;
  }
  // Son adım
  el.innerHTML = `
    <button type="button" class="btn" data-action="back" ${submitting ? 'disabled' : ''}>← Geri</button>
    <button type="button" class="btn primary" data-action="submit" ${submitting ? 'disabled' : ''}>
      ${submitting ? 'Kaydediliyor...' : 'Kurulumu Tamamla ve Başla →'}
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

// ---- Gönderim (davranış ve payload eskisiyle birebir aynı) ----

async function submitOnboarding() {
  const msgEl = $('onboardingErrorMsg');

  if (!ONBOARDING_SUBMIT_URL || ONBOARDING_SUBMIT_URL.includes('YOUR-N8N-URL')) {
    msgEl.textContent = 'Bu özellik henüz bağlanmadı.';
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
        heard_from: selectedHeardFrom,
        skipped: false
      })
    });
    const raw = await res.json();
    const data = unwrap(Array.isArray(raw) ? raw[0] : raw) || {};
    if (data.success) {
      closeOnboardingModal();
    } else {
      msgEl.textContent = data.message || 'Kaydedilemedi, tekrar dene.';
      submitting = false;
      renderActions();
    }
  } catch (err) {
    msgEl.textContent = 'Bağlantı hatası: ' + err.message;
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