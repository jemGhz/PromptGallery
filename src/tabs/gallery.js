// src/tabs/gallery.js
import { escapeAttr, escapeHtml, unwrap, getViewCount, getLikeCount, formatCount } from '../utils.js';
import { isLoggedIn, setLocalCreditBalance, getLocalCreditBalance, refreshCreditBalanceFromServer, authHeaders, onBalanceChange } from '../auth.js';
import { openCreditModal } from '../credits.js';
import { MAX_TOP_TAGS, PUBLIC_LIST_URL, PREMIUM_LIST_URL, UNLOCK_PREMIUM_URL, TOGGLE_INTERACTION_URL, USER_INTERACTIONS_URL } from '../config.js';
import { getStoredDensity, setStoredDensity, applyDensity, appState } from '../state.js';
import { switchTab } from '../tabState.js';


let allRows = [];
let visibleRows = [];
let activeCategory = null;
let activeTag = null;
let currentModalRow = null;
let searchTerm = '';
let sortOrder = 'newest';
let showAllTags = false;
let activeProductType = null;
let activeAudienceGender = null;

// Sunucudan gelen etkileşim durumu: "public:123" / "premium:45" formatında anahtarlar
let serverLikes = new Set();
let serverSaves = new Set();
let serverPurchases = new Set();

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
  if (!PUBLIC_LIST_URL || PUBLIC_LIST_URL.includes('YOUR-N8N-URL')) return [];
  try {
    const res = await fetch(PUBLIC_LIST_URL);
    if (!res.ok) throw new Error('Public liste okunamadı.');
    const data = await res.json();

    const rows = (Array.isArray(data) ? data : []).map((raw) => {
      const r = unwrap(raw);
      return {
        id: String(r.id ?? ''),
        tarih: r.tarih || '',
        etiketler: r.etiketler || '',
        promptText: r.promptText || '',
        gorselLink: r.gorselLink || '',
        chatId: r.chatId || '',
        kategori: (r.kategori || '').trim(),
        productType: (r.productType || '').trim(),
        audienceGender: (r.audienceGender || '').trim(),
        isPremium: false
      };
    }).filter((r) => r.promptText);

    return rows.reverse();
  } catch (err) {
    console.warn('Public liste alınamadı:', err.message);
    return [];
  }
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
        productType: (p.productType || '').trim(),
        audienceGender: (p.audienceGender || '').trim(),
        isPremium: true,
        cost: Number(p.maliyet) || 50
      };
    });
  } catch (err) {
    console.warn('Premium liste alınamadı:', err.message);
    return [];
  }
}

async function fetchUserInteractions() {
  serverLikes = new Set();
  serverSaves = new Set();
  serverPurchases = new Set();

  if (!isLoggedIn()) return;
  if (!USER_INTERACTIONS_URL || USER_INTERACTIONS_URL.includes('YOUR-N8N-URL')) return;

  try {
    const res = await fetch(USER_INTERACTIONS_URL, { headers: authHeaders() });
    if (!res.ok) return; // sessizce boş kalır (401 dahil) — profil/galeri hata göstermesin
    const data = await res.json();
    (data.likes || []).forEach((k) => serverLikes.add(k));
    (data.saves || []).forEach((k) => serverSaves.add(k));
    (data.purchases || []).forEach((k) => serverPurchases.add(k));
  } catch (err) {
    console.warn('Kullanıcı etkileşimleri alınamadı:', err.message);
  }
}

