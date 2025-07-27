// File: functions/api/admin/tokens.js

// Fungsi publish MQTT yang sudah diperbaiki
async function publishMqttViaApi(topic, payload) {
    const apiUrl = `https://xf46ce9c.ala.asia-southeast1.emqxsl.com:8443/api/v5/publish`;
    const authHeader = `Basic ${btoa(`p11a1e1e:J64_aoHEqfrkzk*C`);
    try {
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': authHeader },
            body: JSON.stringify({ topic, payload, qos: 1, retain: false }),
        });
        if (!response.ok) console.error(`Gagal publish MQTT via API: Status ${response.status}`, await response.text());
        else console.log(`Berhasil publish MQTT via API ke topik: ${topic}`);
    } catch (error) {
        console.error("Error saat memanggil fetch ke EMQX API:", error);
    }
}

function generateSecureToken(length = 16) {
    const array = new Uint8Array(length);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

// Handler utama untuk endpoint API
export async function onRequest(context) {
    const { request, env } = context;

    // --- AUTENTIKASI --- (Sama seperti sebelumnya, tapi sekarang di endpoint API)
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Basic ')) {
        return new Response(JSON.stringify({ message: 'Autentikasi diperlukan.' }), {
            status: 401, headers: { 'WWW-Authenticate': 'Basic realm="Admin API"' }
        });
    }
    const decodedCreds = atob(authHeader.substring(6));
    const [user, pass] = decodedCreds.split(':');
    const adminData = await env.ADMIN.get(`admin:${user}`, 'json');
    if (!adminData || adminData.pass !== pass) {
        return new Response(JSON.stringify({ message: 'Username atau password salah.' }), {
            status: 403, headers: { 'Content-Type': 'application/json' }
        });
    }

    // --- MENANGANI REQUEST ---
    try {
        if (request.method === 'GET') {
            const list = await env.TOKEN.list();
            const promises = list.keys.map(async (key) => ({
                key: key.name,
                value: await env.TOKEN.get(key.name, 'json')
            }));
            let allTokenData = await Promise.all(promises);
            allTokenData = allTokenData
                .filter(item => item.value && typeof item.value.id !== 'undefined')
                .sort((a, b) => a.value.id - b.value.id);
            
            return new Response(JSON.stringify(allTokenData), { headers: { 'Content-Type': 'application/json' } });
        }

        if (request.method === 'POST') {
            const body = await request.json();
            const { action, token_key } = body;

            switch (action) {
                case 'add': {
                    const list = await env.TOKEN.list();
                    const allTokens = await Promise.all(list.keys.map(k => env.TOKEN.get(k.name, 'json')));
                    const maxId = allTokens.reduce((max, t) => (t && t.id > max ? t.id : max), 0);
                    const newToken = generateSecureToken();
                    await env.TOKEN.put(newToken, JSON.stringify({ id: maxId + 1, user: body.user, pass: body.pass }));
                    break;
                }
                case 'update':
                    await env.TOKEN.put(token_key, JSON.stringify({ id: body.id, user: body.user, pass: body.pass }));
                    break;
                case 'generate_new': {
                    const oldData = await env.TOKEN.get(token_key, 'json');
                    if (oldData) {
                        const newToken = generateSecureToken();
                        await env.TOKEN.put(newToken, JSON.stringify(oldData));
                        await env.TOKEN.delete(token_key);
                        await publishMqttViaApi(`system/kick/${oldData.user}`, 'session_revoked');
                    }
                    break;
                }
                case 'delete': {
                    const oldData = await env.TOKEN.get(token_key, 'json');
                    await env.TOKEN.delete(token_key);
                    if (oldData) {
                        await publishMqttViaApi(`system/kick/${oldData.user}`, 'session_revoked');
                    }
                    break;
                }
                default:
                    return new Response(JSON.stringify({ message: 'Aksi tidak valid' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
            }
            return new Response(JSON.stringify({ success: true, action }), { headers: { 'Content-Type': 'application/json' } });
        }

        return new Response(JSON.stringify({ message: 'Metode tidak diizinkan' }), { status: 405 });
    } catch (e) {
        console.error("API Error:", e);
        return new Response(JSON.stringify({ message: 'Internal Server Error' }), { status: 500 });
    }
}