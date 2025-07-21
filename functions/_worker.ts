export const onRequest = async ({ request }: { request: Request }) => {
  if (request.headers.get("Upgrade") !== "websocket") {
    return new Response("Expected WebSocket", { status: 400 });
  }

  const upgradeHeader = request.headers.get("Upgrade");
  if (!upgradeHeader || upgradeHeader.toLowerCase() !== "websocket") {
    return new Response("Missing Upgrade: websocket header", { status: 426 });
  }

  const { socket, response } = Deno.upgradeWebSocket(request);

  socket.onopen = () => {
    console.log("WebSocket connected");
    socket.send("Hello from Cloudflare!");
  };

  socket.onmessage = (e) => {
    console.log("Received message:", e.data);
    socket.send(`Echo: ${e.data}`);
  };

  socket.onclose = () => console.log("WebSocket closed");
  socket.onerror = (e) => console.error("WebSocket error:", e);

  return response;
};
