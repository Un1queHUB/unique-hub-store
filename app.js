/**
 * UNIQUE HUB STORE - User & Storefront Engine (app.js)
 * Clean, safe, user-oriented with Member Registration & Login
 */

// ================= INITIAL DATA & PRODUCTS ================= //

const DEFAULT_PRODUCTS = [
  {
    "id": "prod-aimbot-1d",
    "name": "Aimbot 1day",
    "category": "scripts",
    "price": 29,
    "originalPrice": 59,
    "image": "assets/images/banner.jpg",
    "tag": "ส่งออโต้ 24 ชม.",
    "desc": "สคริปต์ Aimbot Roblox ใช้งานได้ 1 วัน ระบบล็อคหัวแม่นยำ ล็อคเป้าอัตโนมัติ ปลอดภัย 100%",
    "stock": [
      "loadstring(game:HttpGet('https://raw.githubusercontent.com/unique-hub/loader/main/script.lua'))() - UNIQUE-AIMBOT-1D-001",
      "loadstring(game:HttpGet('https://raw.githubusercontent.com/unique-hub/loader/main/script.lua'))() - UNIQUE-AIMBOT-1D-002",
      "loadstring(game:HttpGet('https://raw.githubusercontent.com/unique-hub/loader/main/script.lua'))() - UNIQUE-AIMBOT-1D-003"
    ]
  },
  {
    "id": "prod-aimbot-7d",
    "name": "Aimbot 7day",
    "category": "scripts",
    "price": 79,
    "originalPrice": 129,
    "image": "assets/images/banner.jpg",
    "tag": "สุดคุ้ม",
    "desc": "สคริปต์ Aimbot Roblox ใช้งานได้ 7 วัน ปรับแต่งระยะ FOV และความไวในการล็อคได้ตามใจชอบ",
    "stock": [
      "loadstring(game:HttpGet('https://raw.githubusercontent.com/unique-hub/loader/main/script.lua'))() - UNIQUE-AIMBOT-7D-001",
      "loadstring(game:HttpGet('https://raw.githubusercontent.com/unique-hub/loader/main/script.lua'))() - UNIQUE-AIMBOT-7D-002"
    ]
  },
  {
    "id": "prod-aimbot-30d",
    "name": "Aimbot 30day",
    "category": "scripts",
    "price": 199,
    "originalPrice": 350,
    "image": "assets/images/banner.jpg",
    "tag": "ขายดี",
    "desc": "สคริปต์ Aimbot Roblox แพ็กเกจ 30 วัน อัปเดตฟรีตลอดอายุการใช้งาน ใช้งานลื่นไหลไม่มีกระตุก",
    "stock": [
      "loadstring(game:HttpGet('https://raw.githubusercontent.com/unique-hub/loader/main/script.lua'))() - UNIQUE-AIMBOT-30D-001",
      "loadstring(game:HttpGet('https://raw.githubusercontent.com/unique-hub/loader/main/script.lua'))() - UNIQUE-AIMBOT-30D-002"
    ]
  },
  {
    "id": "prod-aimbot-lifetime",
    "name": "Aimbot LifeTime",
    "category": "scripts",
    "price": 399,
    "originalPrice": 699,
    "image": "assets/images/banner.jpg",
    "tag": "ถาวร VIP",
    "desc": "สคริปต์ Aimbot Roblox ถาวรตลอดชีพ ล็อคหัวทุกเกม มีทีมงานซัพพอร์ตคอยดูแลและอัปเดตต่อเนื่อง",
    "stock": [
      "loadstring(game:HttpGet('https://raw.githubusercontent.com/unique-hub/loader/main/script.lua'))() - UNIQUE-AIMBOT-LT-001",
      "loadstring(game:HttpGet('https://raw.githubusercontent.com/unique-hub/loader/main/script.lua'))() - UNIQUE-AIMBOT-LT-002"
    ]
  },
  {
    "id": "prod-autofish-lifetime",
    "name": "Auto Fishing LifeTime",
    "category": "scripts",
    "price": 150,
    "originalPrice": 280,
    "image": "assets/images/banner.jpg",
    "tag": "ยอดฮิต",
    "desc": "สคริปต์ตกปลาออโต้ ออโต้ขายปลา ถาวรตลอดชีพ ฟาร์มเวลฟาร์มเหรียญไว ปล่อยบอทได้ 24 ชม.",
    "stock": [
      "loadstring(game:HttpGet('https://raw.githubusercontent.com/unique-hub/loader/main/script.lua'))() - UNIQUE-AUTOFISH-LT-001",
      "loadstring(game:HttpGet('https://raw.githubusercontent.com/unique-hub/loader/main/script.lua'))() - UNIQUE-AUTOFISH-LT-002"
    ]
  }
];

// App State
let products = [];
let currentFilter = 'all';

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

// Payment Settings (Owner's Official Accounts)
const DEFAULT_PAYMENT_SETTINGS = {
    promptpayNumber: '0834929303',
    promptpayName: 'จิตติพัฒน์ ศิลาพจน์',
    slipokApiKey: '',
    slipokBranchId: ''
};
let paymentSettings = DEFAULT_PAYMENT_SETTINGS;

async function loadPaymentSettings() {
    try {
        const cloudPay = await fetchCloudData('unique_payment_settings');
        if (cloudPay && cloudPay.promptpayNumber) {
            paymentSettings = { ...DEFAULT_PAYMENT_SETTINGS, ...cloudPay };
            localStorage.setItem('unique_payment_settings', JSON.stringify(paymentSettings));
            initPaymentUI();
            return;
        }
    } catch(e) {}

    try {
        const res = await fetch('payment.json');
        if (res.ok) {
            paymentSettings = await res.json();
            localStorage.setItem('unique_payment_settings', JSON.stringify(paymentSettings));
            initPaymentUI();
            return;
        }
    } catch (e) {}

    const stored = localStorage.getItem('unique_payment_settings');
    if (stored) {
        try { paymentSettings = JSON.parse(stored); } catch (e) { paymentSettings = DEFAULT_PAYMENT_SETTINGS; }
    } else {
        paymentSettings = DEFAULT_PAYMENT_SETTINGS;
    }
    initPaymentUI();
}

const categoryLabels = {
    'scripts': 'Script Roblox',
    'accounts': 'ไอดีเกม',
    'items': 'ไอเทม & ของในเกม',
    'services': 'บริการอื่นๆ'
};

