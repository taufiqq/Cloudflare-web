export class TokenStore {
  constructor(state) {
    this.state = state;
    this.data = {};
  }

  async fetch(request) {
    const url = new URL(request.url);
    const method = request.method;

    // Pastikan data sudah ter-load
    if (!this.dataLoaded) {
      this.data = await this.state.storage.get("tokens") || {};
      this.dataLoaded = true;
    }

    if (method === "GET" && url.pathname.startsWith("/get/")) {
      const [_, __, id] = url.pathname.split("/");
      const token = this.data[id];
      return token
        ? new Response(token, { status: 200 })
        : new Response("ID tidak ditemukan", { status: 404 });
    }

    if (method === "POST" && url.pathname === "/save") {
      const body = await request.json();
      const { id, token } = body;
      if (!id || !token) {
        return new Response("ID dan token harus diisi", { status: 400 });
      }
      this.data[id] = token;
      await this.state.storage.put("tokens", this.data);
      return new Response("Disimpan", { status: 200 });
    }

    return new Response("Not found", { status: 404 });
  }
}
