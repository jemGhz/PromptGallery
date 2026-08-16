// src/tabs/characterGenerator.js
import {
  FACE_DETAIL_OPTIONS,
  FACE_DETAIL_OPTION_IMAGES,
  AVATAR_STYLE_OPTIONS,
  AVATAR_STYLE_OPTION_IMAGES,
  PERSONALITY_OPTIONS,
  PERSONALITY_OPTION_IMAGES,
  OTHER_DETAIL_OPTIONS,
  OTHER_DETAIL_OPTION_IMAGES,
  SKIN_TONES,
  AVATAR_PROVIDERS,
  CHARACTER_SHEET_PANEL_COUNT,
  CHARACTER_GENERATE_URL
} from '../config.js';
import { escapeHtml, unwrap, getDeviceId, resizeImageToBase64 } from '../utils.js';
import { isLoggedIn, onBalanceChange, setLocalCreditBalance, authHeaders } from '../auth.js';
import { openCreditModal } from '../credits.js';
import { createChipGroup, bindAccordions, updateAccCount } from '../chipGroups.js';
import { appState } from '../state.js';

function $(id) {
  return document.getElementById(id);
}

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
  note.textContent = `Tam sheet (${CHARACTER_SHEET_PANEL_COUNT} panel) ${cost} kredi tutuyor (bakiyeniz: ${appState.currentCreditBalance} kredi).`;
}

