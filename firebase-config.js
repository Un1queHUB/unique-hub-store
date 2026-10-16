// ==========================================================================
// FIREBASE REALTIME DATABASE CONFIGURATION - UNIQUE STORE
// ระบบฐานข้อมูลคลาวด์ Real-time 100% (อัปเดตสดระดับมิลลิวินาที ไม่ต้องแตะ GitHub)
// ==========================================================================

// 1. นำค่า Config จาก Google Firebase Console มาวางแทนที่ด้านล่างนี้ได้เลย:
//    (Firebase Console -> Project Settings -> General -> Your apps -> SDK setup and configuration)
const DEFAULT_FIREBASE_CONFIG = {
    apiKey: "AIzaSyCOchGL5LDvTK5BUFWcEeWjWRkwFQXJSEQ",
    authDomain: "uniquehub-store.firebaseapp.com",
    databaseURL: "https://uniquehub-store-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "uniquehub-store",
    storageBucket: "uniquehub-store.firebasestorage.app",
    messagingSenderId: "619995091367",
    appId: "1:619995091367:web:2fd99c357245ddda45e682",
    measurementId: "G-MDCMRRR466"
};

let activeFirebaseConfig = null;
let firebaseDb = null;
let firebaseInitialized = false;

// โหลดการตั้งค่าจาก LocalStorage เผื่อแอดมินกรอกผ่านหน้า Admin Dashboard
try {
    const savedConfig = localStorage.getItem('unique_firebase_config');
    if (savedConfig) {
        const parsed = JSON.parse(savedConfig);
        if (parsed && parsed.databaseURL && !parsed.databaseURL.includes('YOUR_PROJECT_ID')) {
            activeFirebaseConfig = parsed;
        }
    }
} catch (e) {}

if (!activeFirebaseConfig) {
    activeFirebaseConfig = DEFAULT_FIREBASE_CONFIG;
}

// ตรวจสอบว่าใส่ค่า Config ครบถ้วนหรือยัง (ไม่ใช่ Placeholder)
function isConfigured(cfg) {
    return Boolean(
        cfg &&
        cfg.databaseURL &&
        !cfg.databaseURL.includes('YOUR_PROJECT_ID') &&
        cfg.apiKey &&
        !cfg.apiKey.includes('YOUR_FIREBASE_API_KEY')
    );
}

// เริ่มต้นการทำงานของ Firebase
function initFirebaseApp(customConfig = null) {
    if (customConfig) {
        activeFirebaseConfig = customConfig;
    }

    if (typeof firebase === 'undefined') {
        console.warn('⚠️ [Firebase] ไม่พบ Firebase SDK (ต้องโหลด firebase-app-compat.js และ firebase-database-compat.js)');
        return false;
    }

    if (!isConfigured(activeFirebaseConfig)) {
        console.log('ℹ️ [Firebase] ยังไม่ได้ตั้งค่า Firebase Config (ระบบจะทำงานผ่าน Upstash Redis Fallback อัตโนมัติ)');
        return false;
    }

    try {
        if (firebase.apps && firebase.apps.length > 0) {
            // ลบ instance เดิมหากต้องการเปลี่ยน config ใหม่
            firebase.app().delete().catch(() => {});
        }

        firebase.initializeApp(activeFirebaseConfig);
        firebaseDb = firebase.database();
        firebaseInitialized = true;
        console.log('🔥 [Firebase] เชื่อมต่อ Realtime Database สำเร็จ! (WebSocket Active)');
        return true;
    } catch (err) {
        console.error('❌ [Firebase] เกิดข้อผิดพลาดในการเชื่อมต่อ:', err);
        firebaseInitialized = false;
        firebaseDb = null;
        return false;
    }
}

// เช็คสถานะพร้อมใช้งาน
function isFirebaseReady() {
    return firebaseInitialized && firebaseDb !== null;
}

// ดึงข้อมูล 1 ครั้ง (Single Read)
async function fbGetData(key) {
    if (!isFirebaseReady()) return null;
    try {
        const snapshot = await firebaseDb.ref(key).once('value');
        return snapshot.val();
    } catch (err) {
        console.warn(`[Firebase] GET [${key}] error:`, err);
        return null;
    }
}

// บันทึกข้อมูล (Write)
async function fbSetData(key, data) {
    if (!isFirebaseReady()) return false;
    try {
        await firebaseDb.ref(key).set(data);
        return true;
    } catch (err) {
        console.error(`[Firebase] SET [${key}] error:`, err);
        return false;
    }
}

// ดักฟังการเปลี่ยนแปลงแบบ Real-time (WebSocket Listener)
function fbOnData(key, callback) {
    if (!isFirebaseReady()) return () => {};
    try {
        const ref = firebaseDb.ref(key);
        const listener = (snapshot) => {
            try {
                callback(snapshot.val());
            } catch (e) {
                console.error(`[Firebase] Error in callback for [${key}]:`, e);
            }
        };
        ref.on('value', listener);
        // คืนฟังก์ชันสำหรับหยุดดักฟัง (Unsubscribe)
        return () => ref.off('value', listener);
    } catch (e) {
        console.warn(`[Firebase] Error attaching listener to [${key}]:`, e);
        return () => {};
    }
}

// รันตั้งต้นทันทีเมื่อโหลดสคริปต์
initFirebaseApp();
