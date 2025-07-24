// --- BAGIAN BARU: SETUP STATE & DISPLAY ---

// 1. Objek untuk menyimpan semua nilai kontrol game.
const controlState = {
    steering: 0, // Nilai setir: -15 (kiri) hingga 15 (kanan)
    gas: 0,      // Nilai gas: 0 (lepas) hingga 30 (penuh)
    brake: 0,    // Nilai rem: 0 (lepas) atau 1 (ditekan)
    gasActive: false,
};

// 2. Ambil elemen display untuk menampilkan data.
const debugDisplay = document.getElementById('debug-display');


// --- BAGIAN LAMA (DENGAN MODIFIKASI) ---

const activeControls = new Map();
const initialPositions = new Map();

document.querySelectorAll('.movable-control').forEach(movable => {
    initialPositions.set(movable, {
        top: movable.style.top,
        left: movable.style.left,
        transform: movable.style.transform
    });
});

function moveElement(element, zone, axis, clientX, clientY) {
    const rect = zone.getBoundingClientRect();
    const targetX = clientX - rect.left;
    const targetY = clientY - rect.top;

    if (axis === 'x') { // Kontrol Setir
        const halfWidth = element.offsetWidth / 2;
        let newLeft = Math.max(halfWidth, Math.min(targetX, zone.clientWidth - halfWidth));
        element.style.left = `${newLeft}px`;

        // --- MODIFIKASI: Hitung nilai setir ---
        const travelRange = zone.clientWidth - element.offsetWidth;
        const currentPosition = newLeft - halfWidth;
        const normalizedValue = currentPosition / travelRange; // Hasilnya 0 sampai 1
        // Ubah dari rentang [0, 1] menjadi [-15, 15]
        controlState.steering = (normalizedValue * 30) - 15;

    } else if (axis === 'y') { // Kontrol Gas
        const halfHeight = element.offsetHeight / 2;
        let newTop = Math.max(halfHeight, Math.min(targetY, zone.clientHeight - halfHeight));
        element.style.top = `${newTop}px`;
        
        // --- MODIFIKASI: Hitung nilai gas ---
        const travelRange = zone.clientHeight - element.offsetHeight;
        const currentPosition = newTop - halfHeight;
        const normalizedValue = currentPosition / travelRange; // Hasilnya 0 (atas) sampai 1 (bawah)
        // Kita balik nilainya (karena 0 di atas = gas penuh) dan kalikan 30
        controlState.gas = (1 - normalizedValue) * 30;
    }
}

function onTouchStart(event) {
    event.preventDefault();
    const zone = event.currentTarget;
    const movable = zone.querySelector('.movable-control');
    if (!movable) return;
    const axis = zone.dataset.axis;

    for (const touch of event.changedTouches) {
        activeControls.set(touch.identifier, { movable, zone, axis });
        movable.classList.add('is-active');
        moveElement(movable, zone, axis, touch.clientX, touch.clientY);
    }
    
}

function onTouchMove(event) {
    for (const touch of event.changedTouches) {
        if (activeControls.has(touch.identifier)) {
            const { movable, zone, axis } = activeControls.get(touch.identifier);
            moveElement(movable, zone, axis, touch.clientX, touch.clientY);
        }
    }
}

function onTouchEnd(event) {
    for (const touch of event.changedTouches) {
        if (activeControls.has(touch.identifier)) {
            const { movable, zone } = activeControls.get(touch.identifier);
            movable.classList.remove('is-active');
            
            // Kembalikan posisi visual
            const initial = initialPositions.get(movable);
            movable.style.left = initial.left;
            movable.style.top = initial.top;
            
            // --- MODIFIKASI: Reset nilai state ke 0 ---
            if (zone.dataset.axis === 'x') {
                controlState.steering = 0;
            } else if (zone.dataset.axis === 'y') {
                controlState.gas = 0;
            }
            
            activeControls.delete(touch.identifier);
        }
    }
}

document.querySelectorAll('.control-zone').forEach(zone => {
    zone.addEventListener('touchstart', onTouchStart, { passive: false });
});

document.addEventListener('touchmove', onTouchMove, { passive: false });
document.addEventListener('touchend', onTouchEnd, { passive: false });
document.addEventListener('touchcancel', onTouchEnd, { passive: false });

// LOGIKA UNTUK TOMBOL REM (TOMBOL STATIS)
const brakeButton = document.getElementById('brake-pedal');

