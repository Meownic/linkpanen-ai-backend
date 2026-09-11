# Kenapa AI LinkPanen Cuma Jawab Template — dan Cara Memperbaikinya

## Akar masalahnya
Web LinkPanen kamu (`index.html`) sudah didesain untuk memanggil AI sungguhan lewat `fetch('/api/linkpanen-ai', ...)`. **Tapi server yang menjalankan `/api/linkpanen-ai` itu belum pernah ada/jalan.** Selama ini kamu membuka file HTML-nya langsung lewat `file:///C:/Users/...` (double-click), sehingga:

1. `fetch('/api/linkpanen-ai')` **selalu gagal** (tidak ada server yang mendengarkan di alamat itu).
2. Kode langsung masuk `catch(e)` dan memakai fungsi cadangan `buildAIResponse()` — ini murni pencocokan kata kunci pakai regex, **bukan AI**. Kalau pertanyaanmu tidak cocok satu pun kata kunci yang terdaftar di situ, dia jatuh ke jawaban template default ("Saya adalah LinkPanen AI...").

Itu sebabnya jawabannya terasa template terus — **AI-nya memang belum pernah benar-benar menyala.**

## Solusi: `server.js` di folder ini
File `server.js` adalah backend sungguhan yang:
- Membuka endpoint `/api/linkpanen-ai` yang dicari oleh web kamu.
- Memuat 4 file basis pengetahuan dari folder `data/` (yang sudah kita buat sebelumnya) sebagai instruksi/system prompt.
- Memanggil model AI Gemini (Google) sungguhan untuk menjawab, mengikuti seluruh aturan di `ai_behavior_rules.json` dan `kualitas_respons_ai.json` — termasuk aturan supaya AI langsung menjawab pertanyaan singkat, tidak minta detail berlebihan.
- Ikut mengirim riwayat chat, profil pengguna, dan data pasar/toko sebagai konteks.

## Cara menjalankan (di komputer kamu, Windows)

1. **Install Node.js** kalau belum ada — download di https://nodejs.org (pilih versi LTS), lalu install seperti biasa.
2. **Kumpulkan semua file ini dalam satu folder**, misal `D:\LinkPanenAI\`:
   - `server.js`
   - `package.json`
   - `.env.example`
   - `index.html`
   - folder `data/` (isinya 4 file JSON basis pengetahuan)
3. **Buat API key Gemini**: buka https://aistudio.google.com/apikey → buat akun/masuk → buat API key baru.
4. Di dalam folder itu, salin `.env.example` jadi file baru bernama `.env`, lalu isi:
   ```
   GEMINI_API_KEY=AIzaSyxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   GEMINI_MODEL=gemini-2.5-flash
   PORT=3000
   ```
5. Buka **Command Prompt / PowerShell** di folder tersebut (klik kanan di folder → "Open in Terminal", atau `cd D:\LinkPanenAI`), lalu jalankan:
   ```
   npm install
   npm start
   ```
6. Kalau muncul tulisan `✅ LinkPanen AI backend jalan di http://localhost:3000`, **buka browser dan akses**:
   ```
   http://localhost:3000/
   ```
   **Jangan** dibuka lagi lewat double-click file / `file://` — itu penyebab utama masalahnya.

7. Coba tanya "berikan informasi terbaru di pertanian tomat" — sekarang seharusnya dijawab langsung oleh AI sungguhan, bukan template.

## Deploy serverless ke Netlify

Project ini sudah menyediakan Netlify Function di `netlify/functions/linkpanen-ai.js`.
Frontend tetap memanggil `/api/linkpanen-ai`; `netlify.toml` me-rewrite URL tersebut ke Function, jadi kode frontend tidak perlu diganti.

1. Upload folder project ini ke repository GitHub. Jangan upload file `.env`; file tersebut sudah masuk `.gitignore`.
2. Di Netlify pilih **Add new site → Import an existing project**, lalu pilih repository tersebut.
3. Biarkan pengaturan build mengikuti `netlify.toml`:
   - Publish directory: `.`
   - Functions directory: `netlify/functions`
4. Buka **Site configuration → Environment variables** dan tambahkan:
   ```
   GEMINI_API_KEY=AIzaSyxxxxxxxxxxxxxxxxxxxxxxxx
   GEMINI_MODEL=gemini-2.5-flash
   ```
5. Deploy/redeploy site, lalu buka alamat Netlify yang diberikan.

Endpoint AI publiknya akan menjadi:
```
https://nama-site-kamu.netlify.app/api/linkpanen-ai
```

`npm start` dan `server.js` tetap bisa dipakai untuk menjalankan project secara lokal. Netlify menggunakan Function serverless, bukan `app.listen()` dari `server.js`.
