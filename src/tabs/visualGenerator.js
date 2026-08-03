// src/tabs/visualGenerator.js
import { AI_MODELS, CAMERA_OPTIONS, EFFECT_OPTIONS, POSE_OPTIONS, STYLE_OPTIONS, GEN_GENERATE_URL } from '../config.js';
import { escapeAttr, escapeHtml, unwrap, getDeviceId, resizeImageToBase64 } from '../utils.js';
import { isLoggedIn, onBalanceChange, setLocalCreditBalance } from '../auth.js';
import { openCreditModal } from '../credits.js';
import { createChipGroup, bindAccordions, updateAccCount } from '../chipGroups.js';
import { appState } from '../state.js';
import { switchTab } from '../tabState.js';

function $(id) {
  return document.getElementById(id);
}

let genSelectedSize = '1:1';
let genSelectedCount = 4;
let genSelectedModelIdx = 0;
let refImageBase64 = null,
  refImageMime = null;
let characters = [];
let charIdCounter = 0;

let cameraGroup, effectsGroup, posesGroup, styleGroup;

function getVisualGenerationCost() {
  return AI_MODELS[genSelectedModelIdx].creditCost * genSelectedCount;
}

function updateGenQuotaNote() {
  const note = $('genQuotaNote');
  if (!note) return;
  const cost = getVisualGenerationCost();
  note.textContent = `Bu üretim ${cost} kredi tutuyor (bakiyeniz: ${appState.currentCreditBalance} kredi).`;
}

function setGenSize(ratio, btn) {
  genSelectedSize = ratio;
  document.querySelectorAll('#genSizeGrid .opt-btn').forEach((b) => b.classList.remove('active'));
  btn.classList.add('active');
}

function setGenCount(n, btn) {
  genSelectedCount = n;
  document.querySelectorAll('#genCountRow .count-btn').forEach((b) => b.classList.remove('active'));
  btn.classList.add('active');
  updateGenQuotaNote();
}

function renderModelMenu() {
  const menu = $('genModelMenu');
  menu.innerHTML = AI_MODELS.map(
    (m, i) => `
    <button type="button" class="model-option" data-model-idx="${i}">
      <span class="m-name">${m.icon} ${escapeHtml(m.name)} ${m.badge ? `<span class="model-badge-new">${escapeHtml(m.badge)}</span>` : ''}</span>
      <span class="m-desc">${escapeHtml(m.desc)} · ${m.creditCost} kredi / görsel</span>
    </button>`
  ).join('');
  menu.querySelectorAll('[data-model-idx]').forEach((btn) => {
    btn.addEventListener('click', () => selectModel(Number(btn.dataset.modelIdx)));
  });
  selectModel(genSelectedModelIdx, true);
}
function selectModel(i, silent) {
  genSelectedModelIdx = i;
  const m = AI_MODELS[i];
  $('genModelIcon').textContent = m.icon;
  $('genModelName').textContent = m.name;
  $('genModelDesc').textContent = `${m.desc} · ${m.creditCost} kredi / görsel`;
  const badgeEl = $('genModelBadge');
  badgeEl.style.display = m.badge ? 'inline-block' : 'none';
  if (!silent) $('genModelMenu').classList.remove('open');
  updateGenQuotaNote();
}

function onGenPromptInput() {
  const val = $('genPromptInput').value;
  $('genCharCount').textContent = val.length + ' / 2000';
  updateGenSubmitState();
}
function updateGenSubmitState() {
  const val = $('genPromptInput').value.trim();
  $('genSubmitBtn').disabled = !val;
}

function usePromptFromMaker() {
  if (appState.makerGeneratedPrompt) {
    $('genPromptInput').value = appState.makerGeneratedPrompt;
    onGenPromptInput();
  }
  switchTab('visual');
}
function suggestGenPrompt() {
  const ideas = [
    'Gün batımında sahilde yürüyen bir kadın, sinematik ışık, warm tones',
    'Yağmurlu bir şehir sokağında neon yansımalar, cyberpunk atmosfer',
    'Minimalist stüdyoda ürün fotoğrafı, yumuşak gölgeler, temiz arka plan',
    'Dağ zirvesinde gün doğumu, epik geniş açı, sinematik renk paleti',
    'Kafede kitap okuyan bir karakter, doğal ışık, sıcak tonlar, portre'
  ];
  $('genPromptInput').value = ideas[Math.floor(Math.random() * ideas.length)];
  onGenPromptInput();
}

