// src/tabs/gallery.js
import { SHEET_ID, SHEET_NAME, MAX_TOP_TAGS, PREMIUM_LIST_URL, PREMIUM_VERIFY_URL } from '../config.js';
import { escapeAttr, escapeHtml, unwrap, getViewCount, getLikeCount, formatCount } from '../utils.js';

let allRows = [];
let visibleRows = [];
let activeCategory = null;
let activeTag = null;
let currentModalRow = null;
let searchTerm = '';
let sortOrder = 'newest';
let showAllTags = false;

function $(id) {
  return document.getElementById(id);
}

function setStatus(msg, isError) {
  const el = $('status');
  el.textContent = msg;
  el.className = 'status show' + (isError ? ' error' : '');
}
function clearStatus() {
  $('status').className = 'status';
}

async function fetchPublicRows() {
  const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(SHEET_NAME)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Sheet okunamadı.');
  const text = await res.text();
  const jsonStr = text.substring(text.indexOf('{'), text.lastIndexOf('}') + 1);
  const data = JSON.parse(jsonStr);

  const rows = data.table.rows
    .map((r, i) => {
      const cells = r.c.map((c) => (c ? c.v ?? '' : ''));
      return {
        id: 'pub_' + i,
        tarih: cells[0] || '',
        etiketler: cells[1] || '',
        promptText: cells[2] || '',
        gorselLink: cells[3] || '',
        chatId: cells[4] || '',
        kategori: (cells[5] || '').trim(),
        isPremium: false
      };
    })
    .filter((r) => r.promptText);

  return rows.reverse();
}

async function fetchPremiumList() {
  if (!PREMIUM_LIST_URL || PREMIUM_LIST_URL.includes('YOUR-N8N-URL')) return [];
  try {
    const res = await fetch(PREMIUM_LIST_URL);
    if (!res.ok) throw new Error('premium liste okunamadı');
    const data = await res.json();

    return (Array.isArray(data) ? data : []).map((raw) => {
      const p = unwrap(raw);
      return {
        id: String(p.id ?? ''),
        tarih: p.tarih || '',
        etiketler: p.etiketler || '',
        promptText: '',
        gorselLink: p.gorselLink || '',
        chatId: '',
        kategori: (p.kategori || '').trim(),
        isPremium: true
      };
    });
  } catch (err) {
    console.warn('Premium liste alınamadı:', err.message);
    return [];
  }
}

export async function loadData() {
  setStatus('Yükleniyor...');
  $('grid').innerHTML = '';

  try {
    const [publicRows, premiumRows] = await Promise.all([fetchPublicRows(), fetchPremiumList()]);

    allRows = [...publicRows, ...premiumRows];
    sortOrder = 'newest';
    applySortOrder();

    activeCategory = null;
    activeTag = null;
    searchTerm = '';
    $('searchInput').value = '';
    clearStatus();
    $('countLabel').textContent = allRows.length + ' kayıt';

    if (allRows.length === 0) {
      $('grid').innerHTML = '<div class="empty">Henüz kayıt yok. Bota bir görsel gönder, buraya düşer.</div>';
      $('catBody').innerHTML = '';
      $('tagCloud').innerHTML = '';
      return;
    }
    renderFilters();
    applyFiltersAndRender();
  } catch (err) {
    setStatus('Hata: ' + err.message, true);
  }
}

function applySortOrder() {
  allRows.sort((a, b) => {
    const da = new Date(a.tarih).getTime() || 0;
    const db = new Date(b.tarih).getTime() || 0;
    return sortOrder === 'newest' ? db - da : da - db;
  });
}

function getCategoryCounts() {
  const counts = {};
  allRows.forEach((r) => {
    if (r.kategori) counts[r.kategori] = (counts[r.kategori] || 0) + 1;
  });
  return counts;
}

function getTagFrequency() {
  const freq = {};
  allRows.forEach((r) => {
    r.etiketler
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean)
      .forEach((t) => {
        freq[t] = (freq[t] || 0) + 1;
      });
  });
  return Object.entries(freq).sort((a, b) => b[1] - a[1]);
}

function renderFilters() {
  const counts = getCategoryCounts();
  const categories = Object.keys(counts).sort();
  const freq = getTagFrequency();
  const tagsToShow = showAllTags ? freq : freq.slice(0, MAX_TOP_TAGS);

  let catHtml = `<button class="cat-item ${!activeCategory ? 'active' : ''}" data-cat=""><span>Tümü</span></button>`;
  catHtml += categories
    .map(
      (c) => `
    <button class="cat-item ${activeCategory === c ? 'active' : ''}" data-cat="${escapeAttr(c)}">
      <span>${escapeHtml(c)}</span><span class="cat-count">${counts[c]}</span>
    </button>`
    )
    .join('');
  $('catBody').innerHTML = catHtml;

  $('tagCloud').innerHTML = tagsToShow
    .map(([t]) => `<button class="chip ${activeTag === t ? 'active' : ''}" data-tag="${escapeAttr(t)}">${escapeHtml(t)}</button>`)
    .join('');

  $('seeAllTagsBtn').textContent = showAllTags ? 'Daha az göster' : 'Tüm etiketleri gör';
}

