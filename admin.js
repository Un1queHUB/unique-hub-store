/**
 * UNIQUE HUB STORE - Dedicated Backoffice System Engine (admin.js)
 * Full Admin Suite: Overview, User Management, Order Logs, Stock, Store Settings & Payments
 */

let adminProducts = [];
let adminUsers = [];
let adminAllOrders = [];
let adminTopups = [];
let adminTopupFilter = 'all';
let adminPaymentSettings = {
    promptpayNumber: '0834929303',
    promptpayName: 'จิตติพัฒน์ ศิลาพจน์',
    slipokApiKey: '',
    slipokBranchId: ''
};
let adminStoreSettings = {
    announcement: 'ยินดีต้อนรับสู่ Unique HUB Store • ระบบบริการอัตโนมัติ 24 ชม. • เติมเงินผ่านพร้อมเพย์ สแกนเช็คสลิปออโต้ รับเครดิตทันที • ติดต่อ Discord: https://discord.gg/3BsH362aEJ',
    discordUrl: 'https://discord.gg/3BsH362aEJ'
};

// ================= CLOUD DATABASE SYNC SYSTEM ================= //
const DIRECT_UPSTASH_URL = 'https://upright-mite-232089.upstash.io';
const DIRECT_UPSTASH_TOKEN = 'gQAAAAAAA4qZAQIgcDEyMDA3ODI0NWEyYTg0MGIzOTdmZjJmY2ZmMjY1NjM5Mg';
const CLOUD_DB_API = '/api/db';

async function fetchCloudData(key) {
    // 1. Direct Upstash REST via query param ?_token (CORS friendly, works on file://, localhost, Vercel, Brave Shields)
    try {
        const url = `${DIRECT_UPSTASH_URL}/get/${encodeURIComponent(key)}?_token=${DIRECT_UPSTASH_TOKEN}&_t=${Date.now()}`;
        const res = await fetch(url, { method: 'GET', mode: 'cors', cache: 'no-store' });
        if (res.ok) {
            const json = await res.json();
            if (json && json.result !== undefined && json.result !== null) {
                try {
                    return JSON.parse(json.result);
                } catch(e) {
                    return json.result;
                }
            }
        }
    } catch (e) {
        console.warn('Direct Upstash GET failed, trying fallback:', e);
    }

    // 2. Fallback to /api/db proxy if running on Vercel
    if (window.location.protocol.startsWith('http')) {
        try {
            const res = await fetch(`${CLOUD_DB_API}?key=${encodeURIComponent(key)}&_t=${Date.now()}`, { cache: 'no-store' });
            if (res.ok) {
                const json = await res.json();
                if (json && json.success && json.data !== undefined && json.data !== null) return json.data;
            }
        } catch (e) {}
    }

    return null;
}

async function saveCloudData(key, data) {
    const stringData = typeof data === 'string' ? data : JSON.stringify(data);

    // 1. Direct Upstash REST via query param ?_token with text/plain (CORS safelisted)
    try {
        const url = `${DIRECT_UPSTASH_URL}/set/${encodeURIComponent(key)}?_token=${DIRECT_UPSTASH_TOKEN}`;
        const res = await fetch(url, {
            method: 'POST',
            mode: 'cors',
            headers: { 'Content-Type': 'text/plain' },
            body: stringData
        });
        if (res.ok) return true;
    } catch (e) {
        console.warn('Direct Upstash POST failed, trying fallback:', e);
    }

    // 2. Fallback to /api/db proxy
    if (window.location.protocol.startsWith('http')) {
        try {
            const res = await fetch(CLOUD_DB_API, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ key, data })
            });
            if (res.ok) return true;
        } catch (e) {}
    }

    return false;
}

const categoryLabels = {
    'scripts': 'Script Roblox',
    'accounts': 'ไอดีเกม',
    'items': 'ไอเทม & ของในเกม',
    'services': 'บริการอื่นๆ'
};

// ================= TOAST NOTIFICATIONS ================= //

function showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    let icon = '<i class="fa-solid fa-circle-info text-neon-cyan"></i>';
    if (type === 'success') icon = '<i class="fa-solid fa-circle-check text-green"></i>';
    if (type === 'error') icon = '<i class="fa-solid fa-circle-exclamation text-neon-pink"></i>';
    toast.innerHTML = `${icon} <span>${message}</span>`;
    container.appendChild(toast);
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(100%)';
        setTimeout(() => toast.remove(), 300);
    }, 3500);
}

