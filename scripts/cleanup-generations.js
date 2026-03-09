const fs = require('fs');
const path = require('path');

const GENERATIONS_FILE = path.join(__dirname, '..', 'data', 'generations.json');
const ONE_HOUR = 60 * 60 * 1000;

try {
    if (!fs.existsSync(GENERATIONS_FILE)) process.exit(0);
    const data = JSON.parse(fs.readFileSync(GENERATIONS_FILE, 'utf8'));
    const now = Date.now();
    let cleaned = 0;

    for (const id of Object.keys(data)) {
        const record = data[id];
        if (record.fileUrl && record.fileUrl.startsWith('data:') && (now - record.createdAt) > ONE_HOUR) {
            record.fileUrl = '';
            cleaned++;
        }
    }

    if (cleaned > 0) {
        fs.writeFileSync(GENERATIONS_FILE, JSON.stringify(data, null, 2));
        console.log(`Cleaned ${cleaned} expired base64 images from generations.json`);
    } else {
        console.log('No expired images to clean');
    }
} catch (e) {
    console.error('Cleanup error:', e);
}
