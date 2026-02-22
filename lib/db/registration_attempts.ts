import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

export interface RegistrationAttemptRecord {
    id: string;
    ipAddress: string;
    email: string;
    success: boolean;
    createdAt: number;
}

const REGISTRATION_FILE = path.join(process.cwd(), 'data', 'registration_attempts.json');

function readAttempts(): Record<string, RegistrationAttemptRecord> {
    if (!fs.existsSync(REGISTRATION_FILE)) return {};
    try {
        return JSON.parse(fs.readFileSync(REGISTRATION_FILE, 'utf8'));
    } catch {
        return {};
    }
}

function writeAttempts(attempts: Record<string, RegistrationAttemptRecord>): void {
    const dir = path.dirname(REGISTRATION_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(REGISTRATION_FILE, JSON.stringify(attempts, null, 2));
}

export function logRegistrationAttempt(ipAddress: string, email: string, success: boolean): void {
    const attempts = readAttempts();
    const newAttempt: RegistrationAttemptRecord = {
        id: crypto.randomUUID(),
        ipAddress,
        email,
        success,
        createdAt: Date.now()
    };
    attempts[newAttempt.id] = newAttempt;

    // Optional: cleanup old attempts (older than 7 days) to save space
    const now = Date.now();
    const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000;
    for (const [id, record] of Object.entries(attempts)) {
        if (now - record.createdAt > SEVEN_DAYS) {
            delete attempts[id];
        }
    }

    writeAttempts(attempts);
}

export function countRecentAttemptsByIp(ipAddress: string, timeWindowMs: number): number {
    const attempts = readAttempts();
    const now = Date.now();
    let count = 0;
    for (const record of Object.values(attempts)) {
        if (record.ipAddress === ipAddress && (now - record.createdAt) <= timeWindowMs) {
            count++;
        }
    }
    return count;
}
