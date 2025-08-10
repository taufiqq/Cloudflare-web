// public/penerima.js

const connectButton = document.getElementById('connectButton');
const sessionIdInput = document.getElementById('sessionIdInput');
const remoteVideo = document.getElementById('remoteVideo');
const statusDiv = document.getElementById('status');

// --- PENGATURAN SUPABASE (Ganti dengan kredensial Anda) ---
const SUPABASE_URL = 'https://umqbiksfxyiarsftwkac.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVtcWJpa3NmeHlpYXJzZnR3a2FjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMxNTM1NTUsImV4cCI6MjA2ODcyOTU1NX0.bNylE96swkVo5rNvqY5JDiM-nSFcs6nEGZEiFpNpos0';
const supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
// -----------------------------------------------------------

// ID unik untuk klien ini agar tidak memproses sinyalnya sendiri
const clientId = 'penerima-' + Math.random().toString(36).substr(2, 9);

const configuration = {
    iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
};

let peerConnection;
let sessionId;

const updateStatus = (message) => {
    console.log(message);
    statusDiv.textContent = `Status: ${message}`;
};

// Fungsi BARU untuk mengirim sinyal ke Supabase
async function sendSignal(type, data) {
    await supabase.from('webrtc_signals').insert([
        { session_id: sessionId, sender_id: clientId, type: type, data: data }
    ]);
}

// Fungsi BARU untuk mendengarkan sinyal dari Supabase
function subscribeToSignals() {
    supabase.channel(`webrtc-signals-${sessionId}`)
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

                if (signal.type === 'offer') {
                    peerConnection = new RTCPeerConnection(configuration);
                    
                    peerConnection.ontrack = event => {
                        updateStatus('Menerima remote track video!');
                        remoteVideo.srcObject = event.streams[0];
                    };

                    peerConnection.onicecandidate = event => {
                        if (event.candidate) {
                            updateStatus('Mengirim ICE candidate...');
                            sendSignal('candidate', event.candidate);
                        }
                    };

                    peerConnection.onconnectionstatechange = () => {
                        updateStatus(`Connection state: ${peerConnection.connectionState}`);
                    };
                    
                    await peerConnection.setRemoteDescription(new RTCSessionDescription(signalData));

                    const answer = await peerConnection.createAnswer();
                    await peerConnection.setLocalDescription(answer);

                    updateStatus('Answer dibuat, mengirim ke server...');
                    await sendSignal('answer', answer);

                } else if (signal.type === 'candidate') {
                     if (peerConnection) {
                        try {
                            await peerConnection.addIceCandidate(new RTCIceCandidate(signalData));
                        } catch(e) {
                            console.error('Error adding received ice candidate', e);
                            updateStatus(`Error adding ICE candidate: ${e.message}`);
                        }
                    }
                }
            }
        )
        .subscribe((status, err) => {
             if (status === 'SUBSCRIBED') {
                updateStatus('Berhasil subscribe ke channel. Menunggu Offer dari pengirim...');
            } else {
                updateStatus(`Gagal subscribe ke channel: ${err?.message || 'error tidak diketahui'}`);
            }
        });
}

connectButton.onclick = () => {
    sessionId = sessionIdInput.value.trim();
    if (!sessionId) {
        alert('Tolong masukkan Session ID.');
        return;
    }
    connectButton.disabled = true;
    sessionIdInput.disabled = true;
    updateStatus(`Menghubungkan ke sesi: ${sessionId}`);
    
    // Mulai mendengarkan sinyal dari pengirim
    subscribeToSignals();
};