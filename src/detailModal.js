// src/detailModal.js
// Full-screen detay modal - profildeki tüm öğeler (görseller, karakterler, koleksiyon promptları) için
import { switchTab } from './tabState.js';
import { escapeHtml, escapeAttr } from './utils.js';
import { isLoggedIn, authHeaders } from './auth.js';
import { GENERATED_VISUAL_DELETE_URL } from './config.js';

let currentItems = [];
let currentIndex = 0;
let currentContext = 'generic';
let onDeleteCallback = null; // silinince listeyi yenilemek için

/**
 * Detay modal'ını aç
 * @param {Array} items - Gezinilecek öğe listesi
 * @param {number} index - Başlangıç indeksi
 * @param {Object} opts - { context: 'generated-visuals'|'generated-prompts'|'characters'|'gallery', onDelete: fn }
 */
export function openDetailModal(items, index = 0, opts = {}) {
    currentItems = Array.isArray(items) ? items.filter(Boolean) : [items];
    if (currentItems.length === 0) return;
    currentIndex = Math.max(0, Math.min(index, currentItems.length - 1));
    currentContext = opts.context || 'generic';
    onDeleteCallback = opts.onDelete || null;

    const modal = document.getElementById('detailModal');
    if (!modal) {
        console.error('detailModal not in DOM');
        return;
    }

    render();
    modal.classList.add('open');
    document.body.style.overflow = 'hidden';
}

export function closeDetailModal() {
    const modal = document.getElementById('detailModal');
    if (!modal) return;
    modal.classList.remove('open');
    document.body.style.overflow = '';
    currentItems = [];
    currentIndex = 0;
    onDeleteCallback = null;
}

// ---- Item field extractors (farklı item şekillerini normalize et) ----

function getImgUrl(item) {
    return item.image_url || item.gorselLink || item.url || '';
}
function getPromptText(item) {
    return item.prompt_text || item.promptText || '';
}
function getCreatedAt(item) {
    return item.created_at || item.tarih || item.createdAt || '';
}
function getProvider(item) {
    const p = item.provider || '';
    const providerLabels = {
        gemini_paid: 'Gemini (Nano Banana)',
        free_draft: 'Cloudflare AI',
        openai: 'OpenAI (GPT Image)'
    };
    return providerLabels[p] || p || '—';
}
function getAspectRatio(item) {
    return item.aspect_ratio || item.aspectRatio || '';
}
function getName(item) {
    return item.name || '';
}
function getId(item) {
    return String(item.id || '');
}

// ---- Render ----

function render() {
    const item = currentItems[currentIndex];
    if (!item) return;

    const $ = (id) => document.getElementById(id);

    const imgUrl = getImgUrl(item);
    const promptText = getPromptText(item);
    const createdAt = getCreatedAt(item);
    const provider = getProvider(item);
    const aspectRatio = getAspectRatio(item);
    const name = getName(item);
    const id = getId(item);

    // Image
    const img = $('detailImg');
    if (img) img.src = imgUrl;

    // Prompt / description
    const promptEl = $('detailPrompt');
    if (promptEl) {
        if (promptText) {
            promptEl.textContent = promptText;
            promptEl.style.color = '';
        } else if (name) {
            promptEl.textContent = name;
            promptEl.style.color = 'var(--ink-dim)';
        } else {
            promptEl.textContent = 'Prompt bilgisi yok.';
            promptEl.style.color = 'var(--ink-dim)';
        }
    }

    // Date
    const dateEl = $('detailDate');
    if (dateEl) {
        dateEl.textContent = createdAt
            ? new Date(createdAt).toLocaleDateString('tr-TR', {
                day: 'numeric', month: 'short', year: 'numeric',
                hour: '2-digit', minute: '2-digit'
            })
            : '—';
    }

    // Model
    const modelEl = $('detailModel');
    if (modelEl) modelEl.textContent = provider;

    // Size
    const sizeEl = $('detailSize');
    if (sizeEl) sizeEl.textContent = aspectRatio || '—';

    // ID
    const idEl = $('detailId');
    if (idEl) idEl.textContent = id ? 'img_' + id.substring(0, 8) : '—';

    // Thumbnails strip
    renderThumbnails();

    // Nav arrows
    const prevBtn = $('detailPrevBtn');
    const nextBtn = $('detailNextBtn');
    if (prevBtn) prevBtn.style.visibility = currentIndex > 0 ? 'visible' : 'hidden';
    if (nextBtn) nextBtn.style.visibility = currentIndex < currentItems.length - 1 ? 'visible' : 'hidden';

    // User info card - dynamic
    renderUserInfo();

    // Adapt buttons based on context
    adaptButtonsToContext();
}

