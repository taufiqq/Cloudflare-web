export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const method = request.method;

  if (!env.SIGNAL_STORE) {
    return new Response("KV not configured", { status: 500 });
  }

  if (method === "POST") {
    const { type, roomId, data } = await request.json();

    if (!roomId || !type) {
      return new Response("Missing roomId or type", { status: 400 });
    }

    if (type === "offer") {
      await env.SIGNAL_STORE.put(`offer-${roomId}`, JSON.stringify(data));
    } else if (type === "answer") {
      await env.SIGNAL_STORE.put(`answer-${roomId}`, JSON.stringify(data));
    } else if (type === "candidate") {
      const key = `candidates-${roomId}`;
      const existing = await env.SIGNAL_STORE.get(key);
      const candidates = existing ? JSON.parse(existing) : [];
      candidates.push(data);
      await env.SIGNAL_STORE.put(key, JSON.stringify(candidates));
    }

    return new Response("OK");
  }

  if (method === "GET") {
    const type = url.searchParams.get("type");
    const roomId = url.searchParams.get("roomId");

    if (!roomId || !type) {
      return new Response("Missing roomId or type", { status: 400 });
    }

    if (type === "offer") {
      const offer = await env.SIGNAL_STORE.get(`offer-${roomId}`);
      return new Response(offer || "{}");
    }

    if (type === "answer") {
      const answer = await env.SIGNAL_STORE.get(`answer-${roomId}`);
      return new Response(answer || "{}");
    }

    if (type === "candidate") {
      const candidates = await env.SIGNAL_STORE.get(`candidates-${roomId}`);
      return new Response(candidates || "[]");
    }
  }

  return new Response("Invalid request", { status: 400 });
}
