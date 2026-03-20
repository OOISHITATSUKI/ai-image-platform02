/**
 * Execute remaining SQL migration via Supabase REST API
 * Run: npx tsx scripts/run-sql-migration.ts
 */

import fs from 'fs';
import path from 'path';

// Load .env
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

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false, autoRefreshToken: false },
});

const statements = [
    // credit_log
    `CREATE TABLE IF NOT EXISTS credit_log (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        change_type TEXT NOT NULL CHECK (change_type IN ('charge','use','refund','admin')),
        delta INTEGER NOT NULL,
        balance_after INTEGER NOT NULL,
        related_id TEXT,
        note TEXT,
        created_at BIGINT NOT NULL
    )`,
    `CREATE INDEX IF NOT EXISTS idx_credit_log_user ON credit_log(user_id, created_at DESC)`,
    `ALTER TABLE credit_log DISABLE ROW LEVEL SECURITY`,

    // transactions
    `CREATE TABLE IF NOT EXISTS transactions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        nowpayments_id TEXT,
        pack_type TEXT NOT NULL CHECK (pack_type IN ('standard','premium')),
        credits_granted INTEGER NOT NULL,
        amount_usd NUMERIC(10,2) NOT NULL,
        currency TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','confirming','completed','failed','expired')),
        created_at BIGINT NOT NULL,
        completed_at BIGINT
    )`,
    `CREATE INDEX IF NOT EXISTS idx_transactions_user ON transactions(user_id, created_at DESC)`,
    `CREATE INDEX IF NOT EXISTS idx_transactions_nowpayments ON transactions(nowpayments_id)`,
    `ALTER TABLE transactions DISABLE ROW LEVEL SECURITY`,

    // login_log
    `CREATE TABLE IF NOT EXISTS login_log (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID,
        email TEXT,
        ip_address TEXT,
        user_agent TEXT,
        success BOOLEAN NOT NULL,
        fail_reason TEXT,
        created_at BIGINT NOT NULL
    )`,
    `CREATE INDEX IF NOT EXISTS idx_login_log_user ON login_log(user_id, created_at DESC)`,
    `ALTER TABLE login_log DISABLE ROW LEVEL SECURITY`,

    // trusted_devices
    `CREATE TABLE IF NOT EXISTS trusted_devices (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        device_token TEXT NOT NULL,
        device_name TEXT,
        ip_address TEXT,
        country_code TEXT,
        last_used_at BIGINT NOT NULL,
        expires_at BIGINT NOT NULL,
        created_at BIGINT NOT NULL
    )`,
    `CREATE INDEX IF NOT EXISTS idx_trusted_devices_token ON trusted_devices(device_token)`,
    `CREATE INDEX IF NOT EXISTS idx_trusted_devices_user ON trusted_devices(user_id)`,
    `ALTER TABLE trusted_devices DISABLE ROW LEVEL SECURITY`,

    // registration_attempts
    `CREATE TABLE IF NOT EXISTS registration_attempts (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        ip_address TEXT NOT NULL,
        email TEXT NOT NULL,
        success BOOLEAN NOT NULL,
        created_at BIGINT NOT NULL
    )`,
    `CREATE INDEX IF NOT EXISTS idx_reg_attempts_ip ON registration_attempts(ip_address, created_at DESC)`,
    `ALTER TABLE registration_attempts DISABLE ROW LEVEL SECURITY`,

    // ip_bans
    `CREATE TABLE IF NOT EXISTS ip_bans (
        ip TEXT PRIMARY KEY,
        strikes INTEGER NOT NULL DEFAULT 0,
        permanent BOOLEAN NOT NULL DEFAULT FALSE,
        banned_until BIGINT,
        email TEXT,
        note TEXT,
        created_at BIGINT NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT
    )`,
    `ALTER TABLE ip_bans DISABLE ROW LEVEL SECURITY`,
];

async function run() {
    console.log('Executing remaining SQL statements via Supabase RPC...\n');

    for (let i = 0; i < statements.length; i++) {
        const sql = statements[i];
        const label = sql.substring(0, 60).replace(/\n/g, ' ').trim();
        process.stdout.write(`[${i + 1}/${statements.length}] ${label}... `);

        const { error } = await supabase.rpc('exec_sql', { query: sql });
        if (error) {
            // Try alternative: use the REST API directly
            const res = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'apikey': supabaseKey,
                    'Authorization': `Bearer ${supabaseKey}`,
                },
                body: JSON.stringify({ query: sql }),
            });
            if (!res.ok) {
                console.log(`SKIP (RPC not available, run manually in SQL Editor)`);
                continue;
            }
        }
        console.log('OK');
    }

    console.log('\nDone! If any statements were skipped, run them manually in SQL Editor.');
}

run().catch(err => { console.error(err); process.exit(1); });
