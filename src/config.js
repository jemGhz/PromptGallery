// src/config.js
// Tüm sabitler, n8n webhook URL'leri ve seçenek listeleri burada toplanır.
// Deploy ortamı Vercel: bu değerler env değişkeni değil; hepsi zaten public/client-side
// olduğu için (backend'e ayrı bir gizli anahtar iletmiyorlar) sabit tutmak sorun değil.
// Google Client ID de zaten public bir değerdir, env'e taşımaya gerek yok.

export const SHEET_ID = '1-n0pVWWzNKKodfB9TVXKC7hpQfJDPO_ZtzFE6gDqKBM';
export const SHEET_NAME = 'Sayfa1';
export const MAX_TOP_TAGS = 10;
export const ONBOARDING_STATUS_URL = 'https://jg-n8n-server.tail1c97b1.ts.net/webhook/onboarding-status';
export const ONBOARDING_SUBMIT_URL = 'https://jg-n8n-server.tail1c97b1.ts.net/webhook/onboarding-submit';
// TODO: bu path'i (premium-list) sen n8n'deki gerçek Webhook node'undan teyit et.
export const PREMIUM_LIST_URL = 'https://jg-n8n-server.tail1c97b1.ts.net/webhook/premium-list';
export const PUBLIC_LIST_URL = 'https://jg-n8n-server.tail1c97b1.ts.net/webhook/public-list';
// PREMIUM_VERIFY_URL kaldırıldı — eski "kod ile tek prompt açma" sistemi devre dışı,
// yerini UNLOCK_PREMIUM_URL (kredi ile açma) aldı.
// TODO: bu path'i (unlock-premium) sen n8n'deki gerçek Webhook node'undan teyit et.
export const UNLOCK_PREMIUM_URL = 'https://jg-n8n-server.tail1c97b1.ts.net/webhook/unlock-premium';

export const PROMPT_MAKER_URL = 'https://jg-n8n-server.tail1c97b1.ts.net/webhook/generate-prompt';
export const GEN_GENERATE_URL = 'https://jg-n8n-server.tail1c97b1.ts.net/webhook/generate-visual';
export const CHARACTER_GENERATE_URL = 'https://jg-n8n-server.tail1c97b1.ts.net/webhook/generate-character';
export const CHARACTER_SAVE_URL = 'https://jg-n8n-server.tail1c97b1.ts.net/webhook/save-character';
export const GOOGLE_LOGIN_VERIFY_URL = 'https://jg-n8n-server.tail1c97b1.ts.net/webhook/verify-google-login';

// ÖNEMLİ: bakiye ASLA sadece tarayıcıda tutulup ücretli işlem kararı buna göre
// verilmemeli; n8n tarafında Supabase'deki gerçek bakiye kontrol edilmeden
// generateCharacter/generateVisual/generatePrompt ÇALIŞTIRILMAMALI.
export const CREDIT_BALANCE_URL = 'https://jg-n8n-server.tail1c97b1.ts.net/webhook/credit-balance';
export const CREDIT_STRIPE_CHECKOUT_URL = 'https://jg-n8n-server.tail1c97b1.ts.net/webhook/credit-stripe-checkout';
// TODO: özet dosyanda bu workflow'un path'i "verify-credit-code" olarak geçiyordu,
// burada "credit-verify-code" yazıyordu — ikisi farklı. n8n'deki gerçek Path alanına bakıp düzelt.
export const CREDIT_VERIFY_CODE_URL = 'https://jg-n8n-server.tail1c97b1.ts.net/webhook/verify-credit-code';
export const TOGGLE_INTERACTION_URL = 'https://jg-n8n-server.tail1c97b1.ts.net/webhook/toggle-interaction';
export const USER_INTERACTIONS_URL = 'https://jg-n8n-server.tail1c97b1.ts.net/webhook/user-interactions';
export const GENERATED_PROMPTS_URL = 'https://jg-n8n-server.tail1c97b1.ts.net/webhook/generated-prompts-list';
export const GENERATED_VISUALS_URL = 'https://jg-n8n-server.tail1c97b1.ts.net/webhook/generated-visuals-list';
export const CHARACTERS_LIST_URL = 'https://jg-n8n-server.tail1c97b1.ts.net/webhook/characters-list';
export const GENERATED_VISUAL_DELETE_URL = 'https://jg-n8n-server.tail1c97b1.ts.net/webhook/generated-visual-delete';
export const NOTIFICATIONS_URL =     'https://jg-n8n-server.tail1c97b1.ts.net/webhook/user-notifications';
export const MARK_NOTIFICATION_READ_URL = 'https://jg-n8n-server.tail1c97b1.ts.net/webhook/mark-notification-read';
export const PURCHASE_HISTORY_URL = 'https://jg-n8n-server.tail1c97b1.ts.net/webhook/purchase-history';
export const DELETE_NOTIFICATION_URL = 'https://jg-n8n-server.tail1c97b1.ts.net/webhook/delete-notification';
export const SUPPORT_FORM_URL = 'https://jg-n8n-server.tail1c97b1.ts.net/webhook/support-form';

