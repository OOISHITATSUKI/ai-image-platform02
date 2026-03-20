/**
 * One-time migration script: JSON files → Supabase
 * Run: npx tsx scripts/migrate-json-to-supabase.ts
 *
 * Prerequisites:
 * 1. Run supabase_migration_users.sql in Supabase SQL Editor first
 * 2. Ensure SUPABASE_SERVICE_ROLE_KEY is set in .env
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
// Load .env manually
const envContent = fs.readFileSync(path.join(process.cwd(), '.env'), 'utf8');
for (const line of envContent.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const val = trimmed.slice(eqIdx + 1).trim();
    if (!process.env[key]) process.env[key] = val;
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false, autoRefreshToken: false },
});

const DATA_DIR = path.join(process.cwd(), 'data');

function readJson(filename: string): Record<string, any> {
    const filepath = path.join(DATA_DIR, filename);
    if (!fs.existsSync(filepath)) {
        console.log(`  ⚠ ${filename} not found, skipping`);
        return {};
    }
    try {
        return JSON.parse(fs.readFileSync(filepath, 'utf8'));
    } catch {
        console.log(`  ⚠ ${filename} parse error, skipping`);
        return {};
    }
}

async function migrateUsers() {
    console.log('\n=== Migrating users ===');
    const users = readJson('users.json');
    const rows = Object.values(users).map((u: any) => ({
        id: u.id,
        email: u.email,
        password_hash: u.passwordHash ?? '',
        username: u.username ?? '',
        status: u.status ?? 'active',
        email_verified: u.emailVerified ?? false,
        date_of_birth: u.dateOfBirth ?? null,
        country: u.country ?? null,
        plan: u.plan ?? 'free',
        credits: u.credits ?? 0,
        locale: u.locale ?? 'en',
        theme: u.theme ?? 'dark',
        otp_code: u.otpCode ?? null,
        otp_expires_at: u.otpExpiresAt ?? null,
        otp_attempts: u.otpAttempts ?? 0,
        otp_locked_until: u.otpLockedUntil ?? null,
        otp_last_sent_at: u.otpLastSentAt ?? null,
        agreements: u.agreements ?? null,
        first_generation_confirmed: u.firstGenerationConfirmed ?? false,
        fingerprint_hash: u.fingerprintHash ?? null,
        free_credits_expire_at: u.freeCreditsExpireAt ?? null,
        registration_ip: u.registrationIp ?? null,
        created_at: u.createdAt,
        updated_at: u.updatedAt,
        last_login_at: u.lastLoginAt ?? null,
        terms_agreed_at: u.termsAgreedAt ?? null,
        terms_version: u.termsVersion ?? null,
        settings: u.settings ?? null,
        device_otp_code: u.deviceOtpCode ?? null,
        device_otp_expires_at: u.deviceOtpExpiresAt ?? null,
        device_otp_attempts: u.deviceOtpAttempts ?? 0,
        device_otp_locked_until: u.deviceOtpLockedUntil ?? null,
        last_known_country: u.lastKnownCountry ?? null,
        login_fail_count: u.loginFailCount ?? 0,
        login_fail_reset_at: u.loginFailResetAt ?? null,
        password_reset_otp: u.passwordResetOtp ?? null,
        password_reset_expires_at: u.passwordResetExpiresAt ?? null,
        password_reset_attempts: u.passwordResetAttempts ?? 0,
        password_reset_locked_until: u.passwordResetLockedUntil ?? null,
    }));

    if (rows.length === 0) {
        console.log('  No users to migrate');
        return;
    }

    const { error } = await supabase.from('users').upsert(rows, { onConflict: 'id' });
    if (error) {
        console.error('  ✗ Users migration error:', error.message);
    } else {
        console.log(`  ✓ Migrated ${rows.length} users`);
    }
}

async function migrateCreditLog() {
    console.log('\n=== Migrating credit_log ===');
    const log = readJson('credit_log.json');
    const rows = Object.values(log).map((r: any) => ({
        id: r.id,
        user_id: r.userId,
        change_type: r.changeType,
        delta: r.delta,
        balance_after: r.balanceAfter,
        related_id: r.relatedId ?? null,
        note: r.note ?? null,
        created_at: r.createdAt,
    }));

    if (rows.length === 0) {
        console.log('  No credit_log entries to migrate');
        return;
    }

    const { error } = await supabase.from('credit_log').upsert(rows, { onConflict: 'id' });
    if (error) {
        console.error('  ✗ Credit log migration error:', error.message);
    } else {
        console.log(`  ✓ Migrated ${rows.length} credit_log entries`);
    }
}

async function migrateTransactions() {
    console.log('\n=== Migrating transactions ===');
    const txns = readJson('transactions.json');
    const rows = Object.values(txns).map((t: any) => ({
        id: t.id,
        user_id: t.userId,
        nowpayments_id: t.nowpaymentsId ?? null,
        pack_type: t.packType,
        credits_granted: t.creditsGranted,
        amount_usd: t.amountUsd,
        currency: t.currency,
        status: t.status,
        created_at: t.createdAt,
        completed_at: t.completedAt ?? null,
    }));

    if (rows.length === 0) {
        console.log('  No transactions to migrate');
        return;
    }

    const { error } = await supabase.from('transactions').upsert(rows, { onConflict: 'id' });
    if (error) {
        console.error('  ✗ Transactions migration error:', error.message);
    } else {
        console.log(`  ✓ Migrated ${rows.length} transactions`);
    }
}

async function migrateLoginLog() {
    console.log('\n=== Migrating login_log ===');
    const log = readJson('login_log.json');
    const rows = Object.values(log).map((r: any) => ({
        id: r.id,
        user_id: r.userId ?? null,
        email: r.email ?? null,
        ip_address: r.ipAddress ?? null,
        user_agent: r.userAgent ?? null,
        success: r.success,
        fail_reason: r.failReason ?? null,
        created_at: r.createdAt,
    }));

    if (rows.length === 0) {
        console.log('  No login_log entries to migrate');
        return;
    }

    const { error } = await supabase.from('login_log').upsert(rows, { onConflict: 'id' });
    if (error) {
        console.error('  ✗ Login log migration error:', error.message);
    } else {
        console.log(`  ✓ Migrated ${rows.length} login_log entries`);
    }
}

async function migrateTrustedDevices() {
    console.log('\n=== Migrating trusted_devices ===');
    const devices = readJson('trusted_devices.json');
    const rows = Object.values(devices).map((d: any) => ({
        id: d.id,
        user_id: d.userId,
        device_token: d.deviceToken,
        device_name: d.deviceName ?? null,
        ip_address: d.ipAddress ?? null,
        country_code: d.countryCode ?? null,
        last_used_at: d.lastUsedAt,
        expires_at: d.expiresAt,
        created_at: d.createdAt,
    }));

    if (rows.length === 0) {
        console.log('  No trusted_devices to migrate');
        return;
    }

    const { error } = await supabase.from('trusted_devices').upsert(rows, { onConflict: 'id' });
    if (error) {
        console.error('  ✗ Trusted devices migration error:', error.message);
    } else {
        console.log(`  ✓ Migrated ${rows.length} trusted_devices`);
    }
}

async function migrateRegistrationAttempts() {
    console.log('\n=== Migrating registration_attempts ===');
    const attempts = readJson('registration_attempts.json');
    const rows = Object.values(attempts).map((a: any) => ({
        id: a.id,
        ip_address: a.ipAddress,
        email: a.email,
        success: a.success,
        created_at: a.createdAt,
    }));

    if (rows.length === 0) {
        console.log('  No registration_attempts to migrate');
        return;
    }

    const { error } = await supabase.from('registration_attempts').upsert(rows, { onConflict: 'id' });
    if (error) {
        console.error('  ✗ Registration attempts migration error:', error.message);
    } else {
        console.log(`  ✓ Migrated ${rows.length} registration_attempts`);
    }
}

async function migrateIpBans() {
    console.log('\n=== Migrating ip_bans ===');
    const bansData = readJson('bans.json');
    const ipBans = bansData.ips || bansData;

    const rows: any[] = [];
    for (const [ip, ban] of Object.entries(ipBans as Record<string, any>)) {
        if (typeof ban !== 'object') continue;
        rows.push({
            ip,
            strikes: ban.strikes ?? 0,
            permanent: ban.permanent ?? false,
            banned_until: ban.bannedUntil ?? null,
            email: ban.email ?? null,
            note: ban.note ?? null,
            created_at: ban.createdAt ?? Date.now(),
        });
    }

    if (rows.length === 0) {
        console.log('  No ip_bans to migrate');
        return;
    }

    const { error } = await supabase.from('ip_bans').upsert(rows, { onConflict: 'ip' });
    if (error) {
        console.error('  ✗ IP bans migration error:', error.message);
    } else {
        console.log(`  ✓ Migrated ${rows.length} ip_bans`);
    }
}

async function migrateSavedFaces() {
    console.log('\n=== Migrating saved_faces ===');
    const faces = readJson('saved_faces.json');
    const rows = Object.values(faces).map((f: any) => ({
        id: f.id,
        user_id: f.userId,
        name: f.name,
        image_url: f.imageUrl,
        thumbnail_url: f.thumbnailUrl,
        is_active: f.isActive ?? false,
        created_at: f.createdAt,
    }));

    if (rows.length === 0) {
        console.log('  No saved_faces to migrate');
        return;
    }

    const { error } = await supabase.from('saved_faces').upsert(rows, { onConflict: 'id' });
    if (error) {
        console.error('  ✗ Saved faces migration error:', error.message);
    } else {
        console.log(`  ✓ Migrated ${rows.length} saved_faces`);
    }
}

// ============================================================
// Main
// ============================================================

async function main() {
    console.log('Starting JSON → Supabase migration...');
    console.log(`Supabase URL: ${supabaseUrl}`);
    console.log(`Data dir: ${DATA_DIR}`);

    // Users must be migrated first (FK dependencies)
    await migrateUsers();

    // Then dependent tables
    await migrateCreditLog();
    await migrateTransactions();
    await migrateLoginLog();
    await migrateTrustedDevices();
    await migrateRegistrationAttempts();
    await migrateIpBans();
    await migrateSavedFaces();

    console.log('\n=== Migration complete ===');
}

main().catch((err) => {
    console.error('Migration failed:', err);
    process.exit(1);
});
