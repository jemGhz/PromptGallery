// src/tabs/characterGenerator.js
import {
  FACE_DETAIL_OPTIONS,
  FACE_DETAIL_OPTION_IMAGES,
  FACE_DETAIL_OPTION_LABEL_KEYS,
  AVATAR_STYLE_OPTIONS,
  AVATAR_STYLE_OPTION_IMAGES,
  AVATAR_STYLE_OPTION_LABEL_KEYS,
  PERSONALITY_OPTIONS,
  PERSONALITY_OPTION_IMAGES,
  PERSONALITY_OPTION_LABEL_KEYS,
  OTHER_DETAIL_OPTIONS,
  OTHER_DETAIL_OPTION_IMAGES,
  OTHER_DETAIL_OPTION_LABEL_KEYS,
  SKIN_TONES,
  AVATAR_PROVIDERS,
  AVATAR_PROVIDER_LABEL_KEYS,
  CHARACTER_SHEET_PANEL_COUNT,
  CHARACTER_GENERATE_URL
} from '../config.js';
import { escapeHtml, unwrap, getDeviceId, resizeImageToBase64 } from '../utils.js';
import { isLoggedIn, onBalanceChange, setLocalCreditBalance, authHeaders } from '../auth.js';
import { openCreditModal } from '../credits.js';
import { createChipGroup, bindAccordions, updateAccCount } from '../chipGroups.js';
import { appState } from '../state.js';
import { t } from '../i18n.js';

function $(id) {
  return document.getElementById(id);
}

// labelFor yardımcıları — chip'in sistem key'i (TR, sabit) değişmiyor, sadece görünen
// metin t() üzerinden okunuyor. visualGenerator.js'teki desenin aynısı.
const faceLabel = (opt) => t(FACE_DETAIL_OPTION_LABEL_KEYS[opt] || opt);
const avstyleLabel = (opt) => t(AVATAR_STYLE_OPTION_LABEL_KEYS[opt] || opt);
const personalityLabel = (opt) => t(PERSONALITY_OPTION_LABEL_KEYS[opt] || opt);
const otherdetailLabel = (opt) => t(OTHER_DETAIL_OPTION_LABEL_KEYS[opt] || opt);

let avatarSelectedProviderIdx = 0;
let avatarGender = 'Kadın';
let avatarSelectedSkinIdx = 0;
let avatarRefImageBase64 = null,
  avatarRefImageMime = null;
let lastCharacterSheet = null;

let faceGroup, avstyleGroup, personalityGroup, otherdetailGroup;

function getCharacterGenerationCost() {
  return AVATAR_PROVIDERS[avatarSelectedProviderIdx].creditCostPerImage * CHARACTER_SHEET_PANEL_COUNT;
}
function updateAvatarQuotaNote() {
  const note = $('avatarQuotaNote');
  if (!note) return;
  const cost = getCharacterGenerationCost();
  note.textContent = t('character.quota_note', {
    panels: CHARACTER_SHEET_PANEL_COUNT,
    cost,
    balance: appState.currentCreditBalance
  });
}

// provider.key üzerinden çeviri key'i bulur; eşleşme yoksa provider'ın kendi
// (TR) alanına düşer — config.js'e yeni provider eklenip LABEL_KEYS güncellenmezse
// sessizce kaybolmaz.
function providerName(p) {
  const keys = AVATAR_PROVIDER_LABEL_KEYS[p.key];
  return keys ? t(keys.name) : p.name;
}
function providerDesc(p) {
  const keys = AVATAR_PROVIDER_LABEL_KEYS[p.key];
  return keys ? t(keys.desc) : p.desc;
}
function providerBadge(p) {
  const keys = AVATAR_PROVIDER_LABEL_KEYS[p.key];
  return keys ? t(keys.badge) : p.badge;
}
function creditPerPanelSuffix(cost) {
  return `${cost} ${t('character.credit_per_panel_suffix')}`;
}

