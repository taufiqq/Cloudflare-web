// public/pengirim.js

const startButton = document.getElementById('startButton');
const localVideo = document.getElementById('localVideo');
const sessionIdDisplay = document.getElementById('sessionIdDisplay');
const statusDiv = document.getElementById('status');

// --- PENGATURAN SUPABASE (Ganti dengan kredensial Anda) ---
const SUPABASE_URL = 'https://umqbiksfxyiarsftwkac.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVtcWJpa3NmeHlpYXJzZnR3a2FjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMxNTM1NTUsImV4cCI6MjA2ODcyOTU1NX0.bNylE96swkVo5rNvqY5JDiM-nSFcs6nEGZEiFpNpos0';
const supabaseC = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
// -----------------------------------------------------------

// ID unik untuk klien ini agar tidak memproses sinyalnya sendiri
const clientId = 'pengirim-' + Math.random().toString(36).substr(2, 9);

const configuration = {
    iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
};

let peerConnection;
let localStream;
let remoteCandidateQueue = [];
const sessionId = 'session-' + Math.random().toString(36).substr(2, 9);
sessionIdDisplay.textContent = sessionId;

const updateStatus = (message) => {
    console.log(message);
    statusDiv.textContent = `Status: ${message}`;
};

// Fungsi BARU untuk mengirim sinyal ke Supabase
async function sendSignal(type, data) {
    await supabaseC.from('webrtc_signals').insert([
        { session_id: sessionId, sender_id: clientId, type: type, data: data }
    ]);
}

// Fungsi BARU untuk mendengarkan sinyal dari Supabase
function subscribeToSignals() {
    supabaseC.channel(`webrtc-signals-${sessionId}`)
        .on(
            'postgres_changes',
            { 
                event: 'INSERT', 
                schema: 'public', 
                table: 'webrtc_signals',
                filter: `session_id=eq.${sessionId}`
            },
            async (payload) => {
                const signal = payload.new;

                // Abaikan sinyal yang dikirim oleh diri sendiri
                if (signal.sender_id === clientId) {
                    return;
                }

                updateStatus(`Menerima sinyal tipe: ${signal.type}`);
                const signalData = signal.data;

                if (signal.type === 'answer') {
                    if (peerConnection.signalingState !== 'stable') {
                        await peerConnection.setRemoteDescription(new RTCSessionDescription(signalData));
                        updateStatus('Answer diterima dan disetel sebagai remote description.');

                        updateStatus(`Memproses ${remoteCandidateQueue.length} kandidat dalam antrian...`);
                        while(remoteCandidateQueue.length > 0) {
                            const candidate = remoteCandidateQueue.shift();
                            await peerConnection.addIceCandidate(candidate);
                        }
                    }
                } else if (signal.type === 'candidate') {
                    const candidate = new RTCIceCandidate(signalData);
                    if (peerConnection.remoteDescription) {
                        await peerConnection.addIceCandidate(candidate);
                    } else {
                        updateStatus('Answer belum diterima, menampung candidate...');
                        remoteCandidateQueue.push(candidate);
                    }
                }
            }
        )
        .subscribe((status, err) => {
            if (status === 'SUBSCRIBED') {
                updateStatus('Berhasil subscribe ke channel sinyal. Menunggu penerima...');
            } else {
                updateStatus(`Gagal subscribe ke channel: ${err?.message || 'error tidak diketahui'}`);
            }
        });
}


startButton.onclick = async () => {
    startButton.disabled = true;
    updateStatus('Memulai...');

    try {
        const backCameraConstraints = { video: { width: { exact: 640 }, height: { exact: 360 }, frameRate: { ideal: 24, max: 24 }, facingMode: { ideal: "environment" } }, audio: false };
        const frontCameraConstraints = { video: { width: { exact: 640 }, height: { exact: 360 }, frameRate: { ideal: 24, max: 24 }, facingMode: "user" }, audio: false };
        
        try {
            updateStatus('Mencoba mengakses kamera belakang...');
            localStream = await navigator.mediaDevices.getUserMedia(backCameraConstraints);
        } catch (err) {
            console.warn('Gagal mendapatkan kamera belakang, mencoba kamera depan...', err);
            updateStatus('Kamera belakang tidak ditemukan, beralih ke kamera depan...');
            localStream = await navigator.mediaDevices.getUserMedia(frontCameraConstraints);
        }
        
        localVideo.srcObject = localStream;
        updateStatus('Kamera berhasil diakses.');

        peerConnection = new RTCPeerConnection(configuration);

        localStream.getTracks().forEach(track => {
            peerConnection.addTrack(track, localStream);
        });

        peerConnection.onicecandidate = event => {
            if (event.candidate) {
                updateStatus('Mengirim ICE candidate lokal...');
                sendSignal('candidate', event.candidate);
            }
        };
        
        peerConnection.onconnectionstatechange = () => {
            updateStatus(`Connection state: ${peerConnection.connectionState}`);
            if (peerConnection.connectionState === "connected") {
                updateStatus('Koneksi berhasil dibuat!');
            }
        };

        const offer = await peerConnection.createOffer();
        await peerConnection.setLocalDescription(offer);
        updateStatus('Offer dibuat, mengirim ke server...');
        await sendSignal('offer', offer);

        // Mulai mendengarkan sinyal dari penerima
        subscribeToSignals();

    } catch (error) {
        console.error('Error starting stream:', error);
        updateStatus(`Error: ${error.message}`);
        startButton.disabled = false;
    }
};