// TODO: bu path'leri (get-profile, save-profile) n8n'deki gerçek Webhook node'undan teyit et.
export const GET_PROFILE_URL = 'https://jg-n8n-server.tail1c97b1.ts.net/webhook/get-profile';
export const SAVE_PROFILE_URL = 'https://jg-n8n-server.tail1c97b1.ts.net/webhook/save-profile';


export const CREDIT_PACKAGES = [
  { id: 'pkg_10', credits: 10, price: '99 TL' },
  { id: 'pkg_25', credits: 25, price: '199 TL' },
  { id: 'pkg_60', credits: 60, price: '399 TL' }
];

export const AI_MODELS = [
  { key: 'gemini_paid', name: 'Gemini (Nano Banana)', icon: '✨', badge: 'Pro', desc: 'Daha yüksek limit ve öncelikli işleme.', creditCost: 2 },
  { key: 'openai', name: 'OpenAI (GPT Image)', icon: '🤖', badge: '', desc: 'OpenAI görsel üretim modeli; yüksek detay ve prompt takibi.', creditCost: 3, comingSoon: false },
  { key: 'stability', name: 'Stability AI SDXL (Yakında)', icon: '🧬', badge: '', desc: 'Stable Diffusion tabanlı, esnek ve özelleştirmeye açık model.', creditCost: 2, comingSoon: true },
  { key: 'flux', name: 'Flux Pro (Yakında)', icon: '⚡', badge: '', desc: 'Fotogerçekçi sonuçlar ve gelişmiş prompt takibi.', creditCost: 4, comingSoon: true },
  { key: 'free_draft', name: 'Hızlı Taslak (Ücretsiz)', icon: '🎨', badge: 'Ücretsiz', desc: 'Watermark\'lı, düşük maliyetli taslak model.', creditCost: 0 }
];

export const AVATAR_PROVIDERS = [
  { key: 'gemini_paid', name: 'Gemini (Ücretli Katman)', icon: '✨', badge: 'Pro', desc: 'Google Gemini ücretli/Pro katman; daha yüksek limit ve öncelikli işleme.', creditCostPerImage: 2 },
  { key: 'openai', name: 'OpenAI (GPT Image)', icon: '🤖', badge: '', desc: 'OpenAI görsel üretim modeli; yüksek detay ve prompt takibi.', creditCostPerImage: 3 }
];

