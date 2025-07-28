// functions/[token].js

export async function onRequest(context) {
    // context berisi semua hal yang kita butuhkan: request, env (environment variables), params (dari URL), next (untuk melanjutkan ke handler lain)
    const { request, env, params, next } = context;

    // --- BAGIAN BARU UNTUK SOLUSI ---
    // 1. Dapatkan pathname dari URL (misal: '/token123' atau '/style.css')
    const { pathname } = new URL(request.url);

    // 2. Buat Regex untuk mendeteksi ekstensi file statis
    // Jika path diakhiri dengan ekstensi ini, kita anggap itu file statis
    const isStaticAsset = /\.(css|js|svg|png|jpg|jpeg|gif|ico|webmanifest)$/.test(pathname);

    // 3. Jika ini adalah request untuk file statis, serahkan ke handler aset bawaan Cloudflare Pages
    if (isStaticAsset) {
        // next() akan melanjutkan rantai middleware, dalam kasus ini ke penyaji aset statis Pages.
        return next();
    }
    // --- AKHIR BAGIAN BARU ---


    // Kode lama Anda dimulai dari sini, dan akan berjalan HANYA jika bukan file statis.
    // Ambil token dari parameter URL (misal: 'tokenmasuk' dari /tokenmasuk)
    const tokenKey = params.token;

    // Cek ke KV Namespace 'TOKEN'
    const credentials = await env.TOKEN.get(tokenKey, { type: 'json' });

    // Jika token tidak ditemukan (credentials bernilai null), kirim pesan error
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

    // Jika token DITEMUKAN, lanjutkan untuk menampilkan C.html
    try {
        // Ambil file C.html dari aset statis Anda
        // Perbaikan kecil: Gunakan env.ASSETS.fetch(request) untuk C.html, tapi cara Anda juga bisa.
        const assetUrl = new URL('/C.html', request.url);
        const asset = await env.ASSETS.fetch(assetUrl);
        let html = await asset.text();

        // Siapkan skrip untuk disuntikkan ke dalam HTML
        const injectionScript = `
        <script>
            // Data ini disuntikkan oleh Cloudflare Function
            window.MQTT_CREDENTIALS = {
                user: "${credentials.user}",
                pass: "${credentials.pass}"
            };
            window.ID = ${credentials.id};
        </script>
        `;

        // Suntikkan skrip tersebut tepat sebelum tag penutup </body>
        html = html.replace('</body>', `${injectionScript}</body>`);

        // Kirim HTML yang sudah dimodifikasi ke browser
        return new Response(html, {
            headers: asset.headers,
        });

    } catch (e) {
        // Jika file C.html tidak ditemukan karena suatu alasan
        return new Response('Gagal memuat halaman kontroler.', { status: 500 });
    }
}