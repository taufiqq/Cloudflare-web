// File: functions/admin.js (VERSI BARU YANG JAUH LEBIH SIMPEL)

export async function onRequest(context) {
    const { request, env } = context;

    // --- AUTENTIKASI (Basic Auth) ---
    // Diperlukan agar hanya admin yang bisa melihat halaman HTML-nya.
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

    // --- MENYAJIKAN FILE HTML STATIS ---
    // Jika autentikasi berhasil, ambil file admin.html dari aset statis
    // dan kirimkan ke browser.
    try {
        const assetUrl = new URL('/admin.html', request.url);
        const asset = await env.ASSETS.fetch(assetUrl);
        return new Response(asset.body, asset);
    } catch (e) {
        return new Response('Gagal memuat halaman admin. Pastikan file admin.html ada.', { status: 500 });
    }
}