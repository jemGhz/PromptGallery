// src/visualDetail.js
// Görsel modalının tam ekran, iki sütunlu detay ekranı. visualGenerator.js VE profile.js
// buradan openLightbox() çağırıyor; döngüsel import oluşmasın diye bu modül o iki dosyayı
// geri import etmiyor (tabState.js'teki "nötr aracı modül" deseniyle aynı sebep).
import { escapeHtml, escapeAttr, unwrap } from './utils.js';
import { isLoggedIn, authHeaders, getInitial } from './auth.js';
import { switchTab } from './tabState.js';
import { GENERATED_VISUALS_URL, GENERATED_VISUAL_DELETE_URL } from './config.js';

function $(id) {
  return document.getElementById(id);
}

const PROVIDER_LABELS = {
  gemini_paid: 'Gemini (Nano Banana)',
  free_draft: 'Cloudflare Flux Schnell'
};
function providerLabel(provider) {
  return PROVIDER_LABELS[provider] || provider || '—';
}

const SIZE_PIXELS = {
  '1:1': '1024 × 1024',
  '3:4': '900 × 1200',
  '4:3': '1200 × 900',
  '9:16': '720 × 1280',
  '16:9': '1280 × 720'
};
function sizeLabel(aspectRatio) {
  if (!aspectRatio) return '—';
  const px = SIZE_PIXELS[aspectRatio];
  return px ? `${aspectRatio} (${px})` : aspectRatio;
}

function formatDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleString('tr-TR', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function getUserInfo() {
  let name = '', email = '', picture = '', username = '';
  try {
    name = localStorage.getItem('userName') || '';
    email = localStorage.getItem('userEmail') || '';
    picture = localStorage.getItem('userPicture') || '';
    username = localStorage.getItem('userUsername') || '';
  } catch (e) {}
  return { name, email, picture, username };
}

const ICONS = {
  download: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>',
  share: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>',
  heart: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>',
  trash: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>',
  globe: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>',
  copy: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>',
  wand: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21.64 3.64-1.28-1.28a1.21 1.21 0 0 0-1.72 0L2.36 18.64a1.21 1.21 0 0 0 0 1.72l1.28 1.28a1.2 1.2 0 0 0 1.72 0L21.64 5.36a1.2 1.2 0 0 0 0-1.72Z"/><path d="m14 7 3 3"/><path d="M5 6v4"/><path d="M19 14v4"/><path d="M10 2v2"/><path d="M7 8H3"/><path d="M21 16h-4"/><path d="M11 3H9"/></svg>',
  search: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>',
  x: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>',
  chevronLeft: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>',
  chevronRight: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>',
  chevronRightSm: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>'
};

let detailReady = false;
let currentList = [];
let currentIdx = 0;
let suppressUrlSync = false;

function ensureDetailScreen() {
  if (detailReady) return;
  detailReady = true;

  const overlay = document.createElement('div');
  overlay.id = 'visualDetailOverlay';
  overlay.className = 'visual-detail-overlay';
  overlay.innerHTML = `
    <button type="button" class="vd-close-btn" id="vdCloseBtn" title="Kapat">${ICONS.x}</button>
    <div class="vd-layout">
      <div class="vd-left">
        <div class="vd-img-wrap">
          <img id="vdImg" class="vd-img" alt="oluşturulan görsel">
          <button type="button" class="vd-nav-prev" id="vdPrev" title="Önceki görsel">${ICONS.chevronLeft}</button>
          <button type="button" class="vd-nav-next" id="vdNext" title="Sonraki görsel">${ICONS.chevronRight}</button>
        </div>
        <div class="vd-thumb-row" id="vdThumbRow">
          <button type="button" class="vd-thumb-scroll vd-thumb-scroll-left" id="vdThumbLeft">${ICONS.chevronRightSm.replace('points="9 18 15 12 9 6"', 'points="15 18 9 12 15 6"')}</button>
          <div class="vd-thumb-track" id="vdThumbTrack"></div>
          <button type="button" class="vd-thumb-scroll vd-thumb-scroll-right" id="vdThumbRight">${ICONS.chevronRightSm}</button>
        </div>
      </div>
      <div class="vd-right">
        <div class="vd-card vd-user-card">
          <div class="vd-avatar" id="vdAvatar"></div>
          <div class="vd-user-info">
            <div class="vd-user-name" id="vdUserName"></div>
            <div class="vd-user-meta" id="vdUserMeta"></div>
          </div>
        </div>
        <div class="vd-card vd-prompt-card">
          <div class="vd-card-header">
            <span>Prompt</span>
            <button type="button" class="btn" id="vdCopyPromptBtn">${ICONS.copy}<span id="vdCopyPromptLabel">Kopyala</span></button>
          </div>
          <div class="vd-prompt-text" id="vdPromptText"></div>
        </div>
        <div class="vd-card vd-details-card">
          <div class="vd-detail-row"><span>Oluşturulma Tarihi</span><span id="vdDate"></span></div>
          <div class="vd-detail-row"><span>Model</span><span id="vdModel"></span></div>
          <div class="vd-detail-row"><span>Boyut</span><span id="vdSize"></span></div>
          <div class="vd-detail-row"><span>Üretim ID</span><span id="vdGenId"></span></div>
        </div>
        <div class="vd-card vd-tools-card">
          <button type="button" class="vd-tool-btn" id="vdUsePromptBtn">
            <span class="vd-tool-left">${ICONS.wand}<span>Bu Prompt ile Oluştur</span></span>
            <span class="vd-tool-chevron">${ICONS.chevronRightSm}</span>
          </button>
          <button type="button" class="vd-tool-btn" disabled title="Yakında">
            <span class="vd-tool-left">${ICONS.search}<span>Benzer Görseller Bul</span></span>
            <span class="vd-tool-chevron">${ICONS.chevronRightSm}</span>
          </button>
        </div>
      </div>
    </div>
    <div class="vd-action-bar">
      <div class="vd-action-buttons">
        <button type="button" class="btn primary" id="vdDownloadBtn">${ICONS.download}<span>İndir</span></button>
        <button type="button" class="btn" id="vdShareBtn">${ICONS.share}<span>Paylaş</span></button>
        <button type="button" class="btn" disabled title="Yakında">${ICONS.heart}<span>Beğen</span></button>
        <button type="button" class="btn" id="vdDeleteBtn" disabled>${ICONS.trash}<span>Sil</span></button>
        <button type="button" class="btn" disabled title="Yakında">${ICONS.globe}<span>Feed'e Ekle</span></button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  $('vdCloseBtn').addEventListener('click', closeDetailScreen);
  $('vdPrev').addEventListener('click', (e) => { e.stopPropagation(); goPrev(); });
  $('vdNext').addEventListener('click', (e) => { e.stopPropagation(); goNext(); });
  $('vdThumbLeft').addEventListener('click', () => $('vdThumbTrack').scrollBy({ left: -160, behavior: 'smooth' }));
  $('vdThumbRight').addEventListener('click', () => $('vdThumbTrack').scrollBy({ left: 160, behavior: 'smooth' }));
  $('vdThumbTrack').addEventListener('click', (e) => {
    const btn = e.target.closest('[data-thumb-idx]');
    if (!btn) return;
    goToIdx(Number(btn.dataset.thumbIdx));
  });
  $('vdCopyPromptBtn').addEventListener('click', () => {
    const item = currentList[currentIdx];
    if (!item || !item.prompt_text) return;
    navigator.clipboard.writeText(item.prompt_text).then(() => {
      const btn = $('vdCopyPromptBtn');
      const label = $('vdCopyPromptLabel');
      label.textContent = 'Kopyalandı ✓';
      btn.classList.add('copied');
      setTimeout(() => {
        label.textContent = 'Kopyala';
        btn.classList.remove('copied');
      }, 1400);
    });
  });
  $('vdUsePromptBtn').addEventListener('click', () => {
    const item = currentList[currentIdx];
    if (!item) return;
    closeDetailScreen();
    switchTab('visual');
    const input = document.getElementById('genPromptInput');
    if (input) {
      input.value = item.prompt_text || '';
      input.dispatchEvent(new Event('input'));
    }
  });
  $('vdDownloadBtn').addEventListener('click', () => {
    const item = currentList[currentIdx];
    if (!item) return;
    const a = document.createElement('a');
    a.href = item.url;
    a.download = 'jg-studio-gorsel-' + (currentIdx + 1) + '.png';
    a.target = '_blank';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  });
  $('vdShareBtn').addEventListener('click', () => {
    const item = currentList[currentIdx];
    if (item) shareImage(item.url);
  });
  $('vdDeleteBtn').addEventListener('click', () => {
    const item = currentList[currentIdx];
    if (item && item.id) deleteImage(item.id);
  });

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeDetailScreen();
  });
  document.addEventListener('keydown', (e) => {
    if (!overlay.classList.contains('open')) return;
    if (e.key === 'Escape') closeDetailScreen();
    else if (e.key === 'ArrowLeft') goPrev();
    else if (e.key === 'ArrowRight') goNext();
  });
  window.addEventListener('popstate', () => {
    const visualId = new URLSearchParams(location.search).get('visual');
    if (!visualId) {
      if (overlay.classList.contains('open')) overlay.classList.remove('open');
      return;
    }
    suppressUrlSync = true;
    const idx = currentList.findIndex((it) => String(it.id) === String(visualId));
    if (idx !== -1) {
      currentIdx = idx;
      overlay.classList.add('open');
      render();
      suppressUrlSync = false;
    } else {
      fetchAndOpenById(visualId).finally(() => {
        suppressUrlSync = false;
      });
    }
  });
}

async function shareImage(url) {
  if (navigator.share) {
    try {
      await navigator.share({ title: 'JG Studio', text: 'JG Studio ile oluşturdum', url });
    } catch (err) {
      // Kullanıcı iptal etti (AbortError) ya da başka bir sebeple paylaşım
      // başarısız oldu — sessiz geç, UX'i bozma.
    }
    return;
  }
  window.open(`https://wa.me/?text=${encodeURIComponent('JG Studio ile oluşturdum: ' + url)}`, '_blank');
}

async function deleteImage(id) {
  if (!window.confirm('Bu görsel kalıcı olarak silinecek. Emin misin?')) return;

  try {
    const res = await fetch(GENERATED_VISUAL_DELETE_URL, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ id })
    });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const raw = await res.json().catch(() => ({}));
    const data = unwrap(Array.isArray(raw) ? raw[0] : raw) || {};
    if (data.error) throw new Error(data.error);

    const tile = document.querySelector(`[data-image-id="${CSS.escape(String(id))}"]`);
    if (tile) tile.remove();

    const deletedIdx = currentList.findIndex((item) => item.id === id);
    if (deletedIdx !== -1) currentList.splice(deletedIdx, 1);

    if (!currentList.length) {
      closeDetailScreen();
    } else {
      if (currentIdx >= currentList.length) currentIdx = currentList.length - 1;
      render();
    }
    alert('Görsel silindi.');
  } catch (err) {
    alert('Silme başarısız: ' + err.message);
  }
}

