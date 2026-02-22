import fs from 'fs';
import path from 'path';

export interface BlockLog {
    timestamp: string;
    user_id: string; // "guest" or actual id if authenticated
    ip_address: string;
    blocked_prompt: string;
    matched_rule: string;
    action_taken: 'warning' | 'temp_ban' | 'permanent_ban';
}

const LOGS_DIR = path.join(process.cwd(), 'logs');
const DATA_DIR = path.join(process.cwd(), 'data');
const LOG_FILE = path.join(LOGS_DIR, 'security.jsonl');
const BANS_FILE = path.join(DATA_DIR, 'bans.json');

// Ensure directories exist
if (!fs.existsSync(LOGS_DIR)) fs.mkdirSync(LOGS_DIR, { recursive: true });
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(BANS_FILE)) fs.writeFileSync(BANS_FILE, JSON.stringify({ ips: {}, users: {} }));

export interface BanState {
    ips: Record<string, { strikes: number; bannedUntil?: number; permanent?: boolean }>;
    users: Record<string, { strikes: number; bannedUntil?: number; permanent?: boolean }>;
}

export function logBlockEvent(log: BlockLog) {
    fs.appendFileSync(LOG_FILE, JSON.stringify(log) + '\n');
}

export function checkBanStatus(ip: string, userId: string = 'guest'): { banned: boolean; reason?: string } {
    try {
        const state: BanState = JSON.parse(fs.readFileSync(BANS_FILE, 'utf8'));
        const now = Date.now();

        // Check IP
        const ipRecord = state.ips[ip];
        if (ipRecord) {
            if (ipRecord.permanent) return { banned: true, reason: 'Permanent IP Ban' };
            if (ipRecord.bannedUntil && ipRecord.bannedUntil > now) return { banned: true, reason: 'Temporary IP Ban' };
        }

        // Check User
        if (userId !== 'guest') {
            const userRecord = state.users[userId];
            if (userRecord) {
                if (userRecord.permanent) return { banned: true, reason: 'Permanent User Ban' };
                if (userRecord.bannedUntil && userRecord.bannedUntil > now) return { banned: true, reason: 'Temporary User Ban' };
            }
        }
    } catch (e) { /* ignore parse errors */ }

    return { banned: false };
}

export function processViolation(ip: string, userId: string, rule: string, prompt: string): 'warning' | 'temp_ban' | 'permanent_ban' {
    let action: 'warning' | 'temp_ban' | 'permanent_ban' = 'warning';

    try {
        const state: BanState = JSON.parse(fs.readFileSync(BANS_FILE, 'utf8'));
        const now = Date.now();

        // 1. Check if it's an egregious Cat 7 direct target (fast path to perma-ban)
        // Hardcode a check for some severe keywords, or just rely on strike count for now

        // Increment strikes
        if (!state.ips[ip]) state.ips[ip] = { strikes: 0 };
        state.ips[ip].strikes += 1;

        if (userId !== 'guest') {
            if (!state.users[userId]) state.users[userId] = { strikes: 0 };
            state.users[userId].strikes += 1;
        }

        const totalStrikes = state.ips[ip].strikes;

        // Auto-ban logic: 5 strikes within 24 hours = temp ban. (strikes aren't decaying here yet, keeping it simple for MVP)
        // If they bypass the temp ban and get more strikes, perma ban.
        if (rule.includes('Category 7') && totalStrikes === 1) {
            action = 'warning'; // First time cat 7 is a warning
        }

        if (totalStrikes >= 3 && totalStrikes < 5) {
            // 3+ strikes is a temp ban
            state.ips[ip].bannedUntil = now + (24 * 60 * 60 * 1000);
            if (userId !== 'guest') state.users[userId].bannedUntil = now + (24 * 60 * 60 * 1000);
            action = 'temp_ban';
        } else if (totalStrikes >= 5) {
            // 5+ strikes is a perma ban
            state.ips[ip].permanent = true;
            if (userId !== 'guest') state.users[userId].permanent = true;
            action = 'permanent_ban';
        }

        fs.writeFileSync(BANS_FILE, JSON.stringify(state, null, 2));

        // Log the event
        logBlockEvent({
            timestamp: new Date().toISOString(),
            user_id: userId,
            ip_address: ip,
            blocked_prompt: prompt,
            matched_rule: rule,
            action_taken: action
        });

    } catch (e) { console.error('Error processing violation', e); }

    return action;
}
