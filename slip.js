// Vercel Serverless Function: Automated Bank Slip Verification API
// Supports SlipOK API integration & Firebase Realtime Database Cloud Sync

const FIREBASE_URL = 'https://uniquehub-store-default-rtdb.asia-southeast1.firebasedatabase.app';

async function getCloudData(key) {
    try {
        const endpoint = `${FIREBASE_URL}/${encodeURIComponent(key)}.json`;
        const res = await fetch(endpoint);
        if (!res.ok) return null;
        return await res.json();
    } catch (e) {
        console.error('getCloudData error:', e);
    }
    return null;
}

async function setCloudData(key, data) {
    try {
        const endpoint = `${FIREBASE_URL}/${encodeURIComponent(key)}.json`;
        const res = await fetch(endpoint, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        return res.ok;
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
            return res.status(400).json({ success: false, message: 'กรุณาเข้าสู่ระบบก่อนทำรายการเติมเงิน' });
        }

        const inputAmount = parseFloat(amount);
        if (isNaN(inputAmount) || inputAmount <= 0) {
            return res.status(400).json({ success: false, message: 'กรุณาระบุจำนวนเงินที่ถูกต้อง' });
        }

        // 1. Fetch Payment Settings from Firebase Cloud Database
        let paySettings = await getCloudData('unique_payment_settings');
        if (!paySettings || !paySettings.slipokApiKey) {
            paySettings = {
                promptpayNumber: '0834929303',
                promptpayName: 'จิตติพัฒน์ ศิลาพจน์',
                slipokApiKey: 'SLIPOKCY56JJC',
                slipokBranchId: '78541'
            };
        }

        const apiKey = (paySettings.slipokApiKey || '').trim();
        let branchId = (paySettings.slipokBranchId || '').trim();

        if (!apiKey || !branchId) {
            return res.status(400).json({
                success: false,
                message: '❌ ร้านค้ายังไม่ได้ตั้งค่า SlipOK API ให้สมบูรณ์ กรุณาแจ้งแอดมินทาง Discord เพื่อดำเนินการเติมเงิน'
            });
        }

        // Normalize SlipOK branch URL
        let slipokUrl = branchId;
        if (!slipokUrl.startsWith('http')) {
            const m = branchId.match(/(\d+)/);
            const cleanId = m ? m[1] : branchId;
            slipokUrl = `https://api.slipok.com/api/line/apikey/${cleanId}`;
        }

        // 2. Call SlipOK to verify slip with Thai banks
        let slipokRes;
        try {
            if (qrData && qrData.length > 10) {
                // Official SlipOK payload for decoded QR string
                slipokRes = await fetch(slipokUrl, {
                    method: 'POST',
                    headers: {
                        'x-authorization': apiKey,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ data: qrData, log: false })
                });
            } else if (imageBase64) {
                // Send as image file
                let cleanBase64 = imageBase64;
                if (cleanBase64.includes(',')) cleanBase64 = cleanBase64.split(',')[1];
                const buffer = Buffer.from(cleanBase64, 'base64');
                const formData = new FormData();
                formData.append('files', new Blob([buffer], { type: 'image/jpeg' }), 'slip.jpg');
                formData.append('log', 'false');

                slipokRes = await fetch(slipokUrl, {
                    method: 'POST',
                    headers: {
                        'x-authorization': apiKey
                    },
                    body: formData
                });
            } else {
                return res.status(400).json({
                    success: false,
                    message: 'กรุณาอัปโหลดรูปภาพสลิป หรือสแกน QR Code บนสลิป'
                });
            }
        } catch (netErr) {
            console.error('Failed to connect to SlipOK:', netErr);
            return res.status(500).json({
                success: false,
                message: 'ไม่สามารถติดต่อเซิร์ฟเวอร์ SlipOK ได้ในขณะนี้ กรุณาลองใหม่อีกครั้ง'
            });
        }

        const slipokData = await slipokRes.json();

        // 3. Check SlipOK result
        if (!slipokData || !slipokData.success || !slipokData.data) {
            const errMsg = slipokData?.message || 'สลิปนี้ไม่ผ่านการตรวจสอบจากระบบธนาคาร (อาจเป็นสลิปปลอม หรือข้อมูลไม่ถูกต้อง)';
            return res.status(400).json({
                success: false,
                message: `❌ ${errMsg}`
            });
        }

        const slipDetails = slipokData.data;
        const slipAmount = parseFloat(slipDetails.amount);
        const transRef = slipDetails.transRef || '';
        const sendingBank = slipDetails.sendingBank || '';

        // 4. STRICT AMOUNT VERIFICATION: Slip amount MUST match input amount
        if (isNaN(slipAmount) || slipAmount <= 0) {
            return res.status(400).json({
                success: false,
                message: '❌ ไม่สามารถอ่านยอดเงินจากสลิปธนาคารได้ กรุณาติดต่อแอดมิน'
            });
        }

        if (Math.abs(slipAmount - inputAmount) > 0.01) {
            return res.status(400).json({
                success: false,
                message: `❌ ยอดเงินในสลิปไม่ตรงกับยอดที่ระบุเติม! สลิปโอนจริง ฿${slipAmount.toFixed(2)} บาท แต่ในเว็ประบุเติม ฿${inputAmount.toFixed(2)} บาท`
            });
        }

        // 5. STRICT RECEIVER VERIFICATION: Ensure funds reached merchant's account
        const receiver = slipDetails.receiver || {};
        const receiverName = (receiver.displayName || receiver.name || '').trim();
        const receiverAcc = (
            receiver.account?.bank?.account ||
            receiver.account?.proxy?.account ||
            receiver.account?.value ||
            receiver.proxy?.value ||
            ''
        ).replace(/[^0-9]/g, '');

        const merchantPhone = (paySettings.promptpayNumber || '0834929303').replace(/[^0-9]/g, '');
        const merchantFullName = (paySettings.promptpayName || 'จิตติพัฒน์ ศิลาพจน์').trim();
        const merchantKeywords = merchantFullName.split(' ').map(s => s.trim()).filter(s => s.length >= 3);

        const phoneMatches = Boolean(
            receiverAcc && merchantPhone && (
                receiverAcc === merchantPhone ||
                receiverAcc.includes(merchantPhone.slice(-4)) ||
                merchantPhone.includes(receiverAcc)
            )
        );

        const nameMatches = Boolean(
            receiverName && merchantKeywords.some(kw => receiverName.includes(kw))
        );

        if (!phoneMatches && !nameMatches) {
            return res.status(400).json({
                success: false,
                message: `❌ สลิปนี้ไม่ได้โอนเข้าบัญชีร้านค้า! ปลายทางในสลิปคือ "${receiverName || receiverAcc || 'ไม่ระบุ'}" ซึ่งไม่ตรงกับบัญชีร้าน (${merchantFullName} / ${merchantPhone})`
            });
        }

        // 6. ANTI-DUPLICATE CHECK: Prevent reusing slips
        if (!transRef) {
            return res.status(400).json({
                success: false,
                message: '❌ ไม่พบรหัสอ้างอิงธุรกรรม (Transaction Reference) ในสลิป'
            });
        }

        let usedSlips = await getCloudData('unique_used_slips');
        if (!Array.isArray(usedSlips)) usedSlips = [];

        if (usedSlips.includes(transRef)) {
            return res.status(400).json({
                success: false,
                message: '❌ สลิปนี้ถูกใช้งานไปแล้วในระบบ! ไม่อนุญาตให้ใช้สลิปซ้ำ'
            });
        }

        // 7. Success: Save transRef to prevent duplicate reuse
        usedSlips.push(transRef);
        if (usedSlips.length > 1000) usedSlips.shift();
        await setCloudData('unique_used_slips', usedSlips);

        // 8. Credit user's balance in Firebase Cloud Database
        let users = await getCloudData('unique_users');
        if (!Array.isArray(users)) users = [];

        const uIdx = users.findIndex(u => (u.username || '').toLowerCase() === username.toLowerCase());
        if (uIdx === -1) {
            return res.status(404).json({ success: false, message: 'ไม่พบชื่อผู้ใช้นี้ในระบบ' });
        }

        const oldBal = parseFloat(users[uIdx].balance) || 0;
        users[uIdx].balance = Math.round((oldBal + slipAmount) * 100) / 100;
        await setCloudData('unique_users', users);

        // 9. Log record to unique_topup_requests in Firebase
        let allTopups = await getCloudData('unique_topup_requests');
        if (!Array.isArray(allTopups)) allTopups = [];

        const topupRecord = {
            id: 'TOP-' + Math.floor(100000 + Math.random() * 900000),
            username: username,
            amount: slipAmount,
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
            amount: slipAmount,
            transRef: transRef,
            newBalance: users[uIdx].balance,
            message: `🎉 ตรวจสอบสลิปสำเร็จ! เครดิตเข้ากระเป๋าจำนวน ฿${slipAmount.toFixed(2)} บาท เรียบร้อยแล้ว`
        });

    } catch (err) {
        console.error('Slip API Fatal Error:', err);
        return res.status(500).json({
            success: false,
            message: 'เกิดข้อผิดพลาดในการตรวจสอบสลิป กรุณาลองใหม่อีกครั้ง หรือติดต่อแอดมิน'
        });
    }
}
