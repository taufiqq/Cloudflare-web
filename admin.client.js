// File: admin.client.js (VERSI PERBAIKAN FINAL)

document.addEventListener('DOMContentLoaded', () => {
    const tableBody = document.querySelector('#tokens-table tbody');
    const addForm = document.getElementById('add-token-form');
    const loadingIndicator = document.getElementById('loading-indicator');

    // --- PERBAIKAN UTAMA DI SINI ---
    const apiEndpoint = '/api/admin/token'; // URL yang benar, tanpa 's'

    // Fungsi untuk menampilkan indikator loading
    const showLoading = (isLoading) => {
        loadingIndicator.style.display = isLoading ? 'block' : 'none';
    };

    // Fungsi untuk membuat tombol aksi
    const createButton = (text, className, onClick) => {
        const button = document.createElement('button');
        button.textContent = text;
        button.className = `btn ${className}`;
        button.addEventListener('click', onClick);
        return button;
    };

    // Fungsi untuk merender baris tabel
    const renderTableRow = (tokenData) => {
        const row = document.createElement('tr');
        row.dataset.key = tokenData.key;

        row.innerHTML = `
            <td>${tokenData.value.id}</td>
            <td><input type="text" class="user-input" value="${tokenData.value.user}"></td>
            <td><input type="text" class="pass-input" value="${tokenData.value.pass}"></td>
            <td class="word-break">${tokenData.key}</td>
        `;

        const actionsCell = document.createElement('td');
        actionsCell.className = 'actions-cell';
        
        const saveBtn = createButton('Simpan', 'btn-save', async (e) => {
            const button = e.target;
            button.disabled = true;
            button.textContent = 'Menyimpan...';
            const user = row.querySelector('.user-input').value;
            const pass = row.querySelector('.pass-input').value;
            const result = await apiRequest('update', { token_key: tokenData.key, id: tokenData.value.id, user, pass });
            button.disabled = false;
            button.textContent = 'Simpan';
            if(result) alert('Data berhasil disimpan.');
        });
        
        const genBtn = createButton('Generate Baru', 'btn-generate', async (e) => {
            if (!confirm('Yakin ingin generate token baru? Token lama akan hangus.')) return;
            e.target.disabled = true;
            await apiRequest('generate_new', { token_key: tokenData.key });
            fetchTokens();
        });

        const copyBtn = createButton('Copy URL', 'btn-copy', () => {
            const urlToCopy = `${window.location.origin}/${tokenData.key}`;
            navigator.clipboard.writeText(urlToCopy).then(() => alert('URL disalin!'));
        });

        const delBtn = createButton('Hapus', 'btn-delete', async (e) => {
            if (!confirm('Yakin ingin menghapus token ini?')) return;
            e.target.disabled = true;
            await apiRequest('delete', { token_key: tokenData.key });
            fetchTokens();
        });

        actionsCell.append(saveBtn, genBtn, copyBtn, delBtn);
        row.appendChild(actionsCell);

        return row;
    };

    // Fungsi utama untuk mengambil data dari API
    const fetchTokens = async () => {
        showLoading(true);
        tableBody.innerHTML = '';
        try {
            const response = await fetch(apiEndpoint, { // Menggunakan variabel endpoint yang sudah benar
                credentials: 'same-origin'
            });

            if (!response.ok) {
                 if(response.status === 401 || response.status === 403) {
                    document.body.innerHTML = `<h1>Akses Ditolak</h1><p>Autentikasi gagal saat mengambil data token. Silakan refresh halaman dan login kembali.</p>`;
                }
                throw new Error(`Gagal mengambil data dari server. Status: ${response.status} ${response.statusText}`);
            }
            const tokens = await response.json();
            tokens.forEach(token => {
                tableBody.appendChild(renderTableRow(token));
            });
        } catch (error) {
            console.error('Error fetching tokens:', error);
            tableBody.innerHTML = `<tr><td colspan="5" style="color: red; text-align: center;"><b>Error:</b> ${error.message}</td></tr>`;
        } finally {
            showLoading(false);
        }
    };

    // Fungsi umum untuk mengirim request POST ke API
    const apiRequest = async (action, data) => {
        try {
            const response = await fetch(apiEndpoint, { // Menggunakan variabel endpoint yang sudah benar
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action, ...data }),
                credentials: 'same-origin'
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || 'Terjadi kesalahan pada server');
            }
            return await response.json();
        } catch (error) {
            console.error(`API request failed for action ${action}:`, error);
            alert(`Error: ${error.message}`);
            return null;
        }
    };
    
    // Handler untuk form tambah token
    addForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const button = e.target.querySelector('button');
        button.disabled = true;
        button.textContent = 'Menambahkan...';
        
        const user = document.getElementById('add-user').value;
        const pass = document.getElementById('add-pass').value;
        
        await apiRequest('add', { user, pass });
        
        addForm.reset();
        button.disabled = false;
        button.textContent = 'Tambah Token';
        fetchTokens();
    });

    // Muat data saat halaman pertama kali dibuka
    fetchTokens();
});