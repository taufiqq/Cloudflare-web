// public/penerima.js

const connectButton = document.getElementById('connectButton');
const sessionIdInput = document.getElementById('sessionIdInput');
const remoteVideo = document.getElementById('remoteVideo');
const statusDiv = document.getElementById('status');

const configuration = {
    iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
};

let peerConnection;
let sessionId;
let lastSignalId = 0;

const updateStatus = (message) => {
    console.log(message);
    statusDiv.textContent = `Status: ${message}`;
};

async function sendSignal(type, data) {
    await fetch('/api/signal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, type, data })
    });
}

async function pollSignals() {
    try {
        const response = await fetch(`/api/signal?sessionId=${sessionId}&lastId=${lastSignalId}`);
        const signals = await response.json();

        for (const signal of signals) {
            updateStatus(`Menerima sinyal tipe: ${signal.type}`);
            const signalData = JSON.parse(signal.data);

            if (signal.type === 'offer') {
                peerConnection = new RTCPeerConnection(configuration);
                
                // Handle remote track
                peerConnection.ontrack = event => {
                    updateStatus('Menerima remote track video!');
                    remoteVideo.srcObject = event.streams[0];
                };

                // Handle ICE Candidate
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
                    await peerConnection.addIceCandidate(new RTCIceCandidate(signalData));
                }
            }
            lastSignalId = signal.id;
        }
    } catch (error) {
        console.error('Polling error:', error);
    } finally {
        setTimeout(pollSignals, 2000);
    }
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
    
    // Mulai polling untuk Offer
    pollSignals();
};