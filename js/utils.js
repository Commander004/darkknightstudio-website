/* =====================================================
   DARKKNIGHT STUDIO — Utilities
   ===================================================== */

window.DK = window.DK || {};
var DK = window.DK;

/** Sanitize text for safe HTML insertion */
DK.escapeHtml = function (str) {
  if (str == null) return '';
  const div = document.createElement('div');
  div.textContent = String(str);
  return div.innerHTML;
};

/** Format date for Persian display */
DK.formatDate = function (dateStr) {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('fa-IR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  } catch {
    return dateStr;
  }
};

/** Format relative time */
DK.timeAgo = function (dateStr) {
  if (!dateStr) return '';
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const sec = Math.floor((now - then) / 1000);
  if (sec < 60) return 'همین الان';
  if (sec < 3600) return Math.floor(sec / 60) + ' دقیقه پیش';
  if (sec < 86400) return Math.floor(sec / 3600) + ' ساعت پیش';
  if (sec < 604800) return Math.floor(sec / 86400) + ' روز پیش';
  return DK.formatDate(dateStr);
};

/** Toast notification */
DK.toast = function (message, type = 'info', duration = 3500) {
  const container = document.getElementById('toast-container');
  if (!container) return;
  const el = document.createElement('div');
  el.className = `toast toast-${type}`;
  el.textContent = message;
  container.appendChild(el);
  setTimeout(() => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(8px)';
    setTimeout(() => el.remove(), 300);
  }, duration);
};

/** Simple confirmation dialog */
DK.confirm = function (message) {
  return window.confirm(message);
};

/** Generate a random token */
DK.randomToken = function (len = 32) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  const arr = new Uint8Array(len);
  crypto.getRandomValues(arr);
  for (let i = 0; i < len; i++) {
    result += chars[arr[i] % chars.length];
  }
  return result;
};

/** Debounce */
DK.debounce = function (fn, ms = 300) {
  let timer;
  return function (...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), ms);
  };
};

/** Status label in Persian */
DK.statusLabel = function (status) {
  const map = {
    ONLINE: 'آنلاین',
    OFFLINE: 'آفلاین',
    IN_DEVELOPMENT: 'در حال توسعه',
    ARCHIVED: 'آرشیو شده',
    DRAFT: 'پیش‌نویس',
    PUBLISHED: 'منتشر شده',
    OPEN: 'باز',
    IN_PROGRESS: 'در حال بررسی',
    WAITING: 'در انتظار',
    CLOSED: 'بسته شده',
    PENDING: 'در انتظار',
    ACCEPTED: 'پذیرفته شده',
    REJECTED: 'رد شده'
  };
  return map[status] || status;
};

/** Status CSS class */
DK.statusClass = function (status) {
  return 'status-' + String(status || '').toLowerCase().replace(/\s+/g, '_');
};

/** Truncate text */
DK.truncate = function (str, max = 120) {
  if (!str) return '';
  str = String(str);
  if (str.length <= max) return str;
  return str.slice(0, max).trim() + '…';
};

/** Get visitor fingerprint (simple, for rate limiting) */
DK.getVisitorId = function () {
  let id = localStorage.getItem('dk_vid');
  if (!id) {
    id = DK.randomToken(24);
    localStorage.setItem('dk_vid', id);
  }
  return id;
};

/** Simple rate limit check (client side helper) */
DK.canIncrementView = function () {
  const key = 'dk_last_view';
  const last = parseInt(localStorage.getItem(key) || '0', 10);
  const now = Date.now();
  // 30 minutes cooldown
  if (now - last < 30 * 60 * 1000) return false;
  localStorage.setItem(key, String(now));
  return true;
};

/** Query selector helpers */
DK.$ = (sel, ctx = document) => ctx.querySelector(sel);
DK.$$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];

/** Set year in footer */
document.addEventListener('DOMContentLoaded', () => {
  const yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();
});

window.DK = DK;
