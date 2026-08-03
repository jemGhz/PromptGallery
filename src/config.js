// src/config.js
// Tüm sabitler, n8n webhook URL'leri ve seçenek listeleri burada toplanır.
// Deploy ortamı Vercel: bu değerler env değişkeni değil; hepsi zaten public/client-side
// olduğu için (backend'e ayrı bir gizli anahtar iletmiyorlar) sabit tutmak sorun değil.
// Google Client ID de zaten public bir değerdir, env'e taşımaya gerek yok.

export const SHEET_ID = '1-n0pVWWzNKKodfB9TVXKC7hpQfJDPO_ZtzFE6gDqKBM';
export const SHEET_NAME = 'Sayfa1';
export const MAX_TOP_TAGS = 10;

export const PREMIUM_LIST_URL = 'https://jg-n8n-server.tail1c97b1.ts.net/webhook/premium-list';
export const PREMIUM_VERIFY_URL = 'https://jg-n8n-server.tail1c97b1.ts.net/webhook/verify-premium-code';
export const PROMPT_MAKER_URL = 'https://jemghz.app.n8n.cloud/webhook/generate-prompt';
export const GEN_GENERATE_URL = 'https://jemghz.app.n8n.cloud/webhook/generate-visual';
export const CHARACTER_GENERATE_URL = 'https://jemghz.app.n8n.cloud/webhook/generate-character';
export const CHARACTER_SAVE_URL = 'https://jemghz.app.n8n.cloud/webhook/save-character';

// ÖNEMLİ: bakiye ASLA sadece tarayıcıda tutulup ücretli işlem kararı buna göre
// verilmemeli; n8n tarafında Supabase'deki gerçek bakiye kontrol edilmeden
// generateCharacter/generateVisual/generatePrompt ÇALIŞTIRILMAMALI.
export const CREDIT_BALANCE_URL = 'https://jemghz.app.n8n.cloud/webhook/credit-balance';
export const CREDIT_STRIPE_CHECKOUT_URL = 'https://jemghz.app.n8n.cloud/webhook/credit-stripe-checkout';
export const CREDIT_VERIFY_CODE_URL = 'https://jemghz.app.n8n.cloud/webhook/credit-verify-code';

export const CREDIT_PACKAGES = [
  { id: 'pkg_10', credits: 10, price: '99 TL' },
  { id: 'pkg_25', credits: 25, price: '199 TL' },
  { id: 'pkg_60', credits: 60, price: '399 TL' }
];

export const AI_MODELS = [
  { name: 'DALL·E 3', icon: '🎨', badge: 'New', desc: 'Daha yüksek kalite ve detay için en iyi seçim.', creditCost: 3 },
  { name: 'Midjourney v6', icon: '🌙', badge: '', desc: 'Sanatsal ve atmosferik sonuçlar için güçlü seçim.', creditCost: 3 },
  { name: 'Stable Diffusion XL', icon: '🧬', badge: '', desc: 'Hızlı ve esnek, özelleştirmeye açık bir model.', creditCost: 1 },
  { name: 'Flux Pro', icon: '⚡', badge: '', desc: 'Fotogerçekçi sonuçlar ve gelişmiş prompt takibi.', creditCost: 2 },
  { name: 'Ideogram', icon: '🔤', badge: '', desc: 'Görsele metin/yazı eklemek için en iyi seçim.', creditCost: 2 }
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

export const GOOGLE_CLIENT_ID = '1036033399902-fufvgkbifjipd9615d790gkjh8k3u7an.apps.googleusercontent.com';