function escapeHtml(str) {
    if (!str) return '';
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function copyToClipboard(text) {
    if (!text) return;
    navigator.clipboard.writeText(text).then(() => {
        showToast('คัดลอกข้อมูลเรียบร้อยแล้ว!', 'success');
    }).catch(() => {
        const ta = document.createElement('textarea');
        ta.value = text;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
        showToast('คัดลอกข้อมูลเรียบร้อยแล้ว!', 'success');
    });
}

// ================= AUTH GATE ================= //

function checkAdminAuth() {
    const isAuthed = sessionStorage.getItem('unique_admin_session') === 'true';
    if (isAuthed) {
        document.getElementById('adminGateScreen').classList.add('hide');
        document.getElementById('adminDashboardScreen').classList.remove('hide');
        document.getElementById('adminLogoutBtn').style.display = 'inline-flex';
        loadAdminData();
    } else {
        document.getElementById('adminGateScreen').classList.remove('hide');
        document.getElementById('adminDashboardScreen').classList.add('hide');
        document.getElementById('adminLogoutBtn').style.display = 'none';
    }
}

function verifyAdminLogin() {
    const input = document.getElementById('adminGatePassword');
    const val = (input.value || '').trim();
    const currentPass = localStorage.getItem('unique_admin_pass') || 'admin1234';

    if (val === currentPass) {
        sessionStorage.setItem('unique_admin_session', 'true');
        showToast('เข้าสู่ระบบแอดมิน Unique HUB สำเร็จ!', 'success');
        checkAdminAuth();
    } else {
        showToast('รหัสผ่านแอดมินไม่ถูกต้อง!', 'error');
    }
}

function adminLogout() {
    sessionStorage.removeItem('unique_admin_session');
    showToast('ออกจากระบบแอดมินเรียบร้อย', 'info');
    checkAdminAuth();
}

function changeAdminPass() {
    const oldP = (document.getElementById('adminOldPassInput').value || '').trim();
    const newP = (document.getElementById('adminNewPassInput').value || '').trim();
    const confP = (document.getElementById('adminConfirmPassInput').value || '').trim();
    const current = localStorage.getItem('unique_admin_pass') || 'admin1234';

    if (oldP !== current) {
        showToast('รหัสผ่านเดิมไม่ถูกต้อง!', 'error');
        return;
    }
    if (!newP || newP.length < 4) {
        showToast('รหัสผ่านใหม่ต้องมีความยาวอย่างน้อย 4 ตัวอักษร', 'error');
        return;
    }
    if (newP !== confP) {
        showToast('รหัสผ่านใหม่ทั้งสองช่องไม่ตรงกัน!', 'error');
        return;
    }

    localStorage.setItem('unique_admin_pass', newP);
    document.getElementById('adminOldPassInput').value = '';
    document.getElementById('adminNewPassInput').value = '';
    document.getElementById('adminConfirmPassInput').value = '';
    showToast('เปลี่ยนรหัสผ่านแอดมินใหม่เรียบร้อยแล้ว!', 'success');
}

// ================= DATA LOADING ================= //

async function loadAdminData(isManual = false) {
    // 1. Initial fast render from local cache
    try {
        const localProds = JSON.parse(localStorage.getItem('unique_products') || '[]');
        if (localProds.length > 0) adminProducts = localProds;
        const localUsers = JSON.parse(localStorage.getItem('unique_users') || '[]');
        if (localUsers.length > 0) adminUsers = localUsers;
        const localOrders = JSON.parse(localStorage.getItem('unique_all_orders') || '[]');
        if (localOrders.length > 0) adminAllOrders = localOrders;
        const localTopups = JSON.parse(localStorage.getItem('unique_topup_requests') || '[]');
        if (localTopups.length > 0) adminTopups = localTopups;

        const storedPay = localStorage.getItem('unique_payment_settings');
        if (storedPay) adminPaymentSettings = JSON.parse(storedPay);
        const storedStore = localStorage.getItem('unique_store_settings');
        if (storedStore) adminStoreSettings = { ...adminStoreSettings, ...JSON.parse(storedStore) };
    } catch (e) {}

    renderDashboardOverview();
    renderUsersTable();
    renderTopupsTable();
    renderOrdersTable();
    renderProductsTable();
    initStoreSettingsInputs();
    initPaymentInputs();
    updateExportJsonView();

    // 2. Fetch fresh real-time data from Cloud Database
    try {
        const cloudUsers = await fetchCloudData('unique_users');
        if (Array.isArray(cloudUsers)) {
            adminUsers = cloudUsers;
            localStorage.setItem('unique_users', JSON.stringify(adminUsers));
            renderUsersTable();
        }

        const cloudTopups = await fetchCloudData('unique_topup_requests');
        if (Array.isArray(cloudTopups)) {
            adminTopups = cloudTopups;
            localStorage.setItem('unique_topup_requests', JSON.stringify(adminTopups));
            renderTopupsTable();
        }

        const cloudProducts = await fetchCloudData('unique_products');
        if (Array.isArray(cloudProducts) && cloudProducts.length > 0) {
            adminProducts = cloudProducts;
            localStorage.setItem('unique_products', JSON.stringify(adminProducts));
            renderProductsTable();
        }

        const cloudOrders = await fetchCloudData('unique_all_orders');
        if (Array.isArray(cloudOrders)) {
            adminAllOrders = cloudOrders;
            localStorage.setItem('unique_all_orders', JSON.stringify(adminAllOrders));
            renderOrdersTable();
        }

        const cloudPay = await fetchCloudData('unique_payment_settings');
        if (cloudPay && cloudPay.promptpayNumber) {
            adminPaymentSettings = { ...adminPaymentSettings, ...cloudPay };
            localStorage.setItem('unique_payment_settings', JSON.stringify(adminPaymentSettings));
            initPaymentInputs();
        }

        const cloudStore = await fetchCloudData('unique_store_settings');
        if (cloudStore && cloudStore.announcement) {
            adminStoreSettings = { ...adminStoreSettings, ...cloudStore };
            localStorage.setItem('unique_store_settings', JSON.stringify(adminStoreSettings));
            initStoreSettingsInputs();
        }

        renderDashboardOverview();

        if (isManual) {
            showToast(`⚡ ซิงค์คลาวด์สำเร็จ! สมาชิก ${adminUsers.length} คน | คำขอเติมเงิน ${adminTopups.length} รายการ`, 'success');
        }
    } catch (err) {
        console.error('Cloud load error:', err);
        if (isManual) {
            showToast('เชื่อมต่อฐานข้อมูลคลาวด์ขัดข้อง', 'error');
        }
    }
}

// ================= TABS ================= //

function switchTab(tabId, btn) {
    document.querySelectorAll('.admin-tab-content').forEach(c => c.classList.add('hide'));
    document.querySelectorAll('.admin-tab-btn').forEach(b => b.classList.remove('active'));
    const target = document.getElementById(tabId);
    if (target) target.classList.remove('hide');
    if (btn) btn.classList.add('active');

    // Always fetch fresh data on tab switch
    loadAdminData();
}

async function forceSyncAdminUsers() {
    const btn = document.querySelector('button[onclick="forceSyncAdminUsers()"]');
    if (btn) btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> กำลังซิงค์...';
    await loadAdminData(true);
    if (btn) btn.innerHTML = '<i class="fa-solid fa-rotate"></i> รีเฟรชสด';
}

function closeAdminModal(id) {
    const modal = document.getElementById(id);
    if (modal) modal.classList.remove('active');
}

// ================= DASHBOARD OVERVIEW ================= //

function renderDashboardOverview() {
    // 1. Stats calculation
    const totalUsers = adminUsers.length;
    const totalBalance = adminUsers.reduce((sum, u) => sum + (parseFloat(u.balance) || 0), 0);
    
    let totalStockCount = 0;
    adminProducts.forEach(p => {
        if (p.stock && Array.isArray(p.stock)) totalStockCount += p.stock.length;
    });

    const totalOrders = adminAllOrders.length;
    const pendingTopupsCount = adminTopups.filter(t => t.status === 'pending').length;

    // 2. Set stats cards
    const uEl = document.getElementById('statTotalUsers');
    const bEl = document.getElementById('statTotalBalance');
    const sEl = document.getElementById('statTotalStock');
    const oEl = document.getElementById('statTotalOrders');
    const ptEl = document.getElementById('statPendingTopups');
    const badgeEl = document.getElementById('pendingTopupBadge');

    if (uEl) uEl.textContent = totalUsers.toLocaleString();
    if (bEl) bEl.textContent = `฿${totalBalance.toFixed(2)}`;
    if (sEl) sEl.textContent = `${totalStockCount.toLocaleString()} ชิ้น (${adminProducts.length} รายการ)`;
    if (oEl) oEl.textContent = `${totalOrders.toLocaleString()} รายการ`;
    if (ptEl) ptEl.textContent = `${pendingTopupsCount} รายการ`;

    if (badgeEl) {
        if (pendingTopupsCount > 0) {
            badgeEl.textContent = pendingTopupsCount;
            badgeEl.classList.remove('hide');
        } else {
            badgeEl.classList.add('hide');
        }
    }

    // 3. Render recent 5 orders
    const tbody = document.getElementById('overviewRecentOrdersTable');
    if (!tbody) return;
    tbody.innerHTML = '';

    const recent = adminAllOrders.slice(0, 5);
    if (recent.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--text-muted); padding: 20px;">ยังไม่มีคำสั่งซื้อในระบบ</td></tr>`;
        return;
    }

    recent.forEach(ord => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><strong style="color: var(--neon-cyan); font-family: var(--font-orbitron);">${ord.id || '-'}</strong></td>
            <td style="color: var(--text-muted); font-size: 0.8rem;">${ord.time || '-'}</td>
            <td><strong style="color: #fff;"><i class="fa-solid fa-user" style="font-size: 0.75rem; color: var(--neon-cyan);"></i> ${escapeHtml(ord.username || 'สมาชิก')}</strong></td>
            <td>${escapeHtml(ord.productName || '-')}</td>
            <td style="color: var(--neon-cyan); font-weight: bold;">฿${(ord.price || 0).toFixed(2)}</td>
            <td><code style="font-size: 0.75rem; color: #a5f3fc;">${escapeHtml(ord.account ? ord.account.substring(0, 30) : '')}...</code></td>
        `;
        tbody.appendChild(tr);
    });
}

// ================= USERS MANAGEMENT ================= //

function renderUsersTable(list = null) {
    const tbody = document.getElementById('adminUsersTable');
    if (!tbody) return;
    tbody.innerHTML = '';

    const usersToRender = list || adminUsers;
    const badge = document.getElementById('userCountBadge');
    if (badge) badge.textContent = `กำลังแสดง ${usersToRender.length} จาก ${adminUsers.length} คน`;

    if (usersToRender.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--text-muted); padding: 30px;">ไม่พบข้อมูลสมาชิกในระบบ</td></tr>`;
        return;
    }

    usersToRender.forEach((u) => {
        const originalIndex = adminUsers.findIndex(orig => orig.username === u.username);
        const historyCount = (u.history && Array.isArray(u.history)) ? u.history.length : 0;
        const isBanned = u.banned === true;
        const regDate = u.createdAt || '-';

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>
                <div style="display: flex; align-items: center; gap: 8px;">
                    <div style="width: 32px; height: 32px; border-radius: 50%; background: rgba(0, 240, 255, 0.15); display: flex; align-items: center; justify-content: center; color: var(--neon-cyan);">
                        <i class="fa-solid fa-user"></i>
                    </div>
                    <div>
                        <strong style="color: #fff; font-size: 0.95rem;">${escapeHtml(u.username)}</strong><br>
                        <small style="color: var(--text-muted); font-size: 0.75rem;">สิทธิ์: ${u.role || 'สมาชิก'}</small>
                    </div>
                </div>
            </td>
            <td style="color: var(--neon-cyan); font-weight: bold; font-family: var(--font-orbitron); font-size: 1.05rem;">
                ฿${(parseFloat(u.balance) || 0).toFixed(2)}
            </td>
            <td>
                <button class="btn btn-secondary btn-sm" onclick="openViewUserOrdersModal(${originalIndex})" title="ดูประวัติการซื้อ">
                    <i class="fa-solid fa-cart-shopping"></i> ${historyCount} ชิ้น
                </button>
            </td>
            <td style="color: var(--text-muted); font-size: 0.78rem;">${regDate}</td>
            <td>
                <span class="${isBanned ? 'badge-banned' : 'badge-active'}">
                    ${isBanned ? '<i class="fa-solid fa-ban"></i> ระงับใช้งาน' : '<i class="fa-solid fa-circle-check"></i> ปกติ'}
                </span>
            </td>
            <td>
                <div style="display: flex; gap: 6px; flex-wrap: wrap;">
                    <button class="btn btn-secondary btn-sm" style="color: var(--neon-green); border-color: rgba(16, 185, 129, 0.4);" onclick="openAdjustBalanceModal(${originalIndex})" title="ปรับยอดเงิน">
                        <i class="fa-solid fa-wallet"></i> ปรับเงิน
                    </button>
                    <button class="btn btn-secondary btn-sm" style="color: var(--neon-yellow); border-color: rgba(255, 209, 102, 0.4);" onclick="openResetUserPassModal(${originalIndex})" title="เปลี่ยนรหัสผ่าน">
                        <i class="fa-solid fa-key"></i> รหัสผ่าน
                    </button>
                    <button class="btn btn-secondary btn-sm" style="color: ${isBanned ? '#10b981' : '#ff4757'}; border-color: rgba(255, 71, 87, 0.4);" onclick="toggleUserBan(${originalIndex})" title="${isBanned ? 'ปลดแบน' : 'แบนสมาชิก'}">
                        <i class="fa-solid ${isBanned ? 'fa-lock-open' : 'fa-ban'}"></i>
                    </button>
                    <button class="btn btn-secondary btn-sm" style="color: #ff4757;" onclick="deleteUser(${originalIndex})" title="ลบสมาชิกนี้">
                        <i class="fa-solid fa-trash"></i>
                    </button>
                </div>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function filterUsersTable() {
    const q = (document.getElementById('userSearchInput').value || '').trim().toLowerCase();
    if (!q) {
        renderUsersTable();
        return;
    }
    const filtered = adminUsers.filter(u => u.username && u.username.toLowerCase().includes(q));
    renderUsersTable(filtered);
}

// Adjust Balance
function openAdjustBalanceModal(idx) {
    const u = adminUsers[idx];
    if (!u) return;

    document.getElementById('adjustUserIndex').value = idx;
    document.getElementById('adjustUsernameText').textContent = u.username;
    document.getElementById('adjustCurrentBalanceText').textContent = `฿${(parseFloat(u.balance) || 0).toFixed(2)}`;
    document.getElementById('adjustAmountInput').value = '';

    const modal = document.getElementById('adjustBalanceModal');
    if (modal) modal.classList.add('active');
}

function confirmAdjustUserBalance() {
    const idx = parseInt(document.getElementById('adjustUserIndex').value);
    const u = adminUsers[idx];
    if (!u) return;

    const action = document.getElementById('adjustActionType').value;
    const amount = parseFloat(document.getElementById('adjustAmountInput').value);

    if (isNaN(amount) || amount < 0) {
        showToast('กรุณากรอกจำนวนเงินให้ถูกต้อง', 'error');
        return;
    }

    let oldBal = parseFloat(u.balance) || 0;
    let newBal = oldBal;

    if (action === 'add') {
        newBal = oldBal + amount;
    } else if (action === 'subtract') {
        newBal = Math.max(0, oldBal - amount);
    } else if (action === 'set') {
        newBal = amount;
    }

    u.balance = newBal;
    saveUsers();
    renderUsersTable();
    renderDashboardOverview();
    closeAdminModal('adjustBalanceModal');
    showToast(`ปรับยอดเงินของ ${u.username} เป็น ฿${newBal.toFixed(2)} สำเร็จ!`, 'success');
}

// Reset Password
function openResetUserPassModal(idx) {
    const u = adminUsers[idx];
    if (!u) return;

    document.getElementById('resetPassUserIndex').value = idx;
    document.getElementById('resetPassUsernameText').textContent = u.username;
    document.getElementById('resetNewPassInput').value = '';

    const modal = document.getElementById('resetUserPassModal');
    if (modal) modal.classList.add('active');
}

function confirmResetUserPassword() {
    const idx = parseInt(document.getElementById('resetPassUserIndex').value);
    const u = adminUsers[idx];
    if (!u) return;

    const newPass = (document.getElementById('resetNewPassInput').value || '').trim();
    if (!newPass || newPass.length < 4) {
        showToast('รหัสผ่านต้องมีความยาวอย่างน้อย 4 ตัวอักษร', 'error');
        return;
    }

    u.password = newPass;
    saveUsers();
    closeAdminModal('resetUserPassModal');
    showToast(`เปลี่ยนรหัสผ่านของ ${u.username} เป็น "${newPass}" สำเร็จ!`, 'success');
}

// View User Orders
function openViewUserOrdersModal(idx) {
    const u = adminUsers[idx];
    if (!u) return;

    document.getElementById('viewUserOrdersName').textContent = u.username;
    const tbody = document.getElementById('viewUserOrdersTableBody');
    tbody.innerHTML = '';

    const history = (u.history && Array.isArray(u.history)) ? u.history : [];

    if (history.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--text-muted); padding: 30px;">สมาชิกคนนี้ยังไม่มีประวัติการซื้อ</td></tr>`;
    } else {
        history.forEach(item => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><strong style="color: var(--neon-cyan); font-family: var(--font-orbitron);">${item.id}</strong></td>
                <td style="color: var(--text-muted); font-size: 0.8rem;">${item.time}</td>
                <td><strong style="color: #fff;">${escapeHtml(item.productName)}</strong></td>
                <td style="color: var(--neon-cyan); font-weight: bold;">฿${item.price}</td>
                <td><code style="font-size: 0.75rem; color: #a5f3fc; word-break: break-all;">${escapeHtml(item.account || '-')}</code></td>
                <td>
                    <button class="btn-copy" onclick="copyToClipboard('${escapeHtml(item.account || '')}')">
                        <i class="fa-solid fa-copy"></i>
                    </button>
                </td>
            `;
            tbody.appendChild(tr);
        });
    }

    const modal = document.getElementById('viewUserOrdersModal');
    if (modal) modal.classList.add('active');
}

// Toggle Ban
function toggleUserBan(idx) {
    const u = adminUsers[idx];
    if (!u) return;

    u.banned = !u.banned;
    saveUsers();
    renderUsersTable();
    showToast(u.banned ? `ระงับการใช้งาน ${u.username} เรียบร้อยแล้ว` : `ปลดแบน ${u.username} เรียบร้อยแล้ว`, 'info');
}

// Delete User
function deleteUser(idx) {
    const u = adminUsers[idx];
    if (!u) return;

    if (confirm(`คุณต้องการลบสมาชิก "${u.username}" ออกจากระบบถาวรใช่หรือไม่?`)) {
        adminUsers.splice(idx, 1);
        saveUsers();
        renderUsersTable();
        renderDashboardOverview();
        showToast('ลบสมาชิกเรียบร้อยแล้ว', 'info');
    }
}

// Add User Directly
function openAddUserModal() {
    document.getElementById('addAdminUsername').value = '';
    document.getElementById('addAdminPassword').value = '';
    document.getElementById('addAdminBalance').value = '0';
    const modal = document.getElementById('addUserModal');
    if (modal) modal.classList.add('active');
}

function confirmAddUserFromAdmin() {
    const username = (document.getElementById('addAdminUsername').value || '').trim();
    const password = (document.getElementById('addAdminPassword').value || '').trim();
    const balance = parseFloat(document.getElementById('addAdminBalance').value) || 0;

    if (!username || username.length < 3) {
        showToast('ชื่อผู้ใช้ต้องมีอย่างน้อย 3 ตัวอักษร', 'error');
        return;
    }
    if (!password || password.length < 4) {
        showToast('รหัสผ่านต้องมีอย่างน้อย 4 ตัวอักษร', 'error');
        return;
    }

    const exists = adminUsers.find(u => u.username.toLowerCase() === username.toLowerCase());
    if (exists) {
        showToast('มีชื่อผู้ใช้นี้ในระบบแล้ว!', 'error');
        return;
    }

    const newUser = {
        username: username,
        password: password,
        balance: balance,
        history: [],
        role: 'user',
        createdAt: new Date().toLocaleString('th-TH')
    };

    adminUsers.unshift(newUser);
    saveUsers();
    renderUsersTable();
    renderDashboardOverview();
    closeAdminModal('addUserModal');
    showToast(`สร้างบัญชีสมาชิก "${username}" สำเร็จ!`, 'success');
}

function saveUsers() {
    localStorage.setItem('unique_users', JSON.stringify(adminUsers));
    saveCloudData('unique_users', adminUsers);
}

// ================= ALL ORDERS LOG ================= //

function renderOrdersTable(list = null) {
    const tbody = document.getElementById('adminOrdersTable');
    if (!tbody) return;
    tbody.innerHTML = '';

    const ordersToRender = list || adminAllOrders;
    const badge = document.getElementById('orderCountBadge');
    if (badge) badge.textContent = `รวม ${ordersToRender.length} รายการ`;

    if (ordersToRender.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: var(--text-muted); padding: 30px;">ยังไม่มีคำสั่งซื้อในระบบ</td></tr>`;
        return;
    }

    ordersToRender.forEach((ord) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><strong style="color: var(--neon-cyan); font-family: var(--font-orbitron);">${ord.id || '-'}</strong></td>
            <td style="color: var(--text-muted); font-size: 0.8rem;">${ord.time || '-'}</td>
            <td><strong style="color: #fff;"><i class="fa-solid fa-user text-neon-cyan"></i> ${escapeHtml(ord.username || 'สมาชิก')}</strong></td>
            <td><strong style="color: #fff;">${escapeHtml(ord.productName || '-')}</strong></td>
            <td style="color: var(--neon-cyan); font-weight: bold; font-family: var(--font-orbitron);">฿${(ord.price || 0).toFixed(2)}</td>
            <td>
                <div style="max-width: 260px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                    <code style="font-size: 0.75rem; color: #a5f3fc;">${escapeHtml(ord.account || '-')}</code>
                </div>
            </td>
            <td>
                <button class="btn-copy" onclick="copyToClipboard('${escapeHtml(ord.account || '')}')" title="คัดลอกข้อมูลสินค้า">
                    <i class="fa-solid fa-copy"></i> คัดลอก
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function filterOrdersTable() {
    const q = (document.getElementById('orderSearchInput').value || '').trim().toLowerCase();
    if (!q) {
        renderOrdersTable();
        return;
    }
    const filtered = adminAllOrders.filter(o => 
        (o.id && o.id.toLowerCase().includes(q)) ||
        (o.username && o.username.toLowerCase().includes(q)) ||
        (o.productName && o.productName.toLowerCase().includes(q))
    );
    renderOrdersTable(filtered);
}

function exportOrdersJson() {
    downloadJsonFile('orders.json', adminAllOrders);
    showToast('ดาวน์โหลด orders.json สำเร็จ!', 'success');
}

// ================= PRODUCTS & STOCK MANAGEMENT ================= //

function renderProductsTable(list = null) {
    const tbody = document.getElementById('adminProductsTable');
    if (!tbody) return;
    tbody.innerHTML = '';

    const prodsToRender = list || adminProducts;

    if (prodsToRender.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--text-muted); padding: 30px;">ยังไม่มีสินค้าในระบบ</td></tr>`;
        return;
    }

    prodsToRender.forEach(prod => {
        const stockCount = (prod.stock && Array.isArray(prod.stock)) ? prod.stock.length : 0;
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><img src="${prod.image || 'assets/images/banner.jpg'}" class="admin-thumb" onerror="this.src='assets/images/banner.jpg'"></td>
            <td>
                <span class="badge" style="background: rgba(0, 240, 255, 0.15); color: var(--neon-cyan); border: 1px solid rgba(0, 240, 255, 0.3); font-size: 0.72rem; padding: 2px 6px; border-radius: 6px; margin-bottom: 4px; display: inline-block;">
                    ${categoryLabels[prod.category] || prod.category || 'ทั่วไป'}
                </span><br>
                <strong>${escapeHtml(prod.name)}</strong><br>
                <small style="color: var(--text-muted);">${escapeHtml(prod.desc || '')}</small>
            </td>
            <td style="color: var(--neon-cyan); font-weight: bold; font-family: var(--font-orbitron);">฿${prod.price}</td>
            <td><span class="badge" style="background: ${stockCount > 0 ? '#10b981' : '#ff007f'}; padding: 3px 8px; border-radius: 8px;">${stockCount} ชิ้น</span></td>
            <td>
                <button class="btn btn-secondary btn-sm" onclick="promptAddStock('${prod.id}')">
                    <i class="fa-solid fa-plus"></i> เติมสต็อก
                </button>
            </td>
            <td>
                <div style="display: flex; gap: 6px;">
                    <button class="btn btn-secondary btn-sm" style="color: var(--neon-cyan); border-color: rgba(0, 240, 255, 0.4);" onclick="openEditProductModal('${prod.id}')">
                        <i class="fa-solid fa-pen-to-square"></i> แก้ไข
                    </button>
                    <button class="btn btn-secondary btn-sm" style="color: #ff4757;" onclick="deleteProduct('${prod.id}')">
                        <i class="fa-solid fa-trash"></i>
                    </button>
                </div>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function filterProductsTable() {
    const q = (document.getElementById('stockSearchInput').value || '').trim().toLowerCase();
    if (!q) {
        renderProductsTable();
        return;
    }
    const filtered = adminProducts.filter(p => p.name && p.name.toLowerCase().includes(q));
    renderProductsTable(filtered);
}

function promptAddStock(productId) {
    const prod = adminProducts.find(p => p.id === productId);
    if (!prod) return;
    const input = prompt(`ใส่สต็อกสำหรับ "${prod.name}" (ขึ้นบรรทัดใหม่เพื่อใส่หลายชุด):`);
    if (input) {
        const lines = input.split('\n').map(s => s.trim()).filter(Boolean);
        if (lines.length > 0) {
            if (!prod.stock) prod.stock = [];
            prod.stock.push(...lines);
            saveProducts();
            renderProductsTable();
            renderDashboardOverview();
            showToast(`เพิ่มสต็อก ${lines.length} ชิ้นสำเร็จ!`, 'success');
        }
    }
}

function deleteProduct(productId) {
    if (confirm('คุณต้องการลบสินค้านี้ใช่หรือไม่?')) {
        adminProducts = adminProducts.filter(p => p.id !== productId);
        saveProducts();
        renderProductsTable();
        renderDashboardOverview();
        showToast('ลบสินค้าเรียบร้อย', 'info');
    }
}

function addNewProductFromAdmin() {
    const name = document.getElementById('newProdName').value.trim();
    const cat = document.getElementById('newProdCategory').value;
    const price = parseFloat(document.getElementById('newProdPrice').value);
    const origPrice = parseFloat(document.getElementById('newProdOriginalPrice').value) || (price + 30);
    const img = document.getElementById('newProdImage').value.trim() || 'assets/images/banner.jpg';
    const tag = document.getElementById('newProdTag').value.trim() || 'ส่งออโต้ 24 ชม.';
    const desc = document.getElementById('newProdDesc').value.trim() || 'จัดส่งข้อมูลอัตโนมัติ 24 ชม.';
    const rawStock = document.getElementById('newProdAccounts').value.trim();

    if (!name || isNaN(price)) {
        showToast('กรุณากรอกชื่อสินค้าและราคาให้ถูกต้อง', 'error');
        return;
    }

    const stockList = rawStock ? rawStock.split('\n').map(s => s.trim()).filter(Boolean) : [];

    const newProd = {
        id: "prod-" + Date.now(),
        name: name,
        category: cat,
        price: price,
        originalPrice: origPrice,
        image: img,
        tag: tag,
        desc: desc,
        stock: stockList
    };

    adminProducts.unshift(newProd);
    saveProducts();

    document.getElementById('newProdName').value = '';
    document.getElementById('newProdPrice').value = '';
    document.getElementById('newProdOriginalPrice').value = '';
    document.getElementById('newProdDesc').value = '';
    document.getElementById('newProdAccounts').value = '';

    renderProductsTable();
    renderDashboardOverview();
    showToast(`เพิ่มสินค้า "${name}" สำเร็จ!`, 'success');
    switchTab('stockTab', document.querySelectorAll('.admin-tab-btn')[3]);
}

function openEditProductModal(productId) {
    const prod = adminProducts.find(p => p.id === productId);
    if (!prod) return;

    document.getElementById('editProdId').value = prod.id;
    document.getElementById('editProdName').value = prod.name || '';
    document.getElementById('editProdCategory').value = prod.category || 'scripts';
    document.getElementById('editProdPrice').value = prod.price || 0;
    document.getElementById('editProdOriginalPrice').value = prod.originalPrice || '';
    document.getElementById('editProdImage').value = prod.image || 'assets/images/banner.jpg';
    document.getElementById('editProdTag').value = prod.tag || '';
    document.getElementById('editProdDesc').value = prod.desc || '';
    document.getElementById('editProdAccounts').value = (prod.stock && Array.isArray(prod.stock)) ? prod.stock.join('\n') : '';

    const modal = document.getElementById('editProductModal');
    if (modal) modal.classList.add('active');
}

function saveProductEditFromAdmin() {
    const id = document.getElementById('editProdId').value;
    const prod = adminProducts.find(p => p.id === id);
    if (!prod) return;

    const name = document.getElementById('editProdName').value.trim();
    const cat = document.getElementById('editProdCategory').value;
    const price = parseFloat(document.getElementById('editProdPrice').value);
    const origPrice = parseFloat(document.getElementById('editProdOriginalPrice').value) || (price + 30);
    const img = document.getElementById('editProdImage').value.trim() || 'assets/images/banner.jpg';
    const tag = document.getElementById('editProdTag').value.trim() || 'ส่งออโต้ 24 ชม.';
    const desc = document.getElementById('editProdDesc').value.trim() || '';
    const rawStock = document.getElementById('editProdAccounts').value.trim();

    if (!name || isNaN(price)) {
        showToast('กรุณากรอกชื่อและราคาให้ถูกต้อง', 'error');
        return;
    }

    prod.name = name;
    prod.category = cat;
    prod.price = price;
    prod.originalPrice = origPrice;
    prod.image = img;
    prod.tag = tag;
    prod.desc = desc;
    prod.stock = rawStock ? rawStock.split('\n').map(s => s.trim()).filter(Boolean) : [];

    saveProducts();
    renderProductsTable();
    renderDashboardOverview();
    closeAdminModal('editProductModal');
    showToast(`แก้ไขข้อมูล "${name}" สำเร็จ!`, 'success');
}

function saveProducts() {
    localStorage.setItem('unique_products', JSON.stringify(adminProducts));
    saveCloudData('unique_products', adminProducts);
    updateExportJsonView();
}

// ================= STORE SETTINGS (ANNOUNCEMENT & DISCORD) ================= //

function initStoreSettingsInputs() {
    const ann = document.getElementById('settingAnnouncementText');
    const disc = document.getElementById('settingDiscordUrl');
    const testBtn = document.getElementById('btnTestDiscord');

    if (ann) ann.value = adminStoreSettings.announcement || '';
    if (disc) disc.value = adminStoreSettings.discordUrl || 'https://discord.gg/3BsH362aEJ';
    if (testBtn) testBtn.href = adminStoreSettings.discordUrl || 'https://discord.gg/3BsH362aEJ';
}

function saveStoreAnnouncementSettings() {
    const ann = (document.getElementById('settingAnnouncementText').value || '').trim();
    const disc = (document.getElementById('settingDiscordUrl').value || '').trim();

    adminStoreSettings.announcement = ann || 'ยินดีต้อนรับสู่ Unique HUB Store';
    adminStoreSettings.discordUrl = disc || 'https://discord.gg/3BsH362aEJ';

    localStorage.setItem('unique_store_settings', JSON.stringify(adminStoreSettings));
    saveCloudData('unique_store_settings', adminStoreSettings);

    const testBtn = document.getElementById('btnTestDiscord');
    if (testBtn) testBtn.href = adminStoreSettings.discordUrl;

    showToast('บันทึกการตั้งค่าร้านค้า & Discord สำเร็จ!', 'success');
}

// ================= PAYMENT SETTINGS (PROMPTPAY & SLIPOK) ================= //

function initPaymentInputs() {
    const ppN = document.getElementById('settingPromptpayNumber');
    const ppNm = document.getElementById('settingPromptpayName');
    const slKey = document.getElementById('settingSlipokKey');
    const slBranch = document.getElementById('settingSlipokBranch');

    if (ppN) ppN.value = adminPaymentSettings.promptpayNumber || '';
    if (ppNm) ppNm.value = adminPaymentSettings.promptpayName || '';
    if (slKey) slKey.value = adminPaymentSettings.slipokApiKey || '';
    if (slBranch) slBranch.value = adminPaymentSettings.slipokBranchId || '';
}

function saveAdminPaymentSettings() {
    const ppN = (document.getElementById('settingPromptpayNumber').value || '').trim();
    const ppNm = (document.getElementById('settingPromptpayName').value || '').trim();
    const slKey = document.getElementById('settingSlipokKey') ? (document.getElementById('settingSlipokKey').value || '').trim() : '';
    const slBranch = document.getElementById('settingSlipokBranch') ? (document.getElementById('settingSlipokBranch').value || '').trim() : '';

    adminPaymentSettings.promptpayNumber = ppN || '0834929303';
    adminPaymentSettings.promptpayName = ppNm || 'จิตติพัฒน์ ศิลาพจน์';
    adminPaymentSettings.slipokApiKey = slKey;
    adminPaymentSettings.slipokBranchId = slBranch;

    localStorage.setItem('unique_payment_settings', JSON.stringify(adminPaymentSettings));
    saveCloudData('unique_payment_settings', adminPaymentSettings);
    showToast('บันทึกการตั้งค่ารับเงินพร้อมเพย์ & SlipOK สำเร็จ!', 'success');
}

// ================= BACKUP & RESTORE / EXPORT & IMPORT ================= //

function downloadJsonFile(filename, dataObj) {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(dataObj, null, 2));
    const dlAnchorElem = document.createElement('a');
    dlAnchorElem.setAttribute("href", dataStr);
    dlAnchorElem.setAttribute("download", filename);
    dlAnchorElem.click();
}

function updateExportJsonView() {
    const viewer = document.getElementById('exportJsonViewer');
    if (viewer) {
        viewer.value = JSON.stringify(adminProducts, null, 2);
    }
}

function downloadProductsJson() {
    downloadJsonFile('products.json', adminProducts);
    showToast('ดาวน์โหลด products.json เรียบร้อย! นำไปวางในโฟลเดอร์ทำเว็ปได้เลย', 'success');
}

function downloadPaymentJson() {
    downloadJsonFile('payment.json', adminPaymentSettings);
    showToast('ดาวน์โหลด payment.json เรียบร้อย! นำไปวางในโฟลเดอร์ทำเว็ปได้เลย', 'success');
}

function downloadUsersJson() {
    downloadJsonFile('users.json', adminUsers);
    showToast('ดาวน์โหลด users.json เรียบร้อย!', 'success');
}

function downloadAllOrdersJson() {
    downloadJsonFile('orders.json', adminAllOrders);
    showToast('ดาวน์โหลด orders.json เรียบร้อย!', 'success');
}

function importJsonData() {
    const fileInput = document.getElementById('importJsonFileInput');
    if (!fileInput || !fileInput.files || fileInput.files.length === 0) {
        showToast('กรุณาเลือกไฟล์ JSON ก่อนกดนำเข้า', 'error');
        return;
    }

    const file = fileInput.files[0];
    const reader = new FileReader();

    reader.onload = function(e) {
        try {
            const parsed = JSON.parse(e.target.result);

            if (file.name.includes('product') || (Array.isArray(parsed) && parsed.length > 0 && parsed[0].price !== undefined)) {
                adminProducts = parsed;
                saveProducts();
                renderProductsTable();
                renderDashboardOverview();
                showToast(`นำเข้าสินค้า ${adminProducts.length} รายการสำเร็จ!`, 'success');
            } else if (file.name.includes('user') || (Array.isArray(parsed) && parsed.length > 0 && parsed[0].username !== undefined)) {
                adminUsers = parsed;
                saveUsers();
                renderUsersTable();
                renderDashboardOverview();
                showToast(`นำเข้าสมาชิก ${adminUsers.length} คนสำเร็จ!`, 'success');
            } else if (file.name.includes('payment') || parsed.tmnPhone !== undefined) {
                adminPaymentSettings = parsed;
                localStorage.setItem('unique_payment_settings', JSON.stringify(adminPaymentSettings));
                initPaymentInputs();
                showToast('นำเข้าการตั้งค่ารับเงินสำเร็จ!', 'success');
            } else if (Array.isArray(parsed)) {
                adminAllOrders = parsed;
                localStorage.setItem('unique_all_orders', JSON.stringify(adminAllOrders));
                renderOrdersTable();
                renderDashboardOverview();
                showToast(`นำเข้าคำสั่งซื้อ ${adminAllOrders.length} รายการสำเร็จ!`, 'success');
            } else {
                showToast('ไม่สามารถระบุประเภทของไฟล์ JSON นี้ได้', 'error');
            }
        } catch (err) {
            showToast('รูปแบบไฟล์ JSON ไม่ถูกต้อง!', 'error');
        }
    };

    reader.readAsText(file);
}

// ================= TOP-UP REQUESTS MANAGEMENT ================= //

function filterTopupStatus(status) {
    adminTopupFilter = status;
    const btnAll = document.getElementById('btnFilterTopupAll');
    const btnPen = document.getElementById('btnFilterTopupPending');
    const btnApp = document.getElementById('btnFilterTopupApproved');

    if (btnAll) btnAll.className = (status === 'all') ? 'btn btn-primary btn-sm' : 'btn btn-secondary btn-sm';
    if (btnPen) btnPen.className = (status === 'pending') ? 'btn btn-primary btn-sm' : 'btn btn-secondary btn-sm';
    if (btnApp) btnApp.className = (status === 'approved') ? 'btn btn-primary btn-sm' : 'btn btn-secondary btn-sm';

    renderTopupsTable();
}

function filterTopupsTable() {
    const q = (document.getElementById('topupSearchInput').value || '').trim().toLowerCase();
    let filtered = adminTopups;

    if (adminTopupFilter !== 'all') {
        filtered = filtered.filter(t => t.status === adminTopupFilter);
    }

    if (q) {
        filtered = filtered.filter(t => 
            (t.id && t.id.toLowerCase().includes(q)) ||
            (t.username && t.username.toLowerCase().includes(q)) ||
            (t.amount && t.amount.toString().includes(q))
        );
    }

    renderTopupsTable(filtered);
}

function renderTopupsTable(list = null) {
    const tbody = document.getElementById('adminTopupsTable');
    if (!tbody) return;
    tbody.innerHTML = '';

    let items = list;
    if (!items) {
        if (adminTopupFilter === 'all') {
            items = adminTopups;
        } else {
            items = adminTopups.filter(t => t.status === adminTopupFilter);
        }
    }

    const badge = document.getElementById('topupCountBadge');
    if (badge) badge.textContent = `กำลังแสดง ${items.length} จาก ${adminTopups.length} รายการ`;

    if (items.length === 0) {
        tbody.innerHTML = `<tr><td colspan="8" style="text-align: center; color: var(--text-muted); padding: 30px;">ยังไม่มีรายการแจ้งโอนหรือคำขอเติมเงินในหมวดนี้</td></tr>`;
        return;
    }

    items.forEach((t) => {
        const isPending = t.status === 'pending';
        const isApproved = t.status === 'approved';
        const isRejected = t.status === 'rejected';

        let statusBadge = '<span class="badge-pending"><i class="fa-solid fa-clock"></i> รอตรวจสอบ</span>';
        if (isApproved) statusBadge = '<span class="badge-approved"><i class="fa-solid fa-check-circle"></i> อนุมัติแล้ว</span>';
        if (isRejected) statusBadge = '<span class="badge-rejected"><i class="fa-solid fa-circle-xmark"></i> ปฏิเสธ</span>';

        let methodBadge = '<span class="badge" style="background: rgba(0, 240, 255, 0.2); color: var(--neon-cyan); border: 1px solid rgba(0, 240, 255, 0.4); font-size: 0.75rem;"><i class="fa-solid fa-qrcode"></i> พร้อมเพย์ (สลิป)</span>';
        if (t.method === 'promptpay_auto') {
            methodBadge = '<span class="badge" style="background: rgba(16, 185, 129, 0.2); color: #10b981; border: 1px solid rgba(16, 185, 129, 0.4); font-size: 0.75rem;"><i class="fa-solid fa-bolt"></i> เช็คสลิปออโต้</span>';
        } else if (t.method === 'truemoney') {
            methodBadge = '<span class="badge" style="background: rgba(255, 71, 87, 0.2); color: #ff4757; border: 1px solid rgba(255, 71, 87, 0.4); font-size: 0.75rem;"><i class="fa-solid fa-gift"></i> TrueMoney (เก่า)</span>';
        }

        let slipHtml = '<span style="color: var(--text-muted); font-size: 0.75rem;">ไม่มีรูป</span>';
        if (t.slipImage) {
            slipHtml = `<img src="${t.slipImage}" class="slip-thumbnail" onclick="openSlipModal('${t.id}')" title="คลิกเพื่อดูรูปสลิปขนาดใหญ่">`;
        } else if (t.voucher) {
            slipHtml = `<span style="color: var(--neon-cyan); font-size: 0.75rem; word-break: break-all;">${escapeHtml(t.voucher.substring(0, 25))}...</span>`;
        }

        let actionsHtml = '';
        if (isPending) {
            actionsHtml = `
                <div style="display: flex; gap: 6px;">
                    <button class="btn btn-secondary btn-sm" style="color: #10b981; border-color: rgba(16, 185, 129, 0.4); padding: 5px 10px;" onclick="approveTopupRequest('${t.id}')" title="อนุมัติและเพิ่มเครดิต">
                        <i class="fa-solid fa-check"></i> อนุมัติ
                    </button>
                    <button class="btn btn-secondary btn-sm" style="color: #ff4757; border-color: rgba(255, 71, 87, 0.4); padding: 5px 10px;" onclick="rejectTopupRequest('${t.id}')" title="ปฏิเสธคำขอนี้">
                        <i class="fa-solid fa-xmark"></i> ปฏิเสธ
                    </button>
                </div>
            `;
        } else if (isApproved) {
            actionsHtml = `<span style="color: #10b981; font-size: 0.8rem; font-weight: 500;"><i class="fa-solid fa-circle-check"></i> เติมเรียบร้อย</span>`;
        } else {
            actionsHtml = `<span style="color: #ff4757; font-size: 0.8rem; font-weight: 500;"><i class="fa-solid fa-ban"></i> ปฏิเสธแล้ว</span>`;
        }

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><strong style="color: var(--neon-cyan); font-family: var(--font-orbitron); font-size: 0.85rem;">${t.id}</strong></td>
            <td style="color: var(--text-muted); font-size: 0.8rem;">${t.createdAt || t.time || '-'}</td>
            <td><strong style="color: #fff;"><i class="fa-solid fa-user" style="font-size: 0.75rem; color: var(--neon-cyan);"></i> ${escapeHtml(t.username)}</strong></td>
            <td>${methodBadge}</td>
            <td style="color: var(--neon-yellow); font-family: var(--font-orbitron); font-weight: 800; font-size: 1rem;">฿${(parseFloat(t.amount) || 0).toFixed(2)}</td>
            <td>${slipHtml}</td>
            <td>${statusBadge}</td>
            <td>${actionsHtml}</td>
        `;
        tbody.appendChild(tr);
    });
}

async function approveTopupRequest(reqId) {
    const req = adminTopups.find(t => t.id === reqId);
    if (!req) return;

    if (req.status === 'approved') {
        showToast('คำขอนี้ได้รับการอนุมัติไปแล้ว', 'info');
        return;
    }

    try {
        // 1. Fetch fresh users and topups from cloud to prevent race condition
        const freshUsers = await fetchCloudData('unique_users') || adminUsers;
        const freshTopups = await fetchCloudData('unique_topup_requests') || adminTopups;

        const targetUser = freshUsers.find(u => u.username.toLowerCase() === req.username.toLowerCase());
        if (!targetUser) {
            showToast(`ไม่พบบัญชีผู้ใช้ "${req.username}" ในระบบคลาวด์`, 'error');
            return;
        }

        const topupIdx = freshTopups.findIndex(t => t.id === reqId);
        if (topupIdx !== -1) {
            freshTopups[topupIdx].status = 'approved';
            freshTopups[topupIdx].approvedAt = new Date().toLocaleString('th-TH');
        }

        // Add exact amount to user balance
        const addedAmount = parseFloat(req.amount) || 0;
        targetUser.balance = (parseFloat(targetUser.balance) || 0) + addedAmount;

        // Save both back to cloud immediately
        await saveCloudData('unique_users', freshUsers);
        await saveCloudData('unique_topup_requests', freshTopups);

        localStorage.setItem('unique_users', JSON.stringify(freshUsers));
        localStorage.setItem('unique_topup_requests', JSON.stringify(freshTopups));

        adminUsers = freshUsers;
        adminTopups = freshTopups;

        renderTopupsTable();
        renderUsersTable();
        renderDashboardOverview();

        if (syncChannel) {
            syncChannel.postMessage({ action: 'TOPUP_APPROVED', payload: { username: req.username, amount: addedAmount } });
        }

        closeAdminModal('viewSlipModal');
        showToast(`🎉 อนุมัติยอดเงิน ฿${addedAmount.toFixed(2)} ให้คุณ ${req.username} สำเร็จ! เครดิตเข้ากระเป๋าลูกค้าทันที`, 'success');
    } catch(err) {
        console.error('Approve error:', err);
        showToast('เกิดข้อผิดพลาดในการอนุมัติยอดเงิน', 'error');
    }
}

async function rejectTopupRequest(reqId) {
    const req = adminTopups.find(t => t.id === reqId);
    if (!req) return;

    try {
        const freshTopups = await fetchCloudData('unique_topup_requests') || adminTopups;
        const topupIdx = freshTopups.findIndex(t => t.id === reqId);
        if (topupIdx !== -1) {
            freshTopups[topupIdx].status = 'rejected';
            freshTopups[topupIdx].rejectedAt = new Date().toLocaleString('th-TH');
        }

        await saveCloudData('unique_topup_requests', freshTopups);
        localStorage.setItem('unique_topup_requests', JSON.stringify(freshTopups));
        adminTopups = freshTopups;

        renderTopupsTable();
        renderDashboardOverview();

        closeAdminModal('viewSlipModal');
        showToast(`ปฏิเสธคำขอเติมเงิน ${reqId} เรียบร้อย`, 'info');
    } catch (err) {
        showToast('เกิดข้อผิดพลาดในการปฏิเสธคำขอ', 'error');
    }
}

function openSlipModal(reqId) {
    const req = adminTopups.find(t => t.id === reqId);
    if (!req) return;

    const detailsEl = document.getElementById('viewSlipDetails');
    const imgEl = document.getElementById('viewSlipImg');
    const actionsEl = document.getElementById('viewSlipActions');

    if (detailsEl) {
        detailsEl.innerHTML = `
            <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                <span>ลูกค้า: <strong>${escapeHtml(req.username)}</strong></span>
                <span>รหัส: <strong>${req.id}</strong></span>
            </div>
            <div style="display: flex; justify-content: space-between;">
                <span>ยอดเงิน: <strong style="color: var(--neon-yellow); font-size: 1.1rem;">฿${(parseFloat(req.amount) || 0).toFixed(2)} บาท</strong></span>
                <span>เวลาแจ้งโอน: <strong style="color: var(--neon-cyan);">${req.time || '-'}</strong></span>
            </div>
        `;
    }

    if (imgEl) {
        imgEl.src = req.slipImage || '';
    }

    if (actionsEl) {
        if (req.status === 'pending') {
            actionsEl.innerHTML = `
                <button class="btn btn-primary" onclick="approveTopupRequest('${req.id}')">
                    <i class="fa-solid fa-check"></i> อนุมัติและเติมเงินทันที
                </button>
                <button class="btn btn-secondary" style="color: #ff4757; border-color: rgba(255, 71, 87, 0.4);" onclick="rejectTopupRequest('${req.id}')">
                    <i class="fa-solid fa-xmark"></i> ปฏิเสธ
                </button>
            `;
        } else {
            actionsEl.innerHTML = `
                <span class="${req.status === 'approved' ? 'badge-approved' : 'badge-rejected'}">
                    ${req.status === 'approved' ? 'อนุมัติแล้ว' : 'ปฏิเสธแล้ว'}
                </span>
                <button class="btn btn-secondary btn-sm" onclick="closeAdminModal('viewSlipModal')">ปิด</button>
            `;
        }
    }

    const modal = document.getElementById('viewSlipModal');
    if (modal) modal.classList.add('active');
}

async function forceSyncAdminData() {
    await loadAdminData(true);
}

async function forceSyncAdminTopups() {
    await loadAdminData(true);
}

// ================= REAL-TIME CLOUD & LOCAL SYNC ENGINE ================= //

const syncChannel = (typeof BroadcastChannel !== 'undefined') ? new BroadcastChannel('unique_hub_realtime_sync') : null;

if (syncChannel) {
    syncChannel.onmessage = (event) => {
        loadAdminData();
    };
}

window.addEventListener('storage', (e) => {
    if (e.key === 'unique_users' || e.key === 'unique_all_orders' || e.key === 'unique_products' || e.key === 'unique_topup_requests' || e.key === 'unique_last_sync') {
        loadAdminData();
    }
});

// 2.5-second live background polling to auto-sync with online cloud database
let lastUsersJsonCache = '';
let lastTopupsJsonCache = '';
let lastOrdersJsonCache = '';
let prevPendingCount = 0;

setInterval(async () => {
    try {
        // 1. Live Sync Users
        const cloudUsers = await fetchCloudData('unique_users');
        if (Array.isArray(cloudUsers)) {
            const raw = JSON.stringify(cloudUsers);
            if (raw !== lastUsersJsonCache) {
                lastUsersJsonCache = raw;
                adminUsers = cloudUsers;
                localStorage.setItem('unique_users', raw);
                renderUsersTable();
                renderDashboardOverview();
            }
        }

        // 2. Live Sync Topup Requests
        const cloudTopups = await fetchCloudData('unique_topup_requests');
        if (Array.isArray(cloudTopups)) {
            const raw = JSON.stringify(cloudTopups);
            if (raw !== lastTopupsJsonCache) {
                lastTopupsJsonCache = raw;
                adminTopups = cloudTopups;
                localStorage.setItem('unique_topup_requests', raw);
                renderTopupsTable();
                renderDashboardOverview();

                const pendingCount = adminTopups.filter(t => t.status === 'pending').length;
                if (pendingCount > prevPendingCount) {
                    showToast(`🔔 มีคำขอเติมเงินใหม่รอตรวจสอบ! (${pendingCount} รายการ)`, 'info');
                }
                prevPendingCount = pendingCount;
            }
        }

        // 3. Live Sync Orders
        const cloudOrders = await fetchCloudData('unique_all_orders');
        if (Array.isArray(cloudOrders)) {
            const raw = JSON.stringify(cloudOrders);
            if (raw !== lastOrdersJsonCache) {
                lastOrdersJsonCache = raw;
                adminAllOrders = cloudOrders;
                localStorage.setItem('unique_all_orders', raw);
                renderOrdersTable();
                renderDashboardOverview();
            }
        }
    } catch(e) {}
}, 2500);

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    checkAdminAuth();
});
