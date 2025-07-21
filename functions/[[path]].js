export async function onRequest(context) {
  const { env, next, params, request } = context;
  const url = new URL(request.url);

  console.log(`--- Request Masuk ---`);
  console.log(`URL Lengkap: ${url.href}`);
  console.log(`Path dari URL: ${url.pathname}`);
  console.log(`Isi params.path: ${JSON.stringify(params.path)}`);

  const path = params.path;

  if (!Array.isArray(path) || path.length !== 2) {
    console.log("Kondisi GAGAL: Format path tidak sesuai. Seharusnya ada 2 bagian.");
    // Mari kita buat halaman default untuk URL yang formatnya aneh
    return new Response("Format URL salah. Gunakan /id/token.", { status: 400 });
  }

  const userId = path[0];
  const userToken = path[1];
  console.log(`Mencoba validasi untuk ID: '${userId}' dengan Token: '${userToken}'`);

  try {
    const kvBinding = env.ID_TOKEN_STORE;
    if (!kvBinding) {
      console.error("Kondisi FATAL: Binding KV 'ID_TOKEN_STORE' tidak ditemukan di env!");
      return new Response("Konfigurasi server error: KV binding tidak ada.", { status: 500 });
    }

    const storedToken = await kvBinding.get(userId);
    console.log(`Token yang tersimpan di KV untuk ID '${userId}': '${storedToken}'`);

    if (storedToken !== null && storedToken === userToken) {
      console.log("Kondisi SUKSES: ID dan Token cocok. Menampilkan halaman sukses.");
      return next('/sukses.html');
    } else {
      console.log("Kondisi GAGAL: ID tidak ditemukan atau Token salah. Menampilkan halaman gagal.");
      return next('/gagal.html');
    }
  } catch (error) {
    console.error("Terjadi error di dalam blok try-catch:", error);
    return new Response("Terjadi kesalahan internal pada server.", { status: 500 });
  }
}