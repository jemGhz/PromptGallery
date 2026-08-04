// src/credits.js — kredi satın alma modalı (paket seçimi -> ödeme yöntemi -> IBAN/kod doğrulama)

import { CREDIT_PACKAGES, CREDIT_STRIPE_CHECKOUT_URL, CREDIT_VERIFY_CODE_URL } from './config.js';
import { escapeHtml, unwrap } from './utils.js';
import { isLoggedIn, setLocalCreditBalance, renderGoogleButton, authHeaders } from './auth.js';

let selectedCreditPkgIdx = null;

function $(id) {
  return document.getElementById(id);
}

export function openCreditModal() {
  $('creditModalBackdrop').classList.add('open');
  $('creditLoginStep').style.display = 'none';
  $('creditPkgStep').style.display = 'none';
  $('creditPayStep').style.display = 'none';
  $('creditIbanStep').style.display = 'none';

  if (!isLoggedIn()) {
    $('creditLoginStep').style.display = 'block';
    return;
  }
  selectedCreditPkgIdx = null;
  renderCreditPkgList();
  $('creditPkgStep').style.display = 'block';
}

export function closeCreditModal() {
  $('creditModalBackdrop').classList.remove('open');
}

function renderCreditPkgList() {
  const list = $('creditPkgList');
  list.innerHTML = CREDIT_PACKAGES.map(
    (p, i) => `
    <button type="button" class="credit-pkg ${selectedCreditPkgIdx === i ? 'active' : ''}" data-pkg-idx="${i}">
      <span class="pkg-credits">${p.credits} Kredi</span>
      <span class="pkg-price">${escapeHtml(p.price)}</span>
    </button>`
  ).join('');
}

function selectCreditPkg(i) {
  selectedCreditPkgIdx = i;
  renderCreditPkgList();
  $('creditContinueBtn').disabled = false;
}

function goToCreditPayStep() {
  if (selectedCreditPkgIdx === null) return;
  const pkg = CREDIT_PACKAGES[selectedCreditPkgIdx];
  $('creditPkgStep').style.display = 'none';
  $('creditPayStep').style.display = 'block';
  $('creditPaySummary').textContent = `${pkg.credits} Kredi — ${pkg.price}`;
}
function backToCreditPkgStep() {
  $('creditPayStep').style.display = 'none';
  $('creditPkgStep').style.display = 'block';
}
function backToCreditPayStep() {
  $('creditIbanStep').style.display = 'none';
  $('creditPayStep').style.display = 'block';
}

async function startCreditPayment(method) {
  const pkg = CREDIT_PACKAGES[selectedCreditPkgIdx];
  if (!pkg) return;

  if (method === 'iban') {
    $('creditPayStep').style.display = 'none';
    $('creditIbanStep').style.display = 'block';
    $('creditIbanAmount').textContent = pkg.price;
    $('creditCodeInput').value = '';
    $('creditCodeMsg').textContent = '';
    $('creditCodeMsg').className = 'code-msg';
    return;
  }

  // Türkiye'de Stripe doğrudan tahsilat desteklemiyor; gerçek entegrasyon (Stripe ya da
  // iyzico/PayTR) bağlanana kadar bilgilendirme mesajı gösterilir.
  if (!CREDIT_STRIPE_CHECKOUT_URL || CREDIT_STRIPE_CHECKOUT_URL.includes('YOUR-N8N-URL')) {
    $('creditPaySummary').textContent = 'Kart ile ödeme henüz aktif değil. Şimdilik IBAN ile devam edebilirsin.';
    return;
  }
  try {
    const email = localStorage.getItem('userEmail') || '';
    const res = await fetch(CREDIT_STRIPE_CHECKOUT_URL, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ email, packageId: pkg.id })
    });
    const raw = await res.json();
    const data = unwrap(Array.isArray(raw) ? raw[0] : raw) || {};
    if (data.checkoutUrl) {
      window.location.href = data.checkoutUrl;
    } else {
      $('creditPaySummary').textContent = data.message || 'Ödeme başlatılamadı.';
    }
  } catch (err) {
    $('creditPaySummary').textContent = 'Hata: ' + err.message;
  }
}

async function submitCreditCode() {
  const pkg = CREDIT_PACKAGES[selectedCreditPkgIdx];
  const code = $('creditCodeInput').value.trim();
  const msgEl = $('creditCodeMsg');

  if (!code) {
    msgEl.textContent = 'Kod boş olamaz.';
    msgEl.className = 'code-msg error';
    return;
  }
  if (!CREDIT_VERIFY_CODE_URL || CREDIT_VERIFY_CODE_URL.includes('YOUR-N8N-URL')) {
    msgEl.textContent = 'Doğrulama servisi henüz bağlanmadı.';
    msgEl.className = 'code-msg error';
    return;
  }
  if (!isLoggedIn()) {
    msgEl.textContent = 'Oturum süresi dolmuş görünüyor, lütfen tekrar giriş yap.';
    msgEl.className = 'code-msg error';
    return;
  }

  msgEl.textContent = 'Kontrol ediliyor...';
  msgEl.className = 'code-msg';

  try {
    const email = localStorage.getItem('userEmail') || '';
    const res = await fetch(CREDIT_VERIFY_CODE_URL, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ email, code, packageId: pkg ? pkg.id : null })
    });
    const raw = await res.json();
    const data = unwrap(Array.isArray(raw) ? raw[0] : raw) || {};

    if (data.success) {
      msgEl.textContent = 'Kod doğru! Krediler ekleniyor...';
      msgEl.className = 'code-msg success';
      if (typeof data.newBalance === 'number') setLocalCreditBalance(data.newBalance);
      setTimeout(closeCreditModal, 700);
    } else {
      msgEl.textContent = data.message || 'Kod geçersiz.';
      msgEl.className = 'code-msg error';
    }
  } catch (err) {
    msgEl.textContent = 'Bağlantı hatası: ' + err.message;
    msgEl.className = 'code-msg error';
  }
}

/** Tüm statik butonları ve event delegation'ı bağlar. main.js'ten bir kez çağrılır. */
export function initCreditModal() {
  $('creditAddBtn').addEventListener('click', openCreditModal);
  $('creditModalBackdrop').addEventListener('click', (e) => {
    if (e.target === $('creditModalBackdrop')) closeCreditModal();
  });

  renderGoogleButton('creditGoogleSignInBtn');
  $('creditLoginStep').querySelector('.btn:not(.primary)').addEventListener('click', closeCreditModal);

  $('creditPkgList').addEventListener('click', (e) => {
    const btn = e.target.closest('[data-pkg-idx]');
    if (btn) selectCreditPkg(Number(btn.dataset.pkgIdx));
  });
  $('creditContinueBtn').addEventListener('click', goToCreditPayStep);
  $('creditPkgStep').querySelector('.btn:not(.primary)').addEventListener('click', closeCreditModal);

  $('creditPayStep').querySelectorAll('.credit-pay-methods .btn').forEach((btn) => {
    if (btn.textContent.includes('Stripe')) btn.addEventListener('click', () => startCreditPayment('stripe'));
    else if (btn.textContent.includes('IBAN')) btn.addEventListener('click', () => startCreditPayment('iban'));
    else btn.addEventListener('click', backToCreditPkgStep);
  });

  $('creditCodeInput').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') submitCreditCode();
  });
  $('creditIbanStep').querySelector('.code-row .btn.primary').addEventListener('click', submitCreditCode);
  $('creditIbanStep').querySelector('.btn:not(.primary)').addEventListener('click', backToCreditPayStep);
}