// src/api/signals.js

export default {
  async fetch(request, env, ctx) {
    // Mengizinkan CORS agar bisa diakses dari halaman HTML manapun
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };

    // Handle pre-flight requests untuk CORS
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    const url = new URL(request.url);
    const path = url.pathname.split('/').filter(p => p); // Memecah URL menjadi bagian-bagian

    // Endpoint untuk membuat sesi baru oleh Pengirim
    // POST /session
    if (request.method === 'POST' && path[1] === 'session' && path.length === 2) {
      try {
        const { offer } = await request.json();
        if (!offer) {
          return new Response('Offer is required', { status: 400, headers: corsHeaders });
        }

        const sessionId = crypto.randomUUID(); // Membuat ID sesi unik
        
        await env.DB.prepare(
          'INSERT INTO sessions (id, offer) VALUES (?, ?)'
        ).bind(sessionId, JSON.stringify(offer)).run();

        return new Response(JSON.stringify({ sessionId }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      } catch (e) {
        return new Response(e.message, { status: 500, headers: corsHeaders });
      }
    }

    // Endpoint untuk mendapatkan data sesi (untuk polling)
    // GET /session/:id
    if (request.method === 'GET' && path[1] === 'session' && path.length === 3) {
      const sessionId = path[2];
      const { results } = await env.DB.prepare(
        'SELECT * FROM sessions WHERE id = ?'
      ).bind(sessionId).all();
      
      if (results.length === 0) {
        return new Response('Session not found', { status: 404, headers: corsHeaders });
      }
      
      return new Response(JSON.stringify(results[0]), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Endpoint untuk mengirim jawaban dari Penerima
    // POST /session/:id/answer
    if (request.method === 'POST' && path[1] === 'session' && path[3] === 'answer') {
        const sessionId = path[1];
        const { answer } = await request.json();
        
        await env.DB.prepare(
            'UPDATE sessions SET answer = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
        ).bind(JSON.stringify(answer), sessionId).run();

        return new Response('Answer received', { status: 200, headers: corsHeaders });
    }

    // Endpoint untuk mengirim ICE candidate dari Pengirim atau Penerima
    // POST /session/:id/candidate
    if (request.method === 'POST' && path[1] === 'session' && path[3] === 'candidate') {
        const sessionId = path[1];
        const { candidate, type } = await request.json(); // type: 'sender' atau 'receiver'

        const column = type === 'sender' ? 'sender_candidates' : 'receiver_candidates';
        
        // Ambil data kandidat yang sudah ada, tambahkan yang baru, lalu update
        const { results } = await env.DB.prepare(`SELECT ${column} FROM sessions WHERE id = ?`).bind(sessionId).all();
        const existingCandidates = JSON.parse(results[0][column] || '[]');
        existingCandidates.push(candidate);
        
        await env.DB.prepare(
            `UPDATE sessions SET ${column} = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`
        ).bind(JSON.stringify(existingCandidates), sessionId).run();
        
        return new Response('Candidate received', { status: 200, headers: corsHeaders });
    }

    return new Response('Not found', { status: 404, headers: corsHeaders });
  },
};