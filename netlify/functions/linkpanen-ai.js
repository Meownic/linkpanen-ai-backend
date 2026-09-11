const { answer } = require('../../lib/linkpanen-ai');

exports.handler = async event => {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: { Allow: 'POST', 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Method tidak diizinkan' })
    };
  }

  try {
    const result = await answer(event.body ? JSON.parse(event.body) : {});
    return {
      statusCode: result.statusCode,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(result.body)
    };
  } catch (err) {
    console.error('Error di Netlify Function /api/linkpanen-ai:', err.message);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Terjadi kendala pada AI backend', detail: err.message })
    };
  }
};
