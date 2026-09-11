require('dotenv').config();
const express = require('express');
const path = require('path');
const { answer } = require('./lib/linkpanen-ai');

const app = express();
app.use(express.json({ limit: '3mb' }));

const PORT = process.env.PORT || 3000;

if (!process.env.GEMINI_API_KEY) {
  console.warn('[PERINGATAN] GEMINI_API_KEY belum diisi di file .env — endpoint AI akan gagal sampai kamu isi.');
}

app.post('/api/linkpanen-ai', async (req, res) => {
  try {
    const result = await answer(req.body);
    res.status(result.statusCode).json(result.body);
  } catch (err) {
    console.error('Error di /api/linkpanen-ai:', err.message);
    res.status(500).json({ error: 'Terjadi kendala pada AI backend', detail: err.message });
  }
});

// Sajikan file HTML LinkPanen dan aset lain dari folder yang sama
app.use(express.static(__dirname));

app.listen(PORT, () => {
  console.log(`\n✅ LinkPanen AI backend jalan di http://localhost:${PORT}`);
  console.log(`   Buka: http://localhost:${PORT}/`);
  console.log(`   (JANGAN buka file HTML-nya langsung lewat double-click / file:// — fetch ke /api tidak akan bekerja)\n`);
});
