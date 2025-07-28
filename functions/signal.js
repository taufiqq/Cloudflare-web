export async function onRequestPost(context) {
  const { request, env } = context;
  const body = await request.json();
  const { type, data, clientId } = body;

  if (!env.SIGNAL_STORE) {
    return new Response("KV binding not configured", { status: 500 });
  }

  if (type === "offer") {
    await env.SIGNAL_STORE.put(`offer-${clientId}`, JSON.stringify(data));
    return new Response("Offer saved");
  }

  if (type === "answer") {
    await env.SIGNAL_STORE.put(`answer-${clientId}`, JSON.stringify(data));
    return new Response("Answer saved");
  }

  if (type === "candidate") {
    let key = `candidates-${clientId}`;
    let existing = await env.SIGNAL_STORE.get(key);
    let candidates = existing ? JSON.parse(existing) : [];
    candidates.push(data);
    await env.SIGNAL_STORE.put(key, JSON.stringify(candidates));
    return new Response("Candidate saved");
  }

  return new Response("Invalid type", { status: 400 });
}

export async function onRequestGet(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const type = url.searchParams.get("type");
  const clientId = url.searchParams.get("clientId");

  if (!env.SIGNAL_STORE) {
    return new Response("KV binding not configured", { status: 500 });
  }

  if (type === "offer") {
    const data = await env.SIGNAL_STORE.get(`offer-${clientId}`);
    return new Response(data || "{}");
  }

  if (type === "answer") {
    const data = await env.SIGNAL_STORE.get(`answer-${clientId}`);
    return new Response(data || "{}");
  }

  if (type === "candidate") {
    const data = await env.SIGNAL_STORE.get(`candidates-${clientId}`);
    return new Response(data || "[]");
  }

  return new Response("Invalid type", { status: 400 });
}
