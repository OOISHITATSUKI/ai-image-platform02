import { NextRequest, NextResponse } from 'next/server';
import { findUserByEmail, saveUser } from '@/lib/auth';
import nodemailer from 'nodemailer';

const SMTP_HOST = process.env.SMTP_HOST || '';
const SMTP_PORT = Number(process.env.SMTP_PORT) || 587;
const SMTP_USER = process.env.SMTP_USER || '';
const SMTP_PASS = process.env.SMTP_PASS || '';
const SMTP_FROM = process.env.SMTP_FROM || 'noreply@example.com';

const OTP_EXPIRY_MS = 10 * 60 * 1000; // 10 minutes
const MAX_RESET_ATTEMPTS = 5;
const RESET_LOCKOUT_MS = 24 * 60 * 60 * 1000; // 24 hours

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { email } = body;

        if (!email) {
            return NextResponse.json({ error: 'Email is required' }, { status: 400 });
        }

        const normalizedEmail = email.toLowerCase().trim();
        const user = findUserByEmail(normalizedEmail);

        // Security best practice: don't reveal if user exists, just return success immediately
        // BUT for a better UX (assuming small scale or less strict threat model), we'll return an error if not found.
        if (!user) {
            return NextResponse.json({ error: 'Account not found' }, { status: 404 });
        }

        const now = Date.now();

        // Check if locked out
        if (user.passwordResetLockedUntil && now < user.passwordResetLockedUntil) {
            return NextResponse.json(
                { error: '一時的にロックされています。24時間後にもう一度お試しください。' },
                { status: 429 }
            );
        }

        // Increment attempts, locking out if >= MAX
        // Reset attempts count if the last attempt was over 24 hours ago
        if (user.passwordResetAttempts && user.passwordResetLockedUntil && now > user.passwordResetLockedUntil) {
            user.passwordResetAttempts = 0;
            user.passwordResetLockedUntil = undefined;
        }

        user.passwordResetAttempts = (user.passwordResetAttempts || 0) + 1;

        if (user.passwordResetAttempts >= MAX_RESET_ATTEMPTS) {
            user.passwordResetLockedUntil = now + RESET_LOCKOUT_MS;
            saveUser(user);
            return NextResponse.json(
                { error: '一時的にロックされています。24時間後にもう一度お試しください。' },
                { status: 429 }
            );
        }

        // Generate 6-digit OTP
        const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
        user.passwordResetOtp = otpCode;
        user.passwordResetExpiresAt = now + OTP_EXPIRY_MS;

        saveUser(user);

        // Send email
        if (SMTP_HOST && SMTP_USER && SMTP_PASS) {
            const transporter = nodemailer.createTransport({
                host: SMTP_HOST,
                port: SMTP_PORT,
                secure: SMTP_PORT === 465,
                auth: { user: SMTP_USER, pass: SMTP_PASS },
                // Allow self-signed for dev
                tls: { rejectUnauthorized: false }
            });

            const htmlContent = `
                <div style="font-family: sans-serif; background-color: #f4f4f4; padding: 20px;">
                    <div style="max-width: 600px; background: white; padding: 30px; border-radius: 8px; margin: auto;">
                        <h2 style="color: #333;">アカウント パスワードリセット</h2>
                        <p style="color: #666; font-size: 16px;">
                            パスワードの再設定がリクエストされました。以下の6桁の認証コードを入力して、新しいパスワードを設定してください。
                        </p>
                        <div style="background-color: #f8f9fa; padding: 15px; text-align: center; border-radius: 6px; margin: 25px 0;">
                            <span style="font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #111;">${otpCode}</span>
                        </div>
                        <p style="color: #999; font-size: 14px; margin-top: 30px;">
                            このコードの有効期限は10分間です。<br>
                            心当たりがない場合は、このメールを破棄してください。
                        </p>
                    </div>
                </div>
            `;

            await transporter.sendMail({
                from: SMTP_FROM,
                to: user.email,
                subject: '【重要】パスワード再設定の認証コード',
                html: htmlContent,
            });
        } else {
            console.log(`[DEV MODE] Forgot Password OTP for ${user.email}: ${otpCode}`);
        }

        return NextResponse.json({ success: true, message: 'OTP sent' });

    } catch (e) {
        console.error('Forgot Password error:', e);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
