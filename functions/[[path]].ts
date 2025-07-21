// functions/[[path]].ts

interface Env {
  // Binding ke Durable Object kita
  VALIDATORS: DurableObjectNamespace;
}

export const onRequest: PagesFunction<Env> = async (context) => {
  const { request, env, next } = context;
  const url = new URL(request.url);
  const pathParts = url.pathname.slice(1).split('/'); // Hilangkan '/' di awal

  // Rute Admin untuk SET TOKEN: /admin/set
  if (pathParts[0] === 'admin' && pathParts[1] === 'set' && request.method === 'POST') {
    try {
        const { id, token } = await request.json<{ id: string, token: string }>();
        if (!id || !token) {
            return new Response('ID dan Token dibutuhkan', { status: 400 });
        }

        // Dapatkan ID unik untuk Durable Object berdasarkan nama 'id'
        const doId = env.VALIDATORS.idFromName(id);
        const stub = env.VALIDATORS.get(doId);

        // Teruskan request ke Durable Object untuk menyimpan token
        const newRequest = new Request(`${url.origin}/set`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token: token }),
        });

        return await stub.fetch(newRequest);

    } catch (e) {
        return new Response('Request body tidak valid.', { status: 400 });
    }
  }

  // Rute Validasi: /{id}/{token}
  if (pathParts.length === 2) {
    const userId = pathParts[0];
    const userToken = pathParts[1];

    // Dapatkan ID unik untuk Durable Object berdasarkan nama 'userId'
    const doId = env.VALIDATORS.idFromName(userId);
    // Dapatkan "stub", yaitu pointer ke Durable Object
    const stub = env.VALIDATORS.get(doId);

    // Buat request baru untuk dikirim ke Durable Object
    const validationRequest = new Request(`${url.origin}/validate/${userToken}`);

    // Panggil metode fetch() di Durable Object
    const response = await stub.fetch(validationRequest);
    const { success } = await response.json<{ success: boolean }>();

    if (success) {
      // Tampilkan halaman sukses
      return next('/sukses.html');
    } else {
      // Tampilkan halaman gagal
      return next('/gagal.html');
    }
  }
  
  // Jika rute tidak cocok, biarkan Pages menangani (cth: menampilkan admin.html)
  return next();
};