function renderAvatarProviderMenu() {
  const menu = $('avatarProviderMenu');
  menu.innerHTML = AVATAR_PROVIDERS.map(
    (p, i) => `
    <button type="button" class="model-option" data-provider-idx="${i}">
      <span class="m-name">${p.icon} ${escapeHtml(providerName(p))} ${providerBadge(p) ? `<span class="model-badge-new">${escapeHtml(providerBadge(p))}</span>` : ''}</span>
      <span class="m-desc">${escapeHtml(providerDesc(p))} · ${escapeHtml(creditPerPanelSuffix(p.creditCostPerImage))}</span>
    </button>`
  ).join('');
  menu.querySelectorAll('[data-provider-idx]').forEach((btn) => {
    btn.addEventListener('click', () => selectAvatarProvider(Number(btn.dataset.providerIdx)));
  });
  selectAvatarProvider(avatarSelectedProviderIdx, true);
}
function selectAvatarProvider(i, silent) {
  avatarSelectedProviderIdx = i;
  const p = AVATAR_PROVIDERS[i];
  $('avatarProviderIcon').textContent = p.icon;
  $('avatarProviderName').textContent = providerName(p);
  $('avatarProviderDesc').textContent = `${providerDesc(p)} · ${creditPerPanelSuffix(p.creditCostPerImage)}`;
  const badgeEl = $('avatarProviderBadge');
  const badge = providerBadge(p);
  badgeEl.style.display = badge ? 'inline-block' : 'none';
  badgeEl.textContent = badge;
  if (!silent) $('avatarProviderMenu').classList.remove('open');
  updateAvatarQuotaNote();
}

function setAvatarGender(g, btn) {
  avatarGender = g;
  document.querySelectorAll('#avatarGenderRow .gender-btn').forEach((b) => b.classList.remove('active'));
  btn.classList.add('active');
}
function setAvatarSkin(i, btn) {
  avatarSelectedSkinIdx = i;
  document.querySelectorAll('#avatarSkinRow .swatch').forEach((b) => b.classList.remove('active'));
  btn.classList.add('active');
}

function handleAvatarRefFile(file) {
  if (!file) return;
  resizeImageToBase64(file, 1400)
    .then(({ base64, mimeType, dataUrl }) => {
      avatarRefImageBase64 = base64;
      avatarRefImageMime = mimeType;
      const img = $('avatarRefPreviewImg');
      img.src = dataUrl;
      img.style.display = 'block';
      $('avatarRefPlaceholder').style.display = 'none';
      $('avatarRefUploadBox').classList.add('has-img');
      $('avatarRefRemoveBtn').style.display = 'flex';
    })
    .catch((err) => {
      $('avatarQuotaNote').textContent = t('character.ref_read_error', { msg: err.message });
    });
}
function removeAvatarRefImage() {
  avatarRefImageBase64 = null;
  avatarRefImageMime = null;
  const img = $('avatarRefPreviewImg');
  img.style.display = 'none';
  img.src = '';
  $('avatarRefPlaceholder').style.display = 'block';
  $('avatarRefUploadBox').classList.remove('has-img');
  $('avatarRefRemoveBtn').style.display = 'none';
  $('avatarRefFileInput').value = '';
}

