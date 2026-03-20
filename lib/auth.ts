import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import fs from 'fs';
import path from 'path';
import { supabaseAdmin } from './supabase-server';

// ============================================================
// Auth Library — Password, JWT, OTP, User DB helpers
// ============================================================

const JWT_SECRET = process.env.JWT_SECRET || 'videogen-jwt-secret-change-in-production';
const SALT_ROUNDS = 10;
const OTP_EXPIRY_MS = 10 * 60 * 1000; // 10 minutes
const OTP_LOCK_MS = 30 * 60 * 1000;   // 30 minutes lock after 3 failures
const OTP_MAX_ATTEMPTS = 3;
const OTP_COOLDOWN_MS = 60 * 1000;     // 60 seconds resend cooldown

// ----- Disposable email domains -----
let disposableDomainsCache: Set<string> | null = null;

// ----- User DB Read/Write -----
export interface UserRecord {
    id: string;
    email: string;
    passwordHash: string;
    username: string;
    status: 'pending_otp' | 'pending_password' | 'pending_agreements' | 'pending_profile' | 'active' | 'age_restricted' | 'banned';
    emailVerified: boolean;
    dateOfBirth?: string;       // ISO date string
    country?: string;           // ISO 3166-1 alpha-2
    plan: string;
    credits: number;
    locale: string;
    theme: string;

    // OTP fields
    otpCode?: string;
    otpExpiresAt?: number;
    otpAttempts?: number;
    otpLockedUntil?: number;
    otpLastSentAt?: number;

    // Agreements
    agreements?: {
        termsOfService?: { agreedAt: number; version: string; ip: string };
        contentPolicy?: { agreedAt: number; version: string; ip: string };
        privacyPolicy?: { agreedAt: number; version: string; ip: string };
        ageConfirmation?: { agreedAt: number; version: string; ip: string };
        minorContentBan?: { agreedAt: number; version: string; ip: string };
        noRefund?: { agreedAt: number; version: string; ip: string };
        personalUseOnly?: { agreedAt: number; version: string; ip: string };
    };

    // First generation flag
    firstGenerationConfirmed: boolean;

    // Anti-Abuse Tracking
    fingerprintHash?: string;
    freeCreditsExpireAt?: number;
    registrationIp?: string;

    // Account timeline
    createdAt: number;
    updatedAt: number;
    lastLoginAt?: number;

    // Terms agreement record
    termsAgreedAt?: number;
    termsVersion?: string;   // e.g. '2025-01-01'

    // User preferences & settings
    settings?: {
        theme: 'dark' | 'light';
        locale: string;
        notifications: boolean;
        defaultGenSettings?: {
            model?: string;
            aspectRatio?: string;
            steps?: number;
            cfgScale?: number;
        };
        nsfwIntensity?: 'soft' | 'hard'; // Reserved for future use
    };

    // Device / MFA verification OTP (for high-risk logins — separate from registration OTP)
    deviceOtpCode?: string;
    deviceOtpExpiresAt?: number;
    deviceOtpAttempts?: number;
    deviceOtpLockedUntil?: number;
    // Tracks past country code for detecting geo-changes
    lastKnownCountry?: string;
    // Tracks failed password attempts for triggering MFA after 3 failures
    loginFailCount?: number;
    loginFailResetAt?: number;

    // Password Reset (Forgot Password)
    passwordResetOtp?: string;
    passwordResetExpiresAt?: number;
    passwordResetAttempts?: number;
    passwordResetLockedUntil?: number;
}

// ============================================================
// camelCase ↔ snake_case mapping helpers
// ============================================================

