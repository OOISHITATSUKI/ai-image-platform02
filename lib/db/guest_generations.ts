import fs from 'fs';
import path from 'path';

const GUEST_GENERATIONS_FILE = path.join(process.cwd(), 'data', 'guest_generations.json');

export interface GuestGenerationRecord {
    id: string;
    guestId: string;                     // IP address
    generationType: 'txt2img' | 'faceswap' | 'inpaint';
    prompt: string;
    tags: Record<string, unknown>;       // tagSettings (ethnicity, situation, breastSize, etc.)
    locale: string;                      // browser locale
    registered: boolean;                 // true after guest registers
    createdAt: number;                   // Unix ms
}

function readGuest(): Record<string, GuestGenerationRecord> {
    if (!fs.existsSync(GUEST_GENERATIONS_FILE)) return {};
    try {
        return JSON.parse(fs.readFileSync(GUEST_GENERATIONS_FILE, 'utf8'));
    } catch {
        return {};
    }
}

function writeGuest(data: Record<string, GuestGenerationRecord>): void {
    const dir = path.dirname(GUEST_GENERATIONS_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(GUEST_GENERATIONS_FILE, JSON.stringify(data));
}

export function saveGuestGeneration(record: GuestGenerationRecord): void {
    const data = readGuest();
    data[record.id] = record;
    writeGuest(data);
}

/** Mark all records for a guest IP as registered */
export function markGuestGenerationsRegistered(guestId: string): void {
    const data = readGuest();
    let changed = false;
    for (const record of Object.values(data)) {
        if (record.guestId === guestId && !record.registered) {
            record.registered = true;
            changed = true;
        }
    }
    if (changed) writeGuest(data);
}

export function getAllGuestGenerations(): GuestGenerationRecord[] {
    return Object.values(readGuest()).sort((a, b) => b.createdAt - a.createdAt);
}
