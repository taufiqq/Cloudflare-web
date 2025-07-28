// Konfigurasi STUN server (kita pakai server publik dari Google)
const configuration = {
    iceServers: [
        {
            urls: [
                'stun:stun.l.google.com:19302',
                'stun:stun1.l.google.com:19302',
                'stun:stun2.l.google.com:19302',
            ],
        },
    ],
};

// Variabel global
let peerConnection = null;
let localStream = null;

// Ambil elemen dari DOM
const startButton = document.getElementById('startButton');
const createOfferButton = document.getElementById('createOfferButton');
const createAnswerButton = document.getElementById('createAnswerButton');
const setAnswerButton = document.getElementById('setAnswerButton');

const localVideo = document.getElementById('localVideo');
const remoteVideo = document.getElementById('remoteVideo');

const offerSdp = document.getElementById('offerSdp');
const answerSdpOutput = document.getElementById('answerSdpOutput');
const offerSdpInput = document.getElementById('offerSdpInput');
const answerSdpInput = document.getElementById('answerSdpInput');

// Event Listeners untuk tombol
startButton.onclick = startCamera;
createOfferButton.onclick = createOffer;
createAnswerButton.onclick = createAnswer;
setAnswerButton.onclick = setRemoteAnswer;

// 1. Fungsi untuk memulai kamera
async function startCamera() {
    try {
        localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        localVideo.srcObject = localStream;
    } catch (error) {
        console.error('Error accessing media devices.', error);
    }
}

// Fungsi untuk membuat koneksi PeerConnection baru
function createPeerConnection() {
    peerConnection = new RTCPeerConnection(configuration);

    // Event handler saat ICE candidate ditemukan
    peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
            // Dalam setup manual ini, kita menunggu semua candidate terkumpul.
            // SDP yang dihasilkan `localDescription` sudah berisi candidate ini.
            console.log('New ICE candidate:', event.candidate);
        }
    };
    
    // Event handler saat ICE gathering selesai
    // Kita update text area saat gathering selesai untuk memastikan semua candidate ada.
    peerConnection.onicegatheringstatechange = () => {
        if (peerConnection.iceGatheringState === 'complete') {
            if (peerConnection.localDescription.type === 'offer') {
                offerSdp.value = JSON.stringify(peerConnection.localDescription);
            } else if (peerConnection.localDescription.type === 'answer') {
                answerSdpOutput.value = JSON.stringify(peerConnection.localDescription);
            }
        }
    };

    // Event handler saat stream remote diterima
    peerConnection.ontrack = (event) => {
        if (!remoteVideo.srcObject) {
            remoteVideo.srcObject = new MediaStream();
        }
        remoteVideo.srcObject.addTrack(event.track);
    };

    // Tambahkan track dari stream lokal ke koneksi
    if (localStream) {
        localStream.getTracks().forEach(track => {
            peerConnection.addTrack(track, localStream);
        });
    }
}

// 2. Fungsi untuk membuat Offer (Peer 1)
async function createOffer() {
    if (!localStream) {
        alert('Mulai kamera terlebih dahulu!');
        return;
    }
    
    createPeerConnection();
    
    try {
        const offer = await peerConnection.createOffer();
        await peerConnection.setLocalDescription(offer);
        // SDP akan ditampilkan di textarea oleh event `onicegatheringstatechange`
    } catch (error) {
        console.error('Error creating offer.', error);
    }
}

// 3. Fungsi untuk membuat Answer (Peer 2)
async function createAnswer() {
    if (!localStream) {
        alert('Mulai kamera terlebih dahulu!');
        return;
    }

    if (!offerSdpInput.value) {
        alert('Tempel Offer SDP dari Peer 1 terlebih dahulu!');
        return;
    }

    createPeerConnection();

    try {
        const offer = JSON.parse(offerSdpInput.value);
        await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
        
        const answer = await peerConnection.createAnswer();
        await peerConnection.setLocalDescription(answer);
        // SDP jawaban akan ditampilkan di textarea oleh event `onicegatheringstatechange`
    } catch (error) {
        console.error('Error creating answer.', error);
    }
}

// 5. Fungsi untuk mengatur remote answer (Peer 1)
async function setRemoteAnswer() {
    if (!peerConnection) {
        alert('Buat tawaran (offer) terlebih dahulu!');
        return;
    }

    if (!answerSdpInput.value) {
        alert('Tempel Answer SDP dari Peer 2 terlebih dahulu!');
        return;
    }
    
    try {
        const answer = JSON.parse(answerSdpInput.value);
        await peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
        console.log('Koneksi berhasil dibuat!');
    } catch (error) {
        console.error('Error setting remote description.', error);
    }
}