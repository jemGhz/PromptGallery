# JG Studio

Pinterest tarzı görsel galeri. Kredi bazlı premium prompt paywall'ı, Telegram admin botları, watermark işleme, kullanıcı etkileşim (like/save) sistemi içerir.

## Stack

- **Backend/otomasyon:** n8n (self-hosted, Docker + Tailscale, sunucu: `jg-n8n-server`)
- **Veritabanı:** Supabase (proje ref: `awnbasnfrhurgbvowcbe`)
- **Frontend:** Vite + vanilla JS, Vercel'de host ediliyor
- **Bot:** Telegram — prompt üretimi ve bildirim yönetimi için AYRI iki bot

Detaylı kurallar `.claude/rules/` altında, ilgili dosya türüyle çalışırken otomatik yükleniyor. Bu dosyayı 200 satırın altında tut.

## Yapı

- `src/tabs/*.js` → her sekme kendi dosyasında: `gallery`, `promptGenerator`, `characterGenerator`, `visualGenerator`, `profile`
- `src/styles/*.css` → her özelliğin kendi CSS dosyası, ortak stiller `base.css`'te
- `src/*.js` (kök) → paylaşılan modüller: `auth`, `state`, `config`, `credits`, `notifications`, `utils`
- `.claude/rules/` → path-scoped kurallar (`frontend.md`, `n8n-workflows.md`, `supabase-schema.md`)

Yeni bir tab eklerken var olan tab dosyalarının (örn. `promptGenerator.js`) state/UI desenini takip et.

## Mimari kararlar (asla değiştirme, önce sor)

- İki ayrı Telegram bot var: biri prompt üretimi, diğeri bildirim yönetimi için. Tek bot kullanmak webhook çakışmasına yol açıyor — birleştirme.
- `user_interactions` tablosu composite key kullanıyor: `item_source:item_id`. Sebep: `public_items` ve `premium_items` arasında ID çakışmasını önlemek. Bu tablolarla ilgili iş bitmiş olsa bile bu deseni bozma — tabloya tekrar dokunulursa bu kural hâlâ geçerli.
- Watermark 4 yönlü drop-shadow tekniğiyle uygulanıyor; pozisyon hesaplarken `$json.size.width` kullan, flat `$json.width` **değil** (daha önce bug'a sebep oldu).

## Şu an aktif iş

- **Görsel Oluşturucu** (`src/tabs/visualGenerator.js`) ve **AI Avatar / Karakter Oluşturucu** (`src/tabs/characterGenerator.js`) henüz inşa edilmedi — asıl aktif çalışma burası. `promptGenerator.js`'deki yükleme/state desenini referans al.
- Bildirim paneli sadece sayfa refresh'inde güncelleniyor. `auth.js` içine `refreshNotifications()` entegrasyonu henüz tamamlanmadı — bir şey değiştirmeden önce bu dosyanın güncel halini oku.
- Monolitik HTML'den modüler Vite mimarisine geçiş sürüyor. Yeni kod yazarken eski monolitik dosyalara referans ekleme.
- Frontend–backend entegrasyon noktaları (JWT'li n8n webhook'ları, Supabase tabloları, profil sekmesi) kısmen tamamlandı — bir endpoint'e dokunmadan önce ilgili n8n workflow'unun güncel halini kontrol et.

## Build / komutlar

<!-- Aşağıdakiler Vite'ın standart komutları — package.json'dan doğrula, farklıysa düzelt -->
- `npm run dev` — geliştirme sunucusu
- `npm run build` — production build
- (varsa) lint/test komutunu buraya ekle

## Asla yapma

- `node_modules`, build çıktıları, watermark cache dizinlerini tarama/okuma (bkz. `.claude/settings.json` deny listesi)
- `user_interactions` tablosunun key yapısını değiştirme
- İki Telegram bot'u tek webhook'ta birleştirme
- Supabase anahtarları, JWT secret, Telegram bot token'larını koda hardcode etme — bunlar `.env`'de kalmalı