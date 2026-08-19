// src/tabs/visualGenerator.js
import {
  AI_MODELS, CAMERA_OPTIONS, CAMERA_OPTION_IMAGES, CAMERA_OPTION_LABEL_KEYS,
  EFFECT_OPTIONS, EFFECT_OPTION_IMAGES, EFFECT_OPTION_LABEL_KEYS,
  POSE_OPTIONS, POSE_OPTION_IMAGES, POSE_OPTION_LABEL_KEYS,
  STYLE_OPTIONS, STYLE_OPTION_IMAGES, STYLE_OPTION_LABEL_KEYS,
  GEN_GENERATE_URL
} from '../config.js';
import { escapeAttr, escapeHtml, unwrap, getDeviceId, resizeImageToBase64 } from '../utils.js';
import { isLoggedIn, onBalanceChange, setLocalCreditBalance, authHeaders } from '../auth.js';
import { openCreditModal } from '../credits.js';
import { createChipGroup, bindAccordions, updateAccCount } from '../chipGroups.js';
import { appState } from '../state.js';
import { switchTab } from '../tabState.js';
import { openLightbox } from '../visualDetail.js';
import { t } from '../i18n.js';

function $(id) {
  return document.getElementById(id);
}

// labelFor yardımcıları — chip'in sistem key'i (TR, sabit) değişmiyor, sadece görünen
// metin t() üzerinden okunuyor. Key eşleşmesi yoksa (ör. config.js'e yeni bir seçenek
// eklenip LABEL_KEYS güncellenmemişse) opt'un kendisi gösterilir — sessizce kaybolmaz.
const cameraLabel = (opt) => t(CAMERA_OPTION_LABEL_KEYS[opt] || opt);
const effectsLabel = (opt) => t(EFFECT_OPTION_LABEL_KEYS[opt] || opt);
const posesLabel = (opt) => t(POSE_OPTION_LABEL_KEYS[opt] || opt);
const styleLabel = (opt) => t(STYLE_OPTION_LABEL_KEYS[opt] || opt);

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
  note.textContent = t('visual.quota_cost_note', { cost, balance: appState.currentCreditBalance });
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

function creditPerImageSuffix(cost) {
  return `${cost} ${t('visual.credit_per_image_suffix')}`;
}

function renderModelMenu() {
  const menu = $('genModelMenu');
  menu.innerHTML = AI_MODELS.map(
    (m, i) => `
    <button type="button" class="model-option" data-model-idx="${i}" ${m.comingSoon ? 'disabled style="opacity:.4;pointer-events:none;"' : ''}>
      <span class="m-name">${m.icon} ${escapeHtml(m.name)} ${m.badge ? `<span class="model-badge-new">${escapeHtml(m.badge)}</span>` : ''}</span>
      <span class="m-desc">${escapeHtml(m.desc)} · ${escapeHtml(creditPerImageSuffix(m.creditCost))}</span>
    </button>`
  ).join('');
  menu.querySelectorAll('[data-model-idx]').forEach((btn) => {
    if (btn.disabled) return;
    btn.addEventListener('click', () => selectModel(Number(btn.dataset.modelIdx)));
  });
  selectModel(genSelectedModelIdx, true);
}
function applyGenCountRestriction(isFreeDraft) {
  const counts = [1, 2, 4, 8];
  const buttons = document.querySelectorAll('#genCountRow .count-btn');
  buttons.forEach((btn, idx) => {
    const locked = isFreeDraft && counts[idx] !== 1;
    btn.disabled = locked;
    btn.style.opacity = locked ? '.4' : '';
    btn.style.pointerEvents = locked ? 'none' : '';
  });
  if (isFreeDraft && genSelectedCount !== 1) {
    setGenCount(1, buttons[0]);
  }
}

