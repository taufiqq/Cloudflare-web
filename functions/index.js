// functions/index.js

export async function onRequest(context) {
    const htmlInfo = `
        <!DOCTYPE html>
        <html lang="id">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Perlu Token</title>
            <style>
                body { font-family: sans-serif; background-color: #333; color: white; text-align: center; padding-top: 20vh; }
                code { background-color: #555; padding: 2px 5px; border-radius: 4px; }
            </style>
        </head>
        <body>
            <h1>Diperlukan Token Akses</h1>
            <p>Silakan akses halaman ini menggunakan URL yang berisi token Anda.</p>
            <p>Contoh: <code>https://${new URL(context.request.url).hostname}/nama_token_anda</code></p>
        </body>
        </html>`;

    return new Response(htmlInfo, {
        status: 401, // 401 Unauthorized
        headers: { 'Content-Type': 'text/html;charset=UTF-8' },
    });
}