function renderAvatarProviderMenu() {
  const menu = $('avatarProviderMenu');
  menu.innerHTML = AVATAR_PROVIDERS.map(
    (p, i) => `
    <button type="button" class="model-option" data-provider-idx="${i}">
      <span class="m-name">${p.icon} ${escapeHtml(p.name)} ${p.badge ? `<span class="model-badge-new">${escapeHtml(p.badge)}</span>` : ''}</span>
      <span class="m-desc">${escapeHtml(p.desc)} · ${p.creditCostPerImage} kredi / panel</span>
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
  $('avatarProviderName').textContent = p.name;
  $('avatarProviderDesc').textContent = `${p.desc} · ${p.creditCostPerImage} kredi / panel`;
  const badgeEl = $('avatarProviderBadge');
  badgeEl.style.display = p.badge ? 'inline-block' : 'none';
  badgeEl.textContent = p.badge;
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
      $('avatarQuotaNote').textContent = 'Referans görsel okunamadı: ' + err.message;
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
    $('avatarQuotaNote').textContent = 'Karakter oluşturmak için önce giriş yapmalısın.';
    openCreditModal();
    return;
  }

  const cost = getCharacterGenerationCost();
  if (appState.currentCreditBalance < cost) {
    $('avatarQuotaNote').textContent = `Yetersiz kredi: bu sheet ${cost} kredi tutuyor, bakiyeniz ${appState.currentCreditBalance} kredi.`;
    openCreditModal();
    return;
  }

  if (!CHARACTER_GENERATE_URL || CHARACTER_GENERATE_URL.includes('YOUR-N8N-URL')) {
    $('avatarQuotaNote').textContent = 'Karakter oluşturma servisi henüz bağlanmadı.';
    return;
  }

  const btn = $('avatarSubmitBtn');
  btn.disabled = true;
  $('avatarQuotaNote').textContent = `Karakter sheet oluşturuluyor (${cost} kredi), bu biraz sürebilir...`;

  const provider = AVATAR_PROVIDERS[avatarSelectedProviderIdx];
  const payload = {
    email: localStorage.getItem('userEmail') || '',
    deviceId: getDeviceId(),
    imageProvider: provider.key,
    creditCostPerImage: provider.creditCostPerImage,
    panelCount: CHARACTER_SHEET_PANEL_COUNT,
    creditCost: cost,
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
      $('avatarQuotaNote').textContent = data.message || 'Kredi bakiyeniz bu işlem için yetersiz.';
      if (typeof data.newBalance === 'number') setLocalCreditBalance(data.newBalance);
      openCreditModal();
      return;
    }

    if (typeof data.newBalance === 'number') setLocalCreditBalance(data.newBalance);
    renderCharacterSheet(data.sheet || {}, payload);
    updateAvatarQuotaNote();
  } catch (err) {
    $('avatarQuotaNote').textContent = 'Hata: ' + err.message;
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
    sheetTitleEl.innerHTML = `${escapeHtml(sheet.name || inputPayload.name || 'Oluşturulan Karakter Sheet')} <span class="new-badge">Yeni</span>`;
  }

  const info = {
    Ad: sheet.name || inputPayload.name || '—',
    Yaş: inputPayload.age || '—',
    Boy: inputPayload.height ? inputPayload.height + ' cm' : '—',
    'Irk / Köken': inputPayload.ethnicity || '—',
    'Saç Rengi': inputPayload.hairColor || '—',
    'Vücut Yapısı': inputPayload.bodyType || '—',
    Tarz: (inputPayload.style || []).join(', ') || '—',
    Kişilik: (inputPayload.personality || []).join(', ') || '—'
  };
  $('sheetInfoGrid').innerHTML = Object.entries(info)
    .map(([k, v]) => `<div class="sheet-info-item"><dt>${escapeHtml(k)}</dt><dd>${escapeHtml(String(v))}</dd></div>`)
    .join('');

  const uses = sheet.suggestedUses || ['Film / Dizi', 'Oyun Karakteri', 'Reklam', 'Sosyal Medya', 'Roman / Kitap', 'Dijital Sanat'];
  $('sheetUses').innerHTML = uses.map((u) => `<span class="chip">${escapeHtml(u)}</span>`).join('');
}

function downloadCharacterSheet() {
  if (!lastCharacterSheet) return;
  const sheet = lastCharacterSheet.sheet;
  if (!sheet.image) return;
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
    navigator.share({ title: 'JG Studio Karakter Sheet', url }).catch(() => {});
  } else if (url) {
    navigator.clipboard.writeText(url);
  }
}

// Not: Profile kaydetme, profil sistemi kurulana kadar devre dışı (buton zaten disabled).
// Profil sistemi hazır olunca burada CHARACTER_SAVE_URL'e POST atan bir fonksiyon eklenecek.

export function initCharacterGenerator() {
  const skinRow = $('avatarSkinRow');
  skinRow.innerHTML = SKIN_TONES.map(
    (hex, i) => `<button type="button" class="swatch ${i === avatarSelectedSkinIdx ? 'active' : ''}" style="background:${hex}" data-skin-idx="${i}" title="Ten tonu ${i + 1}"></button>`
  ).join('');
  skinRow.querySelectorAll('[data-skin-idx]').forEach((btn) => {
    btn.addEventListener('click', () => setAvatarSkin(Number(btn.dataset.skinIdx), btn));
  });

  document.querySelectorAll('#avatarGenderRow .gender-btn').forEach((btn) => {
    btn.addEventListener('click', () => setAvatarGender(btn.dataset.gender, btn));
  });

  faceGroup = createChipGroup($('faceChips'), FACE_DETAIL_OPTIONS, (s) => updateAccCount($('faceAccCount'), s.size), FACE_DETAIL_OPTION_IMAGES);
  avstyleGroup = createChipGroup($('avstyleChips'), AVATAR_STYLE_OPTIONS, (s) => updateAccCount($('avstyleAccCount'), s.size), AVATAR_STYLE_OPTION_IMAGES);
  personalityGroup = createChipGroup($('personalityChips'), PERSONALITY_OPTIONS, (s) => updateAccCount($('personalityAccCount'), s.size), PERSONALITY_OPTION_IMAGES);
  otherdetailGroup = createChipGroup($('otherdetailChips'), OTHER_DETAIL_OPTIONS, () => {}, OTHER_DETAIL_OPTION_IMAGES);
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
}