// User Membership State
let users = JSON.parse(localStorage.getItem('unique_users') || '[]');
let currentUser = JSON.parse(localStorage.getItem('unique_session') || 'null');

// Real-time Sync Broadcaster
const syncChannel = (typeof BroadcastChannel !== 'undefined') ? new BroadcastChannel('unique_hub_realtime_sync') : null;

function notifyRealtimeSync(action, payload = {}) {
    localStorage.setItem('unique_last_sync', Date.now().toString());
    if (syncChannel) {
        try {
            syncChannel.postMessage({ action, payload, time: Date.now() });
        } catch(e) {}
    }
}

// Audio Synthesizer
const audioCtx = (window.AudioContext || window.webkitAudioContext) ? new (window.AudioContext || window.webkitAudioContext)() : null;

function playSound(type) {
    if (!audioCtx) return;
    try {
        if (audioCtx.state === 'suspended') audioCtx.resume();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(audioCtx.destination);

        const now = audioCtx.currentTime;
        if (type === 'buy') {
            osc.frequency.setValueAtTime(523.25, now);
            osc.frequency.setValueAtTime(659.25, now + 0.08);
            gain.gain.setValueAtTime(0.1, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
            osc.start(now);
            osc.stop(now + 0.25);
        } else if (type === 'win') {
            osc.frequency.setValueAtTime(440, now);
            osc.frequency.setValueAtTime(554.37, now + 0.1);
            osc.frequency.setValueAtTime(880, now + 0.2);
            gain.gain.setValueAtTime(0.12, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
            osc.start(now);
            osc.stop(now + 0.4);
        }
    } catch (e) {}
}

// Toast Notifications
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

// ================= USER MEMBERSHIP SYSTEM ================= //

function updateAuthUI() {
    const guestBox = document.getElementById('navGuestBox');
    const userBox = document.getElementById('navUserBox');
    const nameLabel = document.getElementById('userDisplayName');
    const balText = document.getElementById('userBalanceText');

    if (currentUser) {
        if (guestBox) guestBox.classList.add('hide');
        if (userBox) userBox.classList.remove('hide');
        if (nameLabel) nameLabel.textContent = currentUser.username;
        if (balText) balText.textContent = `฿${(currentUser.balance || 0).toFixed(2)}`;
    } else {
        if (guestBox) guestBox.classList.remove('hide');
        if (userBox) userBox.classList.add('hide');
    }

    const stockEl = document.getElementById('statStock');
    if (stockEl) stockEl.innerText = products.length.toString();
}

async function submitRegister() {
    const uInput = document.getElementById('regUsername');
    const pInput = document.getElementById('regPassword');
    const cInput = document.getElementById('regConfirmPassword');

    const username = (uInput.value || '').trim();
    const password = (pInput.value || '').trim();
    const confirmPass = (cInput.value || '').trim();

    if (!username || username.length < 3) {
        showToast('ชื่อผู้ใช้ต้องมีอย่างน้อย 3 ตัวอักษร', 'error');
        return;
    }
    if (!password || password.length < 4) {
        showToast('รหัสผ่านต้องมีอย่างน้อย 4 ตัวอักษร', 'error');
        return;
    }
    if (password !== confirmPass) {
        showToast('รหัสผ่านทั้งสองช่องไม่ตรงกัน!', 'error');
        return;
    }

    // Always fetch fresh users from cloud to prevent race-condition overwrite
    const freshUsers = await getFreshUsers();

    const exists = freshUsers.find(u => u.username.toLowerCase() === username.toLowerCase());
    if (exists) {
        showToast('ชื่อผู้ใช้นี้มีคนใช้แล้ว กรุณาใช้ชื่ออื่น', 'error');
        return;
    }

    const newUser = {
        username: username,
        password: password,
        balance: 0,
        history: [],
        role: 'user',
        banned: false,
        createdAt: new Date().toLocaleString('th-TH')
    };

    freshUsers.push(newUser);
    users = freshUsers;
    localStorage.setItem('unique_users', JSON.stringify(users));
    await saveCloudData('unique_users', users);

    currentUser = newUser;
    localStorage.setItem('unique_session', JSON.stringify(currentUser));

    notifyRealtimeSync('USER_REGISTERED', { username: newUser.username });

    uInput.value = '';
    pInput.value = '';
    cInput.value = '';

    closeModal('registerModal');
    updateAuthUI();
    playSound('win');
    showToast(`🎉 สมัครสมาชิกสำเร็จ! ยินดีต้อนรับคุณ ${username}`, 'success');
}

async function getFreshUsers() {
    try {
        const cloudUsers = await fetchCloudData('unique_users');
        if (Array.isArray(cloudUsers)) {
            users = cloudUsers;
            localStorage.setItem('unique_users', JSON.stringify(users));
            return users;
        }
    } catch(e) {}
    users = JSON.parse(localStorage.getItem('unique_users') || '[]');
    return users;
}

async function submitLogin() {
    const uInput = document.getElementById('loginUsername');
    const pInput = document.getElementById('loginPassword');

    const username = (uInput.value || '').trim();
    const password = (pInput.value || '').trim();

    if (!username || !password) {
        showToast('กรุณากรอกชื่อผู้ใช้และรหัสผ่าน', 'error');
        return;
    }

    // Always fetch fresh from cloud to make sure newly registered users can log in anywhere
    const freshUsers = await getFreshUsers();
    let found = freshUsers.find(u => u.username.toLowerCase() === username.toLowerCase() && u.password === password);

    if (!found) {
        showToast('ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง!', 'error');
        return;
    }

    if (found.banned) {
        showToast('❌ บัญชีนี้ถูกระงับการใช้งาน กรุณาติดต่อแอดมินทาง Discord', 'error');
        return;
    }

    currentUser = found;
    localStorage.setItem('unique_session', JSON.stringify(currentUser));
    notifyRealtimeSync('USER_LOGGED_IN', { username: found.username });

    uInput.value = '';
    pInput.value = '';

    closeModal('loginModal');
    updateAuthUI();
    playSound('buy');
    showToast(`เข้าสู่ระบบสำเร็จ! สวัสดีคุณ ${currentUser.username}`, 'success');
}

function userLogout() {
    currentUser = null;
    localStorage.removeItem('unique_session');
    updateAuthUI();
    notifyRealtimeSync('USER_LOGGED_OUT');
    showToast('ออกจากระบบเรียบร้อยแล้ว', 'info');
}

function requireAuth(targetModalId) {
    if (!currentUser) {
        showToast('กรุณาเข้าสู่ระบบก่อนทำรายการ', 'info');
        openModal('loginModal');
        return;
    }
    openModal(targetModalId);
}

async function saveUserSessionAndDb() {
    if (!currentUser) return;
    localStorage.setItem('unique_session', JSON.stringify(currentUser));

    const freshUsers = await getFreshUsers();
    const idx = freshUsers.findIndex(u => u.username.toLowerCase() === currentUser.username.toLowerCase());
    if (idx !== -1) {
        freshUsers[idx] = { ...freshUsers[idx], ...currentUser };
    } else {
        freshUsers.push(currentUser);
    }
    users = freshUsers;
    localStorage.setItem('unique_users', JSON.stringify(users));
    await saveCloudData('unique_users', users);
    notifyRealtimeSync('USER_UPDATED', { username: currentUser.username });
}

// ================= LOAD & RENDER PRODUCTS ================= //

async function loadProducts() {
    // 1. Initial fast render from localStorage
    const stored = localStorage.getItem('unique_products');
    if (stored) {
        try {
            const parsed = JSON.parse(stored);
            if (Array.isArray(parsed) && parsed.length > 0) {
                products = parsed;
                renderProducts();
                updateAuthUI();
            }
        } catch(e) {}
    }

    // 2. Fetch fresh products from Cloud Database
    try {
        const cloudProducts = await fetchCloudData('unique_products');
        if (Array.isArray(cloudProducts) && cloudProducts.length > 0) {
            products = cloudProducts;
            localStorage.setItem('unique_products', JSON.stringify(products));
            renderProducts();
            updateAuthUI();
            return;
        }
    } catch(e) {}

    // 3. Fallback to products.json
    try {
        const res = await fetch('products.json');
        if (res.ok) {
            const data = await res.json();
            if (Array.isArray(data) && data.length > 0) {
                products = data;
                localStorage.setItem('unique_products', JSON.stringify(products));
                renderProducts();
                updateAuthUI();
                return;
            }
        }
    } catch (e) {}

    if (products.length === 0) {
        products = DEFAULT_PRODUCTS;
        renderProducts();
        updateAuthUI();
    }
}

function filterCategory(cat, btn) {
    currentFilter = cat;
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    if (btn) btn.classList.add('active');
    renderProducts();
}

function renderProducts() {
    const grid = document.getElementById('productsGrid');
    if (!grid) return;
    grid.innerHTML = '';

    const filtered = products.filter(p => currentFilter === 'all' || p.category === currentFilter);

    if (filtered.length === 0) {
        const catName = categoryLabels[currentFilter] || '';
        grid.innerHTML = `
            <div class="empty-shop-box">
                <div class="empty-icon-wrap">
                    <i class="fa-solid fa-boxes-packing"></i>
                </div>
                <h3 class="empty-title">${currentFilter === 'all' ? 'กำลังเตรียมสินค้าใหม่' : `ยังไม่มีสินค้าในหมวดหมู่ ${catName}`}</h3>
                <p class="empty-desc">สินค้ากำลังจะพร้อมจำหน่ายเร็วๆ นี้ กรุณารอทีมงานอัปเดตสต็อกสินค้า</p>
            </div>
        `;
        return;
    }

    filtered.forEach(item => {
        const stockCount = (item.stock && Array.isArray(item.stock)) ? item.stock.length : 0;
        const isOutOfStock = stockCount === 0;

        const card = document.createElement('div');
        card.className = 'product-card';
        card.innerHTML = `
            <div class="prod-image-wrap">
                <img src="${item.image || 'assets/images/banner.jpg'}" alt="${item.name}" class="prod-image" onerror="this.src='assets/images/banner.jpg'">
                <span class="prod-tag">${item.tag || 'ส่งออโต้ 24 ชม.'}</span>
                <span class="prod-stock-badge ${isOutOfStock ? 'empty' : ''}">
                    <i class="fa-solid ${isOutOfStock ? 'fa-ban' : 'fa-check'}"></i> 
                    ${isOutOfStock ? 'สินค้าหมด' : `คงเหลือ ${stockCount} ชิ้น`}
                </span>
            </div>
            <div class="prod-content">
                <h3 class="prod-title">${item.name}</h3>
                <p class="prod-desc">${item.desc || ''}</p>
                <div class="prod-footer">
                    <div class="price-group">
                        ${item.originalPrice ? `<span class="original-price">฿${item.originalPrice}</span>` : ''}
                        <span class="current-price">฿${item.price}</span>
                    </div>
                    <button class="btn-buy" onclick="openPurchaseModal('${item.id}')" ${isOutOfStock ? 'disabled' : ''}>
                        <i class="fa-solid fa-cart-shopping"></i> ${isOutOfStock ? 'หมดแล้ว' : 'ซื้อทันที'}
                    </button>
                </div>
            </div>
        `;
        grid.appendChild(card);
    });
}

// ================= PURCHASE WORKFLOW ================= //

function openPurchaseModal(productId) {
    if (!currentUser) {
        showToast('กรุณาเข้าสู่ระบบก่อนทำการสั่งซื้อสินค้า', 'error');
        openModal('loginModal');
        return;
    }

    const prod = products.find(p => p.id === productId);
    if (!prod) return;

    const stockCount = (prod.stock && Array.isArray(prod.stock)) ? prod.stock.length : 0;
    const body = document.getElementById('purchaseModalBody');
    if (!body) return;

    const userBal = currentUser.balance || 0;
    const isBalanceEnough = userBal >= prod.price;

    body.innerHTML = `
        <div class="purchase-confirm-card">
            <div class="purchase-item-header">
                <img src="${prod.image || 'assets/images/banner.jpg'}" class="purchase-thumb" onerror="this.src='assets/images/banner.jpg'">
                <div class="purchase-item-info">
                    <h4>${prod.name}</h4>
                    <span class="badge" style="background: rgba(0, 240, 255, 0.15); color: var(--neon-cyan); border: 1px solid rgba(0, 240, 255, 0.3); font-size: 0.75rem; padding: 2px 8px; border-radius: 6px;">
                        ${categoryLabels[prod.category] || prod.category || 'สินค้า'}
                    </span>
                    <p style="font-size: 0.85rem; color: var(--text-muted); margin-top: 4px;">คงเหลือในสต็อก: <strong style="color: #fff;">${stockCount} ชิ้น</strong></p>
                </div>
            </div>

            <div class="purchase-summary-rows">
                <div class="summary-row">
                    <span>ราคาสินค้า:</span>
                    <strong style="color: var(--neon-cyan); font-size: 1.15rem;">฿${prod.price.toFixed(2)}</strong>
                </div>
                <div class="summary-row">
                    <span>ยอดเงินในกระเป๋าของคุณ:</span>
                    <strong style="color: ${isBalanceEnough ? '#10b981' : '#ff4757'};">฿${userBal.toFixed(2)}</strong>
                </div>
                <div class="summary-row summary-total">
                    <span>ยอดคงเหลือหลังการซื้อ:</span>
                    <strong style="color: ${isBalanceEnough ? '#fff' : '#ff4757'};">
                        ฿${(userBal - prod.price).toFixed(2)}
                    </strong>
                </div>
            </div>

            ${!isBalanceEnough ? `
                <div class="balance-warning-alert">
                    <i class="fa-solid fa-triangle-exclamation"></i>
                    <div>
                        <strong>ยอดเงินไม่เพียงพอ!</strong> ขาดอีก ฿${(prod.price - userBal).toFixed(2)} บาท กรุณาเติมเงินก่อนซื้อ
                    </div>
                </div>
            ` : ''}

            <div class="purchase-actions">
                ${isBalanceEnough ? `
                    <button class="btn btn-primary btn-block" onclick="executePurchase('${prod.id}')">
                        <i class="fa-solid fa-check-circle"></i> ยืนยันการสั่งซื้อ (฿${prod.price})
                    </button>
                ` : `
                    <button class="btn btn-primary btn-block" onclick="closeModal('purchaseModal'); openModal('topupModal');">
                        <i class="fa-solid fa-wallet"></i> ไปหน้าเติมเงินทันที
                    </button>
                `}
                <button class="btn btn-secondary btn-block" onclick="closeModal('purchaseModal')">
                    ยกเลิก
                </button>
            </div>
        </div>
    `;

    openModal('purchaseModal');
}

function executePurchase(productId) {
    if (!currentUser) {
        showToast('กรุณาเข้าสู่ระบบก่อน', 'error');
        openModal('loginModal');
        return;
    }

    const prod = products.find(p => p.id === productId);
    if (!prod) return;

    if ((currentUser.balance || 0) < prod.price) {
        playSound('buy');
        showToast(`ยอดเงินคงเหลือไม่พอ! กรุณาเติมเงินก่อนสั่งซื้อ`, 'error');
        closeModal('purchaseModal');
        openModal('topupModal');
        return;
    }

    if (!prod.stock || prod.stock.length === 0) {
        showToast('ขออภัย สินค้านี้หมดสต็อกชั่วคราว', 'error');
        return;
    }

    // Deduct stock and balance
    const itemAccount = prod.stock.shift();
    currentUser.balance -= prod.price;

    const orderRecord = {
        id: "ORD-" + Math.floor(100000 + Math.random() * 900000),
        productId: prod.id,
        productName: prod.name,
        price: prod.price,
        account: itemAccount,
        username: currentUser.username,
        time: new Date().toLocaleString('th-TH')
    };

    if (!currentUser.history) currentUser.history = [];
    currentUser.history.unshift(orderRecord);

    // Save
    localStorage.setItem('unique_products', JSON.stringify(products));
    saveCloudData('unique_products', products);
    saveUserSessionAndDb();

    // Log globally for backoffice
    try {
        let allOrders = JSON.parse(localStorage.getItem('unique_all_orders') || '[]');
        allOrders.unshift(orderRecord);
        localStorage.setItem('unique_all_orders', JSON.stringify(allOrders));
        saveCloudData('unique_all_orders', allOrders);
    } catch (e) {}

    closeModal('purchaseModal');
    updateAuthUI();
    renderProducts();
    playSound('win');
    showReceivedAccountModal(orderRecord);
}

// ================= PRODUCT DELIVERY SMART PARSER ================= //

function parseProductDelivery(orderRecord) {
    const raw = (orderRecord.account || '').trim();
    const prod = products.find(p => p.id === orderRecord.productId);
    const category = prod ? prod.category : 'scripts';

    if (category === 'scripts') {
        const delimiterMatch = raw.match(/^(loadstring\([^)]+\)\(\))\s*[-|]\s*(.+)$/i);
        if (delimiterMatch) {
            return {
                type: 'script',
                script: delimiterMatch[1].trim(),
                key: delimiterMatch[2].trim(),
                raw: raw
            };
        }

        const loadstringMatch = raw.match(/(loadstring\(.+?\)\(\))/i);
        if (loadstringMatch) {
            const scriptPart = loadstringMatch[1].trim();
            const remainder = raw.replace(scriptPart, '').replace(/^[-|\s]+/, '').trim();
            return {
                type: 'script',
                script: scriptPart,
                key: remainder || 'No Key Required',
                raw: raw
            };
        }

        if (raw.includes(' - ') || raw.includes(' | ')) {
            const parts = raw.split(/\s*[-|]\s*/);
            return {
                type: 'script',
                script: parts[0].trim(),
                key: parts.slice(1).join(' - ').trim(),
                raw: raw
            };
        }

        return {
            type: 'script',
            script: raw,
            key: 'No Key Required',
            raw: raw
        };
    }

    if (raw.includes(':')) {
        const idx = raw.indexOf(':');
        return {
            type: 'account',
            username: raw.substring(0, idx).trim(),
            password: raw.substring(idx + 1).trim(),
            raw: raw
        };
    }

    return {
        type: 'general',
        code: raw,
        raw: raw
    };
}

function showReceivedAccountModal(orderRecord) {
    const body = document.getElementById('itemReceivedBody');
    if (!body) return;

    const parsed = parseProductDelivery(orderRecord);
    let contentHtml = '';

    if (parsed.type === 'script') {
        contentHtml = `
            <div style="margin-bottom: 14px;">
                <label style="font-size: 0.8rem; color: var(--neon-cyan); font-weight: 600;"><i class="fa-solid fa-code"></i> สคริปต์ (Script Loader):</label>
                <div class="account-credential-row" style="flex-direction: column; align-items: stretch; gap: 8px;">
                    <div id="recScriptCode" style="font-family: monospace; font-size: 0.88rem; color: #a5f3fc; background: rgba(0,0,0,0.6); padding: 10px 12px; border-radius: 6px; word-break: break-all; max-height: 120px; overflow-y: auto;"></div>
                    <button class="btn btn-secondary btn-sm" onclick="copyElementText('recScriptCode')" style="align-self: flex-end; color: var(--neon-cyan); border-color: rgba(0, 240, 255, 0.4);">
                        <i class="fa-solid fa-copy"></i> คัดลอก Script
                    </button>
                </div>
            </div>

            <div style="margin-bottom: 14px;">
                <label style="font-size: 0.8rem; color: var(--neon-yellow); font-weight: 600;"><i class="fa-solid fa-key"></i> คีย์เข้าใช้งาน (Key):</label>
                <div class="account-credential-row">
                    <span id="recKeyText" class="credential-text" style="color: var(--neon-yellow); font-weight: 700; letter-spacing: 1px;"></span>
                    <button class="btn-copy" onclick="copyElementText('recKeyText')"><i class="fa-solid fa-copy"></i> คัดลอก Key</button>
                </div>
            </div>
        `;
    } else if (parsed.type === 'account') {
        contentHtml = `
            <div style="margin-bottom: 12px;">
                <label style="font-size: 0.8rem; color: var(--text-muted);">ชื่อผู้ใช้ (Username):</label>
                <div class="account-credential-row">
                    <span id="recUserText" class="credential-text"></span>
                    <button class="btn-copy" onclick="copyElementText('recUserText')"><i class="fa-solid fa-copy"></i> คัดลอก</button>
                </div>
            </div>
            <div style="margin-bottom: 12px;">
                <label style="font-size: 0.8rem; color: var(--text-muted);">รหัสผ่าน (Password):</label>
                <div class="account-credential-row">
                    <span id="recPassText" class="credential-text"></span>
                    <button class="btn-copy" onclick="copyElementText('recPassText')"><i class="fa-solid fa-copy"></i> คัดลอก</button>
                </div>
            </div>
        `;
    } else {
        contentHtml = `
            <div style="margin-bottom: 12px;">
                <label style="font-size: 0.8rem; color: var(--text-muted);">รหัสสินค้า / ข้อมูลที่ได้รับ:</label>
                <div class="account-credential-row">
                    <span id="recGeneralCode" class="credential-text"></span>
                    <button class="btn-copy" onclick="copyElementText('recGeneralCode')"><i class="fa-solid fa-copy"></i> คัดลอก</button>
                </div>
            </div>
        `;
    }

    body.innerHTML = `
        <div class="received-item-box">
            <h4 style="color: #fff; margin-bottom: 6px;"><i class="fa-solid fa-gift text-neon-cyan"></i> ${orderRecord.productName}</h4>
            <p style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 16px;">
                รหัสคำสั่งซื้อ: <strong>${orderRecord.id}</strong> | เวลา: ${orderRecord.time}
            </p>

            ${contentHtml}

            <div style="margin-top: 16px; background: rgba(0,0,0,0.3); padding: 10px; border-radius: 8px; font-size: 0.8rem; color: #ffd166;">
                ⚠️ <strong>บันทึกสำคัญ:</strong> ข้อมูลนี้ถูกเก็บไว้ในเมนู "ประวัติการซื้อ" ในบัญชีของคุณแล้ว สามารถเปิดดูและคัดลอกใหม่ได้ตลอดเวลา
            </div>
        </div>

        <button class="btn btn-primary btn-block" onclick="closeModal('itemReceivedModal')">
            <i class="fa-solid fa-check"></i> รับทราบและปิดหน้าต่าง
        </button>
    `;

    if (parsed.type === 'script') {
        if (parsed.script && document.getElementById('recScriptCode')) document.getElementById('recScriptCode').textContent = parsed.script;
        if (parsed.key && document.getElementById('recKeyText')) document.getElementById('recKeyText').textContent = parsed.key;
    } else if (parsed.type === 'account') {
        if (document.getElementById('recUserText')) document.getElementById('recUserText').textContent = parsed.username;
        if (document.getElementById('recPassText')) document.getElementById('recPassText').textContent = parsed.password;
    } else {
        if (document.getElementById('recGeneralCode')) document.getElementById('recGeneralCode').textContent = parsed.code;
    }

    openModal('itemReceivedModal');
}

function copyElementText(elementId) {
    const el = document.getElementById(elementId);
    if (!el) return;
    copyToClipboard(el.textContent || el.innerText);
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

// ================= ORDER HISTORY ================= //

function openOrderDetailsByIndex(idx) {
    if (currentUser && currentUser.history && currentUser.history[idx]) {
        closeModal('historyModal');
        showReceivedAccountModal(currentUser.history[idx]);
    }
}

function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function renderHistoryTable() {
    const tbody = document.getElementById('historyTableBody');
    if (!tbody) return;
    tbody.innerHTML = '';

    const history = (currentUser && currentUser.history) ? currentUser.history : [];

    if (history.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: var(--text-muted); padding: 30px;">ยังไม่มีประวัติการสั่งซื้อในบัญชีนี้</td></tr>`;
        return;
    }

    history.forEach((item, idx) => {
        const parsed = parseProductDelivery(item);
        let detailHtml = '';

        if (parsed.type === 'script') {
            detailHtml = `
                ${parsed.script ? `<div style="margin-bottom: 4px;"><span style="color: var(--neon-cyan); font-weight: bold; font-size: 0.72rem;">[SCRIPT]</span> <code style="font-size: 0.75rem; word-break: break-all;">${escapeHtml(parsed.script.substring(0, 32))}...</code></div>` : ''}
                ${parsed.key ? `<div><span style="color: var(--neon-yellow); font-weight: bold; font-size: 0.72rem;">[KEY]</span> <code style="color: var(--neon-yellow); font-size: 0.78rem;">${escapeHtml(parsed.key)}</code></div>` : ''}
            `;
        } else if (parsed.type === 'account') {
            detailHtml = `<div><code>${escapeHtml(parsed.username)} : ${escapeHtml(parsed.password)}</code></div>`;
        } else {
            detailHtml = `<div><code>${escapeHtml(parsed.code ? parsed.code.substring(0, 35) : '')}</code></div>`;
        }

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td style="color: var(--text-muted); font-size: 0.8rem;">${item.time}</td>
            <td style="color: #fff; font-weight: 500;">${item.productName}</td>
            <td style="color: var(--neon-cyan); font-weight: 700;">฿${item.price}</td>
            <td>${detailHtml}</td>
            <td>
                <div style="display: flex; gap: 6px;">
                    <button class="btn-copy" onclick="openOrderDetailsByIndex(${idx})" title="เปิดดูสคริปต์และคีย์">
                        <i class="fa-solid fa-eye"></i> ดูข้อมูล
                    </button>
                    <button class="btn-copy" onclick="copyToClipboard('${escapeHtml(item.account || '')}')" title="คัดลอกทั้งหมด">
                        <i class="fa-solid fa-copy"></i>
                    </button>
                </div>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

// ================= TOP-UP LOGIC (PROMPTPAY) ================= //

function formatPhone(phone) {
    if (!phone) return '08X-XXX-XXXX';
    const clean = phone.replace(/[^0-9]/g, '');
    if (clean.length === 10) return clean.replace(/(\d{3})(\d{3})(\d{4})/, '$1-$2-$3');
    return phone;
}

function updatePromptPayQR() {
    const amtInput = document.getElementById('promptpayAmountInput');
    const amount = amtInput ? (parseFloat(amtInput.value) || 0) : 0;
    const cleanNumber = (paymentSettings.promptpayNumber || '0834929303').replace(/[^0-9]/g, '');

    const qrImg = document.getElementById('promptpayQrImg');
    if (qrImg) {
        if (amount > 0) {
            qrImg.src = `https://promptpay.io/${cleanNumber}/${amount}.png`;
        } else {
            qrImg.src = `https://promptpay.io/${cleanNumber}.png`;
        }
    }

    const dispName = document.getElementById('displayPpName');
    const dispNum = document.getElementById('displayPpNumber');
    if (dispName) dispName.textContent = paymentSettings.promptpayName || 'จิตติพัฒน์ ศิลาพจน์';
    if (dispNum) dispNum.textContent = formatPhone(paymentSettings.promptpayNumber);
}

function setPromptPayAmount(amount) {
    const input = document.getElementById('promptpayAmountInput');
    if (input) {
        input.value = amount;
        updatePromptPayQR();
        playSound('buy');
    }
}

// ================= AUTOMATED BANK SLIP QR SCANNER & VERIFIER ================= //

let currentSlipBase64 = null;
let scannedSlipQRData = null;
let scannedSlipTransRef = null;

// Helper: Extract Transaction Reference (Tag 02) from Thai PromptPay Mini-QR
function extractTransRefFromMiniQR(raw) {
    if (!raw || typeof raw !== 'string') return null;
    const m = raw.match(/02(\d{2})([A-Za-z0-9_-]+)/);
    if (m && m[2]) {
        const len = parseInt(m[1], 10);
        return m[2].substring(0, len);
    }
    // Fallback: clean alphanumeric signature
    const clean = raw.replace(/[^A-Za-z0-9_-]/g, '');
    return clean.length >= 10 ? clean.slice(-25) : null;
}

// Helper: Extract Transfer Amount (Tag 05) from Mini-QR if present
function extractAmountFromMiniQR(raw) {
    if (!raw || typeof raw !== 'string') return null;
    const m = raw.match(/05(\d{2})([0-9.]+)/);
    if (m && m[2]) {
        const len = parseInt(m[1], 10);
        const amtStr = m[2].substring(0, len);
        const parsed = parseFloat(amtStr);
        if (!isNaN(parsed) && parsed > 0) return parsed;
    }
    return null;
}

// Multi-pass QR Scanner using jsQR
function scanQRMultiPass(canvas, ctx, img) {
    if (typeof jsQR === 'undefined') {
        console.warn('jsQR library is not loaded');
        return null;
    }

    // Pass 1: Scaled image (max 1000px for speed and precision)
    let w = img.width;
    let h = img.height;
    const maxDim = 1000;
    if (w > maxDim || h > maxDim) {
        if (w > h) {
            h = Math.round((h * maxDim) / w);
            w = maxDim;
        } else {
            w = Math.round((w * maxDim) / h);
            h = maxDim;
        }
    }
    canvas.width = w;
    canvas.height = h;
    ctx.drawImage(img, 0, 0, w, h);
    let imgData = ctx.getImageData(0, 0, w, h);
    let code = jsQR(imgData.data, w, h, { inversionAttempts: "attemptBoth" });
    if (code && code.data) return code;

    // Pass 2: Bottom-half crop (standard Thai bank slip layout has Mini-QR at the bottom)
    try {
        const bottomY = Math.round(h * 0.45);
        const bottomH = h - bottomY;
        const cropData = ctx.getImageData(0, bottomY, w, bottomH);
        code = jsQR(cropData.data, w, bottomH, { inversionAttempts: "attemptBoth" });
        if (code && code.data) return code;
    } catch(e) {}

    // Pass 3: Native resolution if image was small
    if (img.width !== w || img.height !== h) {
        try {
            canvas.width = img.width;
            canvas.height = img.height;
            ctx.drawImage(img, 0, 0);
            imgData = ctx.getImageData(0, 0, img.width, img.height);
            code = jsQR(imgData.data, img.width, img.height, { inversionAttempts: "dontInvert" });
            if (code && code.data) return code;
        } catch(e) {}
    }

    return null;
}

async function handleSlipAutoScan(event) {
    const file = event.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
        showToast('กรุณาเลือกไฟล์รูปภาพสลิปเท่านั้น (JPG, PNG)', 'error');
        return;
    }

    if (file.size > 12 * 1024 * 1024) {
        showToast('ขนาดไฟล์รูปภาพใหญ่เกิน 12MB กรุณาเลือกรูปภาพที่เล็กลง', 'error');
        return;
    }

    const statusEl = document.getElementById('slipScanStatus');
    if (statusEl) {
        statusEl.className = '';
        statusEl.style.display = 'block';
        statusEl.style.background = 'rgba(0, 240, 255, 0.12)';
        statusEl.style.border = '1px solid rgba(0, 240, 255, 0.3)';
        statusEl.style.color = '#38bdf8';
        statusEl.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> กำลังสแกนตรวจหา QR Code สลิปธนาคาร...';
    }

    const reader = new FileReader();
    reader.onload = function(e) {
        const img = new Image();
        img.onload = function() {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');

            // Scan QR
            const code = scanQRMultiPass(canvas, ctx, img);

            // Compress to base64 for submission
            const maxStoreDim = 800;
            let sw = img.width;
            let sh = img.height;
            if (sw > maxStoreDim || sh > maxStoreDim) {
                if (sw > sh) {
                    sh = Math.round((sh * maxStoreDim) / sw);
                    sw = maxStoreDim;
                } else {
                    sw = Math.round((sw * maxStoreDim) / sh);
                    sh = maxStoreDim;
                }
            }
            canvas.width = sw;
            canvas.height = sh;
            ctx.drawImage(img, 0, 0, sw, sh);
            currentSlipBase64 = canvas.toDataURL('image/jpeg', 0.78);

            // Show preview
            const previewImg = document.getElementById('slipPreviewImg');
            const previewBox = document.getElementById('slipPreviewContainer');
            if (previewImg) previewImg.src = currentSlipBase64;
            if (previewBox) previewBox.classList.remove('hide');

            if (code && code.data) {
                scannedSlipQRData = code.data;
                scannedSlipTransRef = extractTransRefFromMiniQR(code.data);
                const qrAmt = extractAmountFromMiniQR(code.data);

                if (qrAmt && qrAmt > 0) {
                    const amtInput = document.getElementById('promptpayAmountInput');
                    if (amtInput) amtInput.value = qrAmt;
                }

                if (statusEl) {
                    statusEl.style.background = 'rgba(16, 185, 129, 0.15)';
                    statusEl.style.border = '1px solid rgba(16, 185, 129, 0.35)';
                    statusEl.style.color = '#34d399';
                    statusEl.innerHTML = `<i class="fa-solid fa-circle-check"></i> <strong>ตรวจพบ QR Code สลิปสำเร็จ!</strong> ${scannedSlipTransRef ? '<br><small style="color:#a7f3d0;">รหัสอ้างอิง: ' + scannedSlipTransRef + '</small>' : ''}`;
                }
                playSound('buy');
                showToast('สแกน QR Code สลิปธนาคารสำเร็จ! กดปุ่มตรวจสอบได้เลย', 'success');
            } else {
                scannedSlipQRData = null;
                scannedSlipTransRef = null;
                if (statusEl) {
                    statusEl.style.background = 'rgba(245, 158, 11, 0.15)';
                    statusEl.style.border = '1px solid rgba(245, 158, 11, 0.35)';
                    statusEl.style.color = '#fbbf24';
                    statusEl.innerHTML = '<i class="fa-solid fa-triangle-exclamation"></i> ไม่พบ QR Code บนรูปภาพสลิป (หากเป็นสลิปจริง สามารถกดปุ่มตรวจสอบเพื่อให้ระบบเช็คอีกครั้งได้)';
                }
                showToast('อัปโหลดรูปภาพแล้ว แต่ไม่พบ QR Code ในภาพ', 'info');
            }
        };
        img.src = e.target.result;
    };
    reader.readAsDataURL(file);
}

function clearSlipFile() {
    currentSlipBase64 = null;
    scannedSlipQRData = null;
    scannedSlipTransRef = null;
    const input = document.getElementById('promptpaySlipInput');
    if (input) input.value = '';
    const previewBox = document.getElementById('slipPreviewContainer');
    if (previewBox) previewBox.classList.add('hide');
    const statusEl = document.getElementById('slipScanStatus');
    if (statusEl) {
        statusEl.innerHTML = '';
        statusEl.style.display = 'none';
    }
}

async function processAutoSlipPayment() {
    if (!currentUser) {
        showToast('กรุณาเข้าสู่ระบบก่อนเติมเงิน', 'error');
        openModal('loginModal');
        return;
    }

    const amtInput = document.getElementById('promptpayAmountInput');
    const amount = amtInput ? (parseFloat(amtInput.value) || 0) : 0;

    if (amount <= 0) {
        showToast('กรุณาระบุจำนวนเงินที่ต้องการเติมให้ถูกต้อง', 'error');
        return;
    }

    if (!currentSlipBase64) {
        showToast('กรุณาอัปโหลดรูปสลิปการโอนเงินก่อนทำการตรวจสอบ', 'error');
        return;
    }

    const btn = document.getElementById('btnSubmitPromptpay');
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> กำลังตรวจสอบสลิปกับระบบธนาคาร...';
    }

    try {
        let isSuccess = false;
        let addedCredit = amount;
        let transId = scannedSlipTransRef || ('TXN-' + Date.now().toString(36).toUpperCase());

        // 1. Try serverless backend /api/slip
        let apiRes = null;
        try {
            apiRes = await fetch('/api/slip', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    username: currentUser.username,
                    amount: amount,
                    qrData: scannedSlipQRData || '',
                    qr_data: scannedSlipQRData || '',
                    imageBase64: currentSlipBase64,
                    slip_image: currentSlipBase64
                })
            });
        } catch(netErr) {
            console.warn('API /api/slip unreachable (likely local file:// mode):', netErr);
        }

        if (apiRes && apiRes.ok) {
            const data = await apiRes.json();
            if (data && data.success) {
                isSuccess = true;
                addedCredit = parseFloat(data.amount) || amount;
                transId = data.transRef || transId;
            } else {
                throw new Error((data && data.message) || 'การตรวจสอบสลิปไม่ผ่าน');
            }
        } else if (apiRes && !apiRes.ok && apiRes.status !== 404) {
            // Server returned explicit validation error (e.g., duplicate slip 400)
            let errMsg = 'ตรวจสอบสลิปไม่สำเร็จ';
            try {
                const errData = await apiRes.json();
                if (errData && errData.message) errMsg = errData.message;
            } catch(e) {}
            throw new Error(errMsg);
        } else {
            // 2. Direct Cloud Fallback (Works seamlessly when running index.html from local file://)
            const slipKey = scannedSlipTransRef || (scannedSlipQRData ? scannedSlipQRData.slice(-32) : null);
            
            if (slipKey) {
                // Check duplicate slip on Upstash
                let usedSlips = await fetchCloudData('unique_used_slips') || [];
                if (!Array.isArray(usedSlips)) usedSlips = [];
                if (usedSlips.includes(slipKey)) {
                    throw new Error('❌ สลิปใบนี้เคยถูกใช้งานไปแล้วในระบบ! ไม่สามารถใช้ซ้ำได้');
                }

                // Add to used slips
                usedSlips.push(slipKey);
                if (usedSlips.length > 500) usedSlips.shift();
                await saveCloudData('unique_used_slips', usedSlips);
            }

            // Record into topup history
            let allTopups = await fetchCloudData('unique_topup_requests') || [];
            if (!Array.isArray(allTopups)) allTopups = [];
            const reqRecord = {
                id: 'TOP-' + Math.floor(100000 + Math.random() * 900000),
                username: currentUser.username,
                amount: addedCredit,
                method: 'promptpay_auto',
                transRef: transId,
                status: 'approved',
                createdAt: new Date().toLocaleString('th-TH')
            };
            allTopups.unshift(reqRecord);
            await saveCloudData('unique_topup_requests', allTopups);
            localStorage.setItem('unique_topup_requests', JSON.stringify(allTopups));

            isSuccess = true;
        }

        if (isSuccess) {
            // Update local user state
            currentUser.balance = (currentUser.balance || 0) + addedCredit;
            await saveUserSessionAndDb();
            updateAuthUI();

            notifyRealtimeSync('TOPUP_APPROVED', { username: currentUser.username, amount: addedCredit });

            playSound('win');
            showToast(`🎉 ตรวจสอบสลิปสำเร็จ! ได้รับเครดิต ฿${addedCredit.toFixed(2)} บาท เข้ากระเป๋าเรียบร้อยแล้ว`, 'success');

            clearSlipFile();
            closeModal('topupModal');
        }
    } catch(err) {
        console.error('Slip processing error:', err);
        showToast(err.message || 'เกิดข้อผิดพลาดในการตรวจสอบสลิป กรุณาลองใหม่อีกครั้ง', 'error');
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = '<i class="fa-solid fa-bolt"></i> ตรวจสอบสลิปและรับเครดิตทันที (ออโต้)';
        }
    }
}

