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
  { key: 'gemini_free', name: 'Gemini (Ücretsiz Katman)', icon: '✨', badge: 'Ekonomik', desc: 'Hızlı ve ekonomik üretim.', creditCost: 1 },
  { key: 'gemini_paid', name: 'Gemini (Ücretli Katman)', icon: '✨', badge: 'Pro', desc: 'Daha yüksek limit ve öncelikli işleme.', creditCost: 2 },
  { key: 'free_draft', name: 'Hızlı Taslak (Ücretsiz)', icon: '🎨', badge: 'Ücretsiz', desc: 'Watermark\'lı, düşük maliyetli taslak model.', creditCost: 0 }
];

export const AVATAR_PROVIDERS = [
  { key: 'gemini_free', name: 'Gemini (Ücretsiz Katman)', icon: '✨', badge: 'Ekonomik', desc: 'Google Gemini ücretsiz/düşük maliyetli katman; daha yavaş kuyruk olabilir.', creditCostPerImage: 1 },
  { key: 'gemini_paid', name: 'Gemini (Ücretli Katman)', icon: '✨', badge: 'Pro', desc: 'Google Gemini ücretli/Pro katman; daha yüksek limit ve öncelikli işleme.', creditCostPerImage: 2 },
  { key: 'openai', name: 'OpenAI (GPT Image)', icon: '🤖', badge: '', desc: 'OpenAI görsel üretim modeli; yüksek detay ve prompt takibi.', creditCostPerImage: 3 },
  { key: 'stability', name: 'Stability AI (SDXL)', icon: '🧬', badge: '', desc: 'Stable Diffusion tabanlı, esnek ve özelleştirmeye açık model.', creditCostPerImage: 1 },
  { key: 'flux', name: 'Flux Pro', icon: '⚡', badge: '', desc: 'Fotogerçekçi sonuçlar ve gelişmiş prompt takibi.', creditCostPerImage: 2 }
];

export const CAMERA_OPTIONS = ['Ön çekim','Yakın plan','Kuş bakışı','Alçak açı','Yandan (profil)','Geniş açı','Makro','Drone çekimi'];
export const EFFECT_OPTIONS = ['Sinematik ışık','Bokeh','Duman / Sis','Neon parıltı','Film grain','Lens flare','Çift pozlama','Uzun pozlama','Yumuşak gölgeler','Yüksek kontrast'];
export const POSE_OPTIONS = ['Ayakta duruş','Yürüyüş','Oturma','Aksiyon / hareket','Doğal & rahat','Editorial poz','Yakın yüz ifadesi','Sırtı dönük'];
export const STYLE_OPTIONS = ['Sinematik','Portre','Thumbnail','Eskiz (Sketch)','Piksel Sanatı','Anime','3D Render','Suluboya','Yağlıboya','Minimalist','Vintage Film','Fantastik','Ürün Fotoğrafçılığı','Moda / Editorial','Siyah-Beyaz','Gerçekçi (Realistic)','Konsept Sanat'];

export const FACE_DETAIL_OPTIONS = ['Belirgin çene hattı','Yüksek elmacık kemikleri','Dolgun dudaklar','İnce burun','Yoğun kaşlar','Simetrik yüz','Çil','Gamze','Küçük burun','Badem gözler'];
export const AVATAR_STYLE_OPTIONS = ['Minimal / Modern','Sokak Stili','Klasik / Şık','Spor','Vintage','Lüks','Bohem','İş / Ofis','Gotik','Casual'];
export const PERSONALITY_OPTIONS = ['Özgüvenli','Zeki','Bağımsız','Sıcakkanlı','Gizemli','Enerjik','Sakin','Maceraperest','Alaycı','Duygusal'];
export const OTHER_DETAIL_OPTIONS = ['Fotoğrafçı','Model','Sanatçı','Girişimci','Sporcu','Öğrenci','Yazar','Mühendis','Müzisyen','Aktör/Aktris'];
export const SKIN_TONES = ['#F5D5B8','#E8B88C','#D39C6E','#B57A4A','#8B5A2B','#5C3A1E'];

// Sheet 13 panelden oluşuyor: 1 portre + 5 görünüm + 4 yüz detayı + 3 saç detayı.
// n8n workflow'undaki panel bölme mantığıyla birebir eşleşmeli.
export const CHARACTER_SHEET_PANEL_COUNT = 13;
export const PROMPT_MAKER_CREDIT_COST = 1;

export const GOOGLE_CLIENT_ID = '1036033399902-89l44rn5e77mvg7h71ttb06v3ufgdthq.apps.googleusercontent.com';


export const FAQ_ITEMS = [
  { q: 'JG Puanı nedir, nasıl kazanırım?', a: 'JG Puanı, platform içindeki prompt üretimi, görsel oluşturma, karakter sheet\'i ve premium içerik kilidi açma gibi işlemlerde kullanılan sanal kredidir. Sağ üstteki "+" butonundan paket satın alarak bakiyene ekleyebilirsin.' },
  { q: 'IBAN ile ödeme yaptım, kredilerim ne zaman yüklenir?', a: 'IBAN ile ödemede dekontu belirtilen WhatsApp hattına iletmen gerekir; sana gönderilen aktivasyon kodunu ödeme adımındaki kutuya girdiğinde krediler anında bakiyene eklenir.' },
  { q: 'Premium bir prompt\'un kilidini nasıl açarım?', a: 'Galeride premium etiketli bir prompt\'a tıkladığında açılan pencerede "JG Puanı ile Aç" butonunu kullanarak, gösterilen JG Puanı karşılığında o prompt\'u kalıcı olarak açabilirsin.' },
  { q: 'Prompt/görsel/karakter üretimi ne kadar krediye mal olur?', a: 'Maliyet seçtiğin araca ve modele göre değişir; ilgili ekranda ("Prompt Üretici", "Görsel Oluşturucu", "Karakter Oluşturucu") işlem öncesi tam maliyet sana gösterilir.' },
  { q: 'Hesabımdan nasıl çıkış yaparım?', a: 'Sağ üstteki profil fotoğrafının üzerine gelip açılan menüden "Çıkış Yap" seçeneğine tıklayabilirsin.' },
  { q: 'Beğendiğim/kaydettiğim promptları nereden görebilirim?', a: 'Profil sayfandaki soldaki menüden "Beğenilen Promptlar", "Kaydedilen Promptlar" ve "Satın Alınan Promptlar" bölümlerinden erişebilirsin.' },
  { q: 'Sorunum burada yok, ne yapmalıyım?', a: 'Aşağıdaki formu doldurarak bize doğrudan ulaşabilirsin, en kısa sürede e-posta adresin üzerinden dönüş yaparız.' }
];