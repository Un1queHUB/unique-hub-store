// Vercel Serverless Function: TrueMoney Gift Voucher Claimer API
// Free 100% hosting on Vercel without third-party fees

export default async function handler(req, res) {
    // Enable CORS
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
        const { voucher_url, phone } = req.body || {};

        const recipientPhone = phone || '0834929303';
        if (!voucher_url) {
            return res.status(400).json({
                success: false,
                message: 'กรุณากรอกลิงก์ซองของขวัญ TrueMoney'
            });
        }

        // Clean phone number (must be digits only)
        const cleanPhone = recipientPhone.replace(/[^0-9]/g, '');
        if (cleanPhone.length < 10) {
            return res.status(400).json({
                success: false,
                message: 'เบอร์ TrueMoney ของเจ้าของร้านไม่ถูกต้อง (ต้องมี 10 หลัก)'
            });
        }

        let inputUrl = voucher_url.trim();

        // Handle tmn.app.link shortlink redirect resolution
        if (inputUrl.includes('tmn.app.link')) {
            try {
                const headRes = await fetch(inputUrl, {
                    method: 'GET',
                    redirect: 'follow',
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15'
                    }
                });
                if (headRes.url) {
                    inputUrl = headRes.url;
                }
            } catch (redirErr) {
                console.error('Failed to resolve shortlink redirect:', redirErr);
            }
        }

        // Extract voucher hash from url
        let voucherHash = null;
        const vMatch = inputUrl.match(/[?&]v=([a-zA-Z0-9]+)/i);
        if (vMatch && vMatch[1]) {
            voucherHash = vMatch[1];
        } else {
            const voucherPathMatch = inputUrl.match(/vouchers\/([a-zA-Z0-9]+)/i);
            if (voucherPathMatch && voucherPathMatch[1]) {
                voucherHash = voucherPathMatch[1];
            } else {
                // If user entered raw hash or trailing path
                const parts = inputUrl.split(/[/?#]/).filter(Boolean);
                const last = parts[parts.length - 1];
                if (last && last.length >= 10 && /^[a-zA-Z0-9]+$/.test(last)) {
                    voucherHash = last;
                }
            }
        }

        if (!voucherHash || voucherHash.length < 10) {
            return res.status(400).json({
                success: false,
                message: 'ลิงก์ซองของขวัญไม่ถูกต้อง! กรุณาคัดลอกลิงก์จาก TrueMoney ให้ครบถ้วน'
            });
        }

        // Common headers for TrueMoney internal API
        const tmnHeaders = {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148',
            'Origin': 'https://gift.truemoney.com',
            'Referer': `https://gift.truemoney.com/campaign/?v=${voucherHash}`
        };

        const tmnPayload = JSON.stringify({
            mobile: cleanPhone,
            voucher_hash: voucherHash
        });

        // 1. Try modern vouchers/:hash/redeem endpoint
        let endpoint = `https://gift.truemoney.com/campaign/vouchers/${voucherHash}/redeem`;
        let response = await fetch(endpoint, {
            method: 'POST',
            headers: tmnHeaders,
            body: tmnPayload
        });

        // If endpoint is 404, fallback to v1/redeem
        if (response.status === 404) {
            endpoint = `https://gift.truemoney.com/campaign/v1/redeem`;
            response = await fetch(endpoint, {
                method: 'POST',
                headers: tmnHeaders,
                body: tmnPayload
            });
        }

        const data = await response.json();

        // Check TrueMoney response
        if (data && data.status && data.status.code === 'SUCCESS') {
            const amount = parseFloat(data.data.voucher.redeemed_amount_baht);
            return res.status(200).json({
                success: true,
                amount: amount,
                voucher_code: voucherHash,
                owner_phone: cleanPhone,
                message: `เติมเงินสำเร็จ! ยอดเงิน ฿${amount.toFixed(2)} บาท เข้ากระเป๋าเรียบร้อยแล้ว`
            });
        } else {
            // TrueMoney Error handling & friendly Thai messages
            const errCode = data?.status?.code || '';
            let errMsg = 'ซองของขวัญไม่ถูกต้องหรือถูกรับไปแล้ว';

            if (errCode === 'CANNOT_GET_OWN_VOUCHER') {
                errMsg = `ไม่สามารถรับซองของขวัญของตนเองได้ (เบอร์ผู้สร้างซองตรงกับเบอร์ร้านค้า ${cleanPhone})`;
            } else if (errCode === 'VOUCHER_OUT_OF_STOCK') {
                errMsg = 'ซองของขวัญนี้ถูกรับไปหมดแล้ว';
            } else if (errCode === 'VOUCHER_EXPIRED') {
                errMsg = 'ซองของขวัญนี้หมดอายุแล้ว (อายุซองเกิน 72 ชั่วโมง)';
            } else if (errCode === 'TARGET_USER_NOT_FOUND') {
                errMsg = `เบอร์ TrueMoney ของร้านค้า (${cleanPhone}) ยังไม่ได้เปิดใช้งาน TrueMoney Wallet`;
            } else if (errCode === 'VOUCHER_NOT_FOUND') {
                errMsg = 'ไม่พบข้อมูลซองของขวัญนี้ในระบบ TrueMoney';
            } else if (errCode === 'INTERNAL_ERROR') {
                errMsg = 'ระบบ TrueMoney ขัดข้องชั่วคราว กรุณารอสักครู่แล้วลองใหม่อีกครั้ง';
            } else if (data && data.status && data.status.message) {
                errMsg = data.status.message;
            }

            return res.status(400).json({
                success: false,
                code: errCode,
                message: errMsg,
                raw: data
            });
        }

    } catch (err) {
        console.error('TMN API Error:', err);
        return res.status(500).json({
            success: false,
            message: 'เกิดข้อผิดพลาดในการเชื่อมต่อกับเซิร์ฟเวอร์ TrueMoney กรุณาลองใหม่อีกครั้ง'
        });
    }
}
