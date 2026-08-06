// src/tabs/promptGenerator.js
import { PROMPT_MAKER_URL, PROMPT_MAKER_CREDIT_COST } from '../config.js';
import { escapeHtml, unwrap, resizeImageToBase64 } from '../utils.js';
import { isLoggedIn, setLocalCreditBalance, authHeaders } from '../auth.js';
import { openCreditModal } from '../credits.js';
import { appState } from '../state.js';

let makerImageBase64 = null;
let makerImageMime = null;

function $(id) {
  return document.getElementById(id);
}

function resetResultPanel() {
  appState.makerGeneratedPrompt = '';
  const box = $('makerResultBox');
  box.className = 'result-box empty-state';
  box.innerHTML = '<span id="makerEmptyMsg">Prompt üretildiğinde burada görünecek.</span>';
  $('makerCopyBtn').disabled = true;
  $('makerDownloadBtn').disabled = true;
}

function showResultPrompt(promptText) {
  appState.makerGeneratedPrompt = promptText || '';
  const box = $('makerResultBox');
  box.className = 'result-box';
  box.innerHTML = `<button class="copy-icon-btn" id="makerCopyIconBtn" title="Kopyala">📋</button>${escapeHtml(appState.makerGeneratedPrompt)}`;
  $('makerCopyIconBtn').addEventListener('click', copyMakerPrompt);
  $('makerCopyBtn').disabled = false;
  $('makerDownloadBtn').disabled = false;
  const copyBtn = $('makerCopyBtn');
  copyBtn.textContent = 'Kopyala';
  copyBtn.classList.remove('copied');
}

function handleMakerFile(file) {
  if (!file) return;
  resizeImageToBase64(file, 1600)
    .then(({ base64, mimeType, dataUrl }) => {
      makerImageBase64 = base64;
      makerImageMime = mimeType;

      const preview = $('makerPreview');
      preview.src = dataUrl;
      preview.style.display = 'block';
      $('makerPlaceholder').style.display = 'none';
      $('makerDropZone').classList.add('has-img');
      $('removeImgBtn').style.display = 'flex';

      $('makerGenerateBtn').disabled = false;
      $('makerStatus').textContent = '';
      resetResultPanel();
    })
    .catch((err) => {
      $('makerStatus').textContent = 'Görsel okunamadı: ' + err.message;
    });
}

function resetMaker() {
  makerImageBase64 = null;
  makerImageMime = null;
  const preview = $('makerPreview');
  preview.style.display = 'none';
  preview.src = '';
  $('makerPlaceholder').style.display = 'block';
  $('makerDropZone').classList.remove('has-img');
  $('removeImgBtn').style.display = 'none';
  $('makerGenerateBtn').disabled = true;
  $('makerStatus').textContent = '';
  $('makerFileInput').value = '';
  resetResultPanel();
}

async function generatePrompt() {
  if (!makerImageBase64) return;

  if (!isLoggedIn()) {
    $('makerStatus').textContent = 'Prompt üretmek için önce giriş yapmalısın.';
    openCreditModal();
    return;
  }

  const cost = PROMPT_MAKER_CREDIT_COST;
  if (appState.currentCreditBalance < cost) {
    $('makerStatus').textContent = `Yetersiz kredi: bu işlem ${cost} kredi tutuyor, bakiyeniz ${appState.currentCreditBalance}.`;
    openCreditModal();
    return;
  }

  if (!PROMPT_MAKER_URL || PROMPT_MAKER_URL.includes('YOUR-N8N-URL')) {
    $('makerStatus').textContent = 'Prompt üretici servisi henüz bağlanmadı.';
    return;
  }

  const btn = $('makerGenerateBtn');
  btn.disabled = true;
  $('makerStatus').textContent = 'Görsel analiz ediliyor, birkaç saniye sürebilir...';
  resetResultPanel();

  try {
    // ÖNEMLİ: authHeaders() eklendi. Backend artık kredi düşürme işlemini
    // Authorization token'dan çözdüğü email üzerinden yapıyor; token
    // gitmezse istek 401 ile reddediliyor.
    const res = await fetch(PROMPT_MAKER_URL, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({
        mimeType: makerImageMime,
        imageBase64: makerImageBase64
      })
    });
    const raw = await res.json();
    const data = unwrap(Array.isArray(raw) ? raw[0] : raw) || {};

    if (data.blocked) {
      // İçerik moderasyonu tarafından reddedildi — kredi harcanmadı.
      $('makerStatus').textContent = data.message || 'Bu görsel kullanılamıyor.';
      return;
    }

    if (!data.allowed) {
      $('makerStatus').textContent = data.message || 'Kredi bakiyeniz bu işlem için yetersiz.';
      if (typeof data.newBalance === 'number') setLocalCreditBalance(data.newBalance);
      openCreditModal();
      return;
    }

    $('makerStatus').textContent = '';
    showResultPrompt(data.promptText || '');
    if (typeof data.newBalance === 'number') setLocalCreditBalance(data.newBalance);
    // data.imageUrl da dönüyor (Supabase Storage'a yüklenen görselin public URL'i).
    // Profildeki galeri, prompt_generations tablosundan bunu zaten okuyacağı için
    // burada ayrıca bir işlem yapmamıza gerek yok.
  } catch (err) {
    $('makerStatus').textContent = 'Hata: ' + err.message;
  } finally {
    btn.disabled = !makerImageBase64;
  }
}

function copyMakerPrompt() {
  if (!appState.makerGeneratedPrompt) return;
  navigator.clipboard.writeText(appState.makerGeneratedPrompt).then(() => {
    const btn = $('makerCopyBtn');
    btn.textContent = 'Kopyalandı ✓';
    btn.classList.add('copied');
    setTimeout(() => {
      btn.textContent = 'Kopyala';
      btn.classList.remove('copied');
    }, 1600);
  });
}

function downloadMakerPrompt() {
  if (!appState.makerGeneratedPrompt) return;
  const blob = new Blob([appState.makerGeneratedPrompt], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'prompt.txt';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function initPromptGenerator() {
  $('makerDropZone').addEventListener('click', () => $('makerFileInput').click());
  $('makerDropZone').addEventListener('dragover', (e) => {
    e.preventDefault();
    $('makerDropZone').classList.add('dragover');
  });
  $('makerDropZone').addEventListener('dragleave', () => $('makerDropZone').classList.remove('dragover'));
  $('makerDropZone').addEventListener('drop', (e) => {
    e.preventDefault();
    $('makerDropZone').classList.remove('dragover');
    const file = e.dataTransfer.files[0];
    if (file) handleMakerFile(file);
  });
  $('makerFileInput').addEventListener('change', (e) => handleMakerFile(e.target.files[0]));
  $('removeImgBtn').addEventListener('click', (e) => {
    e.stopPropagation();
    resetMaker();
  });
  $('changeImgBtn').addEventListener('click', () => $('makerFileInput').click());
  $('makerGenerateBtn').addEventListener('click', generatePrompt);
  $('makerCopyBtn').addEventListener('click', copyMakerPrompt);
  $('makerDownloadBtn').addEventListener('click', downloadMakerPrompt);
}

/** visualGenerator.js "Prompt Üretici'den Al" butonu için kullanır. */
export function triggerMakerUpload() {
  setTimeout(() => $('makerFileInput').click(), 50);
}