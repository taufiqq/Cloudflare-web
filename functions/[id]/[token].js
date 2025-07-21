// File: functions/[id]/[token].js

export async function onRequest(context) {
  const { env, next, params } = context;

  // TIDAK PERLU CEK PANJANG PATH LAGI
  // Cloudflare hanya akan menjalankan fungsi ini jika pathnya cocok.

  // Ambil `id` dan `token` langsung dari `params`
  const userId = params.id;
  const userToken = params.token;
  
  console.log(`Validasi dari rute spesifik: ID=${userId}, Token=${userToken}`);

  try {
    const storedToken = await env.ID_TOKEN_STORE.get(userId);
    if (storedToken !== null && storedToken === userToken) {
      return next('/sukses.html');
    } else {
      return next('/gagal.html');
    }
  } catch (error) {
    console.error("Error KV:", error);
    return new Response("Error Internal Server", { status: 500 });
  }
}