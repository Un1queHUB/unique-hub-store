// Vercel Serverless Function: Cloud Database API (Powered by Upstash Redis REST)
// Free 100% online cloud database for Unique HUB Store

const UPSTASH_URL = process.env.UPSTASH_REDIS_REST_URL || 'https://upright-mite-232089.upstash.io';
const UPSTASH_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN || 'gQAAAAAAA4qZAQIgcDEyMDA3ODI0NWEyYTg0MGIzOTdmZjJmY2ZmMjY1NjM5Mg';

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

    try {
        if (req.method === 'GET') {
            const key = req.query.key || 'unique_users';
            const endpoint = `${UPSTASH_URL}/get/${encodeURIComponent(key)}`;
            const upRes = await fetch(endpoint, {
                headers: { 'Authorization': `Bearer ${UPSTASH_TOKEN}` }
            });
            const upData = await upRes.json();
            let parsed = null;
            if (upData && upData.result) {
                try {
                    parsed = JSON.parse(upData.result);
                } catch(e) {
                    parsed = upData.result;
                }
            }
            return res.status(200).json({ success: true, key, data: parsed });
        }

        if (req.method === 'POST') {
            const { key, data } = req.body || {};
            if (!key) {
                return res.status(400).json({ success: false, message: 'Missing key' });
            }

            const stringData = typeof data === 'string' ? data : JSON.stringify(data);
            const endpoint = `${UPSTASH_URL}`;
            const upRes = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${UPSTASH_TOKEN}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(['SET', key, stringData])
            });

            const upData = await upRes.json();
            return res.status(200).json({ success: true, key, result: upData.result });
        }

        return res.status(405).json({ success: false, message: 'Method Not Allowed' });
    } catch(err) {
        console.error('Cloud DB Error:', err);
        return res.status(500).json({ success: false, message: err.message });
    }
}