export async function loadData() {
  setStatus('Yükleniyor...');
  $('grid').innerHTML = '';

  try {
    const [publicRows, premiumRows] = await Promise.all([
      fetchPublicRows(),
      fetchPremiumList(),
      fetchUserInteractions()
    ]);

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
    if (sortOrder === 'most-viewed') {
      return getViewCount(b.id) - getViewCount(a.id);
    }
    if (sortOrder === 'most-liked') {
      return getLikeCount(b.id) - getLikeCount(a.id);
    }
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

  renderProductTypeSelect();
  renderGenderSelect();
}

// Türkçe label mapping — kullanıcıya gösterirken
const PRODUCT_TYPE_LABELS = {
  'bag': 'Çanta', 'backpack': 'Sırt Çantası', 'clutch': 'El Çantası',
  'wallet': 'Cüzdan', 'card-holder': 'Kart Cüzdanı', 'luggage': 'Bavul',
  'travel-bag': 'Seyahat Çantası', 'makeup-bag': 'Makyaj Çantası',
  'shoes': 'Ayakkabı', 'sneakers': 'Spor Ayakkabı', 'boots': 'Bot',
  'ankle-boots': 'Bilek Bot', 'heels': 'Topuklu', 'loafers': 'Loafer',
  'sandals': 'Sandalet', 'flats': 'Babet', 'slippers': 'Terlik',
  'jacket': 'Ceket', 'coat': 'Palto', 'trench-coat': 'Trençkot',
  'blazer': 'Blazer', 'suit': 'Takım Elbise', 'vest': 'Yelek',
  't-shirt': 'Tişört', 'polo-shirt': 'Polo Tişört', 'shirt': 'Gömlek',
  'blouse': 'Bluz', 'sweater': 'Kazak', 'hoodie': 'Kapüşonlu',
  'cardigan': 'Hırka', 'pants': 'Pantolon', 'jeans': 'Kot',
  'trousers': 'Kumaş Pantolon', 'shorts': 'Şort', 'skirt': 'Etek',
  'dress': 'Elbise', 'jumpsuit': 'Tulum',
  'sunglasses': 'Güneş Gözlüğü', 'eyeglasses': 'Gözlük',
  'watch': 'Saat', 'smartwatch': 'Akıllı Saat',
  'belt': 'Kemer', 'hat': 'Şapka', 'cap': 'Kep', 'scarf': 'Şal / Atkı',
  'tie': 'Kravat', 'bow-tie': 'Papyon', 'gloves': 'Eldiven',
  'hair-accessories': 'Saç Aksesuarı', 'hair-clips': 'Saç Tokası',
  'umbrella': 'Şemsiye', 'keychain': 'Anahtarlık',
  'jewelry': 'Takı', 'necklace': 'Kolye', 'bracelet': 'Bilezik',
  'ring': 'Yüzük', 'earrings': 'Küpe',
  'phone-case': 'Telefon Kılıfı', 'perfume': 'Parfüm', 'other': 'Diğer'
};

function renderProductTypeSelect() {
  const sel = document.getElementById('productTypeSelect');
  if (!sel) return;
  // Mevcut ürün türlerini (o an DB'de olan) topla
  const counts = {};
  allRows.forEach((r) => {
    if (r.productType) counts[r.productType] = (counts[r.productType] || 0) + 1;
  });
  const items = Object.keys(counts).sort((a, b) => {
    const la = PRODUCT_TYPE_LABELS[a] || a;
    const lb = PRODUCT_TYPE_LABELS[b] || b;
    return la.localeCompare(lb, 'tr');
  });
  sel.innerHTML =
    `<option value="">Tümü (${allRows.filter((r) => r.productType).length})</option>` +
    items.map((k) => {
      const label = PRODUCT_TYPE_LABELS[k] || k;
      return `<option value="${escapeAttr(k)}" ${activeProductType === k ? 'selected' : ''}>${escapeHtml(label)} (${counts[k]})</option>`;
    }).join('');
}
function renderGenderSelect() {
  const sel = document.getElementById('audienceGenderSelect');
  if (!sel) return;
  if (activeAudienceGender !== null) sel.value = activeAudienceGender;
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
    const matchesProduct = !activeProductType || r.productType === activeProductType;
    const matchesGender = !activeAudienceGender || r.audienceGender === activeAudienceGender;
    const haystack = (r.promptText + ' ' + r.etiketler + ' ' + r.kategori + ' ' + r.productType + ' ' + r.audienceGender).toLowerCase();
    const matchesSearch = !searchTerm || haystack.includes(searchTerm);
    return matchesCategory && matchesTag && matchesProduct && matchesGender && matchesSearch;
  });
  renderGrid();
}

// ---- Beğen / Kaydet — artık sunucu tabanlı, sadece giriş yapan kullanıcı ----

