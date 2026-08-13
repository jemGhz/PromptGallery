---
paths:
  - "src/**/*.js"
  - "src/**/*.ts"
  - "**/vite.config.*"
---

# Frontend (Vite + vanilla JS) Kuralları

- Proje monolitik HTML'den modüler Vite mimarisine geçiyor. Yeni özellik eklerken modüler yapıyı kullan, eski monolitik dosyaya referans verme.
- Bildirim paneli şu an sadece sayfa refresh'inde güncelleniyor. `auth.js` içine `refreshNotifications()` entegrasyonu tamamlanana kadar bu bilinen bir kısıtlama — "neden otomatik güncellenmiyor" diye tekrar debug etme, önce bu notu kontrol et.
- n8n webhook çağrıları JWT ile authenticate ediliyor — token'ın frontend'de taşınma şeklini değiştirmeden önce ilgili n8n workflow'una bak.
- Supabase client çağrılarında tablo/şema isimlerini `.claude/rules/supabase-schema.md`'den doğrula.