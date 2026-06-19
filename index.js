const express = require('express');
const fetch = require('node-fetch');

const app = express();
const PORT = process.env.PORT || 3000;

// Token cache — her 55 dakikada bir yenile
let cachedToken = null;
let tokenExpiry = 0;

async function getToken() {
  if (cachedToken && Date.now() < tokenExpiry) return cachedToken;

  const res = await fetch('https://www.fvt.com.tr/api/auth/token', {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Accept': 'application/json',
      'Referer': 'https://www.fvt.com.tr/'
    }
  });

  const data = await res.json();
  cachedToken = data.token || data.access_token;
  tokenExpiry = Date.now() + 55 * 60 * 1000; // 55 dakika
  return cachedToken;
}

// Ana proxy endpoint
app.get('/funds', async (req, res) => {
  try {
    const token = await getToken();

    const fvtRes = await fetch('https://www.fvt.com.tr/api/funds/', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json',
        'Referer': 'https://www.fvt.com.tr/'
      }
    });

    const data = await fvtRes.json();
    res.json(data);

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => console.log(`Proxy çalışıyor: port ${PORT}`));