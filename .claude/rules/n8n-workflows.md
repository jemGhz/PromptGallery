---
paths:
  - "**/n8n/**/*.json"
  - "**/workflows/**/*.json"
---

# n8n Workflow Kuralları

- 0 satır dönen node'lar workflow'u sessizce durdurabilir. Bunu önlemek için `runOnceForAllItems` kullan.
- JWT payload'ı nested geliyor — flat okuma yapma, önce payload yapısını kontrol et.
- Şu workflow'lar ayrı duruyor, birleştirme: public/premium galeri listeleme, toggle interactions, user notifications, Gemini üzerinden prompt üretimi.
- Yeni workflow eklerken mevcut isimlendirme ve `client_id` / `item_source:item_id` desenine uy.
- Sunucu: self-hosted n8n, Docker + Tailscale (`jg-n8n-server`). Bağlantı sorunlarında önce Tailscale durumunu kontrol et.