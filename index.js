const express = require('express');
const fetch = require('node-fetch');

const app = express();
const PORT = process.env.PORT || 3000;

// /funds/AAK veya /funds/AAK/holdings-history gibi tüm yolları karşılar
app.get('/funds/*', async (req, res) => {
  try {
    const targetUrl = 'https://fvt.com.tr/api' + req.path;

    const fvtRes = await fetch(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json',
        'Referer': 'https://fvt.com.tr/',
        'Origin': 'https://fvt.com.tr'
      },
      timeout: 15000
    });

    const data = await fvtRes.json();
    res.json(data);

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => console.log('Proxy port ' + PORT));