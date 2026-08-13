---
paths:
  - "**/supabase/**/*"
  - "**/*.sql"
---

# Supabase Kuralları

- Proje ref: `awnbasnfrhurgbvowcbe`
- `user_interactions` tablosu composite key kullanıyor: `item_source:item_id`. Bu, `public_items` ve `premium_items` arasında ID çakışmasını önlemek için bilinçli bir tasarım kararı — normalize etmeye/tekilleştirmeye çalışma.
- Yeni migration eklerken mevcut RLS politikalarını koru, tenant/kullanıcı izolasyonunu bozma.

## Tablo şemaları

- **`profiles`** — `email` (PK, text), `name`, `username`, `picture`, `first_seen_at` (timestamptz), `last_seen_at` (timestamptz)

- **`credits`** — `email` (PK, text), `user_id` (uuid), `balance` (int4), `marketing_opt_in` (bool), `updated_at` (timestamptz)

- **`generation_history`** — `id` (PK, uuid), `email`, `generation_type`, `kredi_harcanan` (int4), `item_id`, `created_at` (timestamptz)

- **`prompt_generations`** — `id` (PK, uuid), `email`, `image_url`, `prompt_text`, `has_person` (bool), `person_gender`, `style_tags`, `category`, `product_type`, `created_at` (timestamptz)

- **`bot_conversation_state`** — `chat_id` (PK, text), `step`, `data` (jsonb), `updated_at` (timestamptz)

- **`notifications`** — `id` (PK, uuid), `title`, `body`, `type`, `scheduled_at` (timestamptz), `recurrence_hours` (int4), `next_fire_at` (timestamptz), `is_active` (bool), `created_at` (timestamptz)

- **`user_notifications`** — `id` (PK, uuid), `user_id`, `notification_id` (uuid, → `notifications.id`), `sent_at` (timestamptz), `read_at` (timestamptz)

- **`onboarding_responses`** — `id` (PK, uuid), `email`, `use_reasons` (text[]), `custom_reason`, `heard_from`, `skipped` (bool), `created_at` (timestamptz)

- **`user_interactions`** — composite PK: `email` + `item_id` + `item_source` + `interaction_type` (hepsi text), `created_at` (timestamptz). Bkz. yukarıdaki composite key notu.

- **`public_items`** — `id` (PK, **uuid**), `prompt_text`, `etiketler`, `gorsel_link`, `kategori`, `product_type`, `audience_gender`, `telegram_user_id`, `created_at` (timestamptz)

- **`premium_items`** — `id` (PK, **text** — public_items'tan farklı tip, dikkat), `prompt_text`, `maliyet` (int4), `etiketler`, `gorsel_link`, `kategori`, `product_type`, `audience_gender`, `telegram_user_id`, `created_at` (timestamptz)

- **`redeem_codes`** — `id` (PK, uuid), `kod`, `puan` (int4), `aktif` (bool), `used_by_email`, `used_at` (timestamptz), `created_at` (timestamptz)

- **`unlocks`** — composite PK: `email` + `item_id` (text), `unlocked_at` (timestamptz). `item_id` → `premium_items.id` (FK). `redeem_codes` ile doğrudan bir ilişkisi yok — kod kullanımı `redeem_codes.puan` üzerinden kredi/puan kazandırıyor, item unlock etmiyor.

## Bilinen tutarsızlıklar (yeni kolon/tablo eklerken referans alma)

- `premium_items.id` text, `public_items.id` uuid — aynı kavramsal varlık ("item") için iki farklı PK tipi. Yeni kod yazarken bu ikisini join edeceksen tip dönüşümüne dikkat et.
- Kolon isimlerinde Türkçe (`kod`, `puan`, `aktif`, `maliyet`, `kredi_harcanan`, `etiketler`, `gorsel_link`, `kategori`) ve İngilizce (`email`, `balance`, `created_at`) karışık kullanılmış. Yeni kolon eklerken hangi tabloya ekliyorsan o tablonun mevcut dilini takip et, tutarlı bir kural yok.