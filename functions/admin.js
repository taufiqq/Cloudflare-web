// File: functions/admin.js
async function publishMqttViaApi(topic, payload, env) {
    // Pastikan variabel environment sudah diatur

    const apiUrl = "https://xf46ce9c.ala.asia-southeast1.emqxsl.com:8443/api/v5/publish";
    const credentials = "p11a1e1e:J64_aoHEqfrkzk*C";
    const authHeader = `Basic ${btoa(credentials)}`; // btoa tersedia di environment Cloudflare Functions

    try {
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': authHeader,
            },
            body: JSON.stringify({
                topic: topic,
                payload: payload,
                qos: 1, // Quality of Service
                retain: false,
            }),
        });

        if (!response.ok) {
            const errorBody = await response.text();
            console.error(`Gagal publish MQTT via API: ${response.status} ${response.statusText}`, errorBody);
        } else {
            console.log(`Berhasil publish MQTT via API ke topik: ${topic}`);
        }
    } catch (error) {
        console.error("Error saat memanggil EMQX API:", error);
    }
}

// Fungsi helper untuk menghasilkan token acak yang aman
function generateSecureToken(length = 32) {
    const array = new Uint8Array(length);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

// Fungsi untuk merender halaman HTML admin
function renderAdminPage(tokens, requestUrl) {
    const baseUrl = new URL(requestUrl).origin;

    return `
    <!DOCTYPE html>
    <html lang="id">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Admin Panel - Manajemen Token</title>
        <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; margin: 0; background-color: #f4f4f4; color: #333; }
            .container { max-width: 1200px; margin: 20px auto; padding: 20px; background-color: #fff; box-shadow: 0 0 10px rgba(0,0,0,0.1); border-radius: 8px; }
            h1, h2 { color: #0056b3; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { padding: 12px; border: 1px solid #ddd; text-align: left; }
            th { background-color: #007bff; color: white; }
            tr:nth-child(even) { background-color: #f2f2f2; }
            form { display: inline-block; margin: 0; }
            .btn { cursor: pointer; padding: 8px 12px; border: none; border-radius: 4px; color: white; font-weight: bold; text-decoration: none; display: inline-block; margin: 2px; }
            .btn-add { background-color: #28a745; }
            .btn-edit { background-color: #ffc107; color: #333; }
            .btn-generate { background-color: #17a2b8; }
            .btn-copy { background-color: #6c757d; }
            .btn-delete { background-color: #dc3545; }
            .btn-save { background-color: #007bff; }
            .add-form { background-color: #e9ecef; padding: 20px; border-radius: 8px; margin-bottom: 30px; }
            .add-form input { width: calc(100% - 24px); padding: 10px; margin-bottom: 10px; border: 1px solid #ccc; border-radius: 4px; }
            .add-form .btn-add { width: 100%; padding: 12px; }
            .word-break { word-break: break-all; }
        </style>
    </head>
    <body>
        <div class="container">
            <h1>Panel Admin</h1>

            <h2>Tambah Token Baru</h2>
            <div class="add-form">
                <form method="POST" action="/admin">
                    <input type="hidden" name="action" value="add">
                    <label for="user">User:</label>
                    <input type="text" id="user" name="user" required>
                    <label for="pass">Password:</label>
                    <input type="text" id="pass" name="pass" required>
                    <button type="submit" class="btn btn-add">Tambah Token</button>
                </form>
            </div>

            <h2>Daftar Token</h2>
            <table>
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>User</th>
                        <th>Password</th>
                        <th>Token</th>
                        <th>Aksi</th>
                    </tr>
                </thead>
                <tbody>
                    ${tokens.map(tokenData => `
                        <tr>
                            <form method="POST" action="/admin">
                                <input type="hidden" name="action" value="update">
                                <input type="hidden" name="token_key" value="${tokenData.key}">
                                <input type="hidden" name="id" value="${tokenData.value.id}">
                                <td>${tokenData.value.id}</td>
                                <td><input type="text" name="user" value="${tokenData.value.user}"></td>
                                <td><input type="text" name="pass" value="${tokenData.value.pass}"></td>
                                <td class="word-break">${tokenData.key}</td>
                                <td>
                                    <button type="submit" class="btn btn-save">Simpan</button>
                            </form>
                            <form method="POST" action="/admin">
                                <input type="hidden" name="action" value="generate_new">
                                <input type="hidden" name="token_key" value="${tokenData.key}">
                                <button type="submit" class="btn btn-generate">Generate Baru</button>
                            </form>
                            <button class="btn btn-copy" data-token="${tokenData.key}">Copy URL</button>
                             <form method="POST" action="/admin" onsubmit="return confirm('Apakah Anda yakin ingin menghapus token ini?');">
                                <input type="hidden" name="action" value="delete">
                                <input type="hidden" name="token_key" value="${tokenData.key}">
                                <button type="submit" class="btn btn-delete">Hapus</button>
                            </form>
                                </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
        <script>
            document.querySelectorAll('.btn-copy').forEach(button => {
                button.addEventListener('click', function() {
                    const token = this.getAttribute('data-token');
                    const urlToCopy = \`${baseUrl}/\${token}\`;
                    navigator.clipboard.writeText(urlToCopy).then(() => {
                        alert('URL disalin ke clipboard: ' + urlToCopy);
                    }).catch(err => {
                        console.error('Gagal menyalin: ', err);
                        alert('Gagal menyalin URL.');
                    });
                });
            });
        </script>
    </body>
    </html>
    `;
}

// Handler utama untuk semua request ke /admin
export async function onRequest(context) {
    const { request, env } = context;
    const url = new URL(request.url);

    // --- 1. AUTENTIKASI ---
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Basic ')) {
        return new Response('Autentikasi diperlukan.', {
            status: 401,
            headers: { 'WWW-Authenticate': 'Basic realm="Admin Area"' },
        });
    }

    const decodedCreds = atob(authHeader.substring(6));
    const [user, pass] = decodedCreds.split(':');

    const adminData = await env.ADMIN.get(`admin:${user}`, 'json');

    if (!adminData || adminData.pass !== pass) {
        return new Response('Username atau password salah.', {
            status: 401,
            headers: { 'WWW-Authenticate': 'Basic realm="Admin Area"' },
        });
    }

    // --- 2. PENANGANAN AKSI (POST) ---
    if (request.method === 'POST') {
        const formData = await request.formData();
        const action = formData.get('action');
        const tokenKey = formData.get('token_key');

        switch (action) {
            case 'add': {
                // ... (logika 'add' tidak berubah, karena tidak ada sesi aktif yang perlu di-kick) ...
                 const user = formData.get('user');
                const pass = formData.get('pass');
                if (user && pass) {
                    const list = await env.TOKEN.list();
                    const allTokens = await Promise.all(list.keys.map(k => env.TOKEN.get(k.name, 'json')));
                    const maxId = allTokens.reduce((max, t) => (t && t.id > max ? t.id : max), 0);
                    
                    const newToken = generateSecureToken(16); // Generate token lebih pendek
                    const newValue = { id: maxId + 1, user, pass };
                    await env.TOKEN.put(newToken, JSON.stringify(newValue));
                }
                break;
            }
            case 'update': {
                // ... (logika 'update' tidak berubah) ...
                 const user = formData.get('user');
                const pass = formData.get('pass');
                const id = parseInt(formData.get('id'), 10);
                if (tokenKey && user && pass) {
                    const updatedValue = { id, user, pass };
                    await env.TOKEN.put(tokenKey, JSON.stringify(updatedValue));
                }
                break;
            }
            case 'generate_new': {
                if (tokenKey) {
                    // Ambil data lama untuk mendapatkan 'user'
                    const oldData = await env.TOKEN.get(tokenKey, 'json');
                    if (oldData) {
                        const newToken = generateSecureToken(16);
                        await env.TOKEN.put(newToken, JSON.stringify(oldData)); // Simpan dengan token baru
                        await env.TOKEN.delete(tokenKey); // Hapus token lama

                        // KIRIM PESAN KICK!
                        const kickTopic = `system/kick/${oldData.user}`;
                        await publishMqttViaApi(kickTopic, 'session_revoked', env);
                    }
                }
                break;
            }
            case 'delete': {
                if (tokenKey) {
                    // Ambil data lama untuk mendapatkan 'user' SEBELUM dihapus
                    const oldData = await env.TOKEN.get(tokenKey, 'json');
                    await env.TOKEN.delete(tokenKey); // Hapus token

                    if (oldData) {
                        // KIRIM PESAN KICK!
                        const kickTopic = `system/kick/${oldData.user}`;
                        await publishMqttViaApi(kickTopic, 'session_revoked', env);
                    }
                }
                break;
            }
        }

        // Redirect kembali ke halaman admin untuk melihat perubahan
        return Response.redirect(url.origin + url.pathname, 303);
    }


    // --- 3. MENAMPILKAN HALAMAN (GET) ---
    if (request.method === 'GET') {
        const list = await env.TOKEN.list();
        let allTokenData = [];

        if (list.keys.length > 0) {
            const promises = list.keys.map(async (key) => {
                const value = await env.TOKEN.get(key.name, 'json');
                return { key: key.name, value };
            });
            allTokenData = await Promise.all(promises);
            // Filter data yang null/kosong dan urutkan berdasarkan ID
            allTokenData = allTokenData
                .filter(item => item.value && typeof item.value.id !== 'undefined')
                .sort((a, b) => a.value.id - b.value.id);
        }

        const html = renderAdminPage(allTokenData, request.url);
        return new Response(html, {
            headers: { 'Content-Type': 'text/html;charset=UTF-8' },
        });
    }

    // Metode lain tidak diizinkan
    return new Response('Metode tidak diizinkan', { status: 405 });
}