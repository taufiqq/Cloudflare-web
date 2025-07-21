// src/durable-object.ts

export class TokenValidator {
  state: DurableObjectState;

  constructor(state: DurableObjectState) {
    this.state = state;
  }

  // Metode ini dipanggil saat ada request ke Durable Object
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    // Rute 1: Validasi token
    // Contoh: /validate/token-rahasia-abc
    if (url.pathname.startsWith('/validate/')) {
      const receivedToken = url.pathname.split('/')[2];
      const storedToken = await this.state.storage.get<string>('token');

      const isValid = storedToken !== undefined && storedToken === receivedToken;

      return new Response(JSON.stringify({ success: isValid }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Rute 2: Set/Update token (untuk admin)
    // Contoh: POST /set dengan body { "token": "token-baru-123" }
    if (url.pathname === '/set' && request.method === 'POST') {
      try {
        const { token } = await request.json<{ token: string }>();
        if (!token) {
          return new Response('Token tidak boleh kosong', { status: 400 });
        }
        await this.state.storage.put('token', token);
        return new Response(JSON.stringify({ message: 'Token berhasil diperbarui' }), {
          headers: { 'Content-Type': 'application/json' },
        });
      } catch (e) {
        return new Response('Body JSON tidak valid', { status: 400 });
      }
    }

    return new Response('Endpoint tidak ditemukan di dalam Object', { status: 404 });
  }
}