brakeButton.addEventListener('touchstart', (e) => {
    e.preventDefault();
    brakeButton.classList.add('is-active');
    // --- MODIFIKASI: Set nilai rem saat ditekan ---
    controlState.brake = 1;
});

const gasButton = document.getElementById('mulai-gas');

gasButton.addEventListener('touchstart', (e) => {
    controlState.gasActive = true;
    
});

gasButton.addEventListener('touchend', (e) => {
    controlState.gasActive = false;
    
});

brakeButton.addEventListener('touchend', (e) => {
    e.preventDefault();
    brakeButton.classList.remove('is-active');
    // --- MODIFIKASI: Reset nilai rem saat dilepas ---
    controlState.brake = 0;
});


// --- BAGIAN BARU: GAME LOOP & DISPLAY UPDATE ---

// 3. Fungsi untuk memperbarui tampilan data di layar.
// --- BAGIAN LAMA (TIDAK BERUBAH) ---
// ... (semua kode untuk onTouchStart, onTouchMove, onTouchEnd, dll. tetap sama) ...
// --- BAGIAN KONTROL UI (TIDAK BERUBAH) ---
// ... (semua kode dari const controlState sampai event listener 'touchend' untuk rem tetap sama persis) ...
// ... (Saya akan lewati bagian ini untuk mempersingkat)

// =================================================================
// === LOGIKA MQTT & KONTROL RODA (BAGIAN YANG DIREVISI) ==========
// =================================================================

// --- 1. SETUP MQTT (Tidak Berubah) ---
// =================================================================
// === LOGIKA MQTT & KONTROL RODA (BAGIAN YANG DIREVISI) ==========
// =================================================================

// --- 1. SETUP MQTT (DIMODIFIKASI UNTUK MENGAMBIL KREDENSIAL) ---

// Cek apakah kredensial telah disuntikkan oleh Cloudflare Function
if (!window.MQTT_CREDENTIALS || !window.MQTT_CREDENTIALS.user) {
    // Jika tidak ada, hentikan eksekusi dan tampilkan error di konsol dan layar.
    // Ini mencegah error jika halaman dibuka secara lokal tanpa server/token.
    document.body.innerHTML = '<h1 style="color:red; font-family: sans-serif; text-align:center; margin-top: 20vh;">Error: Halaman ini harus diakses melalui URL dengan token yang valid.</h1>';
    throw new Error("MQTT Credentials not injected. Cannot connect.");
}

const MQTT_SETTINGS = {
    host: 'ws://xf46ce9c.ala.asia-southeast1.emqxsl.com',
    port: 8084,
    clientId: `game_controller_${window.MQTT_CREDENTIALS.user}_${Math.random().toString(16).substr(2, 4)}`,
    // Gunakan user dan pass yang didapat dari KV melalui Function
    username: window.MQTT_CREDENTIALS.user,
    password: window.MQTT_CREDENTIALS.pass,
};

// Selebihnya dari file script.js Anda tetap sama...
console.log(`Menghubungkan ke broker MQTT: ${MQTT_SETTINGS.host}`);
const client = mqtt.connect(MQTT_SETTINGS.host, MQTT_SETTINGS);
client.on('connect', () => console.log('Berhasil terhubung ke broker MQTT!'));
client.on('error', (err) => {
    console.error('Koneksi MQTT Gagal:', err);
    client.end();
});

// --- 2. OBJEK PENYIMPAN DATA RODA (Tidak Berubah) ---
const wheelState = { kanan: 0, kiri: 0, belok:0};

// --- BARU: KONFIGURASI TINGKATAN (LEVELS) ---
// Pisahkan konfigurasi dari logika. Lebih mudah dibaca dan diubah.
// Diurutkan dari nilai terkecil ke terbesar.
const GAS_LEVELS = [
    { threshold: 1, value: 150 },
    { threshold: 11, value: 200 },
    { threshold: 26, value: 250 },
    // Anda bisa menambah level baru di sini dengan mudah
];

const STEERING_LEVELS = [
    // Belok Kiri (nilai negatif)
    { threshold: -13, value: -40 },
    { threshold: -5, value: -20 },
    // Belok Kanan (nilai positif)
    { threshold: 5, value: 20 },
    { threshold: 13, value: 40 },
];

// --- BARU: FUNGSI PINTAR UNTUK MAPPING NILAI ---
/**
 * Mengubah nilai input analog menjadi nilai level diskrit berdasarkan konfigurasi.
 * @param {number} inputValue - Nilai dari kontrol (misal: controlState.gas)
 * @param {Array} levelsConfig - Array konfigurasi (misal: GAS_LEVELS)
 * @returns {number} Nilai level yang sesuai (misal: 150, 200) atau 0 jika tidak ada yang cocok.
 */