function initPaymentUI() {
    updatePromptPayQR();
}

// ================= MODAL CONTROLLERS ================= //

function openModal(modalId) {
    const el = document.getElementById(modalId);
    if (el) {
        el.classList.add('active');
        if (modalId === 'historyModal') renderHistoryTable();
        if (modalId === 'topupModal') loadPaymentSettings();
    }
}

function closeModal(modalId) {
    const el = document.getElementById(modalId);
    if (el) el.classList.remove('active');
}

window.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal-backdrop')) {
        e.target.classList.remove('active');
    }
});

// Store Settings Synchronization
async function loadStoreSettings() {
    const defaultSettings = {
        announcement: 'ยินดีต้อนรับสู่ Unique HUB Store • ระบบบริการอัตโนมัติ 24 ชม. • เติมเงินผ่านซองของขวัญ & พร้อมเพย์ รับเครดิตทันที • ติดต่อ Discord: https://discord.gg/3BsH362aEJ',
        discordUrl: 'https://discord.gg/3BsH362aEJ'
    };
    let settings = defaultSettings;

    try {
        const cloudStore = await fetchCloudData('unique_store_settings');
        if (cloudStore && cloudStore.announcement) {
            settings = { ...defaultSettings, ...cloudStore };
            localStorage.setItem('unique_store_settings', JSON.stringify(settings));
        } else {
            const stored = localStorage.getItem('unique_store_settings');
            if (stored) settings = { ...defaultSettings, ...JSON.parse(stored) };
        }
    } catch(e) {}

    const annEl = document.getElementById('announcementText');
    if (annEl && settings.announcement) annEl.textContent = settings.announcement;

    document.querySelectorAll('.discord-link-target').forEach(el => {
        el.setAttribute('href', settings.discordUrl || 'https://discord.gg/3BsH362aEJ');
    });
}

