// src/notifications.js
// Bell ikonuna tıklayınca açılan dropdown (sortBtn/sortMenu pattern'iyle aynı mantık).

import { escapeHtml } from './utils.js';
import { authHeaders } from './auth.js';
import { NOTIFICATIONS_URL, MARK_NOTIFICATION_READ_URL } from './config.js';

let notifications = [];
let isOpen = false;

function $(id) {
  return document.getElementById(id);
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
        <div class="notif-item-title">${escapeHtml(n.title)}</div>
        <div class="notif-item-desc">${escapeHtml(n.message)}</div>
        <div class="notif-item-time">${escapeHtml(n.time || '')}</div>
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
    const item = e.target.closest('.notif-item');
    if (!item) return;
    markAsRead(item.dataset.notifId);
  });

  fetchNotifications();
}