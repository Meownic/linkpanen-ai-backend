const path = require('path');
const fs = require('fs');

function loadJSON(file) {
  try {
    return JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', file), 'utf8'));
  } catch (e) {
    console.error(`Gagal memuat data/${file}:`, e.message);
    return {};
  }
}

const behaviorRules = loadJSON('ai_behavior_rules.json');
const knowledgeBase = loadJSON('pengetahuan_pertanian.json');
const responseQuality = loadJSON('kualitas_respons_ai.json');
const priceSchema = loadJSON('skema_harga_pasar.json');

function buildSystemPrompt() {
  return `Kamu adalah LinkPanen AI, asisten AI khusus pertanian & agribisnis untuk website LinkPanen.

Ikuti SELURUH aturan JSON berikut ini secara ketat. Ini bukan sekadar referensi, tapi ATURAN WAJIB yang membentuk perilakumu:

=== ATURAN PERILAKU (ai_behavior_rules.json) ===
${JSON.stringify(behaviorRules, null, 2)}

=== PRINSIP KUALITAS JAWABAN (kualitas_respons_ai.json) ===
${JSON.stringify(responseQuality, null, 2)}

=== BASIS PENGETAHUAN PERTANIAN (pengetahuan_pertanian.json) ===
${JSON.stringify(knowledgeBase, null, 2)}

=== SKEMA DATA HARGA PASAR (skema_harga_pasar.json) ===
${JSON.stringify(priceSchema, null, 2)}
Catatan: ini hanya SKEMA. Jangan mengarang angka harga. Jika data marketplace/harga live tidak diberikan dalam pesan pengguna atau konteks, katakan dengan jujur bahwa kamu tidak punya data harga real-time saat ini dan sarankan sumber resmi.

PENGINGAT PALING PENTING (sering dilanggar sebelumnya): ikuti "aturan_kedalaman_jawaban" di atas — untuk pertanyaan singkat/umum, JAWAB LANGSUNG dengan info yang berguna, JANGAN minta pengguna menjelaskan detail lengkap dulu. Hanya untuk kasus diagnosis spesifik yang benar-benar butuh konteks, kamu boleh menanyakan SATU hal paling krusial saja, sambil tetap memberi kemungkinan jawaban awal.

Format jawaban dalam teks biasa yang enak dibaca di chat (boleh pakai **tebal** dan baris baru), tidak perlu HTML.`;
}

function stripHtml(str) {
  return String(str || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

function toChatHtml(text) {
  return String(text || '')
    .replace(/\*\*(.+?)\*\*/g, '<b>$1</b>')
    .replace(/\n/g, '<br>');
}

async function generateGeminiResponse(systemPrompt, chatHistory, message) {
  const model = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(process.env.GEMINI_API_KEY)}`;
  const contents = [
    ...chatHistory.map(item => ({
      role: item.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: item.content }]
    })),
    { role: 'user', parts: [{ text: message }] }
  ];

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: systemPrompt }] },
      contents,
      generationConfig: { maxOutputTokens: 1024 }
    })
  });
  const result = await response.json();

  if (!response.ok) {
    const detail = result.error?.message || `Gemini API mengembalikan HTTP ${response.status}`;
    throw new Error(detail);
  }

  const text = result.candidates?.[0]?.content?.parts
    ?.filter(part => typeof part.text === 'string')
    .map(part => part.text)
    .join('');
  if (!text) throw new Error('Gemini tidak mengembalikan teks jawaban');
  return text;
}

async function answer(body) {
  const { message, history = [], profile, community = [], marketplace } = body || {};
  if (!message || !String(message).trim()) {
    return { statusCode: 400, body: { error: 'Pesan kosong' } };
  }
  if (!process.env.GEMINI_API_KEY) {
    return { statusCode: 500, body: { error: 'GEMINI_API_KEY belum diatur di server' } };
  }

  const chatHistory = Array.isArray(history)
    ? history
      .filter(h => h && h.text)
      .map(h => ({ role: h.role === 'user' ? 'user' : 'assistant', content: stripHtml(h.text) }))
    : [];

  let contextNote = '';
  if (profile) contextNote += `\n\n[Profil pengguna saat ini]\n${JSON.stringify(profile)}`;
  if (Array.isArray(community) && community.length) {
    contextNote += `\n\n[Pengalaman komunitas yang mungkin relevan — perlakukan sebagai pengalaman pribadi, bukan fakta mutlak]\n${JSON.stringify(community.slice(0, 8))}`;
  }
  if (marketplace) {
    contextNote += `\n\n[Data pasar & toko LinkPanen saat ini — pakai hanya jika relevan dengan pertanyaan]\n${JSON.stringify(marketplace)}`;
  }

  const replyRaw = await generateGeminiResponse(
    buildSystemPrompt() + contextNote,
    chatHistory,
    String(message)
  );

  return {
    statusCode: 200,
    body: {
      reply: toChatHtml(replyRaw),
      sources: [{ kind: 'knowledge', name: 'Basis pengetahuan LinkPanen' }],
      webUsed: false
    }
  };
}

module.exports = { answer };
