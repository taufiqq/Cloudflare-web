// /functions/_worker.js

export async function onRequest(context) {
  // Hanya proses upgrade ke WebSocket jika header 'Upgrade' ada dan nilainya 'websocket'
  if (context.request.headers.get('upgrade') === 'websocket') {
    // Membuat objek WebSocketPair
    const { socket, response } = new WebSocketPair();

    // Menangani event saat ada pesan masuk dari klien
    socket.addEventListener('message', event => {
      console.log(`Pesan dari klien: ${event.data}`);
      // Mengirim kembali pesan yang sama ke klien (echo)
      socket.send(`Anda mengirim: ${event.data}`);
    });

    // Menangani event saat koneksi ditutup
    socket.addEventListener('close', event => {
      console.log('Koneksi WebSocket ditutup');
    });

    // Menangani event jika terjadi error
    socket.addEventListener('error', event => {
      console.error('Terjadi error WebSocket:', event.error);
    });

    // Mengembalikan response yang akan memulai handshake WebSocket
    return new Response(null, { status: 101, webSocket: socket });
  } else {
    // Jika bukan permintaan upgrade WebSocket, kembalikan response biasa
    return new Response('Silakan hubungkan melalui WebSocket.', { status: 200 });
  }
}