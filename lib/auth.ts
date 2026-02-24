import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import fs from 'fs';
import path from 'path';

// ============================================================
// Auth Library — Password, JWT, OTP, User DB helpers
// ============================================================

const USERS_FILE = path.join(process.cwd(), 'data', 'users.json');
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

export function readUsers(): Record<string, UserRecord> {
    if (!fs.existsSync(USERS_FILE)) return {};
    try {
        return JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
    } catch {
        return {};
    }
}

export function writeUsers(data: Record<string, UserRecord>): void {
    const dir = path.dirname(USERS_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(USERS_FILE, JSON.stringify(data, null, 2));
}

export function findUserByEmail(email: string): UserRecord | null {
    const users = readUsers();
    return Object.values(users).find(u => u.email === email.toLowerCase()) || null;
}

export function findUserById(id: string): UserRecord | null {
    const users = readUsers();
    return users[id] || null;
}

export function findUserByUsername(username: string): UserRecord | null {
    const users = readUsers();
    return Object.values(users).find(u => u.username?.toLowerCase() === username.toLowerCase()) || null;
}

export function saveUser(user: UserRecord): void {
    const users = readUsers();
    users[user.id] = { ...user, updatedAt: Date.now() };
    writeUsers(users);
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