function dbRowToUserRecord(row: any): UserRecord {
    return {
        id: row.id,
        email: row.email,
        passwordHash: row.password_hash ?? '',
        username: row.username ?? '',
        status: row.status ?? 'active',
        emailVerified: row.email_verified ?? false,
        dateOfBirth: row.date_of_birth ?? undefined,
        country: row.country ?? undefined,
        plan: row.plan ?? 'free',
        credits: row.credits ?? 0,
        locale: row.locale ?? 'en',
        theme: row.theme ?? 'dark',
        otpCode: row.otp_code ?? undefined,
        otpExpiresAt: row.otp_expires_at ?? undefined,
        otpAttempts: row.otp_attempts ?? 0,
        otpLockedUntil: row.otp_locked_until ?? undefined,
        otpLastSentAt: row.otp_last_sent_at ?? undefined,
        agreements: row.agreements ?? undefined,
        firstGenerationConfirmed: row.first_generation_confirmed ?? false,
        fingerprintHash: row.fingerprint_hash ?? undefined,
        freeCreditsExpireAt: row.free_credits_expire_at ?? undefined,
        registrationIp: row.registration_ip ?? undefined,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        lastLoginAt: row.last_login_at ?? undefined,
        termsAgreedAt: row.terms_agreed_at ?? undefined,
        termsVersion: row.terms_version ?? undefined,
        settings: row.settings ?? undefined,
        deviceOtpCode: row.device_otp_code ?? undefined,
        deviceOtpExpiresAt: row.device_otp_expires_at ?? undefined,
        deviceOtpAttempts: row.device_otp_attempts ?? 0,
        deviceOtpLockedUntil: row.device_otp_locked_until ?? undefined,
        lastKnownCountry: row.last_known_country ?? undefined,
        loginFailCount: row.login_fail_count ?? 0,
        loginFailResetAt: row.login_fail_reset_at ?? undefined,
        passwordResetOtp: row.password_reset_otp ?? undefined,
        passwordResetExpiresAt: row.password_reset_expires_at ?? undefined,
        passwordResetAttempts: row.password_reset_attempts ?? 0,
        passwordResetLockedUntil: row.password_reset_locked_until ?? undefined,
    };
}

function userRecordToDbRow(user: UserRecord): Record<string, any> {
    return {
        id: user.id,
        email: user.email,
        password_hash: user.passwordHash,
        username: user.username,
        status: user.status,
        email_verified: user.emailVerified,
        date_of_birth: user.dateOfBirth ?? null,
        country: user.country ?? null,
        plan: user.plan,
        credits: user.credits,
        locale: user.locale,
        theme: user.theme,
        otp_code: user.otpCode ?? null,
        otp_expires_at: user.otpExpiresAt ?? null,
        otp_attempts: user.otpAttempts ?? 0,
        otp_locked_until: user.otpLockedUntil ?? null,
        otp_last_sent_at: user.otpLastSentAt ?? null,
        agreements: user.agreements ?? null,
        first_generation_confirmed: user.firstGenerationConfirmed,
        fingerprint_hash: user.fingerprintHash ?? null,
        free_credits_expire_at: user.freeCreditsExpireAt ?? null,
        registration_ip: user.registrationIp ?? null,
        created_at: user.createdAt,
        updated_at: user.updatedAt,
        last_login_at: user.lastLoginAt ?? null,
        terms_agreed_at: user.termsAgreedAt ?? null,
        terms_version: user.termsVersion ?? null,
        settings: user.settings ?? null,
        device_otp_code: user.deviceOtpCode ?? null,
        device_otp_expires_at: user.deviceOtpExpiresAt ?? null,
        device_otp_attempts: user.deviceOtpAttempts ?? 0,
        device_otp_locked_until: user.deviceOtpLockedUntil ?? null,
        last_known_country: user.lastKnownCountry ?? null,
        login_fail_count: user.loginFailCount ?? 0,
        login_fail_reset_at: user.loginFailResetAt ?? null,
        password_reset_otp: user.passwordResetOtp ?? null,
        password_reset_expires_at: user.passwordResetExpiresAt ?? null,
        password_reset_attempts: user.passwordResetAttempts ?? 0,
        password_reset_locked_until: user.passwordResetLockedUntil ?? null,
    };
}

// ============================================================
// Supabase-backed User CRUD
// ============================================================

export async function readUsers(): Promise<Record<string, UserRecord>> {
    const { data, error } = await supabaseAdmin.from('users').select('*');
    if (error) {
        console.error('[auth] readUsers error:', error.message);
        return {};
    }
    const result: Record<string, UserRecord> = {};
    for (const row of data ?? []) {
        result[row.id] = dbRowToUserRecord(row);
    }
    return result;
}

export async function findUserByEmail(email: string): Promise<UserRecord | null> {
    const { data, error } = await supabaseAdmin
        .from('users')
        .select('*')
        .eq('email', email.toLowerCase())
        .limit(1)
        .maybeSingle();
    if (error) {
        console.error('[auth] findUserByEmail error:', error.message);
        return null;
    }
    return data ? dbRowToUserRecord(data) : null;
}