function handleRefFile(file) {
  if (!file) return;
  resizeImageToBase64(file, 1200)
    .then(({ base64, mimeType, dataUrl }) => {
      refImageBase64 = base64;
      refImageMime = mimeType;
      const img = $('refPreviewImg');
      img.src = dataUrl;
      img.style.display = 'block';
      $('refPlaceholder').style.display = 'none';
      $('refUploadBox').classList.add('has-img');
      $('refRemoveBtn').style.display = 'flex';
    })
    .catch((err) => {
      $('genQuotaNote').textContent = 'Referans görsel okunamadı: ' + err.message;
    });
}
function removeRefImage() {
  refImageBase64 = null;
  refImageMime = null;
  const img = $('refPreviewImg');
  img.style.display = 'none';
  img.src = '';
  $('refPlaceholder').style.display = 'block';
  $('refUploadBox').classList.remove('has-img');
  $('refRemoveBtn').style.display = 'none';
  $('refFileInput').value = '';
}

function addCharacterRow() {
  if (characters.length >= 4) return;
  charIdCounter++;
  characters.push({ id: charIdCounter, name: '', base64: null, mime: null });
  renderCharList();
}
function removeCharacterRow(id) {
  characters = characters.filter((c) => c.id !== id);
  renderCharList();
}
function handleCharFile(id, file) {
  if (!file) return;
  resizeImageToBase64(file, 1000)
    .then(({ base64, mimeType }) => {
      const c = characters.find((c) => c.id === id);
      if (!c) return;
      c.base64 = base64;
      c.mime = mimeType;
      renderCharList();
    })
    .catch((err) => {
      $('genQuotaNote').textContent = 'Karakter görseli okunamadı: ' + err.message;
    });
}
function renderCharList() {
  const el = $('charList');
  el.innerHTML = characters
    .map(
      (c, idx) => `
    <div class="char-row">
      <div class="char-thumb" data-char-thumb="${c.id}">
        ${c.base64 ? `<img src="data:${c.mime};base64,${c.base64}" alt="">` : '📷'}
      </div>
      <input type="file" id="charFile_${c.id}" accept="image/*" style="display:none">
      <div class="char-fields">
        <input type="text" placeholder="Karakter ${idx + 1} (isim, isteğe bağlı)" value="${escapeAttr(c.name)}" data-char-name="${c.id}">
      </div>
      <button type="button" class="char-remove" data-char-remove="${c.id}" title="Kaldır">✕</button>
    </div>`
    )
    .join('');

  el.querySelectorAll('[data-char-thumb]').forEach((thumb) => {
    const id = Number(thumb.dataset.charThumb);
    thumb.addEventListener('click', () => document.getElementById('charFile_' + id).click());
  });
  el.querySelectorAll('input[type=file]').forEach((input) => {
    const id = Number(input.id.replace('charFile_', ''));
    input.addEventListener('change', (e) => handleCharFile(id, e.target.files[0]));
  });
  el.querySelectorAll('[data-char-name]').forEach((input) => {
    const id = Number(input.dataset.charName);
    input.addEventListener('input', (e) => {
      const c = characters.find((c) => c.id === id);
      if (c) c.name = e.target.value;
    });
  });
  el.querySelectorAll('[data-char-remove]').forEach((btn) => {
    btn.addEventListener('click', () => removeCharacterRow(Number(btn.dataset.charRemove)));
  });

  $('addCharBtn').disabled = characters.length >= 4;
}

