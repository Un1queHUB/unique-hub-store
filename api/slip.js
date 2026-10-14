// Vercel Serverless Function: Automated Bank Slip Verification API
// Supports SlipOK API integration & Built-in Thai Bank Mini-QR duplicate protection

const UPSTASH_URL = process.env.UPSTASH_REDIS_REST_URL || 'https://upright-mite-232089.upstash.io';
const UPSTASH_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN || 'gQAAAAAAA4qZAQIgcDEyMDA3ODI0NWEyYTg0MGIzOTdmZjJmY2ZmMjY1NjM5Mg';

async function getCloudData(key) {
    try {
        const endpoint = `${UPSTASH_URL}/get/${encodeURIComponent(key)}`;
        const res = await fetch(endpoint, {
            headers: { 'Authorization': `Bearer ${UPSTASH_TOKEN}` }
        });
        const json = await res.json();
        if (json && json.result) {
            try { return JSON.parse(json.result); } catch (e) { return json.result; }
        }
    } catch (e) {
        console.error('getCloudData error:', e);
    }
    return null;
}

async function setCloudData(key, data) {
    try {
        const stringData = typeof data === 'string' ? data : JSON.stringify(data);
        const endpoint = `${UPSTASH_URL}`;
        await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${UPSTASH_TOKEN}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(['SET', key, stringData])
        });
        return true;
    } catch (e) {
        console.error('setCloudData error:', e);
    }
    return false;
}

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ success: false, message: 'Method Not Allowed' });
    }

    try {
        const body = req.body || {};
        const username = body.username;
        const amount = body.amount;
        const imageBase64 = body.imageBase64 || body.slip_image || body.image_base64 || '';
        const qrData = body.qrData || body.qr_data || '';

        if (!username) {
            return res.status(400).json({ success: false, message: 'กรุณาเข้าสู่ระบบก่อนทำรายการ' });
        }

        const inputAmount = parseFloat(amount);
        if (isNaN(inputAmount) || inputAmount <= 0) {
            return res.status(400).json({ success: false, message: 'จำนวนเงินไม่ถูกต้อง' });
        }

        // 1. Fetch Payment Settings from Cloud
        const paySettings = await getCloudData('unique_payment_settings') || {
            promptpayNumber: '0834929303',
            promptpayName: 'จิตติพัฒน์ ศิลาพจน์',
            slipokApiKey: '',
            slipokBranchId: ''
        };

        let verifiedAmount = inputAmount;
        let transRef = '';
        let sendingBank = '';

        // 2. If SlipOK API is configured, use SlipOK to verify with banks directly
        if (paySettings.slipokApiKey && paySettings.slipokBranchId) {
            try {
                let cleanBase64 = imageBase64 || '';
                if (cleanBase64.includes(',')) cleanBase64 = cleanBase64.split(',')[1];

                const slipokRes = await fetch(`https://api.slipok.com/api/line/apikey/${paySettings.slipokBranchId}`, {
                    method: 'POST',
                    headers: {
                        'x-authorization': paySettings.slipokApiKey,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ data: cleanBase64, log: true })
                });

                const slipokData = await slipokRes.json();
                if (!slipokData || !slipokData.success || !slipokData.data) {
                    return res.status(400).json({
                        success: false,
                        message: slipokData.message || 'สลิปนี้ไม่ผ่านการตรวจสอบจากระบบธนาคาร'
                    });
                }

                const slipDetails = slipokData.data;
                verifiedAmount = parseFloat(slipDetails.amount) || inputAmount;
                transRef = slipDetails.transRef || '';
                sendingBank = slipDetails.sendingBank || '';

                // Verify receiver account or promptpay
                const receiverAcc = slipDetails.receiver?.account?.bank?.account || slipDetails.receiver?.account?.proxy?.account || '';
                const cleanMerchantPhone = (paySettings.promptpayNumber || '0834929303').replace(/[^0-9]/g, '');
                if (receiverAcc && !receiverAcc.includes(cleanMerchantPhone.slice(-4))) {
                    return res.status(400).json({
                        success: false,
                        message: 'สลิปนี้ไม่ได้โอนเข้าบัญชีร้านค้า Unique HUB (เลขบัญชีปลายทางไม่ตรงกัน)'
                    });
                }
            } catch (slipErr) {
                console.error('SlipOK error:', slipErr);
                return res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการเชื่อมต่อ SlipOK' });
            }
        } else {
            // 3. Built-in Thai Bank Mini-QR Verification
            if (!qrData || typeof qrData !== 'string' || qrData.length < 20) {
                return res.status(400).json({
                    success: false,
                    message: 'ไม่พบ QR Code สลิปธนาคาร! กรุณาอัปโหลดรูปสลิปที่มี QR Code ชัดเจน'
                });
            }

            // Thai QR Slip standard payload check (EMVCo identifier usually starts with 000400000100)
            if (!qrData.includes('000400000100') && !qrData.includes('000201') && !qrData.includes('promptpay')) {
                return res.status(400).json({
                    success: false,
                    message: 'QR Code นี้ไม่ใช่สลิปโอนเงินของธนาคารไทย กรุณาใช้สลิปโอนเงินที่มี QR Code จากแอปธนาคาร'
                });
            }

            // Extract transRef from QR Data (standard Tag 02 or string hash)
            const tag02Match = qrData.match(/02([0-9]{2})([a-zA-Z0-9]+)/);
            if (tag02Match && tag02Match[2]) {
                const len = parseInt(tag02Match[1], 10);
                transRef = tag02Match[2].substring(0, len);
            } else {
                // Generate consistent hash signature from the QR payload
                transRef = qrData.substring(0, 45);
            }
        }

        if (!transRef) {
            transRef = 'REF-' + Date.now();
        }

        // 4. Anti-Duplicate Check in Cloud Database
        let usedSlips = await getCloudData('unique_used_slips');
        if (!Array.isArray(usedSlips)) usedSlips = [];

        if (usedSlips.includes(transRef)) {
            return res.status(400).json({
                success: false,
                message: '❌ สลิปนี้ถูกใช้งานไปแล้วในระบบ! ไม่อนุญาตให้ใช้สลิปซ้ำ'
            });
        }

        // 5. Success: Save transRef to prevent duplicate reuse
        usedSlips.push(transRef);
        await setCloudData('unique_used_slips', usedSlips);

        // 6. Credit User's Balance in Cloud
        let users = await getCloudData('unique_users') || [];
        const uIdx = users.findIndex(u => u.username.toLowerCase() === username.toLowerCase());
        if (uIdx === -1) {
            return res.status(404).json({ success: false, message: 'ไม่พบชื่อผู้ใช้นี้ในระบบ' });
        }

        users[uIdx].balance = (parseFloat(users[uIdx].balance) || 0) + verifiedAmount;
        await setCloudData('unique_users', users);

        // 7. Log to unique_topup_requests
        let allTopups = await getCloudData('unique_topup_requests') || [];
        const topupRecord = {
            id: 'TOP-' + Math.floor(100000 + Math.random() * 900000),
            username: username,
            amount: verifiedAmount,
            method: 'promptpay_auto',
            transRef: transRef,
            sendingBank: sendingBank,
            time: new Date().toLocaleTimeString('th-TH'),
            status: 'approved',
            createdAt: new Date().toLocaleString('th-TH')
        };
        allTopups.unshift(topupRecord);
        await setCloudData('unique_topup_requests', allTopups);

        return res.status(200).json({
            success: true,
            amount: verifiedAmount,
            transRef: transRef,
            newBalance: users[uIdx].balance,
            message: `🎉 ตรวจสอบสลิปสำเร็จ! เครดิตเข้ากระเป๋าจำนวน ฿${verifiedAmount.toFixed(2)} บาท เรียบร้อยแล้ว`
        });

    } catch (err) {
        console.error('Slip API Error:', err);
        return res.status(500).json({
            success: false,
            message: 'เกิดข้อผิดพลาดในการตรวจสอบสลิป กรุณาลองใหม่อีกครั้ง'
        });
    }
}
