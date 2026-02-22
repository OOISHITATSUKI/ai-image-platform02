import fs from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';

// ============================================================
// Security Logs — Filter Blocks & Login Logs
// ============================================================

const FILTER_BLOCKS_FILE = path.join(process.cwd(), 'data', 'filter_blocks.json');
const LOGIN_LOG_FILE = path.join(process.cwd(), 'data', 'login_log.json');

// Retention policy
const FILTER_BLOCK_TTL_MS = 90 * 24 * 60 * 60 * 1000;  // 90 days
const LOGIN_LOG_TTL_MS = 30 * 24 * 60 * 60 * 1000;   // 30 days

// ----- Filter Block Record -----

export type FilterBlockAction = 'warning' | 'temp_ban' | 'permanent_ban';

export interface FilterBlockRecord {
    id: string;
    userId?: string;                // May be undefined for unauthenticated users
    prompt: string;                 // Full prompt text that was blocked
    hitCategory: number;            // 1–9 content category number
    hitRule: string;                // Rule name that triggered the block
    action: FilterBlockAction;
    ipAddress?: string;
    createdAt: number;              // Unix ms
}

// ----- Login Log Record -----

export interface LoginLogRecord {
    id: string;
    userId?: string;                // May be undefined if user not found
    email?: string;                 // For failed attempts where userId is unknown
    ipAddress?: string;
    userAgent?: string;
    success: boolean;
    failReason?: string;            // e.g. 'invalid_password', 'account_suspended'
    createdAt: number;              // Unix ms
}

// ============================================================
// Filter Blocks: File Helpers & CRUD
// ============================================================

function readFilterBlocks(): Record<string, FilterBlockRecord> {
    if (!fs.existsSync(FILTER_BLOCKS_FILE)) return {};
    try {
        return JSON.parse(fs.readFileSync(FILTER_BLOCKS_FILE, 'utf8'));
    } catch {
        return {};
    }
}

function writeFilterBlocks(data: Record<string, FilterBlockRecord>): void {
    const dir = path.dirname(FILTER_BLOCKS_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(FILTER_BLOCKS_FILE, JSON.stringify(data, null, 2));
}

export function logFilterBlock(
    record: Omit<FilterBlockRecord, 'id' | 'createdAt'>
): FilterBlockRecord {
    const blocks = readFilterBlocks();
    const newRecord: FilterBlockRecord = {
        ...record,
        id: randomUUID(),
        createdAt: Date.now(),
    };
    blocks[newRecord.id] = newRecord;
    writeFilterBlocks(blocks);
    return newRecord;
}

export function getFilterBlocksByUser(userId: string, limit = 100): FilterBlockRecord[] {
    const blocks = readFilterBlocks();
    return Object.values(blocks)
        .filter(b => b.userId === userId)
        .sort((a, b) => b.createdAt - a.createdAt)
        .slice(0, limit);
}

/** Purge filter block logs older than 90 days */
export function purgeOldFilterBlocks(): number {
    const blocks = readFilterBlocks();
    const cutoff = Date.now() - FILTER_BLOCK_TTL_MS;
    let purged = 0;
    for (const [id, record] of Object.entries(blocks)) {
        if (record.createdAt < cutoff) {
            delete blocks[id];
            purged++;
        }
    }
    if (purged > 0) writeFilterBlocks(blocks);
    return purged;
}

// ============================================================
// Login Log: File Helpers & CRUD
// ============================================================

function readLoginLog(): Record<string, LoginLogRecord> {
    if (!fs.existsSync(LOGIN_LOG_FILE)) return {};
    try {
        return JSON.parse(fs.readFileSync(LOGIN_LOG_FILE, 'utf8'));
    } catch {
        return {};
    }
}

function writeLoginLog(data: Record<string, LoginLogRecord>): void {
    const dir = path.dirname(LOGIN_LOG_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(LOGIN_LOG_FILE, JSON.stringify(data, null, 2));
}

export function logLoginAttempt(
    record: Omit<LoginLogRecord, 'id' | 'createdAt'>
): LoginLogRecord {
    const log = readLoginLog();
    const newRecord: LoginLogRecord = {
        ...record,
        id: randomUUID(),
        createdAt: Date.now(),
    };
    log[newRecord.id] = newRecord;
    writeLoginLog(log);
    return newRecord;
}

export function getLoginLogByUser(userId: string, limit = 50): LoginLogRecord[] {
    const log = readLoginLog();
    return Object.values(log)
        .filter(l => l.userId === userId)
        .sort((a, b) => b.createdAt - a.createdAt)
        .slice(0, limit);
}

/** Purge login logs older than 30 days */
export function purgeOldLoginLogs(): number {
    const log = readLoginLog();
    const cutoff = Date.now() - LOGIN_LOG_TTL_MS;
    let purged = 0;
    for (const [id, record] of Object.entries(log)) {
        if (record.createdAt < cutoff) {
            delete log[id];
            purged++;
        }
    }
    if (purged > 0) writeLoginLog(log);
    return purged;
}
