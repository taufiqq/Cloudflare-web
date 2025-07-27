// File: functions/api/admin/token.js (VERSI SANGAT SIMPLE)

function generateSecureToken(length = 16) {
    const array = new Uint8Array(length);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

export async function onRequest(context) {
    const { request, env } = context;
    
    // --- AUTENTIKASI ADMIN ---
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Basic ')) {
        return new Response(JSON.stringify({ message: 'Autentikasi diperlukan.' }), { status: 401, headers: { 'WWW-Authenticate': 'Basic realm="Admin API"' } });
    }
    const decodedCreds = atob(authHeader.substring(6));
    const [user, pass] = decodedCreds.split(':');
    const adminData = await env.ADMIN.get(`admin:${user}`, 'json');
    if (!adminData || adminData.pass !== pass) {
        return new Response(JSON.stringify({ message: 'Username atau password salah.' }), { status: 403, headers: { 'Content-Type': 'application/json' } });
    }

    try {
        if (request.method === 'GET') {
            const list = await env.TOKEN.list();
            const promises = list.keys.map(async (key) => ({ key: key.name, value: await env.TOKEN.get(key.name, 'json') }));
            let allTokenData = await Promise.all(promises);
            allTokenData = allTokenData.filter(item => item.value && typeof item.value.id !== 'undefined').sort((a, b) => a.value.id - b.value.id);
            return new Response(JSON.stringify(allTokenData), { headers: { 'Content-Type': 'application/json' } });
        }
        
        if (request.method === 'POST') {
            const body = await request.json();
            const { action, token_key } = body;
            let responseData = { success: true, action };

            switch (action) {
                case 'add': {
                    const list = await env.TOKEN.list();
                    const allTokens = await Promise.all(list.keys.map(k => env.TOKEN.get(k.name, 'json')));
                    const maxId = allTokens.reduce((max, t) => (t && t.id > max ? t.id : max), 0);
                    const newToken = generateSecureToken();
                    await env.TOKEN.put(newToken, JSON.stringify({ id: maxId + 1, user: body.user, pass: body.pass }));
                    break;
                }
                case 'update': {
                    await env.TOKEN.put(token_key, JSON.stringify({ id: body.id, user: body.user, pass: body.pass }));
                    break;
                }
                case 'generate_new': {
                    const oldData = await env.TOKEN.get(token_key, 'json');
                    if (oldData) {
                        const newToken = generateSecureToken();
                        await env.TOKEN.put(newToken, JSON.stringify(oldData));
                        await env.TOKEN.delete(token_key);
                        responseData.kickedUser = oldData.user; // Kirim balik user yang di-kick
                    }
                    break;
                }
                case 'delete': {
                    const oldData = await env.TOKEN.get(token_key, 'json');
                    await env.TOKEN.delete(token_key);
                    if (oldData) {
                        responseData.kickedUser = oldData.user; // Kirim balik user yang di-kick
                    }
                    break;
                }
                default:
                    return new Response(JSON.stringify({ message: 'Aksi tidak valid' }), { status: 400 });
            }
            // Kirim balik respons dengan data user yang di-kick
            return new Response(JSON.stringify(responseData), { headers: { 'Content-Type': 'application/json' } });
        }
        return new Response(JSON.stringify({ message: 'Metode tidak diizinkan' }), { status: 405 });
    } catch (e) {
        console.error("API Error:", e);
        return new Response(JSON.stringify({ message: 'Internal Server Error' }), { status: 500 });
    }
}