export const CAMERA_OPTIONS = ['Ön çekim','Yakın plan','Kuş bakışı','Alçak açı','Yandan (profil)','Geniş açı','Makro','Drone çekimi'];
export const CAMERA_OPTION_IMAGES = {
  'Ön çekim': '/thumbnails/camera/on-cekim.webp',
  'Yakın plan': '/thumbnails/camera/yakin-plan.webp',
  'Kuş bakışı': '/thumbnails/camera/kus-bakisi.webp',
  'Alçak açı': '/thumbnails/camera/alcak-aci.webp',
  'Yandan (profil)': '/thumbnails/camera/yandan-profil.webp',
  'Geniş açı': '/thumbnails/camera/genis-aci.webp',
  'Makro': '/thumbnails/camera/makro.webp',
  'Drone çekimi': '/thumbnails/camera/drone-cekimi.webp'
};
export const EFFECT_OPTIONS = ['Sinematik ışık','Bokeh','Duman / Sis','Neon parıltı','Film grain','Lens flare','Çift pozlama','Uzun pozlama','Yumuşak gölgeler','Yüksek kontrast'];
export const EFFECT_OPTION_IMAGES = {
  'Sinematik ışık': '/thumbnails/effects/sinematik-isik.webp',
  'Bokeh': '/thumbnails/effects/bokeh.webp',
  'Duman / Sis': '/thumbnails/effects/duman-sis.webp',
  'Neon parıltı': '/thumbnails/effects/neon-parilti.webp',
  'Film grain': '/thumbnails/effects/film-grain.webp',
  'Lens flare': '/thumbnails/effects/lens-flare.webp',
  'Çift pozlama': '/thumbnails/effects/cift-pozlama.webp',
  'Uzun pozlama': '/thumbnails/effects/uzun-pozlama.webp',
  'Yumuşak gölgeler': '/thumbnails/effects/yumusak-golgeler.webp',
  'Yüksek kontrast': '/thumbnails/effects/yuksek-kontrast.webp'
};
export const POSE_OPTIONS = ['Ayakta duruş','Yürüyüş','Oturma','Aksiyon / hareket','Doğal & rahat','Editorial poz','Yakın yüz ifadesi','Sırtı dönük'];
export const POSE_OPTION_IMAGES = {
  'Ayakta duruş': '/thumbnails/poses/ayakta-durus.webp',
  'Yürüyüş': '/thumbnails/poses/yuruyus.webp',
  'Oturma': '/thumbnails/poses/oturma.webp',
  'Aksiyon / hareket': '/thumbnails/poses/aksiyon-hareket.webp',
  'Doğal & rahat': '/thumbnails/poses/dogal-rahat.webp',
  'Editorial poz': '/thumbnails/poses/editorial-poz.webp',
  'Yakın yüz ifadesi': '/thumbnails/poses/yakin-yuz-ifadesi.webp',
  'Sırtı dönük': '/thumbnails/poses/sirti-donuk.webp'
};
export const STYLE_OPTIONS = ['Sinematik','Portre','Thumbnail','Eskiz (Sketch)','Piksel Sanatı','Anime','3D Render','Suluboya','Yağlıboya','Minimalist','Vintage Film','Fantastik','Ürün Fotoğrafçılığı','Moda / Editorial','Siyah-Beyaz','Gerçekçi (Realistic)','Konsept Sanat'];
export const STYLE_OPTION_IMAGES = {
  'Sinematik': '/thumbnails/style/sinematik.webp',
  'Portre': '/thumbnails/style/portre.webp',
  'Thumbnail': '/thumbnails/style/thumbnail.webp',
  'Eskiz (Sketch)': '/thumbnails/style/eskiz-sketch.webp',
  'Piksel Sanatı': '/thumbnails/style/piksel-sanati.webp',
  'Anime': '/thumbnails/style/anime.webp',
  '3D Render': '/thumbnails/style/3d-render.webp',
  'Suluboya': '/thumbnails/style/suluboya.webp',
  'Yağlıboya': '/thumbnails/style/yagliboya.webp',
  'Minimalist': '/thumbnails/style/minimalist.webp',
  'Vintage Film': '/thumbnails/style/vintage-film.webp',
  'Fantastik': '/thumbnails/style/fantastik.webp',
  'Ürün Fotoğrafçılığı': '/thumbnails/style/urun-fotografciligi.webp',
  'Moda / Editorial': '/thumbnails/style/moda-editorial.webp',
  'Siyah-Beyaz': '/thumbnails/style/siyah-beyaz.webp',
  'Gerçekçi (Realistic)': '/thumbnails/style/gercekci-realistic.webp',
  'Konsept Sanat': '/thumbnails/style/konsept-sanat.webp'
};

export const FACE_DETAIL_OPTIONS = ['Belirgin çene hattı','Yüksek elmacık kemikleri','Dolgun dudaklar','İnce burun','Yoğun kaşlar','Simetrik yüz','Çil','Gamze','Küçük burun','Badem gözler'];
export const FACE_DETAIL_OPTION_IMAGES = {
  'Belirgin çene hattı': '/thumbnails/face/belirgin-cene-hatti.webp',
  'Yüksek elmacık kemikleri': '/thumbnails/face/yuksek-elmacik-kemikleri.webp',
  'Dolgun dudaklar': '/thumbnails/face/dolgun-dudaklar.webp',
  'İnce burun': '/thumbnails/face/ince-burun.webp',
  'Yoğun kaşlar': '/thumbnails/face/yogun-kaslar.webp',
  'Simetrik yüz': '/thumbnails/face/simetrik-yuz.webp',
  'Çil': '/thumbnails/face/cil.webp',
  'Gamze': '/thumbnails/face/gamze.webp',
  'Küçük burun': '/thumbnails/face/kucuk-burun.webp',
  'Badem gözler': '/thumbnails/face/badem-gozler.webp'
};
export const AVATAR_STYLE_OPTIONS = ['Minimal / Modern','Sokak Stili','Klasik / Şık','Spor','Vintage','Lüks','Bohem','İş / Ofis','Gotik','Casual'];
export const AVATAR_STYLE_OPTION_IMAGES = {
  'Minimal / Modern': '/thumbnails/avatar-style/minimal-modern.webp',
  'Sokak Stili': '/thumbnails/avatar-style/sokak-stili.webp',
  'Klasik / Şık': '/thumbnails/avatar-style/klasik-sik.webp',
  'Spor': '/thumbnails/avatar-style/spor.webp',
  'Vintage': '/thumbnails/avatar-style/vintage.webp',
  'Lüks': '/thumbnails/avatar-style/luks.webp',
  'Bohem': '/thumbnails/avatar-style/bohem.webp',
  'İş / Ofis': '/thumbnails/avatar-style/is-ofis.webp',
  'Gotik': '/thumbnails/avatar-style/gotik.webp',
  'Casual': '/thumbnails/avatar-style/casual.webp'
};
export const PERSONALITY_OPTIONS = ['Özgüvenli','Zeki','Bağımsız','Sıcakkanlı','Gizemli','Enerjik','Sakin','Maceraperest','Alaycı','Duygusal'];
export const PERSONALITY_OPTION_IMAGES = {
  'Özgüvenli': '/thumbnails/personality/ozguvenli.webp',
  'Zeki': '/thumbnails/personality/zeki.webp',
  'Bağımsız': '/thumbnails/personality/bagimsiz.webp',
  'Sıcakkanlı': '/thumbnails/personality/sicakkanli.webp',
  'Gizemli': '/thumbnails/personality/gizemli.webp',
  'Enerjik': '/thumbnails/personality/enerjik.webp',
  'Sakin': '/thumbnails/personality/sakin.webp',
  'Maceraperest': '/thumbnails/personality/maceraperest.webp',
  'Alaycı': '/thumbnails/personality/alayci.webp',
  'Duygusal': '/thumbnails/personality/duygusal.webp'
};
export const OTHER_DETAIL_OPTIONS = ['Fotoğrafçı','Model','Sanatçı','Girişimci','Sporcu','Öğrenci','Yazar','Mühendis','Müzisyen','Aktör/Aktris'];
export const OTHER_DETAIL_OPTION_IMAGES = {
  'Fotoğrafçı': '/thumbnails/other-detail/fotografci.webp',
  'Model': '/thumbnails/other-detail/model.webp',
  'Sanatçı': '/thumbnails/other-detail/sanatci.webp',
  'Girişimci': '/thumbnails/other-detail/girisimci.webp',
  'Sporcu': '/thumbnails/other-detail/sporcu.webp',
  'Öğrenci': '/thumbnails/other-detail/ogrenci.webp',
  'Yazar': '/thumbnails/other-detail/yazar.webp',
  'Mühendis': '/thumbnails/other-detail/muhendis.webp',
  'Müzisyen': '/thumbnails/other-detail/muzisyen.webp',
  'Aktör/Aktris': '/thumbnails/other-detail/aktor-aktris.webp'
};
export const SKIN_TONES = ['#F5D5B8','#E8B88C','#D39C6E','#B57A4A','#8B5A2B','#5C3A1E'];