function selectModel(i, silent) {
  genSelectedModelIdx = i;
  const m = AI_MODELS[i];
  $('genModelIcon').textContent = m.icon;
  $('genModelName').textContent = m.name;
  $('genModelDesc').textContent = `${m.desc} · ${creditPerImageSuffix(m.creditCost)}`;
  const badgeEl = $('genModelBadge');
  badgeEl.style.display = m.badge ? 'inline-block' : 'none';
  if (!silent) $('genModelMenu').classList.remove('open');
  applyGenCountRestriction(m.key === 'free_draft');
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

// 5 örnek prompt fikri — içerik olduğu için (UI etiketi değil) ayrı key'lerle çevrilir.
const PROMPT_IDEA_KEYS = [
  'visual.suggest_idea_1',
  'visual.suggest_idea_2',
  'visual.suggest_idea_3',
  'visual.suggest_idea_4',
  'visual.suggest_idea_5'
];

function suggestGenPrompt() {
  const key = PROMPT_IDEA_KEYS[Math.floor(Math.random() * PROMPT_IDEA_KEYS.length)];
  $('genPromptInput').value = t(key);
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
      $('refModeSection').style.display = 'block';
    })
    .catch((err) => {
      $('genQuotaNote').textContent = t('visual.ref_read_error', { msg: err.message });
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
  $('refModeSection').style.display = 'none';
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
      $('genQuotaNote').textContent = t('visual.char_read_error', { msg: err.message });
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
        <input type="text" placeholder="${escapeAttr(t('visual.char_name_placeholder', { n: idx + 1 }))}" value="${escapeAttr(c.name)}" data-char-name="${c.id}">
      </div>
      <button type="button" class="char-remove" data-char-remove="${c.id}" title="${escapeAttr(t('visual.char_remove_title'))}">✕</button>
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
  grid.style.display = '';
  grid.classList.toggle('single', n === 1);
  grid.innerHTML = Array.from({ length: n })
    .map(
      () => `<div class="gen-tile loading">
      <div class="gen-loading-text">${escapeHtml(t('visual.generating_label'))}</div>
      <div class="gen-progress-bar"><div class="gen-progress-bar-fill"></div></div>
    </div>`
    )
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
const GEN_ASPECT_RATIOS = {
  '1:1': '1/1',
  '3:4': '3/4',
  '4:3': '4/3',
  '9:16': '9/16',
  '16:9': '16/9'
};

function renderGenResults(images, prompt) {
  if (!images || !images.length) {
    showGenEmptyState();
    return;
  }
  const aspectRatio = GEN_ASPECT_RATIOS[genSelectedSize] || '1/1';
  const grid = $('genResultsGrid');
  grid.style.display = '';
  grid.classList.toggle('single', images.length === 1);
  grid.innerHTML = images
    .map(
      (url, i) => `
    <div class="gen-tile" style="aspect-ratio:${aspectRatio}" data-lightbox-url="${escapeAttr(url)}">
      <img src="${escapeAttr(url)}" alt="${escapeAttr(t('visual.result_alt', { n: i + 1 }))}" loading="lazy">
      <div class="gen-tile-hover-overlay">
        <svg viewBox="0 0 24 24"><path d="M9 3H5a2 2 0 0 0-2 2v4M15 3h4a2 2 0 0 1 2 2v4M9 21H5a2 2 0 0 1-2-2v-4M15 21h4a2 2 0 0 0 2-2v-4"/></svg>
      </div>
      <div class="gen-tile-actions">
        <button class="icon-btn" data-download-url="${escapeAttr(url)}" data-download-idx="${i}" title="${escapeAttr(t('visual.tile_download_title'))}">⬇</button>
      </div>
    </div>`
    )
    .join('');
  const imageList = images.map((url) => ({
    url,
    id: null,
    prompt_text: prompt,
    provider: AI_MODELS[genSelectedModelIdx].key,
    aspect_ratio: genSelectedSize,
    created_at: new Date().toISOString()
  }));
  grid.querySelectorAll('[data-lightbox-url]').forEach((tile, i) => {
    tile.addEventListener('click', () => openLightbox(imageList, i));
  });
  grid.querySelectorAll('[data-download-url]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      downloadGenImage(btn.dataset.downloadUrl, Number(btn.dataset.downloadIdx));
    });
  });
  $('genResultCount').textContent = images.length;
}

