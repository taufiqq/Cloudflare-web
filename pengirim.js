// public/pengirim.js

const startButton = document.getElementById('startButton');
const localVideo = document.getElementById('localVideo');
const sessionIdDisplay = document.getElementById('sessionIdDisplay');
const statusDiv = document.getElementById('status');

// Konfigurasi WebRTC
const configuration = {
    iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
};

let peerConnection;
let localStream;
let lastSignalId = 0;
const sessionId = 'session-' + Math.random().toString(36).substr(2, 9);
sessionIdDisplay.textContent = sessionId;

// >>> PERBAIKAN: Buat antrian untuk kandidat dari remote (penerima)
let remoteCandidateQueue = [];

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
            lastSignalId = signal.id; // Selalu update ID sinyal terakhir

            if (signal.type === 'answer') {
                // Periksa apakah remote description sudah ada. Jika belum, setel.
                if (peerConnection.signalingState !== 'stable') {
                    await peerConnection.setRemoteDescription(new RTCSessionDescription(signalData));
                    updateStatus('Answer diterima dan disetel sebagai remote description.');

                    // >>> PERBAIKAN: Proses antrian kandidat SEKARANG
                    updateStatus(`Memproses ${remoteCandidateQueue.length} kandidat dalam antrian...`);
                    while(remoteCandidateQueue.length > 0) {
                        const candidate = remoteCandidateQueue.shift();
                        await peerConnection.addIceCandidate(candidate);
                    }

                    // Kita tidak perlu lagi memeriksa 'stable' state di sini, karena 'setRemoteDescription' sudah selesai.
                    // Kondisi 'connected' akan ditangani oleh onconnectionstatechange.
                }
            } else if (signal.type === 'candidate') {
                // >>> PERBAIKAN: Logika untuk menangani kandidat yang datang
                const candidate = new RTCIceCandidate(signalData);
                // Jika remote description sudah ada, langsung tambahkan.
                if (peerConnection.remoteDescription) {
                    await peerConnection.addIceCandidate(candidate);
                } else {
                    // Jika belum, masukkan ke antrian.
                    updateStatus('Answer belum diterima, menampung candidate...');
                    remoteCandidateQueue.push(candidate);
                }
            }
        }
    } catch (error) {
        console.error('Polling error:', error);
        // Tangani error spesifik ini dengan pesan yang lebih jelas
        if (error.name === 'InvalidStateError') {
             updateStatus(`Error: ${error.message}. Ini biasanya terjadi jika kandidat datang sebelum answer. Kode sudah mencoba menanganinya.`);
        } else {
             updateStatus(`Error: ${error.message}`);
        }
    } finally {
        setTimeout(pollSignals, 2000);
    }
}

startButton.onclick = async () => {
    startButton.disabled = true;
    updateStatus('Memulai...');

    try {
        // 1. Dapatkan media (kamera)
        const backCameraConstraints = {
            video: {
                width: { exact: 640 },
                height: { exact: 360 },
                frameRate: { ideal: 24, max: 24 },
                facingMode: { ideal: "environment" } // Minta kamera belakang
            },
            audio: false
        };

        // Constraint untuk kamera depan (user) sebagai fallback
        const frontCameraConstraints = {
            video: {
                width: { exact: 640 },
                height: { exact: 360 },
                frameRate: { ideal: 24, max: 24 },
                facingMode: "user" // Fallback ke kamera depan
            },
            audio: false
        };
        
        try {
            // Coba dapatkan kamera belakang dulu
            updateStatus('Mencoba mengakses kamera belakang...');
            localStream = await navigator.mediaDevices.getUserMedia(backCameraConstraints);
        } catch (err) {
            // Jika gagal (misal: tidak ada kamera belakang atau error lain)
            console.warn('Gagal mendapatkan kamera belakang, mencoba kamera depan...', err);
            updateStatus('Kamera belakang tidak ditemukan, beralih ke kamera depan...');
            try {
                // Coba dapatkan kamera depan sebagai fallback
                localStream = await navigator.mediaDevices.getUserMedia(frontCameraConstraints);
            } catch (fallbackErr) {
                // Jika kamera depan juga gagal, lempar error utama
                updateStatus('Gagal mengakses semua kamera.');
                throw fallbackErr; // Melempar error agar ditangkap oleh blok catch utama
            }
        }
        
        localVideo.srcObject = localStream;
        updateStatus('Kamera berhasil diakses.');

        // 2. Buat Peer Connection
        peerConnection = new RTCPeerConnection(configuration);

        // 3. Tambahkan track video ke koneksi
        localStream.getTracks().forEach(track => {
            peerConnection.addTrack(track, localStream);
        });

        // 4. Handle ICE Candidate lokal (untuk dikirim)
        peerConnection.onicecandidate = event => {
            if (event.candidate) {
                updateStatus('Mengirim ICE candidate lokal...');
                sendSignal('candidate', event.candidate);
            }
        };
        
        // 5. Monitor status koneksi
        peerConnection.onconnectionstatechange = () => {
            updateStatus(`Connection state: ${peerConnection.connectionState}`);
            if (peerConnection.connectionState === "connected") {
                updateStatus('Koneksi berhasil dibuat!');
            }
        };

        // 6. Buat Offer
        const offer = await peerConnection.createOffer();
        await peerConnection.setLocalDescription(offer);
        updateStatus('Offer dibuat, mengirim ke server...');
        await sendSignal('offer', offer);

        // 7. Mulai polling untuk Answer & Candidate dari penerima
        updateStatus('Menunggu Answer dan Candidate dari penerima...');
        pollSignals();

    } catch (error) {
        console.error('Error starting stream:', error);
        updateStatus(`Error: ${error.message}`);
        startButton.disabled = false;
    }
};