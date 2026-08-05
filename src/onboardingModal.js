// src/onboardingModal.js
// Giriş sonrası tek seferlik: "neden kullanıyorsun" + "nereden duydun" anketi.
// auth.js'e bağımlı DEĞİL — headers/email dışarıdan (main.js, auth.js) enjekte edilir.
// Bu yüzden dairesel import riski yok: sadece auth.js -> onboardingModal.js yönünde bağımlılık var.

import { ONBOARDING_STATUS_URL, ONBOARDING_SUBMIT_URL } from './config.js';
import { unwrap } from './utils.js';

const USE_REASON_OPTIONS = [
  { id: 'character', label: 'Karakter tasarımı' },
  { id: 'visual', label: 'Görsel üretimi' },
  { id: 'inspiration', label: 'Prompt / ilham arıyorum' },
  { id: 'curious', label: 'Sadece merak ettim, deniyorum' }
];

const HEARD_FROM_OPTIONS = ['Instagram', 'TikTok', 'Arkadaş tavsiyesi', 'Google araması', 'Diğer'];

let currentEmail = '';
let getAuthHeaders = () => ({ 'Content-Type': 'application/json' });

function $(id) {
  return document.getElementById(id);
}

function renderOptions() {
  const reasonsEl = $('onboardingReasons');
  if (reasonsEl) {
    reasonsEl.innerHTML = USE_REASON_OPTIONS.map(
      (opt) => `
      <label class="onboarding-check">
        <input type="checkbox" value="${opt.id}">
        <span>${opt.label}</span>
      </label>`
    ).join('');
  }

  const heardEl = $('onboardingHeardFrom');
  if (heardEl) {
    heardEl.innerHTML =
      '<option value="" disabled selected>Seç...</option>' +
      HEARD_FROM_OPTIONS.map((label) => `<option value="${label}">${label}</option>`).join('');
  }
}

function openOnboardingModal(email) {
  currentEmail = email;
  $('onboardingErrorMsg').textContent = '';
  $('onboardingSubmitBtn').disabled = false;
  $('onboardingModalBackdrop').classList.add('open');
}

function closeOnboardingModal() {
  $('onboardingModalBackdrop').classList.remove('open');
}

// Kullanıcı "Şimdi değil" derse: sunucuya HİÇBİR ŞEY yazılmaz, sadece bu tarayıcıda
// tekrar sorulmasın diye localStorage'a işaret konur. Başka bir cihazdan girerse
// tekrar sorulur — bu bilinçli bir basitleştirme (istersen skipped:true ile
// sunucuya da yazdırıp kalıcı hale getirebiliriz).
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

async function submitOnboarding() {
  const reasonsEl = $('onboardingReasons');
  const reasons = reasonsEl
    ? Array.from(reasonsEl.querySelectorAll('input[type=checkbox]:checked')).map((el) => el.value)
    : [];
  const heardFrom = $('onboardingHeardFrom') ? $('onboardingHeardFrom').value : '';
  const customReason = $('onboardingCustomReason') ? $('onboardingCustomReason').value.trim() : '';
  const msgEl = $('onboardingErrorMsg');

  if (!ONBOARDING_SUBMIT_URL || ONBOARDING_SUBMIT_URL.includes('YOUR-N8N-URL')) {
    msgEl.textContent = 'Bu özellik henüz bağlanmadı.';
    return;
  }

  $('onboardingSubmitBtn').disabled = true;
  try {
    const res = await fetch(ONBOARDING_SUBMIT_URL, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        email: currentEmail,
        use_reasons: reasons,
        custom_reason: customReason,
        heard_from: heardFrom,
        skipped: false
      })
    });
    const raw = await res.json();
    const data = unwrap(Array.isArray(raw) ? raw[0] : raw) || {};
    if (data.success) {
      closeOnboardingModal();
    } else {
      msgEl.textContent = data.message || 'Kaydedilemedi, tekrar dene.';
      $('onboardingSubmitBtn').disabled = false;
    }
  } catch (err) {
    msgEl.textContent = 'Bağlantı hatası: ' + err.message;
    $('onboardingSubmitBtn').disabled = false;
  }
}

/**
 * main.js'ten bir kez çağrılır. headersProvider = auth.js'teki authHeaders fonksiyonu.
 * Böylece bu dosya auth.js'i import etmek zorunda kalmıyor.
 */
export function initOnboardingModal(headersProvider) {
  if (typeof headersProvider === 'function') getAuthHeaders = headersProvider;
  renderOptions();

  $('onboardingModalBackdrop').addEventListener('click', (e) => {
    if (e.target === $('onboardingModalBackdrop')) {
      markSkippedLocally();
      closeOnboardingModal();
    }
  });

  $('onboardingSkipBtn').addEventListener('click', () => {
    markSkippedLocally();
    closeOnboardingModal();
  });

  $('onboardingSubmitBtn').addEventListener('click', submitOnboarding);
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