function renderThumbnails() {
    const strip = document.getElementById('detailThumbs');
    if (!strip) return;

    const total = currentItems.length;
    if (total <= 1) {
        strip.innerHTML = '';
        return;
    }

    // Show 5 thumbnails max, centered around current
    const half = 2;
    let start = Math.max(0, currentIndex - half);
    let end = Math.min(total, start + 5);
    if (end - start < 5) start = Math.max(0, end - 5);

    const shown = currentItems.slice(start, end);
    strip.innerHTML = shown.map((it, i) => {
        const actualIdx = start + i;
        const url = getImgUrl(it);
        return `<div class="detail-thumb ${actualIdx === currentIndex ? 'active' : ''}" data-thumb-idx="${actualIdx}">
      <img src="${escapeAttr(url)}" alt="" loading="lazy">
    </div>`;
    }).join('');

    strip.querySelectorAll('[data-thumb-idx]').forEach((el) => {
        el.addEventListener('click', () => {
            currentIndex = Number(el.dataset.thumbIdx);
            render();
        });
    });
}

function renderUserInfo() {
    let name = 'Kullanıcı', email = '', picture = '', username = '';
    try {
        name = localStorage.getItem('userName') || 'Kullanıcı';
        email = localStorage.getItem('userEmail') || '';
        picture = localStorage.getItem('userPicture') || '';
        username = localStorage.getItem('userUsername') || '';
    } catch (e) { }

    const handle = username ? '@' + username : (email ? '@' + email.split('@')[0] : '');
    const initials = name.split(' ').map(p => p[0] || '').join('').slice(0, 2).toUpperCase();

    const nameEl = document.getElementById('detailUserName');
    const handleEl = document.getElementById('detailUserHandle');
    const avatarEl = document.getElementById('detailAvatar');

    if (nameEl) nameEl.textContent = name;
    if (handleEl) handleEl.textContent = handle + (email ? ' · ' + email : '');
    if (avatarEl) {
        if (picture) {
            avatarEl.innerHTML = `<img src="${escapeAttr(picture)}" alt="">`;
        } else {
            avatarEl.textContent = initials || 'U';
        }
    }
}

function adaptButtonsToContext() {
    // Sil: sadece kullanıcının kendi içeriğinde (üretilen görsel/karakter)
    const canDelete = currentContext === 'generated-visuals' || currentContext === 'characters';
    const delBtn = document.getElementById('detailDelBtn');
    if (delBtn) {
        delBtn.disabled = !canDelete;
        delBtn.title = canDelete ? 'Bu içeriği sil' : 'Bu içerik silinemez (koleksiyondan)';
    }

    // Bu Prompt ile Oluştur: sadece prompt varsa aktif
    const useBtn = document.getElementById('detailUseBtn');
    const hasPrompt = !!getPromptText(currentItems[currentIndex]);
    if (useBtn) {
        useBtn.disabled = !hasPrompt;
        useBtn.title = hasPrompt ? '' : 'Prompt bulunmadığı için kullanılamaz';
    }

    // Kopyala butonu
    const copyBtn = document.getElementById('detailCopyBtn');
    if (copyBtn) copyBtn.disabled = !hasPrompt;
}

// ---- Navigation ----

function next() {
    if (currentIndex < currentItems.length - 1) {
        currentIndex++;
        render();
    }
}
function prev() {
    if (currentIndex > 0) {
        currentIndex--;
        render();
    }
}

// ---- Actions ----