function goPrev() {
  if (!currentList.length) return;
  currentIdx = (currentIdx - 1 + currentList.length) % currentList.length;
  render();
}
function goNext() {
  if (!currentList.length) return;
  currentIdx = (currentIdx + 1) % currentList.length;
  render();
}
function goToIdx(idx) {
  if (idx < 0 || idx >= currentList.length) return;
  currentIdx = idx;
  render();
}

function syncUrl() {
  if (suppressUrlSync) return;
  const item = currentList[currentIdx];
  if (!item || !item.id) return;
  const search = `?visual=${encodeURIComponent(item.id)}`;
  if (location.search !== search) history.pushState({}, '', search);
}
function clearUrl() {
  if (new URLSearchParams(location.search).has('visual')) {
    history.pushState({}, '', location.pathname);
  }
}

function renderThumbnails() {
  const track = $('vdThumbTrack');
  track.innerHTML = currentList
    .map(
      (item, i) => `
    <button type="button" class="vd-thumb ${i === currentIdx ? 'active' : ''}" data-thumb-idx="${i}">
      <img src="${escapeAttr(item.url)}" alt="">
    </button>`
    )
    .join('');
  const showScroll = track.scrollWidth > track.clientWidth + 4;
  $('vdThumbLeft').style.display = showScroll ? 'flex' : 'none';
  $('vdThumbRight').style.display = showScroll ? 'flex' : 'none';
  const activeThumb = track.querySelector('.vd-thumb.active');
  if (activeThumb) activeThumb.scrollIntoView({ block: 'nearest', inline: 'nearest' });
}

