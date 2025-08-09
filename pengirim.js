// public/pengirim.js

const startButton = document.getElementById('startButton');
const localVideo = document.getElementById('localVideo');
const sessionIdDisplay = document.getElementById('sessionIdDisplay');
const statusDiv = document.getElementById('status');

// Konfigurasi WebRTC
const configuration = {
    iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] // STUN server gratis dari Google
};

let peerConnection;
let localStream;
let lastSignalId = 0;
const sessionId = 'session-' + Math.random().toString(36).substr(2, 9);
sessionIdDisplay.textContent = sessionId;

const updateStatus = (message) => {
    console.log(message);
    statusDiv.textContent = `Status: ${message}`;
};

// Fungsi untuk mengirim sinyal ke server
async function sendSignal(type, data) {
    await fetch('/api/signal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, type, data })
    });
}

// Fungsi untuk polling (mengambil) sinyal dari server
async function pollSignals() {
    try {
        const response = await fetch(`/api/signal?sessionId=${sessionId}&lastId=${lastSignalId}`);
        const signals = await response.json();

        for (const signal of signals) {
            updateStatus(`Menerima sinyal tipe: ${signal.type}`);
            const signalData = JSON.parse(signal.data);

            if (signal.type === 'answer') {
                if (peerConnection.signalingState !== 'stable') {
                    await peerConnection.setRemoteDescription(new RTCSessionDescription(signalData));
                    updateStatus('Koneksi berhasil dibuat!');
                }
            } else if (signal.type === 'candidate') {
                await peerConnection.addIceCandidate(new RTCIceCandidate(signalData));
            }
            lastSignalId = signal.id; // Update ID sinyal terakhir yang diterima
        }
    } catch (error) {
        console.error('Polling error:', error);
    } finally {
        // Terus lakukan polling
        setTimeout(pollSignals, 2000); // Poll setiap 2 detik
    }
}

startButton.onclick = async () => {
    startButton.disabled = true;
    updateStatus('Memulai...');

    try {
        // 1. Dapatkan media (kamera)
        const constraints = {
            video: {
                width: { exact: 640 }, // 480p
                height: { exact: 480 },
                frameRate: { ideal: 24, max: 24 }
            },
            audio: false // Tanpa audio
        };
        localStream = await navigator.mediaDevices.getUserMedia(constraints);
        localVideo.srcObject = localStream; // Diperlukan agar stream aktif, meski video disembunyikan
        updateStatus('Kamera berhasil diakses.');

        // 2. Buat Peer Connection
        peerConnection = new RTCPeerConnection(configuration);

        // 3. Tambahkan track video ke koneksi
        localStream.getTracks().forEach(track => {
            peerConnection.addTrack(track, localStream);
        });

        // 4. Handle ICE Candidate
        peerConnection.onicecandidate = event => {
            if (event.candidate) {
                updateStatus('Mengirim ICE candidate...');
                sendSignal('candidate', event.candidate);
            }
        };
        
        peerConnection.onconnectionstatechange = () => {
            updateStatus(`Connection state: ${peerConnection.connectionState}`);
        };

        // 5. Buat Offer
        const offer = await peerConnection.createOffer();
        await peerConnection.setLocalDescription(offer);
        updateStatus('Offer dibuat, mengirim ke server...');
        await sendSignal('offer', offer);

        // 6. Mulai polling untuk Answer dari penerima
        updateStatus('Menunggu Answer dari penerima...');
        pollSignals();

    } catch (error) {
        console.error('Error starting stream:', error);
        updateStatus(`Error: ${error.message}`);
        startButton.disabled = false;
    }
};