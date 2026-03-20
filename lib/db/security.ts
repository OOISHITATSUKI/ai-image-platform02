import fs from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';
import { supabaseAdmin } from '../supabase-server';

// ============================================================
// Security Logs — Filter Blocks (file) & Login Logs (Supabase)
// ============================================================

const FILTER_BLOCKS_FILE = path.join(process.cwd(), 'data', 'filter_blocks.json');

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
// Filter Blocks: File-based (unchanged)
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
// Login Log: Supabase-backed
// ============================================================

function rowToLoginLog(row: any): LoginLogRecord {
    return {
        id: row.id,
        userId: row.user_id ?? undefined,
        email: row.email ?? undefined,
        ipAddress: row.ip_address ?? undefined,
        userAgent: row.user_agent ?? undefined,
        success: row.success,
        failReason: row.fail_reason ?? undefined,
        createdAt: row.created_at,
    };
}

export async function logLoginAttempt(
    record: Omit<LoginLogRecord, 'id' | 'createdAt'>
): Promise<LoginLogRecord> {
    const row = {
        user_id: record.userId ?? null,
        email: record.email ?? null,
        ip_address: record.ipAddress ?? null,
        user_agent: record.userAgent ?? null,
        success: record.success,
        fail_reason: record.failReason ?? null,
        created_at: Date.now(),
    };
    const { data, error } = await supabaseAdmin
        .from('login_log')
        .insert(row)
        .select()
        .single();
    if (error) {
        console.error('[security] logLoginAttempt error:', error.message);
        // Return a fallback record
        return { ...record, id: randomUUID(), createdAt: Date.now() };
    }
    return rowToLoginLog(data);
}

export async function getLoginLogByUser(userId: string, limit = 50): Promise<LoginLogRecord[]> {
    const { data, error } = await supabaseAdmin
        .from('login_log')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);
    if (error) {
        console.error('[security] getLoginLogByUser error:', error.message);
        return [];
    }
    return (data ?? []).map(rowToLoginLog);
}

/** Purge login logs older than 30 days */
export async function purgeOldLoginLogs(): Promise<number> {
    const cutoff = Date.now() - LOGIN_LOG_TTL_MS;
    const { data, error } = await supabaseAdmin
        .from('login_log')
        .delete()
        .lt('created_at', cutoff)
        .select('id');
    if (error) {
        console.error('[security] purgeOldLoginLogs error:', error.message);
        return 0;
    }
    return data?.length ?? 0;
}
