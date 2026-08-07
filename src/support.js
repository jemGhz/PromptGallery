// src/support.js — Destek & Yardım modalı (SSS akordiyon + iletişim formu)
import { FAQ_ITEMS, SUPPORT_FORM_URL } from './config.js';
import { escapeHtml, unwrap } from './utils.js';
import { isLoggedIn, authHeaders } from './auth.js';

function $(id) {
  return document.getElementById(id);
}

let openFaqIdx = null;

function renderFaqList() {
  const list = $('supportFaqList');
  if (!list) return;
  list.innerHTML = FAQ_ITEMS.map((item, i) => `
    <div class="faq-item ${openFaqIdx === i ? 'open' : ''}">
      <button type="button" class="faq-question" data-faq-idx="${i}">
        <span>${escapeHtml(item.q)}</span>
        <span class="faq-chev">⌄</span>
      </button>
      <div class="faq-answer">${escapeHtml(item.a)}</div>
    </div>
  `).join('');
}

function toggleFaq(i) {
  openFaqIdx = openFaqIdx === i ? null : i;
  renderFaqList();
}

function prefillSupportForm() {
  const nameEl = $('supportNameInput');
  const emailEl = $('supportEmailInput');
  if (!nameEl || !emailEl) return;
  try {
    nameEl.value = localStorage.getItem('userName') || '';
    emailEl.value = localStorage.getItem('userEmail') || '';
  } catch (e) {}
}

export function openSupportModal() {
  $('supportModalBackdrop').classList.add('open');
  openFaqIdx = null;
  renderFaqList();
  prefillSupportForm();
  $('supportSubjectInput').value = '';
  $('supportMessageInput').value = '';
  $('supportFormMsg').textContent = '';
  $('supportFormMsg').className = 'code-msg';
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

  $('supportFaqList').addEventListener('click', (e) => {
    const btn = e.target.closest('[data-faq-idx]');
    if (btn) toggleFaq(Number(btn.dataset.faqIdx));
  });

  $('supportSubmitBtn').addEventListener('click', submitSupportForm);

  // Avatar dropdown'daki "Destek & Yardım" butonu dinamik render edildiği için delegation kullanıyoruz.
  document.addEventListener('click', (e) => {
    if (e.target.closest('#avatarSupportBtn')) openSupportModal();
  });
}