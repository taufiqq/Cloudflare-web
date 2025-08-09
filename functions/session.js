// functions/session.js

// Handler untuk POST /session
export async function onRequestPost(context) {
  // context object berisi:
  // context.request: objek Request
  // context.env: variabel environment (termasuk binding D1)
  // context.params: parameter dari path (tidak kita gunakan di sini)
  // context.next: untuk middleware
  
  try {
    const { offer } = await context.request.json();
    if (!offer) {
      return new Response('Offer is required', { status: 400 });
    }

    const sessionId = crypto.randomUUID();
    
    await context.env.DB.prepare(
      'INSERT INTO sessions (id, offer) VALUES (?, ?)'
    ).bind(sessionId, JSON.stringify(offer)).run();

    // Mengizinkan CORS dengan header
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
    };

    return new Response(JSON.stringify({ sessionId }), { headers });

  } catch (e) {
    return new Response(e.message, { status: 500 });
  }
}

// Handler untuk OPTIONS (diperlukan untuk CORS pre-flight)
export async function onRequestOptions(context) {
    return new Response(null, {
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
        }
    });
}