function itemKey(row) {
  return `${row.isPremium ? 'premium' : 'public'}:${row.id}`;
}
function findRow(id) {
  return allRows.find((r) => String(r.id) === String(id));
}
function isLiked(id) {
  const row = findRow(id);
  return row ? serverLikes.has(itemKey(row)) : false;
}
function isSaved(id) {
  const row = findRow(id);
  return row ? serverSaves.has(itemKey(row)) : false;
}

async function toggleInteraction(id, type) {
  if (!isLoggedIn()) {
    openCreditModal(); // giriş yapmamış kullanıcı — mevcut login/credit modal'ı tetikler
    return;
  }
  const row = findRow(id);
  if (!row) return;
  if (!TOGGLE_INTERACTION_URL || TOGGLE_INTERACTION_URL.includes('YOUR-N8N-URL')) {
    setStatus('Etkileşim servisi henüz bağlanmadı.', true);
    return;
  }

  const key = itemKey(row);
  const set = type === 'like' ? serverLikes : serverSaves;
  const wasActive = set.has(key);

  // Optimistic UI
  if (wasActive) set.delete(key);
  else set.add(key);
  renderGrid();

  try {
    const res = await fetch(TOGGLE_INTERACTION_URL, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({
        item_id: row.id,
        item_source: row.isPremium ? 'premium' : 'public',
        interaction_type: type
      })
    });
    const raw = await res.json();
    const data = unwrap(Array.isArray(raw) ? raw[0] : raw) || {};

    if (res.status === 401) {
      // token geçersiz/süresi dolmuş — optimistic değişikliği geri al
      if (wasActive) set.add(key);
      else set.delete(key);
      renderGrid();
      setStatus('Oturum süresi dolmuş, lütfen tekrar giriş yap.', true);
      return;
    }
    if (!res.ok || data.success === false) throw new Error(data.message || 'İşlem başarısız.');

    // Sunucudan dönen gerçek durum optimistic tahminden farklıysa düzelt
    if (typeof data.active === 'boolean' && data.active !== set.has(key)) {
      if (data.active) set.add(key);
      else set.delete(key);
      renderGrid();
    }
  } catch (err) {
    // Hata — optimistic değişikliği geri al
    if (wasActive) set.add(key);
    else set.delete(key);
    renderGrid();
    setStatus('Bağlantı hatası: ' + err.message, true);
  }
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
      const lockBadge = r.isPremium && !getUnlockedPrompt(r.id)
        ? `<div class="premium-badge">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
              <path d="M3 8l4 3 5-6 5 6 4-3-2 10H5L3 8z"/>
            </svg>
          </div>`
        : '';
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
        <img src="${escapeAttr(imgSrc)}" alt="referans görsel" loading="lazy" data-onerror-hide="1">
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

// visibleRows içindeki index'e göre açar (galeri grid'inden tıklamada kullanılır)
function openModal(idx) {
  openModalForRow(visibleRows[idx]);
}

// Satır objesiyle doğrudan açar — galeri dışından (ör. profil sayfası) da çağrılabilir
export function openModalForRow(r) {
  if (!r) return;
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
  $('modalPremiumBadge').style.display = 'none';
  $('modalPrompt').textContent = promptText || '';
  const copyIconBtn = $('copyIconBtn');
  if (copyIconBtn) {
    copyIconBtn.classList.remove('copied');
    copyIconBtn.dataset.prompt = promptText || '';
  }
  const useBtn = $('useInVisualBtn');
  if (useBtn) useBtn.dataset.prompt = promptText || '';
}

function showPaywallSection() {
  $('promptSection').style.display = 'none';
  $('paywallSection').style.display = 'flex';
  $('modalPremiumBadge').style.display = 'inline-flex';

  const r = currentModalRow;
  const cost = r?.cost || 50;
  $('unlockCostNum').textContent = cost;
  $('paywallBalanceNote').textContent = `${getLocalCreditBalance()} VSP'ye sahipsin.`;

  const msgEl = $('unlockMsg');
  msgEl.textContent = '';
  msgEl.className = 'code-msg';

  const btn = $('unlockBtn');
  btn.disabled = false;
  $('unlockBtnLabel').textContent = 'VSP ile Aç';
}

