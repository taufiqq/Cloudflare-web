// durable_object.js (Revisi)
export class TokenStore {
  constructor(state, env) {
    this.state = state;
    this.env = env;
  }

  async fetch(request) {
    const url = new URL(request.url);
    const pathSegments = url.pathname.split('/').filter(segment => segment !== '');

    // Endpoint internal untuk menyimpan token (misalnya, dari admin panel atau API lain)
    // Contoh: /do/put/123/abc-xyz-token
    if (pathSegments[0] === 'do' && pathSegments[1] === 'put' && pathSegments.length === 4) {
      const id = pathSegments[2];
      const token = pathSegments[3];
      await this.state.storage.put(id, token);
      return new Response(JSON.stringify(true), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }

    // Endpoint internal untuk memverifikasi token
    // Contoh: /do/verify/123/abc-xyz-token
    if (pathSegments[0] === 'do' && pathSegments[1] === 'verify' && pathSegments.length === 4) {
      const id = pathSegments[2];
      const tokenToCheck = pathSegments[3];
      const storedToken = await this.state.storage.get(id);
      const isValid = (storedToken && storedToken === tokenToCheck);
      return new Response(JSON.stringify(isValid), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }

    // Endpoint internal untuk menghapus token (opsional)
    // Contoh: /do/delete/123
    if (pathSegments[0] === 'do' && pathSegments[1] === 'delete' && pathSegments.length === 3) {
      const id = pathSegments[2];
      await this.state.storage.delete(id);
      return new Response(JSON.stringify(true), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }

    return new Response("Invalid Durable Object operation", { status: 400 });
  }
}