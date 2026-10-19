// Vercel Serverless Function: Cloud Database API (Powered by Firebase Realtime Database REST)
// Free 100% online cloud database for Unique HUB Store

const FIREBASE_URL = 'https://uniquehub-store-default-rtdb.asia-southeast1.firebasedatabase.app';

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
            const endpoint = `${FIREBASE_URL}/${encodeURIComponent(key)}.json`;
            const upRes = await fetch(endpoint);
            const parsed = await upRes.json();
            return res.status(200).json({ success: true, key, data: parsed });
        }

        if (req.method === 'POST') {
            const { key, data } = req.body || {};
            if (!key) {
                return res.status(400).json({ success: false, message: 'Missing key' });
            }

            const endpoint = `${FIREBASE_URL}/${encodeURIComponent(key)}.json`;
            const upRes = await fetch(endpoint, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });

            const result = await upRes.json();
            return res.status(200).json({ success: true, key, result });
        }

        return res.status(405).json({ success: false, message: 'Method Not Allowed' });
    } catch(err) {
        console.error('Cloud DB Error:', err);
        return res.status(500).json({ success: false, message: err.message });
    }
}