// Artık tek API çağrısıyla 5 panelli tek bir karakter sheet görseli üretiliyor
// (eskiden 13 ayrı çağrıydı). Bu değer artık sadece kredi maliyeti çarpanı.
export const CHARACTER_SHEET_PANEL_COUNT = 1;
export const PROMPT_MAKER_CREDIT_COST = 1;

export const GOOGLE_CLIENT_ID = '1036033399902-89l44rn5e77mvg7h71ttb06v3ufgdthq.apps.googleusercontent.com';


export const FAQ_ITEMS = [
  { q: 'VSP nedir, nasıl kazanırım?', a: 'VSP, platform içindeki prompt üretimi, görsel oluşturma, karakter sheet\'i ve premium içerik kilidi açma gibi işlemlerde kullanılan sanal kredidir. Sağ üstteki "+" butonundan paket satın alarak bakiyene ekleyebilirsin.' },
  { q: 'IBAN ile ödeme yaptım, kredilerim ne zaman yüklenir?', a: 'IBAN ile ödemede dekontu belirtilen WhatsApp hattına iletmen gerekir; sana gönderilen aktivasyon kodunu ödeme adımındaki kutuya girdiğinde krediler anında bakiyene eklenir.' },
  { q: 'Premium bir prompt\'un kilidini nasıl açarım?', a: 'Galeride premium etiketli bir prompt\'a tıkladığında açılan pencerede "VSP ile Aç" butonunu kullanarak, gösterilen VSP karşılığında o prompt\'u kalıcı olarak açabilirsin.' },
  { q: 'Prompt/görsel/karakter üretimi ne kadar krediye mal olur?', a: 'Maliyet seçtiğin araca ve modele göre değişir; ilgili ekranda ("Prompt Üretici", "Görsel Oluşturucu", "Karakter Oluşturucu") işlem öncesi tam maliyet sana gösterilir.' },
  { q: 'Hesabımdan nasıl çıkış yaparım?', a: 'Sağ üstteki profil fotoğrafının üzerine gelip açılan menüden "Çıkış Yap" seçeneğine tıklayabilirsin.' },
  { q: 'Beğendiğim/kaydettiğim promptları nereden görebilirim?', a: 'Profil sayfandaki soldaki menüden "Beğenilen Promptlar", "Kaydedilen Promptlar" ve "Satın Alınan Promptlar" bölümlerinden erişebilirsin.' },
  { q: 'Sorunum burada yok, ne yapmalıyım?', a: 'Aşağıdaki formu doldurarak bize doğrudan ulaşabilirsin, en kısa sürede e-posta adresin üzerinden dönüş yaparız.' }
];