export async function findUserById(id: string): Promise<UserRecord | null> {
    const { data, error } = await supabaseAdmin
        .from('users')
        .select('*')
        .eq('id', id)
        .maybeSingle();
    if (error) {
        console.error('[auth] findUserById error:', error.message);
        return null;
    }
    return data ? dbRowToUserRecord(data) : null;
}

export async function findUserByUsername(username: string): Promise<UserRecord | null> {
    const { data, error } = await supabaseAdmin
        .from('users')
        .select('*')
        .ilike('username', username)
        .limit(1)
        .maybeSingle();
    if (error) {
        console.error('[auth] findUserByUsername error:', error.message);
        return null;
    }
    return data ? dbRowToUserRecord(data) : null;
}

export async function saveUser(user: UserRecord): Promise<void> {
    const row = userRecordToDbRow({ ...user, updatedAt: Date.now() });
    const { error } = await supabaseAdmin
        .from('users')
        .upsert(row, { onConflict: 'id' });
    if (error) {
        console.error('[auth] saveUser error:', error.message);
    }
}

export async function deleteUser(userId: string): Promise<void> {
    const { error } = await supabaseAdmin
        .from('users')
        .delete()
        .eq('id', userId);
    if (error) {
        console.error('[auth] deleteUser error:', error.message);
    }
}

// ----- Password -----
export async function hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, SALT_ROUNDS);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
}

export function validatePasswordStrength(password: string): { valid: boolean; error?: string } {
    if (password.length < 8) return { valid: false, error: 'Password must be at least 8 characters' };
    if (!/[a-zA-Z]/.test(password)) return { valid: false, error: 'Password must contain at least one letter' };
    if (!/[0-9]/.test(password)) return { valid: false, error: 'Password must contain at least one number' };
    return { valid: true };
}

// ----- JWT -----
export function signToken(userId: string, email: string): string {
    return jwt.sign({ userId, email }, JWT_SECRET, { expiresIn: '7d' });
}

export function verifyToken(token: string): { userId: string; email: string } | null {
    try {
        const decoded = jwt.verify(token, JWT_SECRET) as { userId: string; email: string };
        return decoded;
    } catch {
        return null;
    }
}

export function extractToken(authHeader: string | null): string | null {
    if (!authHeader) return null;
    if (authHeader.startsWith('Bearer ')) return authHeader.slice(7);
    return null;
}

// ----- OTP -----
export function generateOTP(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

export function isOTPValid(user: UserRecord): { valid: boolean; error?: string } {
    if (user.otpLockedUntil && Date.now() < user.otpLockedUntil) {
        const remainingMin = Math.ceil((user.otpLockedUntil - Date.now()) / 60000);
        return { valid: false, error: `Too many attempts. Try again in ${remainingMin} minutes.` };
    }
    if (!user.otpCode || !user.otpExpiresAt) {
        return { valid: false, error: 'No verification code found. Please request a new one.' };
    }
    if (Date.now() > user.otpExpiresAt) {
        return { valid: false, error: 'Code expired. Please request a new one.' };
    }
    return { valid: true };
}

export function canResendOTP(user: UserRecord): boolean {
    if (!user.otpLastSentAt) return true;
    return Date.now() - user.otpLastSentAt >= OTP_COOLDOWN_MS;
}

export { OTP_EXPIRY_MS, OTP_LOCK_MS, OTP_MAX_ATTEMPTS, OTP_COOLDOWN_MS };

export function isDisposableEmail(email: string): boolean {
    if (!disposableDomainsCache) {
        try {
            const domainsFile = path.join(process.cwd(), 'data', 'disposable_domains.json');
            if (fs.existsSync(domainsFile)) {
                const domains = JSON.parse(fs.readFileSync(domainsFile, 'utf8')) as string[];
                disposableDomainsCache = new Set(domains.map(d => d.toLowerCase()));
            } else {
                disposableDomainsCache = new Set();
            }
        } catch (e) {
            console.error('Failed to load disposable domains:', e);
            disposableDomainsCache = new Set();
        }
    }
    const domain = email.split('@')[1]?.toLowerCase();
    return disposableDomainsCache.has(domain);
}

export function isValidEmail(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}
