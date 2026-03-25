import fs from 'fs';
import path from 'path';

const GUEST_IMAGES_FILE = path.join(process.cwd(), 'data', 'guest_images.json');

export interface GuestImageRecord {
    id: string;
    guestId: string;              // IP address
    generationType: string;       // 'txt2img' | 'faceswap' | 'inpaint'
    prompt: string;
    originalPath: string;         // /api/images/guest_xxx_original.jpg
    watermarkedPath: string;      // /api/images/guest_xxx_watermarked.jpg
    unlocked: boolean;
    userId?: string;              // set after registration/login
    createdAt: number;            // Unix ms
}

function readGuestImages(): Record<string, GuestImageRecord> {
    if (!fs.existsSync(GUEST_IMAGES_FILE)) return {};
    try {
        return JSON.parse(fs.readFileSync(GUEST_IMAGES_FILE, 'utf8'));
    } catch {
        return {};
    }
}

function writeGuestImages(data: Record<string, GuestImageRecord>): void {
    const dir = path.dirname(GUEST_IMAGES_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(GUEST_IMAGES_FILE, JSON.stringify(data));
}

/** Save a guest generation record */
export function saveGuestImage(record: GuestImageRecord): void {
    const data = readGuestImages();
    data[record.id] = record;
    writeGuestImages(data);
}

/** Find all unlockable images for a given guest IP (not yet unlocked, within 24h) */
export function findUnlockableImages(guestId: string): GuestImageRecord[] {
    const data = readGuestImages();
    const now = Date.now();
    const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;
    return Object.values(data).filter(
        img => img.guestId === guestId && !img.unlocked && (now - img.createdAt) < TWENTY_FOUR_HOURS
    );
}

/** Mark images as unlocked and assign to a user */
export function unlockGuestImages(guestId: string, userId: string): GuestImageRecord[] {
    const data = readGuestImages();
    const now = Date.now();
    const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;
    const unlocked: GuestImageRecord[] = [];

    for (const img of Object.values(data)) {
        if (img.guestId === guestId && !img.unlocked && (now - img.createdAt) < TWENTY_FOUR_HOURS) {
            img.unlocked = true;
            img.userId = userId;
            unlocked.push(img);
        }
    }

    if (unlocked.length > 0) {
        writeGuestImages(data);
    }
    return unlocked;
}

/** Purge expired guest images (older than 24h, not unlocked) */
export function purgeExpiredGuestImages(): number {
    const data = readGuestImages();
    const now = Date.now();
    const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;
    let purged = 0;

    for (const [id, img] of Object.entries(data)) {
        if (!img.unlocked && (now - img.createdAt) > TWENTY_FOUR_HOURS) {
            // Delete image files from disk
            try {
                const imagesDir = path.join(process.cwd(), 'data', 'images');
                const origFile = path.join(imagesDir, path.basename(img.originalPath));
                const wmFile = path.join(imagesDir, path.basename(img.watermarkedPath));
                if (fs.existsSync(origFile)) fs.unlinkSync(origFile);
                if (fs.existsSync(wmFile)) fs.unlinkSync(wmFile);
            } catch {}
            delete data[id];
            purged++;
        }
    }

    if (purged > 0) {
        writeGuestImages(data);
    }
    return purged;
}