function render() {
  const item = currentList[currentIdx];
  if (!item) {
    closeDetailScreen();
    return;
  }

  $('vdImg').src = item.url;

  const showNav = currentList.length > 1;
  $('vdPrev').style.display = showNav ? 'flex' : 'none';
  $('vdNext').style.display = showNav ? 'flex' : 'none';

  $('vdPromptText').textContent = item.prompt_text || 'Bu görsel için kayıtlı prompt yok.';
  $('vdDate').textContent = formatDate(item.created_at);
  $('vdModel').textContent = providerLabel(item.provider);
  $('vdSize').textContent = sizeLabel(item.aspect_ratio);
  $('vdGenId').textContent = item.id ? 'img_' + String(item.id).slice(-7) : 'Henüz kaydediliyor…';

  const deleteBtn = $('vdDeleteBtn');
  deleteBtn.disabled = !item.id;
  deleteBtn.title = item.id ? 'Sil' : 'Bu görsel henüz kaydedilmedi';

  const { name, email, picture, username } = getUserInfo();
  const displayName = name || 'Kullanıcı';
  const handle = username ? '@' + username : (email ? '@' + email.split('@')[0] : '@kullanici');
  $('vdAvatar').innerHTML = picture ? `<img src="${escapeAttr(picture)}" alt="">` : escapeHtml(getInitial(name, email));
  $('vdUserName').textContent = displayName;
  $('vdUserMeta').textContent = `${handle} · ${email || '—'}`;

  renderThumbnails();
  syncUrl();
}

export function openLightbox(imageList, startIdx) {
  ensureDetailScreen();
  currentList = Array.isArray(imageList) ? imageList.slice() : [];
  currentIdx = startIdx || 0;
  $('visualDetailOverlay').classList.add('open');
  render();
}

function closeDetailScreen() {
  const overlay = $('visualDetailOverlay');
  if (overlay) overlay.classList.remove('open');
  clearUrl();
}

async function fetchAndOpenById(id) {
  if (!isLoggedIn()) return;
  if (!GENERATED_VISUALS_URL || GENERATED_VISUALS_URL.includes('YOUR-N8N-URL')) return;
  try {
    const res = await fetch(GENERATED_VISUALS_URL, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({})
    });
    const raw = await res.json();
    const data = unwrap(Array.isArray(raw) ? raw[0] : raw) || {};
    const rows = Array.isArray(data.rows) ? data.rows : [];
    const idx = rows.findIndex((r) => String(r.id) === String(id));
    if (idx === -1) return;
    const imageList = rows.map((r) => ({
      url: r.image_url,
      id: r.id,
      prompt_text: r.prompt_text,
      provider: r.provider,
      aspect_ratio: r.aspect_ratio,
      created_at: r.created_at
    }));
    openLightbox(imageList, idx);
  } catch (err) {
    console.warn('Görsel detayı yüklenemedi:', err.message);
  }
}

/** Sayfa yüklenirken URL'de ?visual=<id> varsa o görselin detay ekranını açar. main.js'ten çağrılır. */
export function initVisualDetailFromUrl() {
  const visualId = new URLSearchParams(location.search).get('visual');
  if (!visualId) return;
  fetchAndOpenById(visualId);
}
