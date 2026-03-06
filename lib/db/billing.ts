import fs from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';

// ============================================================
// Billing / Credit Records — Data Layer
// ============================================================

const TRANSACTIONS_FILE = path.join(process.cwd(), 'data', 'transactions.json');
const CREDIT_LOG_FILE = path.join(process.cwd(), 'data', 'credit_log.json');

// ----- Transaction Record (one per payment) -----

export type PackType = 'starter' | 'light' | 'standard' | 'premium' | 'basic' | 'unlimited';
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
// Transactions: File Helpers & CRUD
// ============================================================

function readTransactions(): Record<string, TransactionRecord> {
    if (!fs.existsSync(TRANSACTIONS_FILE)) return {};
    try {
        return JSON.parse(fs.readFileSync(TRANSACTIONS_FILE, 'utf8'));
    } catch {
        return {};
    }
}

function writeTransactions(data: Record<string, TransactionRecord>): void {
    const dir = path.dirname(TRANSACTIONS_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(TRANSACTIONS_FILE, JSON.stringify(data, null, 2));
}

export function createTransaction(
    record: Omit<TransactionRecord, 'id' | 'createdAt'>
): TransactionRecord {
    const transactions = readTransactions();
    const newRecord: TransactionRecord = {
        ...record,
        id: randomUUID(),
        createdAt: Date.now(),
    };
    transactions[newRecord.id] = newRecord;
    writeTransactions(transactions);
    return newRecord;
}

export function updateTransactionStatus(
    id: string,
    status: TransactionStatus
): TransactionRecord | null {
    const transactions = readTransactions();
    if (!transactions[id]) return null;
    transactions[id].status = status;
    if (status === 'completed') transactions[id].completedAt = Date.now();
    writeTransactions(transactions);
    return transactions[id];
}

export function getTransactionsByUser(
    userId: string,
    options: { limit?: number; offset?: number } = {}
): TransactionRecord[] {
    const { limit = 50, offset = 0 } = options;
    const transactions = readTransactions();
    return Object.values(transactions)
        .filter(t => t.userId === userId)
        .sort((a, b) => b.createdAt - a.createdAt)
        .slice(offset, offset + limit);
}

export function getTransactionById(id: string): TransactionRecord | null {
    const transactions = readTransactions();
    return transactions[id] ?? null;
}

// ============================================================
// Credit Log: File Helpers & CRUD
// ============================================================

function readCreditLog(): Record<string, CreditLogRecord> {
    if (!fs.existsSync(CREDIT_LOG_FILE)) return {};
    try {
        return JSON.parse(fs.readFileSync(CREDIT_LOG_FILE, 'utf8'));
    } catch {
        return {};
    }
}

function writeCreditLog(data: Record<string, CreditLogRecord>): void {
    const dir = path.dirname(CREDIT_LOG_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(CREDIT_LOG_FILE, JSON.stringify(data, null, 2));
}

export function recordCreditChange(
    record: Omit<CreditLogRecord, 'id' | 'createdAt'>
): CreditLogRecord {
    const log = readCreditLog();
    const newRecord: CreditLogRecord = {
        ...record,
        id: randomUUID(),
        createdAt: Date.now(),
    };
    log[newRecord.id] = newRecord;
    writeCreditLog(log);
    return newRecord;
}

export function getCreditLogByUser(
    userId: string,
    options: { limit?: number; offset?: number } = {}
): CreditLogRecord[] {
    const { limit = 100, offset = 0 } = options;
    const log = readCreditLog();
    return Object.values(log)
        .filter(l => l.userId === userId)
        .sort((a, b) => b.createdAt - a.createdAt)
        .slice(offset, offset + limit);
}