// ---- Kredi ile prompt açma ----
async function unlockWithCredits() {
  const r = currentModalRow;
  const msgEl = $('unlockMsg');
  const btn = $('unlockBtn');
  const label = $('unlockBtnLabel');

  if (!isLoggedIn()) {
    openCreditModal();
    return;
  }
  if (!UNLOCK_PREMIUM_URL || UNLOCK_PREMIUM_URL.includes('YOUR-N8N-URL')) {
    msgEl.textContent = 'Kilit açma servisi henüz bağlanmadı.';
    msgEl.className = 'code-msg error';
    return;
  }

  btn.disabled = true;
  label.textContent = 'İşleniyor...';
  msgEl.textContent = '';
  msgEl.className = 'code-msg';

  try {
    const res = await fetch(UNLOCK_PREMIUM_URL, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({
        id: r.id,
        email: localStorage.getItem('userEmail') || ''
      })
    });
    const raw = await res.json();
    const data = unwrap(Array.isArray(raw) ? raw[0] : raw) || {};

    if (data.success) {
      setUnlockedPrompt(r.id, data.promptText);
      serverPurchases.add(itemKey(r)); // profil listesi bu oturumda da güncel görünsün
      msgEl.textContent = 'Açıldı!';
      msgEl.className = 'code-msg success';
      if (typeof data.newBalance === 'number') {
        setLocalCreditBalance(data.newBalance);
      } else {
        refreshCreditBalanceFromServer();
      }
      renderGrid();
      setTimeout(() => showPromptSection(data.promptText), 400);
    } else if (res.status === 401) {
      msgEl.textContent = 'Oturum süresi dolmuş, lütfen tekrar giriş yap.';
      msgEl.className = 'code-msg error';
      btn.disabled = false;
      label.textContent = 'VSP ile Aç';
    } else {
      msgEl.textContent = data.message || 'Bakiye yetersiz veya bir hata oluştu.';
      msgEl.className = 'code-msg error';
      btn.disabled = false;
      label.textContent = 'VSP ile Aç';
    }
  } catch (err) {
    msgEl.textContent = 'Bağlantı hatası: ' + err.message;
    msgEl.className = 'code-msg error';
    btn.disabled = false;
    label.textContent = 'VSP ile Aç';
  }
}

function copyPromptFromIcon() {
  const btn = $('copyIconBtn');
  if (!btn || !btn.dataset.prompt) return;
  navigator.clipboard.writeText(btn.dataset.prompt).then(() => {
    btn.classList.add('copied');
    setTimeout(() => btn.classList.remove('copied'), 1400);
  });
}

function useInVisualGenerator() {
  const btn = $('useInVisualBtn');
  if (!btn || !btn.dataset.prompt) return;
  const promptText = btn.dataset.prompt;

  // Prompt'u appState'e koy — visualGenerator switchTab öncesi de sonrası da okuyabilsin
  appState.makerGeneratedPrompt = promptText;

  // Modal'ı kapat
  closeModal();

  // Görsel Oluşturucu sekmesine geç
  switchTab('visual');

  // Textbox'a bas + char count / submit state güncelle
  // (visual tab yeni açılıyorsa DOM hazır olması için 1 tick bekle)
  setTimeout(() => {
    const input = document.getElementById('genPromptInput');
    if (input) {
      input.value = promptText;
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.focus();
      // Cursor'u sona koy
      input.setSelectionRange(input.value.length, input.value.length);
    }
  }, 50);
}

// ---- Profile.js için dışa açılan erişimciler ----
export function getGalleryRows() {
  return allRows;
}
export function getUserInteractionSets() {
  return { likes: serverLikes, saves: serverSaves, purchases: serverPurchases };
}