function showGenLoadingTiles(n) {
  $('genEmptyState').style.display = 'none';
  const grid = $('genResultsGrid');
  grid.style.display = 'grid';
  grid.innerHTML = Array.from({ length: n })
    .map(() => `<div class="gen-tile loading">Oluşturuluyor...</div>`)
    .join('');
  $('genResultCount').textContent = n;
}
function showGenEmptyState() {
  $('genEmptyState').style.display = 'block';
  const grid = $('genResultsGrid');
  grid.style.display = 'none';
  grid.innerHTML = '';
  $('genResultCount').textContent = '0';
}
function renderGenResults(images) {
  if (!images || !images.length) {
    showGenEmptyState();
    return;
  }
  const grid = $('genResultsGrid');
  grid.innerHTML = images
    .map(
      (url, i) => `
    <div class="gen-tile">
      <img src="${url}" alt="oluşturulan görsel ${i + 1}" loading="lazy">
      <div class="gen-tile-actions">
        <button class="icon-btn" data-download-url="${escapeAttr(url)}" data-download-idx="${i}" title="İndir">⬇</button>
      </div>
    </div>`
    )
    .join('');
  grid.querySelectorAll('[data-download-url]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      downloadGenImage(btn.dataset.downloadUrl, Number(btn.dataset.downloadIdx));
    });
  });
  $('genResultCount').textContent = images.length;
}
function downloadGenImage(url, idx) {
  const a = document.createElement('a');
  a.href = url;
  a.download = 'jg-studio-gorsel-' + (idx + 1) + '.png';
  a.target = '_blank';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

async function generateVisual() {
  const prompt = $('genPromptInput').value.trim();
  if (!prompt) return;

  if (!isLoggedIn()) {
    $('genQuotaNote').textContent = 'Görsel oluşturmak için önce giriş yapmalısın.';
    openCreditModal();
    return;
  }

  const cost = getVisualGenerationCost();
  if (appState.currentCreditBalance < cost) {
    $('genQuotaNote').textContent = `Yetersiz kredi: bu üretim ${cost} kredi tutuyor, bakiyeniz ${appState.currentCreditBalance} kredi.`;
    openCreditModal();
    return;
  }

  if (!GEN_GENERATE_URL || GEN_GENERATE_URL.includes('YOUR-N8N-URL')) {
    $('genQuotaNote').textContent = 'Görsel oluşturma servisi henüz bağlanmadı.';
    return;
  }

  const btn = $('genSubmitBtn');
  btn.disabled = true;
  $('genQuotaNote').textContent = `Görsel oluşturuluyor (${cost} kredi), birkaç saniye sürebilir...`;
  showGenLoadingTiles(genSelectedCount);

  try {
    const payload = {
      email: localStorage.getItem('userEmail') || '',
      deviceId: getDeviceId(),
      prompt,
      size: genSelectedSize,
      count: genSelectedCount,
      model: AI_MODELS[genSelectedModelIdx].name,
      creditCostPerImage: AI_MODELS[genSelectedModelIdx].creditCost,
      creditCost: cost,
      camera: [...cameraGroup.selected],
      effects: [...effectsGroup.selected],
      poses: [...posesGroup.selected],
      styles: [...styleGroup.selected],
      referenceImage: refImageBase64 ? { base64: refImageBase64, mimeType: refImageMime } : null,
      characters: characters.map((c) => ({ name: c.name, base64: c.base64, mimeType: c.mime }))
    };
    const res = await fetch(GEN_GENERATE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const raw = await res.json();
    const data = unwrap(Array.isArray(raw) ? raw[0] : raw) || {};

    if (!data.allowed) {
      $('genQuotaNote').textContent = data.message || 'Kredi bakiyeniz bu işlem için yetersiz.';
      showGenEmptyState();
      if (typeof data.newBalance === 'number') setLocalCreditBalance(data.newBalance);
      openCreditModal();
      return;
    }

    if (typeof data.newBalance === 'number') setLocalCreditBalance(data.newBalance);
    renderGenResults(data.images || []);
    updateGenQuotaNote();
  } catch (err) {
    $('genQuotaNote').textContent = 'Hata: ' + err.message;
    showGenEmptyState();
  } finally {
    btn.disabled = false;
  }
}

export function initVisualGenerator() {
  cameraGroup = createChipGroup($('cameraChips'), CAMERA_OPTIONS, (s) => updateAccCount($('cameraAccCount'), s.size));
  effectsGroup = createChipGroup($('effectsChips'), EFFECT_OPTIONS, (s) => updateAccCount($('effectsAccCount'), s.size));
  posesGroup = createChipGroup($('posesChips'), POSE_OPTIONS, (s) => updateAccCount($('posesAccCount'), s.size));
  styleGroup = createChipGroup($('styleChips'), STYLE_OPTIONS, (s) => updateAccCount($('styleAccCount'), s.size));
  bindAccordions(document.getElementById('visualView'));

  renderModelMenu();
  renderCharList();
  updateGenSubmitState();

  $('genPromptInput').addEventListener('input', onGenPromptInput);
  document.querySelector('#visualView .chip-btn-row').children[0].addEventListener('click', suggestGenPrompt);
  document.querySelector('#visualView .chip-btn-row').children[1].addEventListener('click', usePromptFromMaker);

  document.querySelectorAll('#genSizeGrid .opt-btn').forEach((btn) => {
    btn.addEventListener('click', () => setGenSize(btn.dataset.ratio, btn));
  });
  document.querySelectorAll('#genCountRow .count-btn').forEach((btn, idx) => {
    const counts = [1, 2, 4, 8];
    btn.addEventListener('click', () => setGenCount(counts[idx], btn));
  });

  $('genModelMenu').previousElementSibling.addEventListener('click', () => $('genModelMenu').classList.toggle('open'));
  document.addEventListener('click', (e) => {
    const wrap = document.querySelector('#visualView .model-select-wrap');
    if (wrap && !wrap.contains(e.target)) $('genModelMenu').classList.remove('open');
  });

  $('refUploadBox').addEventListener('click', () => $('refFileInput').click());
  $('refFileInput').addEventListener('change', (e) => handleRefFile(e.target.files[0]));
  $('refRemoveBtn').addEventListener('click', (e) => {
    e.stopPropagation();
    removeRefImage();
  });

  $('addCharBtn').addEventListener('click', addCharacterRow);
  $('genSubmitBtn').addEventListener('click', generateVisual);

  onBalanceChange(updateGenQuotaNote);
  updateGenQuotaNote();
}
