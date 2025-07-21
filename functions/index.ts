export const onRequest = async ({ request }) => {
  if (request.headers.get("upgrade")?.toLowerCase() !== "websocket") {
    return new Response("Expected WebSocket", { status: 426 });
  }

  const { socket, response } = Deno.upgradeWebSocket(request);

  socket.onopen = () => {
    console.log("WebSocket connected");
    socket.send("Hello from server!");
  };

  socket.onmessage = (e) => {
    console.log("Message from client:", e.data);
    socket.send("Echo: " + e.data);
  };

  socket.onclose = () => console.log("WebSocket closed");
  socket.onerror = (e) => console.error("WebSocket error", e);

  return response;
};