// ---- Init: tüm statik event binding + delegation burada ----
export function initGallery() {
  applyDensity(getStoredDensity());
  $('searchInput').addEventListener('input', (e) => {
    searchTerm = e.target.value.trim().toLowerCase();
    applyFiltersAndRender();
  });

  const prodSel = document.getElementById('productTypeSelect');
  if (prodSel) {
    prodSel.addEventListener('change', (e) => {
      activeProductType = e.target.value || null;
      applyFiltersAndRender();
    });
  }
  const genderSel = document.getElementById('audienceGenderSelect');
  if (genderSel) {
    genderSel.addEventListener('change', (e) => {
      activeAudienceGender = e.target.value || null;
      applyFiltersAndRender();
    });
  }
  // Toggle davranışı — Kategoriler/Etiketler dropdownlarıyla aynı
  const prodToggle = document.getElementById('prodToggleBtn');
  if (prodToggle) {
    prodToggle.addEventListener('click', () => {
      document.getElementById('prodBody').classList.toggle('collapsed');
      document.getElementById('prodChev').classList.toggle('rotated');
    });
  }
  const genderToggle = document.getElementById('genderToggleBtn');
  if (genderToggle) {
    genderToggle.addEventListener('click', () => {
      document.getElementById('genderBody').classList.toggle('collapsed');
      document.getElementById('genderChev').classList.toggle('rotated');
    });
  }

  $('sidebarToggleBtn').addEventListener('click', () => $('sidebar').classList.toggle('open'));

  $('densityToggleBtn').addEventListener('click', () => {
    const order = ['compact', 'standard', 'comfortable'];
    const current = getStoredDensity();
    const next = order[(order.indexOf(current) + 1) % order.length];
    setStoredDensity(next);
    applyDensity(next);
  });

  $('refreshBtn')?.addEventListener('click', loadData);

  $('sortBtn').addEventListener('click', () => $('sortMenu').classList.toggle('open'));
  $('sortNewestBtn').addEventListener('click', () => setSort('newest'));
  $('sortOldestBtn').addEventListener('click', () => setSort('oldest'));
  $('sortMostViewedBtn').addEventListener('click', () => setSort('most-viewed'));
  $('sortMostLikedBtn').addEventListener('click', () => setSort('most-liked'));
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
      toggleInteraction(likeBtn.dataset.likeId, 'like');
      return;
    }
    const saveBtn = e.target.closest('[data-save-id]');
    if (saveBtn) {
      e.stopPropagation();
      toggleInteraction(saveBtn.dataset.saveId, 'save');
      return;
    }
    const tile = e.target.closest('[data-open-idx]');
    if (tile) openModal(Number(tile.dataset.openIdx));
  });

  $('modalBackdrop').addEventListener('click', (e) => {
    if (e.target === $('modalBackdrop')) closeModal();
  });
  document.querySelectorAll('#promptSection .btn').forEach((btn) => {
    if (btn.id === 'useInVisualBtn') btn.addEventListener('click', useInVisualGenerator);
    else btn.addEventListener('click', closeModal);
  });
  const copyIconBtn = $('copyIconBtn');
  if (copyIconBtn) copyIconBtn.addEventListener('click', copyPromptFromIcon);

  $('unlockBtn').addEventListener('click', unlockWithCredits);
  document.querySelectorAll('#paywallSection .btn').forEach((btn) => {
    if (btn.id !== 'unlockBtn') btn.addEventListener('click', closeModal);
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeModal();
  });

  // Giriş/çıkış olduğunda (ör. login sonrası balance event'i) etkileşim setlerini tazele
  onBalanceChange(async () => {
    await fetchUserInteractions();
    renderGrid();
  });
}

function toggleSection(key) {
  const body = document.getElementById(key + 'Body');
  const chev = document.getElementById(key + 'Chev');
  const isOpen = body.style.display !== 'none';
  body.style.display = isOpen ? 'none' : key === 'cat' ? 'flex' : 'block';
  chev.style.transform = isOpen ? 'rotate(-90deg)' : 'rotate(0deg)';
}

const SORT_LABELS = {
  'newest': 'En yeni',
  'oldest': 'En eski',
  'most-viewed': 'En çok görüntülenen',
  'most-liked': 'En çok beğenilen'
};

function setSort(order) {
  sortOrder = order;
  $('sortLabel').textContent = SORT_LABELS[order] || 'En yeni';
  $('sortNewestBtn').classList.toggle('active', order === 'newest');
  $('sortOldestBtn').classList.toggle('active', order === 'oldest');
  $('sortMostViewedBtn').classList.toggle('active', order === 'most-viewed');
  $('sortMostLikedBtn').classList.toggle('active', order === 'most-liked');
  $('sortMenu').classList.remove('open');
  applySortOrder();
  applyFiltersAndRender();
}