async function generateCharacter() {
  if (!isLoggedIn()) {
    $('avatarQuotaNote').textContent = t('character.login_required');
    openCreditModal();
    return;
  }

  const cost = getCharacterGenerationCost();
  if (appState.currentCreditBalance < cost) {
    $('avatarQuotaNote').textContent = t('character.insufficient_credit', { cost, balance: appState.currentCreditBalance });
    openCreditModal();
    return;
  }

  if (!CHARACTER_GENERATE_URL || CHARACTER_GENERATE_URL.includes('YOUR-N8N-URL')) {
    $('avatarQuotaNote').textContent = t('character.service_not_connected');
    return;
  }

  const btn = $('avatarSubmitBtn');
  btn.disabled = true;
  $('avatarQuotaNote').textContent = t('character.generating_progress', { cost });

  $('avatarEmptyState').style.display = 'none';
  $('avatarSheetResult').style.display = 'none';
  let loadingEl = $('avatarLoadingState');
  if (!loadingEl) {
    loadingEl = document.createElement('div');
    loadingEl.id = 'avatarLoadingState';
    loadingEl.className = 'avatar-loading-state';
    $('avatarCanvas').appendChild(loadingEl);
  }
  // İçerik her seferinde yeniden yazılıyor ki dil değişince (langchange) elimizdeki
  // loading ekranı da güncel kalsın (nadiren üretim sürerken dil değiştirilirse).
  loadingEl.innerHTML = `
    <div class="gen-loading-icon">🧬</div>
    <div class="gen-loading-text">${escapeHtml(t('character.loading_text'))}</div>
    <div class="gen-loading-subtext">${escapeHtml(t('character.loading_subtext'))}</div>
    <div class="gen-progress-bar" style="width:220px; margin-top:16px;"><div class="gen-progress-bar-fill"></div></div>
  `;
  loadingEl.style.display = 'flex';

  const provider = AVATAR_PROVIDERS[avatarSelectedProviderIdx];
  const payload = {
    email: localStorage.getItem('userEmail') || '',
    deviceId: getDeviceId(),
    imageProvider: provider.key,
    creditCostPerImage: provider.creditCostPerImage,
    panelCount: CHARACTER_SHEET_PANEL_COUNT,
    creditCost: cost,
    // NOT: aşağıdaki alanlar (gender, ethnicity, hairColor, hairType, eyeColor,
    // bodyType) index.html'deki <select>/<button> elementlerinin sistem
    // değerleridir (TR, sabit) — dil değişse de bu değerler değişmemeli.
    // BU GÜVENCE index.html'deki <option> etiketlerine sabit `value` eklenmesine
    // bağlıdır (ayrı bir düzeltme gerektirir); bu dosya kendi tarafını doğru yapıyor.
    gender: avatarGender,
    name: $('avatarNameInput').value.trim(),
    age: $('avatarAgeInput').value,
    height: $('avatarHeightInput').value,
    ethnicity: $('avatarEthnicitySelect').value,
    skinTone: SKIN_TONES[avatarSelectedSkinIdx],
    hairColor: $('avatarHairColorSelect').value,
    hairType: $('avatarHairTypeSelect').value,
    eyeColor: $('avatarEyeColorSelect').value,
    bodyType: $('avatarBodyTypeSelect').value,
    faceDetails: [...faceGroup.selected],
    style: [...avstyleGroup.selected],
    personality: [...personalityGroup.selected],
    otherDetails: [...otherdetailGroup.selected],
    extraNotes: $('avatarExtraNotes').value.trim(),
    referenceImage: avatarRefImageBase64 ? { base64: avatarRefImageBase64, mimeType: avatarRefImageMime } : null
  };

  try {
    const res = await fetch(CHARACTER_GENERATE_URL, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(payload)
    });
    const raw = await res.json();
    const data = unwrap(Array.isArray(raw) ? raw[0] : raw) || {};

    if (!data.allowed) {
      $('avatarQuotaNote').textContent = data.message || t('character.insufficient_balance_generic');
      if (typeof data.newBalance === 'number') setLocalCreditBalance(data.newBalance);
      openCreditModal();
      return;
    }

    if (typeof data.newBalance === 'number') setLocalCreditBalance(data.newBalance);
    const loadEl = $('avatarLoadingState');
    if (loadEl) loadEl.style.display = 'none';
    renderCharacterSheet(data.sheet || {}, payload);
    updateAvatarQuotaNote();
  } catch (err) {
    const loadEl = $('avatarLoadingState');
    if (loadEl) loadEl.style.display = 'none';
    $('avatarEmptyState').style.display = 'block';
    $('avatarQuotaNote').textContent = t('character.generic_error', { msg: err.message });
  } finally {
    btn.disabled = false;
  }
}

function renderCharacterSheet(sheet, inputPayload) {
  lastCharacterSheet = { sheet, input: inputPayload };

  $('avatarEmptyState').style.display = 'none';
  const result = $('avatarSheetResult');
  result.style.display = 'block';

  $('sheetPortraitImg').src = sheet.image || '';
  const sheetTitleEl = $('sheetTitle');
  if (sheetTitleEl) {
    sheetTitleEl.innerHTML = `${escapeHtml(sheet.name || inputPayload.name || t('character.default_sheet_title'))} <span class="new-badge">${escapeHtml(t('character.new_badge'))}</span>`;
  }

  const dash = t('onboarding.empty');
  const info = [
    [t('character.info.name'), sheet.name || inputPayload.name || dash],
    [t('character.info.age'), inputPayload.age || dash],
    [t('character.info.height'), inputPayload.height ? inputPayload.height + ' cm' : dash],
    [t('character.info.ethnicity'), inputPayload.ethnicity || dash],
    [t('character.info.hair_color'), inputPayload.hairColor || dash],
    [t('character.info.body_type'), inputPayload.bodyType || dash],
    [t('character.info.style'), (inputPayload.style || []).join(', ') || dash],
    [t('character.info.personality'), (inputPayload.personality || []).join(', ') || dash]
  ];
  $('sheetInfoGrid').innerHTML = info
    .map(([k, v]) => `<div class="sheet-info-item"><dt>${escapeHtml(k)}</dt><dd>${escapeHtml(String(v))}</dd></div>`)
    .join('');

  const defaultUses = [
    t('character.uses.film_series'),
    t('character.uses.game_character'),
    t('character.uses.ad'),
    t('character.uses.social'),
    t('character.uses.novel'),
    t('character.uses.digital_art')
  ];
  const uses = sheet.suggestedUses || defaultUses;
  $('sheetUses').innerHTML = uses.map((u) => `<span class="chip">${escapeHtml(u)}</span>`).join('');
}

