/**
 * 週次バックアップレポート送信スクリプト
 * cron: 毎週月曜 9:00 AM (JST) = 日曜 24:00 UTC
 *
 * Usage: npx tsx scripts/weekly-backup-report.ts
 */

import fs from 'fs';
import path from 'path';
import { sendWeeklyBackupReport } from '../lib/email';

const DATA_DIR = path.join(process.cwd(), 'data');
const BACKUP_DIR = path.join(process.cwd(), 'backups');
const USERDATA_BACKUP_DIR = path.join(BACKUP_DIR, 'userdata');

function readJSON(filePath: string): unknown {
    try {
        if (!fs.existsSync(filePath)) return null;
        return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    } catch {
        return null;
    }
}

function getFileSize(filePath: string): string {
    try {
        const stats = fs.statSync(filePath);
        const kb = stats.size / 1024;
        if (kb < 1024) return `${kb.toFixed(1)} KB`;
        return `${(kb / 1024).toFixed(1)} MB`;
    } catch {
        return '0 KB';
    }
}

async function main() {
    console.log('[Weekly Report] Generating backup report...');

    // --- Users ---
    const usersData = readJSON(path.join(DATA_DIR, 'users.json')) as Record<string, { status?: string }> | null;
    const users = usersData ? Object.values(usersData) : [];
    const totalUsers = users.length;
    const activeUsers = users.filter(u => u.status === 'active').length;
    const bannedUsers = users.filter(u => u.status === 'banned').length;

    // --- Transactions ---
    const txData = readJSON(path.join(DATA_DIR, 'transactions.json')) as Record<string, { status?: string; amountUsd?: number }> | null;
    const transactions = txData ? Object.values(txData) : [];
    const completedTx = transactions.filter(t => t.status === 'completed');
    const totalTransactions = completedTx.length;
    const totalRevenue = completedTx.reduce((sum, t) => sum + (t.amountUsd || 0), 0);

    // --- Credit Usage ---
    const creditData = readJSON(path.join(DATA_DIR, 'credit_log.json')) as Record<string, { changeType?: string; delta?: number }> | null;
    const creditLogs = creditData ? Object.values(creditData) : [];
    const totalCreditsUsed = creditLogs
        .filter(l => l.changeType === 'use')
        .reduce((sum, l) => sum + Math.abs(l.delta || 0), 0);

    // --- Data Files ---
    const targetFiles = [
        'users.json', 'transactions.json', 'credit_log.json',
        'login_log.json', 'registration_attempts.json',
        'trusted_devices.json', 'bans.json', 'favorites.json',
        'generations.json',
    ];
    const dataFiles = targetFiles
        .filter(f => fs.existsSync(path.join(DATA_DIR, f)))
        .map(f => ({ name: f, size: getFileSize(path.join(DATA_DIR, f)) }));

    // --- Backup Files (this week) ---
    const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    let backupFiles: string[] = [];
    let backupTotalBytes = 0;

    // Check both backup dirs
    for (const dir of [BACKUP_DIR, USERDATA_BACKUP_DIR]) {
        if (!fs.existsSync(dir)) continue;
        const files = fs.readdirSync(dir).filter(f => f.endsWith('.tar.gz'));
        for (const file of files) {
            const fullPath = path.join(dir, file);
            const stats = fs.statSync(fullPath);
            if (stats.mtimeMs >= oneWeekAgo) {
                backupFiles.push(file);
                backupTotalBytes += stats.size;
            }
        }
    }

    const backupTotalSize = backupTotalBytes < 1024 * 1024
        ? `${(backupTotalBytes / 1024).toFixed(1)} KB`
        : `${(backupTotalBytes / (1024 * 1024)).toFixed(1)} MB`;

    // --- Send ---
    const success = await sendWeeklyBackupReport({
        totalUsers,
        activeUsers,
        bannedUsers,
        totalTransactions,
        totalRevenue,
        totalCreditsUsed,
        backupFiles,
        backupTotalSize,
        dataFiles,
    });

    if (success) {
        console.log('[Weekly Report] Report sent successfully.');
    } else {
        console.error('[Weekly Report] Failed to send report.');
        process.exit(1);
    }
}

main().catch(err => {
    console.error('[Weekly Report] Fatal error:', err);
    process.exit(1);
});
