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
    // Q&A wizard data
    qaAnswers?: Record<string, string | null>;
    qaQuestions?: string[];
    qaCompleted?: boolean;
    qaSkippedCount?: number;
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

/** Count generations for a specific IP in the last 24 hours */
export function countGuestGenerationsLast24h(guestId: string): number {
    const cutoff = Date.now() - 24 * 60 * 60 * 1000;
    return Object.values(readGuest()).filter(
        r => r.guestId === guestId && r.createdAt >= cutoff
    ).length;
}

/** Count how many unique IPs hit the daily limit today */
export function countDailyLimitHits(dailyLimit: number): number {
    const now = new Date();
    const msToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const records = Object.values(readGuest());
    const ipCounts: Record<string, number> = {};
    for (const r of records) {
        if (r.createdAt >= msToday) {
            ipCounts[r.guestId] = (ipCounts[r.guestId] || 0) + 1;
        }
    }
    return Object.values(ipCounts).filter(c => c >= dailyLimit).length;
}