function downloadCharacterSheet() {
  if (!lastCharacterSheet) return;
  const sheet = lastCharacterSheet.sheet;
  if (!sheet.image) return;
  // NOT: indirilen dosya adı bilinçli olarak çevrilmedi (dosya adı, UI metni değil).
  const a = document.createElement('a');
  a.href = sheet.image;
  a.download = 'karakter-' + (sheet.name || 'sheet').replace(/[^a-z0-9-]+/gi, '_') + '.png';
  a.target = '_blank';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}
function shareCharacterSheet() {
  if (!lastCharacterSheet) return;
  const url = lastCharacterSheet.sheet.image || '';
  if (navigator.share) {
    navigator.share({ title: 'Vero Scena Karakter Sheet', url }).catch(() => { });
  } else if (url) {
    navigator.clipboard.writeText(url);
  }
}

// Not: Profile kaydetme, profil sistemi kurulana kadar devre dışı (buton zaten disabled).
// Profil sistemi hazır olunca burada CHARACTER_SAVE_URL'e POST atan bir fonksiyon eklenecek.

function renderSkinRow() {
  const skinRow = $('avatarSkinRow');
  skinRow.innerHTML = SKIN_TONES.map(
    (hex, i) => `<button type="button" class="swatch ${i === avatarSelectedSkinIdx ? 'active' : ''}" style="background:${hex}" data-skin-idx="${i}" title="${escapeHtml(t('character.skin_tone_title', { n: i + 1 }))}"></button>`
  ).join('');
  skinRow.querySelectorAll('[data-skin-idx]').forEach((btn) => {
    btn.addEventListener('click', () => setAvatarSkin(Number(btn.dataset.skinIdx), btn));
  });
}

export function initCharacterGenerator() {
  renderSkinRow();

  document.querySelectorAll('#avatarGenderRow .gender-btn').forEach((btn) => {
    btn.addEventListener('click', () => setAvatarGender(btn.dataset.gender, btn));
  });

  faceGroup = createChipGroup($('faceChips'), FACE_DETAIL_OPTIONS, (s) => updateAccCount($('faceAccCount'), s.size), FACE_DETAIL_OPTION_IMAGES, faceLabel);
  avstyleGroup = createChipGroup($('avstyleChips'), AVATAR_STYLE_OPTIONS, (s) => updateAccCount($('avstyleAccCount'), s.size), AVATAR_STYLE_OPTION_IMAGES, avstyleLabel);
  personalityGroup = createChipGroup($('personalityChips'), PERSONALITY_OPTIONS, (s) => updateAccCount($('personalityAccCount'), s.size), PERSONALITY_OPTION_IMAGES, personalityLabel);
  otherdetailGroup = createChipGroup($('otherdetailChips'), OTHER_DETAIL_OPTIONS, () => { }, OTHER_DETAIL_OPTION_IMAGES, otherdetailLabel);
  bindAccordions(document.getElementById('avatarView'));

  renderAvatarProviderMenu();
  $('avatarProviderMenu').previousElementSibling.addEventListener('click', () => $('avatarProviderMenu').classList.toggle('open'));
  document.addEventListener('click', (e) => {
    const wrap = $('avatarProviderWrap');
    if (wrap && !wrap.contains(e.target)) $('avatarProviderMenu').classList.remove('open');
  });

  $('avatarRefUploadBox').addEventListener('click', () => $('avatarRefFileInput').click());
  $('avatarRefFileInput').addEventListener('change', (e) => handleAvatarRefFile(e.target.files[0]));
  $('avatarRefRemoveBtn').addEventListener('click', (e) => {
    e.stopPropagation();
    removeAvatarRefImage();
  });

  $('avatarSubmitBtn').addEventListener('click', generateCharacter);
  $('downloadSheetBtn').addEventListener('click', downloadCharacterSheet);
  $('shareSheetBtn').addEventListener('click', shareCharacterSheet);

  onBalanceChange(updateAvatarQuotaNote);
  updateAvatarQuotaNote();

  // Dil değişince: chip grupları kendi içinde otomatik yeniden render oluyor
  // (chipGroups.js — labelFor verilince langchange'i kendisi dinliyor).
  // Burada bu dosyanın kendi ürettiği dinamik metinleri tazeliyoruz. Sonuç ekranı
  // (renderCharacterSheet) bilinçli olarak yeniden çizilmiyor — zaten üretilmiş bir
  // sonucun etiketlerini geriye dönük çevirmek input değerlerini karıştırabilir
  // (sheet bir kez üretildiğinde o anki dile "kilitli" kalır).
  window.addEventListener('langchange', () => {
    renderAvatarProviderMenu();
    renderSkinRow();
    updateAvatarQuotaNote();
  });
}