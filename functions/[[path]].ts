/**
 * Fungsi ini menangani semua request masuk.
 * @param {object} context - Objek konteks dari Cloudflare Functions.
 */
export async function onRequest(context) {
  // `context.env` adalah tempat binding ke KV disimpan.
  // `ID_TOKEN_STORE` adalah NAMA BINDING yang akan kita atur di dashboard.
  const { env, next, params } = context;

  // `params.path` berisi array dari segmen URL.
  // Contoh: /user123/abc -> ['user123', 'abc']
  const path = params.path;

  // 1. Cek apakah format URL benar (harus ada 2 bagian: id dan token)
  if (!Array.isArray(path) || path.length !== 2) {
    // Jika format salah, tampilkan halaman gagal.
    return next('/gagal.html');
  }

  const userId = path[0];
  const userToken = path[1];

  try {
    // 2. Ambil token yang tersimpan di KV berdasarkan userId
    const storedToken = await env.ID_TOKEN_STORE.get(userId);

    // 3. Validasi
    // Cek apakah ID ada di KV dan tokennya cocok.
    if (storedToken !== null && storedToken === userToken) {
      // Jika cocok, tampilkan halaman sukses.
      console.log(`Akses berhasil untuk ID: ${userId}`);
      return next('/sukses.html');
    } else {
      // Jika ID tidak ditemukan atau token salah, tampilkan halaman gagal.
      console.log(`Akses gagal untuk ID: ${userId}`);
      return next('/gagal.html');
    }
  } catch (error) {
    // Menangani jika ada error saat mengakses KV
    console.error("Error saat mengakses KV:", error);
    return new Response("Terjadi kesalahan internal pada server.", { status: 500 });
  }
}