function downloadGenImage(url, idx) {
  // NOT: indirilen dosya adı bilinçli olarak çevrilmedi (sistem/dosya adı,
  // kullanıcıya UI metni olarak gösterilmiyor). İstersen bunu da t()'a bağlarım.
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
    $('genQuotaNote').textContent = t('visual.login_required');
    openCreditModal();
    return;
  }

  const cost = getVisualGenerationCost();
  if (appState.currentCreditBalance < cost) {
    $('genQuotaNote').textContent = t('visual.insufficient_credit', { cost, balance: appState.currentCreditBalance });
    openCreditModal();
    return;
  }

  if (!GEN_GENERATE_URL || GEN_GENERATE_URL.includes('YOUR-N8N-URL')) {
    $('genQuotaNote').textContent = t('visual.service_not_connected');
    return;
  }

  const btn = $('genSubmitBtn');
  btn.disabled = true;
  $('genQuotaNote').textContent = t('visual.generating_progress', { cost });
  showGenLoadingTiles(genSelectedCount);

  try {
    const payload = {
      email: localStorage.getItem('userEmail') || '',
      deviceId: getDeviceId(),
      prompt,
      size: genSelectedSize,
      count: genSelectedCount,
      model: AI_MODELS[genSelectedModelIdx].key,
      creditCostPerImage: AI_MODELS[genSelectedModelIdx].creditCost,
      creditCost: cost,
      // NOT: buraya giden değerler chip'lerin sistem key'leri (TR, sabit) —
      // dil değişse bile n8n'e her zaman aynı Türkçe key gider.
      camera: [...cameraGroup.selected],
      effects: [...effectsGroup.selected],
      poses: [...posesGroup.selected],
      styles: [...styleGroup.selected],
      referenceImage: refImageBase64 ? { base64: refImageBase64, mimeType: refImageMime } : null,
      referenceMode: document.querySelector('input[name="refMode"]:checked')?.value || 'product',
      characters: characters.map((c) => ({ name: c.name, base64: c.base64, mimeType: c.mime }))
    };
    const res = await fetch(GEN_GENERATE_URL, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(payload)
    });
    const raw = await res.json();
    const data = unwrap(Array.isArray(raw) ? raw[0] : raw) || {};

    if (!data.allowed) {
      $('genQuotaNote').textContent = data.message || t('visual.insufficient_balance_generic');
      showGenEmptyState();
      if (typeof data.newBalance === 'number') setLocalCreditBalance(data.newBalance);
      if (data.reason === 'insufficient_credit') openCreditModal();
      return;
    }

    if (typeof data.newBalance === 'number') setLocalCreditBalance(data.newBalance);
    renderGenResults(data.images || [], prompt);
    updateGenQuotaNote();
  } catch (err) {
    $('genQuotaNote').textContent = t('visual.generic_error', { msg: err.message });
    showGenEmptyState();
  } finally {
    btn.disabled = false;
  }
}

export function initVisualGenerator() {
  cameraGroup = createChipGroup($('cameraChips'), CAMERA_OPTIONS, (s) => updateAccCount($('cameraAccCount'), s.size), CAMERA_OPTION_IMAGES, cameraLabel);
  effectsGroup = createChipGroup($('effectsChips'), EFFECT_OPTIONS, (s) => updateAccCount($('effectsAccCount'), s.size), EFFECT_OPTION_IMAGES, effectsLabel);
  posesGroup = createChipGroup($('posesChips'), POSE_OPTIONS, (s) => updateAccCount($('posesAccCount'), s.size), POSE_OPTION_IMAGES, posesLabel);
  styleGroup = createChipGroup($('styleChips'), STYLE_OPTIONS, (s) => updateAccCount($('styleAccCount'), s.size), STYLE_OPTION_IMAGES, styleLabel);
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

  document.getElementById('genUpgradeBtn')?.addEventListener('click', openCreditModal);

  onBalanceChange(updateGenQuotaNote);
  updateGenQuotaNote();

  // Dil değişince: chip grupları kendi içinde otomatik yeniden render oluyor
  // (chipGroups.js — labelFor verilince langchange'i kendisi dinliyor).
  // Burada sadece bu dosyanın kendi ürettiği dinamik metinleri tazeliyoruz.
  window.addEventListener('langchange', () => {
    renderModelMenu();
    renderCharList();
    updateGenQuotaNote();
  });
}