function setCategory(c) {
  activeCategory = c || null;
  renderFilters();
  applyFiltersAndRender();
}
function setTag(t) {
  activeTag = activeTag === t ? null : t;
  renderFilters();
  applyFiltersAndRender();
}
function toggleAllTags() {
  showAllTags = !showAllTags;
  renderFilters();
}

function applyFiltersAndRender() {
  visibleRows = allRows.filter((r) => {
    const matchesCategory = !activeCategory || r.kategori === activeCategory;
    const tags = r.etiketler.split(',').map((t) => t.trim());
    const matchesTag = !activeTag || tags.includes(activeTag);
    const haystack = (r.promptText + ' ' + r.etiketler + ' ' + r.kategori).toLowerCase();
    const matchesSearch = !searchTerm || haystack.includes(searchTerm);
    return matchesCategory && matchesTag && matchesSearch;
  });
  renderGrid();
}

// ---- Beğen / Kaydet — tarayıcıda kalıcı, hesap gerektirmez (şimdilik) ----
function getLikedSet() {
  try {
    return new Set(JSON.parse(localStorage.getItem('likedIds') || '[]'));
  } catch (e) {
    return new Set();
  }
}
function getSavedSet() {
  try {
    return new Set(JSON.parse(localStorage.getItem('savedIds') || '[]'));
  } catch (e) {
    return new Set();
  }
}
function isLiked(id) {
  return getLikedSet().has(String(id));
}
function isSaved(id) {
  return getSavedSet().has(String(id));
}
function toggleLike(id) {
  const set = getLikedSet();
  const key = String(id);
  if (set.has(key)) set.delete(key);
  else set.add(key);
  try {
    localStorage.setItem('likedIds', JSON.stringify([...set]));
  } catch (e) {}
  renderGrid();
}
function toggleSave(id) {
  const set = getSavedSet();
  const key = String(id);
  if (set.has(key)) set.delete(key);
  else set.add(key);
  try {
    localStorage.setItem('savedIds', JSON.stringify([...set]));
  } catch (e) {}
  renderGrid();
}

function renderGrid() {
  const grid = $('grid');

  if (visibleRows.length === 0) {
    grid.innerHTML = '<div class="empty">Bu filtrelere uyan kayıt yok.</div>';
    return;
  }

  grid.innerHTML = visibleRows
    .map((r, i) => {
      const tags = r.etiketler.split(',').map((t) => t.trim()).filter(Boolean);
      const firstTag = tags[0] || (r.isPremium ? 'Premium' : '');
      const imgSrc = r.gorselLink || '';
      const lockBadge = r.isPremium && !getUnlockedPrompt(r.id) ? '<div class="lock-badge">🔒</div>' : '';
      const views = formatCount(getViewCount(r.id));
      const likes = formatCount(getLikeCount(r.id) + (isLiked(r.id) ? 1 : 0));
      const statBadges = `
      <div class="stat-badges">
        <span class="stat-badge"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z"/><circle cx="12" cy="12" r="3"/></svg>${views}</span>
        <span class="stat-badge"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 21s-6.7-4.35-9.3-8.1C.8 9.9 1.7 6.4 4.6 5.1c2.1-.95 4.2-.1 5.4 1.6.4.55.8 1.1 1 1.5.2-.4.6-.95 1-1.5 1.2-1.7 3.3-2.55 5.4-1.6 2.9 1.3 3.8 4.8 1.9 7.8C18.7 16.65 12 21 12 21z"/></svg>${likes}</span>
      </div>`;
      const cardActions = `
      <div class="card-actions">
        <button class="icon-btn like-btn ${isLiked(r.id) ? 'active' : ''}" data-like-id="${escapeAttr(r.id)}" title="Beğen">
          <svg viewBox="0 0 24 24"><path d="M12 21s-6.7-4.35-9.3-8.1C.8 9.9 1.7 6.4 4.6 5.1c2.1-.95 4.2-.1 5.4 1.6.4.55.8 1.1 1 1.5.2-.4.6-.95 1-1.5 1.2-1.7 3.3-2.55 5.4-1.6 2.9 1.3 3.8 4.8 1.9 7.8C18.7 16.65 12 21 12 21z"/></svg>
        </button>
        <button class="icon-btn save-btn ${isSaved(r.id) ? 'active' : ''}" data-save-id="${escapeAttr(r.id)}" title="Kaydet">
          <svg viewBox="0 0 24 24"><path d="M6 3h12a1 1 0 0 1 1 1v17l-7-4-7 4V4a1 1 0 0 1 1-1z"/></svg>
        </button>
      </div>`;
      return `
      <div class="tile ${r.isPremium ? 'locked' : ''}" data-open-idx="${i}">
        <img src="${imgSrc}" alt="referans görsel" loading="lazy" data-onerror-hide="1">
        ${lockBadge}
        ${statBadges}
        ${cardActions}
        <div class="tile-hint"><span>${escapeHtml(firstTag)}</span></div>
      </div>
    `;
    })
    .join('');

  grid.querySelectorAll('img[data-onerror-hide]').forEach((img) => {
    img.addEventListener('error', () => {
      img.closest('.tile').style.display = 'none';
    });
  });
}

