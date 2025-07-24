// functions/[token].js

export async function onRequest(context) {
    // context berisi semua hal yang kita butuhkan: request, env (environment variables), params (dari URL)
    const { request, env, params } = context;

    // 1. Ambil token dari parameter URL (misal: 'tokenmasuk' dari /tokenmasuk)
    const tokenKey = params.token;

    // 2. Cek ke KV Namespace 'TOKEN'
    // Kita gunakan { type: 'json' } agar nilainya otomatis di-parse dari string JSON ke objek JavaScript
    const credentials = await env.TOKEN.get(tokenKey, { type: 'json' });

    // 3. Jika token tidak ditemukan (credentials bernilai null), kirim pesan error
    if (!credentials) {
        const htmlError = `
            <!DOCTYPE html>
            <html lang="id">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Akses Ditolak</title>
                <style>
                    body { font-family: sans-serif; background-color: #333; color: white; text-align: center; padding-top: 20vh; }
                    h1 { color: #ff6b6b; }
                </style>
            </head>
            <body>
                <h1>Akses Ditolak</h1>
                <p>Token yang Anda gunakan tidak valid atau tidak ditemukan.</p>
            </body>
            </html>`;
        return new Response(htmlError, {
            status: 403, // 403 Forbidden
            headers: { 'Content-Type': 'text/html;charset=UTF-8' },
        });
    }

    // 4. Jika token DITEMUKAN, lanjutkan untuk menampilkan C.html
    try {
        // Ambil file C.html dari aset statis Anda
        const assetUrl = new URL('/C.html', request.url);
        const asset = await env.ASSETS.fetch(assetUrl);
        let html = await asset.text();

        // 5. Siapkan skrip untuk disuntikkan ke dalam HTML
        // Ini cara aman untuk meneruskan data dari server ke client
        const injectionScript = `
        <script>
            // Data ini disuntikkan oleh Cloudflare Function
            window.MQTT_CREDENTIALS = {
                user: "${credentials.user}",
                pass: "${credentials.pass}"
            };
        </script>
        `;

        // 6. Suntikkan skrip tersebut tepat sebelum tag penutup </body>
        html = html.replace('</body>', `${injectionScript}</body>`);

        // 7. Kirim HTML yang sudah dimodifikasi ke browser
        return new Response(html, {
            headers: asset.headers, // Gunakan header asli dari file (misal: 'text/html')
        });

    } catch (e) {
        // Jika file C.html tidak ditemukan karena suatu alasan
        return new Response('Gagal memuat halaman kontroler.', { status: 500 });
    }
}