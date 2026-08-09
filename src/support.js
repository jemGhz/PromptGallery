// src/support.js — Destek & Yardım modalı (sol nav: SSS / Bize Ulaşın, sağ: dinamik içerik)
import { FAQ_ITEMS, SUPPORT_FORM_URL } from './config.js';
import { escapeHtml, unwrap } from './utils.js';
import { isLoggedIn, authHeaders } from './auth.js';

function $(id) {
  return document.getElementById(id);
}

let supportView = 'faq'; // 'faq' | 'contact'
let openFaqIdx = 0; // mockup'ta ilk soru açık geliyor

function renderSupportNav() {
  document.querySelectorAll('.support-nav-item').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.supportView === supportView);
  });
}

function faqListHtml() {
  return FAQ_ITEMS.map((item, i) => `
    <div class="faq-item ${openFaqIdx === i ? 'open' : ''}">
      <button type="button" class="faq-question" data-faq-idx="${i}">
        <span>${escapeHtml(item.q)}</span>
        <span class="faq-chev">⌄</span>
      </button>
      <div class="faq-answer">${escapeHtml(item.a)}</div>
    </div>
  `).join('');
}

function renderFaqView() {
  $('supportContent').innerHTML = `
    <div class="support-content-header">
      <h2>Sık Sorulan Sorular</h2>
      <p>Aşağıdaki konulardan birine tıklayarak hızlıca çözüm bulabilirsiniz.</p>
    </div>
    <div class="faq-list" id="supportFaqList">${faqListHtml()}</div>
    <div class="support-footer-note">
      <span>✨ Başka bir sorunuz varsa, <strong id="supportGoContact">bize ulaşmaktan çekinmeyin</strong>.</span>
    </div>
  `;
}

function renderContactView() {
  let name = '', email = '';
  try {
    name = localStorage.getItem('userName') || '';
    email = localStorage.getItem('userEmail') || '';
  } catch (e) {}

  $('supportContent').innerHTML = `
    <div class="support-content-header">
      <h2>Bize Ulaşın</h2>
      <p>Aşağıdaki formu doldur, en kısa sürede e-posta adresin üzerinden dönüş yapalım.</p>
    </div>

    <div class="support-form-row">
      <div class="field-group">
        <div class="field-label">Ad Soyad</div>
        <input type="text" class="field-input" id="supportNameInput" placeholder="Adın (opsiyonel)" maxlength="60" value="${escapeHtml(name)}">
      </div>
      <div class="field-group">
        <div class="field-label">E-posta</div>
        <input type="email" class="field-input" id="supportEmailInput" placeholder="ornek@mail.com" maxlength="120" value="${escapeHtml(email)}">
      </div>
    </div>
    <div class="field-group" style="margin-top:12px;">
      <div class="field-label">Konu</div>
      <input type="text" class="field-input" id="supportSubjectInput" placeholder="Kısaca konu (opsiyonel)" maxlength="120">
    </div>
    <div class="field-group" style="margin-top:12px;">
      <div class="field-label">Mesajın</div>
      <textarea class="gen-textarea" id="supportMessageInput" style="min-height:110px;" maxlength="1000" placeholder="Sorununu ya da sorunu buraya yaz..."></textarea>
    </div>

    <div class="support-form-actions">
      <button class="btn primary" id="supportSubmitBtn">Gönder</button>
      <span class="code-msg" id="supportFormMsg"></span>
    </div>
  `;
}

function switchSupportView(view) {
  supportView = view;
  renderSupportNav();
  if (view === 'faq') renderFaqView();
  else renderContactView();
}

export function openSupportModal() {
  $('supportModalBackdrop').classList.add('open');
  supportView = 'faq';
  openFaqIdx = 0;
  renderSupportNav();
  renderFaqView();
}

export function closeSupportModal() {
  $('supportModalBackdrop').classList.remove('open');
}

async function submitSupportForm() {
  const name = $('supportNameInput').value.trim();
  const email = $('supportEmailInput').value.trim();
  const subject = $('supportSubjectInput').value.trim();
  const message = $('supportMessageInput').value.trim();
  const msgEl = $('supportFormMsg');

  if (!email || !message) {
    msgEl.textContent = 'E-posta ve mesaj alanları zorunlu.';
    msgEl.className = 'code-msg error';
    return;
  }
  if (!SUPPORT_FORM_URL || SUPPORT_FORM_URL.includes('YOUR-N8N-URL')) {
    msgEl.textContent = 'Destek servisi henüz bağlanmadı.';
    msgEl.className = 'code-msg error';
    return;
  }

  msgEl.textContent = 'Gönderiliyor...';
  msgEl.className = 'code-msg';
  $('supportSubmitBtn').disabled = true;

  try {
    const res = await fetch(SUPPORT_FORM_URL, {
      method: 'POST',
      headers: isLoggedIn() ? authHeaders() : { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, subject, message })
    });
    const raw = await res.json();
    const data = unwrap(Array.isArray(raw) ? raw[0] : raw) || {};

    if (data.success !== false) {
      msgEl.textContent = 'Mesajın iletildi, en kısa sürede dönüş yapacağız. Teşekkürler!';
      msgEl.className = 'code-msg success';
      $('supportSubjectInput').value = '';
      $('supportMessageInput').value = '';
    } else {
      msgEl.textContent = data.message || 'Gönderilemedi, lütfen tekrar dene.';
      msgEl.className = 'code-msg error';
    }
  } catch (err) {
    msgEl.textContent = 'Bağlantı hatası: ' + err.message;
    msgEl.className = 'code-msg error';
  } finally {
    $('supportSubmitBtn').disabled = false;
  }
}

/** main.js'ten bir kez çağrılır. */
export function initSupportModal() {
  $('supportModalBackdrop').addEventListener('click', (e) => {
    if (e.target === $('supportModalBackdrop')) closeSupportModal();
  });
  $('supportCloseBtn').addEventListener('click', closeSupportModal);

  // Sol nav
  document.querySelector('.support-nav').addEventListener('click', (e) => {
    const btn = e.target.closest('[data-support-view]');
    if (btn) switchSupportView(btn.dataset.supportView);
  });

  // Sağ panel: FAQ toggle, "bize ulaşmaktan çekinmeyin" linki, form submit
  // (içerik her seferinde yeniden render edildiği için delegation kullanıyoruz)
  $('supportContent').addEventListener('click', (e) => {
    const faqBtn = e.target.closest('[data-faq-idx]');
    if (faqBtn) {
      const i = Number(faqBtn.dataset.faqIdx);
      openFaqIdx = openFaqIdx === i ? null : i;
      renderFaqView();
      return;
    }
    if (e.target.closest('#supportGoContact')) {
      switchSupportView('contact');
      return;
    }
    if (e.target.closest('#supportSubmitBtn')) {
      submitSupportForm();
    }
  });

  // Avatar dropdown'daki "Destek & Yardım" butonu
  document.addEventListener('click', (e) => {
    if (e.target.closest('#avatarSupportBtn')) openSupportModal();
  });
}