function downloadCurrent() {
    const item = currentItems[currentIndex];
    const url = getImgUrl(item);
    if (!url) return;
    const a = document.createElement('a');
    a.href = url;
    a.download = 'vero-scena-' + (getId(item) || Date.now()) + '.png';
    a.target = '_blank';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
}

async function shareCurrent() {
    const item = currentItems[currentIndex];
    const url = getImgUrl(item);
    if (!url) return;

    const shareData = { title: 'Vero Scena', text: 'AI ile oluşturulan görsel', url };

    if (navigator.share) {
        try {
            await navigator.share(shareData);
        } catch (err) {
            // user cancelled or share failed
        }
    } else {
        // Fallback: WhatsApp
        window.open(`https://wa.me/?text=${encodeURIComponent(url)}`, '_blank');
    }
}

async function deleteCurrent() {
    const item = currentItems[currentIndex];
    if (!confirm('Bu görsel silinsin mi? Bu işlem geri alınamaz.')) return;

    if (currentContext === 'generated-visuals') {
        if (!GENERATED_VISUAL_DELETE_URL || GENERATED_VISUAL_DELETE_URL.includes('YOUR-N8N-URL')) {
            alert('Silme servisi bağlı değil.');
            return;
        }

        try {
            const res = await fetch(GENERATED_VISUAL_DELETE_URL, {
                method: 'POST',
                headers: authHeaders(),
                body: JSON.stringify({
                    id: getId(item),
                    image_url: getImgUrl(item)
                }),
            });
            if (!res.ok) throw new Error('HTTP ' + res.status);

            // Cache invalidation + list refresh via callback
            currentItems.splice(currentIndex, 1);

            if (typeof onDeleteCallback === 'function') {
                onDeleteCallback(item);
            }

            if (currentItems.length === 0) {
                closeDetailModal();
            } else {
                currentIndex = Math.min(currentIndex, currentItems.length - 1);
                render();
            }
        } catch (err) {
            alert('Silme hatası: ' + err.message);
        }
    } else if (currentContext === 'characters') {
        alert('Karakter silme henüz aktif değil.');
    }
}

function copyPrompt() {
    const prompt = getPromptText(currentItems[currentIndex]);
    if (!prompt) return;
    navigator.clipboard.writeText(prompt).then(() => {
        const btn = document.getElementById('detailCopyBtn');
        if (btn) {
            btn.classList.add('copied');
            const label = btn.querySelector('.copy-label');
            const orig = label ? label.textContent : '';
            if (label) label.textContent = 'Kopyalandı ✓';
            setTimeout(() => {
                btn.classList.remove('copied');
                if (label) label.textContent = orig;
            }, 1400);
        }
    });
}

function useInVisualGen() {
    const prompt = getPromptText(currentItems[currentIndex]);
    if (!prompt) return;

    closeDetailModal();
    switchTab('visual');

    setTimeout(() => {
        const input = document.getElementById('genPromptInput');
        if (input) {
            input.value = prompt;
            input.dispatchEvent(new Event('input', { bubbles: true }));
            input.focus();
            input.setSelectionRange(input.value.length, input.value.length);
        }
    }, 60);
}

// ---- Init ----

export function initDetailModal() {
    const bind = (id, ev, fn) => {
        const el = document.getElementById(id);
        if (el) el.addEventListener(ev, fn);
    };

    bind('detailPrevBtn', 'click', prev);
    bind('detailNextBtn', 'click', next);
    bind('detailCloseBtn', 'click', closeDetailModal);
    bind('detailDownloadBtn', 'click', downloadCurrent);
    bind('detailShareBtn', 'click', shareCurrent);
    bind('detailDelBtn', 'click', deleteCurrent);
    bind('detailCopyBtn', 'click', copyPrompt);
    bind('detailUseBtn', 'click', useInVisualGen);

    // Close on backdrop click
    const modal = document.getElementById('detailModal');
    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeDetailModal();
        });
    }

    // Keyboard navigation
    document.addEventListener('keydown', (e) => {
        const m = document.getElementById('detailModal');
        if (!m || !m.classList.contains('open')) return;
        if (e.key === 'Escape') closeDetailModal();
        else if (e.key === 'ArrowLeft') prev();
        else if (e.key === 'ArrowRight') next();
    });
}