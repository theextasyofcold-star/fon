const express = require('express');
const fetch = require('node-fetch');

const app = express();
const PORT = process.env.PORT || 3000;

// Kendimizi gerçek bir tarayıcı gibi göstermek için genişletilmiş başlıklar
const BASE_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
  'Accept': 'application/json, text/plain, */*',
  'Accept-Language': 'tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7',
  'Referer': 'https://fvt.com.tr/',
  'Origin': 'https://fvt.com.tr',
  'Connection': 'keep-alive'
};

// Token'ı RAM'de tutacağımız değişkenler
let cachedToken = null;
let tokenExpiry = 0; // Süre takibi için

// --- YARDIMCI FONKSİYON: TOKEN ALMA ---
async function getValidToken() {
  // Eğer elimizde süresi dolmamış bir token varsa direkt onu kullan
  if (cachedToken && Date.now() < tokenExpiry) {
    return cachedToken;
  }
  
  console.log('Taze token alınıyor...');
  try {
    const response = await fetch('https://fvt.com.tr/api/app-token', { headers: BASE_HEADERS });
    
    if (!response.ok) {
      console.log('Token alma reddedildi! HTTP Status:', response.status);
      return null;
    }
    
    const json = await response.json();
    if (json.success && json.data && json.data.token) {
      cachedToken = json.data.token;
      // Token 2 saat geçerli, biz güvenli tarafta kalıp 1 saat (3.600.000 ms) sonra yenileteceğiz
      tokenExpiry = Date.now() + 3600000; 
      console.log('✅ Yeni token başarıyla alındı ve hafızaya kaydedildi.');
      return cachedToken;
    }
  } catch (e) {
    console.error('Token fetch hatası:', e.message);
  }
  return null;
}

// Sağlık kontrolü
app.get('/', (req, res) => res.json({ status: 'Proxy tıkır tıkır çalışıyor!' }));

// --- ANA FONKSİYON: FON DETAYI ÇEKME ---
app.get('/funds/:code', async (req, res) => {
  const url = `https://fvt.com.tr/api/funds/${req.params.code}`;
  
  // Önce geçerli token'ı hazır et
  const token = await getValidToken();
  const reqHeaders = { ...BASE_HEADERS };
  
  // Token'ı başlıklara ekle
  if (token) {
    reqHeaders['Authorization'] = `Bearer ${token}`;
    reqHeaders['App-Token'] = token;
  }

  console.log('Veri çekiliyor:', url);
  try {
    const r = await fetch(url, { headers: reqHeaders });
    console.log('FVT Yanıt Kodu:', r.status);
    const text = await r.text();
    res.status(r.status).set('Content-Type', 'application/json').send(text);
  } catch (e) {
    console.error('Fon verisi çekilirken hata:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// --- ALT FONKSİYON: GEÇMİŞ / HOLDINGS ÇEKME ---
app.get('/funds/:code/:sub', async (req, res) => {
  const url = `https://fvt.com.tr/api/funds/${req.params.code}/${req.params.sub}`;
  
  const token = await getValidToken();
  const reqHeaders = { ...BASE_HEADERS };
  if (token) {
    reqHeaders['Authorization'] = `Bearer ${token}`;
    reqHeaders['App-Token'] = token;
  }

  console.log('Veri çekiliyor:', url);
  try {
    const r = await fetch(url, { headers: reqHeaders });
    console.log('FVT Yanıt Kodu:', r.status);
    const text = await r.text();
    res.status(r.status).set('Content-Type', 'application/json').send(text);
  } catch (e) {
    console.error('Alt veri çekilirken hata:', e.message);
    res.status(500).json({ error: e.message });
  }
});
// --- CLOUDFLARE VE TOKEN TEŞHİS ROTASI ---
app.get('/test-cloudflare', async (req, res) => {
  const report = {
    adim1_token_alma: { http_kodu: null, basarili: false, mesaj: "" },
    adim2_veri_cekme: { http_kodu: null, basarili: false, mesaj: "" },
    sonuc: ""
  };

  const BASE_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
    'Accept': 'application/json, text/plain, */*',
    'Accept-Language': 'tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7',
    'Referer': 'https://fvt.com.tr/',
    'Origin': 'https://fvt.com.tr'
  };

  try {
    // 1. ADIM: Token sayfasını test et
    const tokenIstegi = await fetch('https://fvt.com.tr/api/app-token', { headers: BASE_HEADERS });
    report.adim1_token_alma.http_kodu = tokenIstegi.status;
    report.adim1_token_alma.basarili = tokenIstegi.ok;
    
    let aktifToken = null;
    if (tokenIstegi.ok) {
      const tokenJson = await tokenIstegi.json();
      aktifToken = tokenJson?.data?.token;
      report.adim1_token_alma.mesaj = aktifToken ? "Harika! Token başarıyla üretildi." : "200 döndü ancak JSON içinde token yok.";
    } else {
      const hataMetni = await tokenIstegi.text();
      report.adim1_token_alma.mesaj = `Reddedildi! Hata: ${hataMetni.substring(0, 150)}...`;
    }

    // 2. ADIM: Token ile fon verisi sayfasını test et (Örnek: TLY Fonu)
    const fonHeaders = { ...BASE_HEADERS };
    if (aktifToken) {
      fonHeaders['Authorization'] = `Bearer ${aktifToken}`;
      fonHeaders['App-Token'] = aktifToken;
    }

    const fonIstegi = await fetch('https://fvt.com.tr/api/funds/TLY', { headers: fonHeaders });
    report.adim2_veri_cekme.http_kodu = fonIstegi.status;
    report.adim2_veri_cekme.basarili = fonIstegi.ok;
    
    if (fonIstegi.ok) {
      report.adim2_veri_cekme.mesaj = "Harika! TLY fon verisi başarıyla çekildi.";
    } else {
      const hataMetni = await fonIstegi.text();
      report.adim2_veri_cekme.mesaj = `Reddedildi! Hata: ${hataMetni.substring(0, 150)}...`;
    }

    // 3. ADIM: Rapor Sonucu Çıkar
    if (report.adim1_token_alma.http_kodu === 403) {
      report.sonuc = "❌ CLOUDFLARE WAF ENGELİ: Render sunucusunun IP adresi tamamen yasaklı. Token bile vermiyor.";
    } else if (report.adim1_token_alma.basarili && report.adim2_veri_cekme.http_kodu === 403) {
      report.sonuc = "⚠️ KISMİ ENGEL: Sistem token veriyor ancak asıl veri uçnoktası (endpoint) IP adresine kapalı.";
    } else if (report.adim1_token_alma.basarili && report.adim2_veri_cekme.basarili) {
      report.sonuc = "✅ BAŞARILI: IP engeli yok, her iki adım da tıkır tıkır çalışıyor.";
    } else {
      report.sonuc = "Beklenmeyen bir hata kombinasyonu oluştu.";
    }

    res.json(report);
  } catch (e) {
    res.status(500).json({ error: "Sunucu içi kod hatası: " + e.message });
  }
});

app.listen(PORT, () => console.log('🚀 FVT Proxy sunucusu çalışıyor. Port:', PORT));