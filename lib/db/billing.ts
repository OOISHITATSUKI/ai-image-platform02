import { supabaseAdmin } from '../supabase-server';

// ============================================================
// Billing / Credit Records — Data Layer (Supabase)
// ============================================================

// ----- Transaction Record (one per payment) -----

export type PackType = 'standard' | 'premium';
export type TransactionStatus = 'pending' | 'confirming' | 'completed' | 'failed' | 'expired';

export interface TransactionRecord {
    id: string;                     // UUID
    userId: string;                 // FK → UserRecord.id
    nowpaymentsId?: string;         // NowPayments external reference ID
    packType: PackType;
    creditsGranted: number;
    amountUsd: number;
    currency: string;               // BTC / ETH / USDT / USDC etc.
    status: TransactionStatus;
    createdAt: number;              // Unix ms
    completedAt?: number;           // Unix ms (set when status = completed)
}

// ----- Credit Log Record (balance change per event) -----

export type CreditChangeType = 'charge' | 'use' | 'refund' | 'admin';

export interface CreditLogRecord {
    id: string;
    userId: string;                 // FK → UserRecord.id
    changeType: CreditChangeType;
    delta: number;                  // Positive = credit, negative = debit (e.g. +50, -5)
    balanceAfter: number;           // Credit balance after this change
    relatedId?: string;             // transactionId or generationId
    note?: string;                  // Optional human-readable note (admin ops)
    createdAt: number;              // Unix ms
}

// ============================================================
// DB row ↔ TypeScript mapping
// ============================================================

function rowToTransaction(row: any): TransactionRecord {
    return {
        id: row.id,
        userId: row.user_id,
        nowpaymentsId: row.nowpayments_id ?? undefined,
        packType: row.pack_type,
        creditsGranted: row.credits_granted,
        amountUsd: Number(row.amount_usd),
        currency: row.currency,
        status: row.status,
        createdAt: row.created_at,
        completedAt: row.completed_at ?? undefined,
    };
}

function rowToCreditLog(row: any): CreditLogRecord {
    return {
        id: row.id,
        userId: row.user_id,
        changeType: row.change_type,
        delta: row.delta,
        balanceAfter: row.balance_after,
        relatedId: row.related_id ?? undefined,
        note: row.note ?? undefined,
        createdAt: row.created_at,
    };
}

// ============================================================
// Transactions: CRUD
// ============================================================

export async function createTransaction(
    record: Omit<TransactionRecord, 'id' | 'createdAt'>
): Promise<TransactionRecord> {
    const row = {
        user_id: record.userId,
        nowpayments_id: record.nowpaymentsId ?? null,
        pack_type: record.packType,
        credits_granted: record.creditsGranted,
        amount_usd: record.amountUsd,
        currency: record.currency,
        status: record.status,
        created_at: Date.now(),
        completed_at: record.completedAt ?? null,
    };
    const { data, error } = await supabaseAdmin
        .from('transactions')
        .insert(row)
        .select()
        .single();
    if (error) {
        console.error('[billing] createTransaction error:', error.message);
        throw error;
    }
    return rowToTransaction(data);
}

export async function updateTransactionStatus(
    id: string,
    status: TransactionStatus
): Promise<TransactionRecord | null> {
    const updates: any = { status };
    if (status === 'completed') updates.completed_at = Date.now();
    const { data, error } = await supabaseAdmin
        .from('transactions')
        .update(updates)
        .eq('id', id)
        .select()
        .maybeSingle();
    if (error) {
        console.error('[billing] updateTransactionStatus error:', error.message);
        return null;
    }
    return data ? rowToTransaction(data) : null;
}

export async function getTransactionsByUser(
    userId: string,
    options: { limit?: number; offset?: number } = {}
): Promise<TransactionRecord[]> {
    const { limit = 50, offset = 0 } = options;
    const { data, error } = await supabaseAdmin
        .from('transactions')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);
    if (error) {
        console.error('[billing] getTransactionsByUser error:', error.message);
        return [];
    }
    return (data ?? []).map(rowToTransaction);
}

export async function getTransactionById(id: string): Promise<TransactionRecord | null> {
    const { data, error } = await supabaseAdmin
        .from('transactions')
        .select('*')
        .eq('id', id)
        .maybeSingle();
    if (error) {
        console.error('[billing] getTransactionById error:', error.message);
        return null;
    }
    return data ? rowToTransaction(data) : null;
}

// ============================================================
// Credit Log: CRUD
// ============================================================

export async function recordCreditChange(
    record: Omit<CreditLogRecord, 'id' | 'createdAt'>
): Promise<CreditLogRecord> {
    const row = {
        user_id: record.userId,
        change_type: record.changeType,
        delta: record.delta,
        balance_after: record.balanceAfter,
        related_id: record.relatedId ?? null,
        note: record.note ?? null,
        created_at: Date.now(),
    };
    const { data, error } = await supabaseAdmin
        .from('credit_log')
        .insert(row)
        .select()
        .single();
    if (error) {
        console.error('[billing] recordCreditChange error:', error.message);
        throw error;
    }
    return rowToCreditLog(data);
}

export async function getCreditLogByUser(
    userId: string,
    options: { limit?: number; offset?: number } = {}
): Promise<CreditLogRecord[]> {
    const { limit = 100, offset = 0 } = options;
    const { data, error } = await supabaseAdmin
        .from('credit_log')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);
    if (error) {
        console.error('[billing] getCreditLogByUser error:', error.message);
        return [];
    }
    return (data ?? []).map(rowToCreditLog);
}
