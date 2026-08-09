// src/notifications.js
// Bell ikonuna tıklayınca açılan dropdown (sortBtn/sortMenu pattern'iyle aynı mantık).

import { escapeHtml } from './utils.js';
import { authHeaders } from './auth.js';
import { NOTIFICATIONS_URL, MARK_NOTIFICATION_READ_URL, DELETE_NOTIFICATION_URL } from './config.js';

let notifications = [];
let isOpen = false;

function $(id) {
  return document.getElementById(id);
}

function relativeTime(isoString) {
  if (!isoString) return '';
  const then = new Date(isoString).getTime();
  if (isNaN(then)) return '';
  const diffSec = Math.floor((Date.now() - then) / 1000);

  if (diffSec < 60) return 'Şimdi';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin} dk önce`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour} saat önce`;
  const diffDay = Math.floor(diffHour / 24);
  return `${diffDay} gün önce`;
}

function unreadCount() {
  return notifications.filter((n) => !n.read).length;
}

function updateBadge() {
  const badge = $('notifBadge');
  const count = unreadCount();
  if (count > 0) {
    badge.textContent = count > 9 ? '9+' : String(count);
    badge.style.display = 'flex';
  } else {
    badge.style.display = 'none';
  }
}

function renderNotifications() {
  const list = $('notifList');

  if (notifications.length === 0) {
    list.innerHTML = `<div class="notif-empty">Henüz bildirim yok.</div>`;
    return;
  }

  list.innerHTML = notifications
    .map(
      (n) => `
      <div class="notif-item ${n.read ? '' : 'unread'}" data-notif-id="${escapeHtml(n.id)}">
        <button class="notif-item-delete" data-notif-delete="${escapeHtml(n.id)}" title="Sil" aria-label="Bildirimi sil">✕</button>
        <div class="notif-item-title">${escapeHtml(n.title)}</div>
        <div class="notif-item-desc">${escapeHtml(n.message)}</div>
        <div class="notif-item-time">${escapeHtml(relativeTime(n.time))}</div>
      </div>`
    )
    .join('');
}

function openPanel() {
  isOpen = true;
  $('notifMenu').classList.add('open');
}

function closePanel() {
  isOpen = false;
  $('notifMenu').classList.remove('open');
}

function togglePanel() {
  isOpen ? closePanel() : openPanel();
}

async function markAsRead(id) {
  const notif = notifications.find((n) => n.id === id);
  if (!notif || notif.read) return;

  // Optimistic update: kullanıcı tıkladığı an UI'da hemen okundu göster.
  notif.read = true;
  renderNotifications();
  updateBadge();

  try {
    await fetch(MARK_NOTIFICATION_READ_URL, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ notification_id: id })
    });
  } catch (err) {
    console.warn('Okundu işaretlenemedi:', err.message);
  }
}

async function deleteNotification(id) {
  const idx = notifications.findIndex((n) => n.id === id);
  if (idx === -1) return;

  // Optimistic delete: hemen listeden çıkar.
  const removed = notifications[idx];
  notifications.splice(idx, 1);
  renderNotifications();
  updateBadge();

  try {
    const res = await fetch(DELETE_NOTIFICATION_URL, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ notification_id: id })
    });
    if (!res.ok) throw new Error('İstek başarısız: ' + res.status);
  } catch (err) {
    console.warn('Bildirim silinemedi:', err.message);
    // Başarısız olursa geri ekle.
    notifications.splice(idx, 0, removed);
    renderNotifications();
    updateBadge();
  }
}

async function fetchNotifications() {
  try {
    const res = await fetch(NOTIFICATIONS_URL, { headers: authHeaders() });
    const data = await res.json();
    notifications = Array.isArray(data.notifications) ? data.notifications : [];
  } catch (err) {
    console.warn('Bildirimler alınamadı:', err.message);
    notifications = [];
  }
  renderNotifications();
  updateBadge();
}

export function initNotifications() {
  renderNotifications();
  updateBadge();

  $('notifBellBtn').addEventListener('click', (e) => {
    e.stopPropagation();
    togglePanel();
  });

  // Dışarı tıklayınca kapansın.
  document.addEventListener('click', (e) => {
    if (isOpen && !$('notifWrap').contains(e.target)) closePanel();
  });

  // Event delegation: notifList her yeniden render edildiğinde
  // yeniden bind etmeye gerek yok, tek seferlik listener yeterli.
  $('notifList').addEventListener('click', (e) => {
    const deleteBtn = e.target.closest('[data-notif-delete]');
    if (deleteBtn) {
      e.stopPropagation();
      deleteNotification(deleteBtn.dataset.notifDelete);
      return;
    }
    const item = e.target.closest('.notif-item');
    if (!item) return;
    markAsRead(item.dataset.notifId);
  });

  fetchNotifications();
}

/** Çıkış yapıldığında auth.js tarafından çağrılır — bellekteki bildirimleri temizler. */
export function resetNotifications() {
  notifications = [];
  isOpen = false;
  const menu = $('notifMenu');
  if (menu) menu.classList.remove('open');
  renderNotifications();
  updateBadge();
}

/** Giriş başarılı olduğunda auth.js tarafından çağrılır — token artık hazır, bildirimleri gerçek kullanıcı için tekrar çeker. */
export function refreshNotifications() {
  fetchNotifications();
}