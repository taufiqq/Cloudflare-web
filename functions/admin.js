// File: functions/admin.js (VERSI BARU UNTUK INJECT SCRIPT)

export async function onRequest(context) {
    const { request, env } = context;

    // --- AUTENTIKASI ADMIN ---
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

    // --- PROSES BARU: AMBIL HTML, SUNTIKKAN SCRIPT, KIRIM ---
    try {
        const assetUrl = new URL('/admin.html', request.url);
        const asset = await env.ASSETS.fetch(assetUrl);
        let html = await asset.text();

        // Pastikan variabel environment ada
        const mqtt = await env.ADMIN.get('MQTT','json');

        // Siapkan skrip untuk disuntikkan
        const injectionScript = `
        <script>
            // Data ini disuntikkan oleh Cloudflare Function
            window.ADMIN_MQTT_CREDS = {
                user: "${mqtt.user}",
                pass: "${mqtt.pass}"
            };
        </script>
        `;

        // Suntikkan skrip tersebut tepat sebelum tag </body>
        html = html.replace('</body>', `${injectionScript}</body>`);

        return new Response(html, {
            headers: { 'Content-Type': 'text/html;charset=UTF-8' },
        });

    } catch (e) {
        console.error("Gagal memuat atau memodifikasi admin.html:", e);
        return new Response('Gagal memuat halaman admin. Pastikan file admin.html ada.', { status: 500 });
    }
}