// ---- Modal (referans görsel + prompt) ----

function openModal(idx) {
  const r = visibleRows[idx];
  currentModalRow = r;
  const tags = r.etiketler.split(',').map((t) => t.trim()).filter(Boolean);

  $('modalImg').src = r.gorselLink || '';
  $('modalDate').textContent = r.tarih
    ? new Date(r.tarih).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    : '';

  const maxEtiket = r.kategori ? 3 : 4;
  let tagsHtml = tags
    .slice(0, maxEtiket)
    .map((t) => {
      const isPerson = t.includes('model');
      return `<span class="tag${isPerson ? ' person' : ''}">${escapeHtml(t)}</span>`;
    })
    .join('');
  if (r.kategori) {
    tagsHtml = `<span class="tag person">${escapeHtml(r.kategori)}</span>` + tagsHtml;
  }
  $('modalTags').innerHTML = tagsHtml;

  const unlocked = r.isPremium ? getUnlockedPrompt(r.id) : null;
  if (r.isPremium && !unlocked) {
    showPaywallSection();
  } else {
    showPromptSection(r.isPremium ? unlocked : r.promptText);
  }

  $('modalBackdrop').classList.add('open');
}

function closeModal() {
  $('modalBackdrop').classList.remove('open');
}

function getUnlockedPrompt(id) {
  try {
    return sessionStorage.getItem('unlocked_' + id);
  } catch (e) {
    return null;
  }
}
function setUnlockedPrompt(id, promptText) {
  try {
    sessionStorage.setItem('unlocked_' + id, promptText);
  } catch (e) {}
}

function showPromptSection(promptText) {
  $('promptSection').style.display = 'flex';
  $('paywallSection').style.display = 'none';
  $('modalPrompt').textContent = promptText || '';
  const copyBtn = $('copyBtn');
  copyBtn.textContent = 'Kopyala';
  copyBtn.classList.remove('copied');
  copyBtn.dataset.prompt = promptText || '';
}

function showPaywallSection() {
  $('promptSection').style.display = 'none';
  $('paywallSection').style.display = 'flex';
  showPaywallActions();
}
function showPaywallActions() {
  $('paywallPanel').style.display = 'flex';
  $('codePanel').style.display = 'none';
}
function showCodePanel() {
  $('paywallPanel').style.display = 'none';
  $('codePanel').style.display = 'flex';
  const msgEl = $('codeMsg');
  msgEl.textContent = '';
  msgEl.className = 'code-msg';
  const input = $('codeInput');
  input.value = '';
  input.focus();
}

async function submitCode() {
  const r = currentModalRow;
  const code = $('codeInput').value.trim();
  const msgEl = $('codeMsg');

  if (!code) {
    msgEl.textContent = 'Kod boş olamaz.';
    msgEl.className = 'code-msg error';
    return;
  }
  if (!PREMIUM_VERIFY_URL || PREMIUM_VERIFY_URL.includes('YOUR-N8N-URL')) {
    msgEl.textContent = 'Doğrulama servisi henüz bağlanmadı.';
    msgEl.className = 'code-msg error';
    return;
  }

  msgEl.textContent = 'Kontrol ediliyor...';
  msgEl.className = 'code-msg';

  try {
    const res = await fetch(PREMIUM_VERIFY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: r.id, code })
    });
    const raw = await res.json();
    const data = unwrap(Array.isArray(raw) ? raw[0] : raw) || {};

    if (data.success) {
      setUnlockedPrompt(r.id, data.promptText);
      msgEl.textContent = 'Kod doğru! Açılıyor...';
      msgEl.className = 'code-msg success';
      setTimeout(() => showPromptSection(data.promptText), 500);
      renderGrid();
    } else {
      msgEl.textContent = data.message || 'Kod geçersiz.';
      msgEl.className = 'code-msg error';
    }
  } catch (err) {
    msgEl.textContent = 'Bağlantı hatası: ' + err.message;
    msgEl.className = 'code-msg error';
  }
}

