// functions/session/[[path]].js

// Handler untuk semua method, kita akan routing di dalamnya
export async function onRequest(context) {
  const { request, env, params } = context;

  // params.path akan berisi array dari segmen URL, misal: ['some-id', 'answer']
  const pathSegments = params.path || [];
  const sessionId = pathSegments[0];

  if (!sessionId) {
    return new Response('Session ID is missing', { status: 400 });
  }

  // Siapkan header CORS untuk semua respons dari file ini
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  // Handle pre-flight requests untuk CORS
  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  
  // ROUTING BERDASARKAN METHOD DAN PANJANG PATH
  
  // GET /session/:id
  if (request.method === 'GET' && pathSegments.length === 1) {
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

  // POST /session/:id/answer
  if (request.method === 'POST' && pathSegments.length === 2 && pathSegments[1] === 'answer') {
      const { answer } = await request.json();
      await env.DB.prepare(
          'UPDATE sessions SET answer = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
      ).bind(JSON.stringify(answer), sessionId).run();
      return new Response('Answer received', { status: 200, headers: corsHeaders });
  }

  // POST /session/:id/candidate
  if (request.method === 'POST' && pathSegments.length === 2 && pathSegments[1] === 'candidate') {
      const { candidate, type } = await request.json();
      const column = type === 'sender' ? 'sender_candidates' : 'receiver_candidates';
      
      const { results } = await env.DB.prepare(`SELECT ${column} FROM sessions WHERE id = ?`).bind(sessionId).all();
      const existingCandidates = JSON.parse(results[0][column] || '[]');
      existingCandidates.push(candidate);
      
      await env.DB.prepare(
          `UPDATE sessions SET ${column} = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`
      ).bind(JSON.stringify(existingCandidates), sessionId).run();
      
      return new Response('Candidate received', { status: 200, headers: corsHeaders });
  }

  return new Response('Endpoint not found in this route', { status: 404, headers: corsHeaders });
}