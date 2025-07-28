let localStream;
let peerConnection;

const servers = {
    iceServers: [
        { urls: "stun:stun.l.google.com:19302" } // STUN saja
    ]
};

const localVideo = document.getElementById("localVideo");
const remoteVideo = document.getElementById("remoteVideo");
const startBtn = document.getElementById("startBtn");
const callBtn = document.getElementById("callBtn");
const answerBtn = document.getElementById("answerBtn");
const offerText = document.getElementById("offer");
const answerText = document.getElementById("answer");

startBtn.onclick = async () => {
    localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    localVideo.srcObject = localStream;
};

callBtn.onclick = async () => {
    peerConnection = new RTCPeerConnection(servers);
    localStream.getTracks().forEach(track => peerConnection.addTrack(track, localStream));

    peerConnection.onicecandidate = e => {
        if (e.candidate) return;
        offerText.value = JSON.stringify(peerConnection.localDescription);
    };

    peerConnection.ontrack = e => {
        remoteVideo.srcObject = e.streams[0];
    };

    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);
};

answerBtn.onclick = async () => {
    peerConnection = new RTCPeerConnection(servers);
    localStream.getTracks().forEach(track => peerConnection.addTrack(track, localStream));

    peerConnection.onicecandidate = e => {
        if (e.candidate) return;
        answerText.value = JSON.stringify(peerConnection.localDescription);
    };

    peerConnection.ontrack = e => {
        remoteVideo.srcObject = e.streams[0];
    };

    const offer = JSON.parse(offerText.value);
    await peerConnection.setRemoteDescription(offer);

    const answer = await peerConnection.createAnswer();
    await peerConnection.setLocalDescription(answer);
};

async function setAnswer() {
    const answer = JSON.parse(answerText.value);
    await peerConnection.setRemoteDescription(answer);
}

answerText.addEventListener("input", () => {
    if (peerConnection && answerText.value.trim() !== "") {
        setAnswer();
    }
});