function copyPrompt() {
  const btn = $('copyBtn');
  navigator.clipboard.writeText(btn.dataset.prompt).then(() => {
    btn.textContent = 'Kopyalandı ✓';
    btn.classList.add('copied');
    setTimeout(() => {
      btn.textContent = 'Kopyala';
      btn.classList.remove('copied');
    }, 1600);
  });
}

// ---- Init: tüm statik event binding + delegation burada ----
export function initGallery() {
  $('searchInput').addEventListener('input', (e) => {
    searchTerm = e.target.value.trim().toLowerCase();
    applyFiltersAndRender();
  });

  $('sidebarToggleBtn').addEventListener('click', () => $('sidebar').classList.toggle('open'));

  $('densityToggleBtn').addEventListener('click', () => {
    const grid = $('grid');
    const nowWide = grid.classList.toggle('wide');
    $('densityToggleBtn').classList.toggle('active', nowWide);
  });

  $('refreshBtn')?.addEventListener('click', loadData);

  $('sortBtn').addEventListener('click', () => $('sortMenu').classList.toggle('open'));
  $('sortNewestBtn').addEventListener('click', () => setSort('newest'));
  $('sortOldestBtn').addEventListener('click', () => setSort('oldest'));
  document.addEventListener('click', (e) => {
    const wrap = document.querySelector('.sort-wrap');
    if (wrap && !wrap.contains(e.target)) $('sortMenu').classList.remove('open');
  });

  document.getElementById('catBody').addEventListener('click', (e) => {
    const btn = e.target.closest('[data-cat]');
    if (btn) setCategory(btn.dataset.cat);
  });
  document.getElementById('tagCloud').addEventListener('click', (e) => {
    const btn = e.target.closest('[data-tag]');
    if (btn) setTag(btn.dataset.tag);
  });
  $('seeAllTagsBtn').addEventListener('click', toggleAllTags);

  $('catChev').closest('.sidebar-header').addEventListener('click', () => toggleSection('cat'));
  $('tagChev').closest('.sidebar-header').addEventListener('click', () => toggleSection('tag'));

  $('grid').addEventListener('click', (e) => {
    const likeBtn = e.target.closest('[data-like-id]');
    if (likeBtn) {
      e.stopPropagation();
      toggleLike(likeBtn.dataset.likeId);
      return;
    }
    const saveBtn = e.target.closest('[data-save-id]');
    if (saveBtn) {
      e.stopPropagation();
      toggleSave(saveBtn.dataset.saveId);
      return;
    }
    const tile = e.target.closest('[data-open-idx]');
    if (tile) openModal(Number(tile.dataset.openIdx));
  });

  $('modalBackdrop').addEventListener('click', (e) => {
    if (e.target === $('modalBackdrop')) closeModal();
  });
  document.querySelectorAll('#promptSection .btn').forEach((btn) => {
    if (btn.id === 'copyBtn') btn.addEventListener('click', copyPrompt);
    else btn.addEventListener('click', closeModal);
  });
  $('codeInput').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') submitCode();
  });
  document.querySelectorAll('#paywallPanel .btn').forEach((btn) => {
    if (btn.textContent.includes('sahip ol')) btn.addEventListener('click', showCodePanel);
    else if (!btn.disabled) btn.addEventListener('click', closeModal);
  });
  document.getElementById('codePanel').querySelector('.code-row .btn.primary').addEventListener('click', submitCode);
  document.getElementById('codePanel').querySelector('.btn:not(.primary)').addEventListener('click', showPaywallActions);

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeModal();
  });
}

function toggleSection(key) {
  const body = document.getElementById(key + 'Body');
  const chev = document.getElementById(key + 'Chev');
  const isOpen = body.style.display !== 'none';
  body.style.display = isOpen ? 'none' : key === 'cat' ? 'flex' : 'block';
  chev.style.transform = isOpen ? 'rotate(-90deg)' : 'rotate(0deg)';
}

function setSort(order) {
  sortOrder = order;
  $('sortLabel').textContent = order === 'newest' ? 'En yeni' : 'En eski';
  $('sortNewestBtn').classList.toggle('active', order === 'newest');
  $('sortOldestBtn').classList.toggle('active', order === 'oldest');
  $('sortMenu').classList.remove('open');
  applySortOrder();
  applyFiltersAndRender();
}
