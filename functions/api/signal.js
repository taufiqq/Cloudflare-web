// functions/api/signal.js

export async function onRequest(context) {
  const { request, env } = context;
  const db = env.DB;

  // Mengizinkan Cross-Origin Resource Sharing (CORS)
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
  };

  if (request.method === 'OPTIONS') {
    return new Response(null, { headers });
  }

  // Menangani permintaan POST untuk mengirim sinyal
  if (request.method === 'POST') {
    try {
      const { sessionId, type, data } = await request.json();
      if (!sessionId || !type || !data) {
        return new Response(JSON.stringify({ error: 'Missing required fields' }), { status: 400, headers });
      }

      const stmt = db.prepare('INSERT INTO signals (session_id, type, data) VALUES (?, ?, ?)');
      await stmt.bind(sessionId, type, JSON.stringify(data)).run();

      return new Response(JSON.stringify({ success: true }), { status: 200, headers });
    } catch (e) {
      return new Response(JSON.stringify({ error: e.message }), { status: 500, headers });
    }
  }

  // Menangani permintaan GET untuk mengambil sinyal
  if (request.method === 'GET') {
    try {
      const url = new URL(request.url);
      const sessionId = url.searchParams.get('sessionId');
      const lastId = parseInt(url.searchParams.get('lastId') || '0', 10);

      if (!sessionId) {
        return new Response(JSON.stringify({ error: 'Missing sessionId parameter' }), { status: 400, headers });
      }

      // Ambil semua pesan untuk sesi ini yang ID-nya lebih besar dari lastId
      const stmt = db.prepare('SELECT * FROM signals WHERE session_id = ? AND id > ? ORDER BY id ASC');
      const { results } = await stmt.bind(sessionId, lastId).all();

      return new Response(JSON.stringify(results), { status: 200, headers });
    } catch (e) {
      return new Response(JSON.stringify({ error: e.message }), { status: 500, headers });
    }
  }

  return new Response('Method Not Allowed', { status: 405, headers });
}