function mapValueToLevel(inputValue, levelsConfig) {
    // Untuk nilai positif (Gas & Belok Kanan)
    if (inputValue > 0) {
        // Cari dari level terbesar ke terkecil
        for (let i = levelsConfig.length - 1; i >= 0; i--) {
            const level = levelsConfig[i];
            if (level.threshold > 0 && inputValue >= level.threshold) {
                return level.value;
            }
        }
    }
    // Untuk nilai negatif (Belok Kiri)
    else if (inputValue < 0) {
        // Cari dari level terkecil (paling negatif) ke terbesar
        for (let i = 0; i < levelsConfig.length; i++) {
            const level = levelsConfig[i];
            if (level.threshold < 0 && inputValue <= level.threshold) {
                return level.value;
            }
        }
    }
    return 0; // Default jika di "dead zone" atau nilai 0
}


// --- 3. FUNGSI UTAMA (DIPERBAIKI & DISEDERHANAKAN) ---
function processWheelCommands(belok, gas) {
    let targetRodaKiri = 0;
    let targetRodaKanan = 0;
    if (belok !== wheelState.belok) {
      let kirimGas = 90 + gas;
      publishMqtt('robot/belok', kirimGas.toString());
      wheelState.belok = gas;
    }
    // Switch case sekarang bersih dan logis
    switch (belok) {
        case 0: // Lurus
            targetRodaKiri = gas;
            targetRodaKanan = gas;
            break;
        case 20: // Belok Kanan Ringan
            targetRodaKiri = gas;
            targetRodaKanan = gas * 0.7;
            break;
        case 40: // Belok Kanan Tajam
            targetRodaKiri = gas;
            targetRodaKanan = gas * 0.4;
            break;
        case -20: // Belok Kiri Ringan
            targetRodaKiri = gas * 0.7;
            targetRodaKanan = gas;
            break;
        case -40: // Belok Kiri Tajam
            targetRodaKiri = gas * 0.4;
            targetRodaKanan = gas;
            break;
    }

    targetRodaKiri = Math.round(targetRodaKiri);
    targetRodaKanan = Math.round(targetRodaKanan);

    if (targetRodaKiri !== wheelState.kiri) {
        wheelState.kiri = targetRodaKiri;
        publishMqtt('robot/roda/kiri', wheelState.kiri.toString());
    }

    if (targetRodaKanan !== wheelState.kanan) {
        wheelState.kanan = targetRodaKanan;
        publishMqtt('robot/roda/kanan', wheelState.kanan.toString());
    }
    // DIPERBAIKI: Menghapus publish yang berlebihan di sini.
}

// Fungsi pembantu publish (Tidak berubah)
function publishMqtt(topic, message) {
    if (client.connected) {
        console.log(`MQTT PUB -> Topic: ${topic}, Pesan: ${message}`);
        client.publish(topic, message);
    } else {
        console.warn(`Gagal publish, klien MQTT tidak terhubung. Topic: ${topic}`);
    }
}

// --- 4. GAME LOOP (DIPERBAIKI & DISEDERHANAKAN) ---
function updateGameData() {
    // Bagian display debug tidak berubah
    const steeringValue = controlState.steering.toFixed(2);
    const gasValue = controlState.gas.toFixed(2);
    const brakeValue = controlState.brake;
    debugDisplay.textContent = `Setir: ${steeringValue}\nGas  : ${gasValue}\nRem  : ${brakeValue}`;

    // DIPERBAIKI: Logika yang jauh lebih bersih
    
    
    if (controlState.brake > 0) {
        // Jika mengerem, paksa berhenti.
        const gasCommand = -150;
        const steeringCommand = mapValueToLevel(controlState.steering, STEERING_LEVELS);
        processWheelCommands(steeringCommand, gasCommand);
        
    } else if(controlState.gasActive == true){
        // Jika tidak mengerem, hitung nilai gas dan setir dari levelnya.
        const gasCommand = mapValueToLevel(controlState.gas + 1, GAS_LEVELS);
        const steeringCommand = mapValueToLevel(controlState.steering, STEERING_LEVELS);
        processWheelCommands(steeringCommand, gasCommand);

    }
    
    
    requestAnimationFrame(updateGameData);
}

// --- Mulai game loop ---
updateGameData();