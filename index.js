const express = require('express');
const fetch = require('node-fetch');

const app = express();
const PORT = process.env.PORT || 3000;

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
  'Accept': 'application/json',
  'Referer': 'https://fvt.com.tr/',
  'Origin': 'https://fvt.com.tr'
};

// Sağlık kontrolü — tarayıcıdan test için
app.get('/', (req, res) => res.json({ status: 'proxy çalışıyor' }));

// /funds/AAK
app.get('/funds/:code', async (req, res) => {
  const url = `https://fvt.com.tr/api/funds/${req.params.code}`;
  console.log('Fetching:', url);
  try {
    const r = await fetch(url, { headers: HEADERS });
    console.log('fvt status:', r.status);
    const text = await r.text();
    res.status(r.status).set('Content-Type', 'application/json').send(text);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// /funds/AAK/holdings-history
app.get('/funds/:code/:sub', async (req, res) => {
  const url = `https://fvt.com.tr/api/funds/${req.params.code}/${req.params.sub}`;
  console.log('Fetching:', url);
  try {
    const r = await fetch(url, { headers: HEADERS });
    console.log('fvt status:', r.status);
    const text = await r.text();
    res.status(r.status).set('Content-Type', 'application/json').send(text);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.listen(PORT, () => console.log('Proxy çalışıyor, port:', PORT));