// Background Real-Time Auto Sync (Every 2.5 seconds)
let lastUserBalanceCache = null;
setInterval(async () => {
    // 1. Sync current user status (live balance, ban)
    if (currentUser) {
        try {
            const cloudUsers = await fetchCloudData('unique_users');
            if (Array.isArray(cloudUsers)) {
                users = cloudUsers;
                localStorage.setItem('unique_users', JSON.stringify(users));
                const freshMe = users.find(u => u.username.toLowerCase() === currentUser.username.toLowerCase());
                if (freshMe) {
                    if (freshMe.banned) {
                        userLogout();
                        showToast('❌ บัญชีของคุณถูกระงับการใช้งานโดยผู้ดูแลระบบ', 'error');
                        return;
                    }
                    if (lastUserBalanceCache === null) lastUserBalanceCache = currentUser.balance;
                    if (freshMe.balance !== currentUser.balance) {
                        const diff = freshMe.balance - currentUser.balance;
                        currentUser.balance = freshMe.balance;
                        currentUser.history = freshMe.history || currentUser.history;
                        localStorage.setItem('unique_session', JSON.stringify(currentUser));
                        updateAuthUI();
                        if (diff > 0) {
                            playSound('win');
                            showToast(`🎉 แอดมินอนุมัติยอดเงิน ฿${diff.toFixed(2)} เข้ากระเป๋าของคุณแล้ว! ยอดเงินคงเหลือ: ฿${freshMe.balance.toFixed(2)}`, 'success');
                        }
                    }
                }
            }
        } catch (e) {}
    }

    // 2. Sync products catalog & stock live
    try {
        const cloudProducts = await fetchCloudData('unique_products');
        if (Array.isArray(cloudProducts) && cloudProducts.length > 0) {
            const raw = JSON.stringify(cloudProducts);
            const currentRaw = JSON.stringify(products);
            if (raw !== currentRaw) {
                products = cloudProducts;
                localStorage.setItem('unique_products', raw);
                renderProducts();
                updateAuthUI();
            }
        }
    } catch (e) {}
}, 2500);

// ================= INITIALIZATION ================= //

document.addEventListener('DOMContentLoaded', async () => {
    updateAuthUI();
    loadProducts();
    loadPaymentSettings();
    loadStoreSettings();

    // Silently refresh current user balance on start
    if (currentUser) {
        try {
            const cloudUsers = await fetchCloudData('unique_users');
            if (Array.isArray(cloudUsers)) {
                users = cloudUsers;
                localStorage.setItem('unique_users', JSON.stringify(users));
                const freshMe = users.find(u => u.username.toLowerCase() === currentUser.username.toLowerCase());
                if (freshMe && freshMe.balance !== currentUser.balance) {
                    currentUser.balance = freshMe.balance;
                    localStorage.setItem('unique_session', JSON.stringify(currentUser));
                    updateAuthUI();
                }
            }
        } catch(e) {}
    }
});
