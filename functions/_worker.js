// functions/_worker.js (dengan penambahan endpoint admin sementara)
// Pastikan Anda mengimpor kelas Durable Object
import { TokenStore } from '../durable_object'; // Sesuaikan path jika berbeda

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const pathSegments = url.pathname.split('/').filter(segment => segment !== '');

    // --- Endpoint Admin untuk Menyimpan Token (HANYA UNTUK PENGUJIAN) ---
    // Contoh akses: link.com/admin/put-token/myuser123/secure-token-123
    if (pathSegments[0] === 'admin' && pathSegments[1] === 'put-token' && pathSegments.length === 4) {
      const idToStore = pathSegments[2];
      const tokenToStore = pathSegments[3];

      const durableObjectId = env.TOKEN_STORE.idFromName("main-token-store");
      const tokenStore = env.TOKEN_STORE.get(durableObjectId);

      // Panggil metode putToken di Durable Object melalui subrequest
      const putUrl = new URL(request.url); // Base URL tidak penting untuk DO subrequest
      putUrl.pathname = `/do/put/${idToStore}/${tokenToStore}`;

      const doRequest = new Request(putUrl, {
        method: 'GET', // Menggunakan GET untuk kesederhanaan URL, POST dengan body lebih baik
      });

      const doResponse = await tokenStore.fetch(doRequest);

      if (doResponse.status === 200) {
        return new Response(`Token '${tokenToStore}' untuk ID '${idToStore}' berhasil disimpan.`, { status: 200 });
      } else {
        return new Response("Gagal menyimpan token di Durable Object.", { status: 500 });
      }
    }
    // --- Akhir Endpoint Admin ---


    // --- Logika Verifikasi Token Utama ---
    // Path yang diharapkan: /<id>/<token>
    // Contoh: link.com/123/abc-xyz-token
    if (pathSegments.length === 2) {
      const id = pathSegments[0];
      const token = pathSegments[1];

      const durableObjectId = env.TOKEN_STORE.idFromName("main-token-store");
      const tokenStore = env.TOKEN_STORE.get(durableObjectId);

      const verifyUrl = new URL(request.url);
      verifyUrl.pathname = `/do/verify/${id}/${token}`;

      const doRequest = new Request(verifyUrl, {
        method: 'GET',
      });

      const doResponse = await tokenStore.fetch(doRequest);

      if (doResponse.status === 200) {
        const isValid = await doResponse.json();
        if (isValid) {
          return new Response(`Akses diizinkan untuk ID: ${id}. Token valid.`, { status: 200 });
        } else {
          return new Response("Akses ditolak: Token tidak valid.", { status: 403 });
        }
      } else {
        return new Response("Terjadi kesalahan saat memverifikasi token.", { status: 500 });
      }

    } else if (url.pathname.startsWith('/do/')) {
        // Ini adalah endpoint internal untuk Durable Object
        // Durable Object akan memproses permintaan ini
        // Ini tidak akan diakses langsung dari browser
        return new Response("Akses langsung ke endpoint DO tidak diizinkan.", { status: 403 });
    }

    return new Response("Not Found. Format URL: /<id>/<token> atau /admin/put-token/<id>/<token>", { status: 404 });
  },
};

// Pastikan Durable Object diekspor agar bisa diakses oleh Worker
export { TokenStore } from '../durable_object';