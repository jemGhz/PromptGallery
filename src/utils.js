// src/utils.js
// Genel amaçlı yardımcı fonksiyonlar. Statüsü: "Tamamlanan dosyalar" listesinde
// zaten var olarak işaretlenmişti — burada, geri kalan modüllerin import edebilmesi
// için aynı isim/imzalarla yeniden üretildi. Kendi mevcut dosyanla farkı varsa
// (ör. ek fonksiyon eklemişsindir), bu dosyayı onunla birleştir.

export function escapeAttr(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function escapeHtml(s) {
  const div = document.createElement('div');
  div.textContent = s;
  return div.innerHTML;
}

// n8n Respond to Webhook çıktısı her item'ı {"json": {...}} şeklinde sarmalıyor.
export function unwrap(raw) {
  return raw && raw.json ? raw.json : raw;
}

export function getDeviceId() {
  let id = localStorage.getItem('jg_device_id');
  if (!id) {
    id = 'dev_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2);
    localStorage.setItem('jg_device_id', id);
  }
  return id;
}

export function resizeImageToBase64(file, maxDim) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Dosya okunamadı.'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Görsel yüklenemedi.'));
      img.onload = () => {
        let { width, height } = img;
        if (width > maxDim || height > maxDim) {
          const scale = maxDim / Math.max(width, height);
          width = Math.round(width * scale);
          height = Math.round(height * scale);
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        canvas.getContext('2d').drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
        resolve({ base64: dataUrl.split(',')[1], mimeType: 'image/jpeg', dataUrl });
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

export function seededRandom(seed, min, max) {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return min + (hash % (max - min + 1));
}

const statCache = {};
export function getViewCount(id) {
  const key = 'v_' + id;
  if (!(key in statCache)) statCache[key] = seededRandom(key, 40, 2400);
  return statCache[key];
}
export function getLikeCount(id) {
  const key = 'l_' + id;
  if (!(key in statCache)) statCache[key] = seededRandom(key, 3, 180);
  return statCache[key];
}
export function formatCount(n) {
  if (n >= 1000) return (n / 1000).toFixed(1).replace('.0', '') + 'b';
  return String(n);
}
