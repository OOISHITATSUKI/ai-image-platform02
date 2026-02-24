'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAppStore } from '@/lib/store';
import { useTranslation } from '@/lib/useTranslation';

type Step = 'password' | 'mfa' | 'forgot-password' | 'reset-password';

export default function LoginPage() {
    const router = useRouter();
    const { setUser } = useAppStore();
    const { t } = useTranslation();

    // Step 1 state
    const [step, setStep] = useState<Step>('password');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');

    // Step 2 MFA state
    const [sessionToken, setSessionToken] = useState('');
    const [emailHint, setEmailHint] = useState('');
    const [riskReason, setRiskReason] = useState('');
    const [otpCode, setOtpCode] = useState('');
    const [trustDevice, setTrustDevice] = useState(false);
    const [resendCooldown, setResendCooldown] = useState(0);

    // Step 3 Forgot Password & Reset
    const [resetEmail, setResetEmail] = useState('');
    const [resetOtp, setResetOtp] = useState('');
    const [newPassword, setNewPassword] = useState('');

    const [error, setError] = useState('');
    const [successMsg, setSuccessMsg] = useState('');
    const [loading, setLoading] = useState(false);

    // Tick down resend cooldown
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
    useEffect(() => {
        if (resendCooldown > 0) {
            timerRef.current = setInterval(() => {
                setResendCooldown(prev => { if (prev <= 1) { clearInterval(timerRef.current!); return 0; } return prev - 1; });
            }, 1000);
        }
        return () => { if (timerRef.current) clearInterval(timerRef.current); };
    }, [resendCooldown]);

    // Handle success — store token and redirect
    const onLoginSuccess = (token: string, user: object) => {
        localStorage.setItem('auth_token', token);
        setUser(user as any);
        useAppStore.setState({ isAuthenticated: true, ageVerified: true });
        setTimeout(() => router.push('/editor'), 100);
    };

    // ── Step 1: email + password ──────────────────────────
    const handleLogin = async () => {
        setError('');
        if (!email || !password) { setError('Please enter your email address and password'); return; }
        setLoading(true);
        try {
            const res = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password }),
            });
            const data = await res.json();

            if (!res.ok) throw new Error(data.error);

            if (data.incompleteRegistration) {
                localStorage.setItem('auth_token', data.token);
                router.push('/register');
                return;
            }

            if (data.step === 'mfa_required') {
                setSessionToken(data.sessionToken);
                setEmailHint(data.emailHint ?? email);
                setRiskReason(data.reason ?? '');
                setResendCooldown(60);
                setStep('mfa');
                return;
            }

            // Normal success
            onLoginSuccess(data.token, data.user);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An error occurred');
        } finally {
            setLoading(false);
        }
    };

    // ── Step 2: OTP verification ──────────────────────────
    const handleVerify = async () => {
        setError('');
        if (otpCode.length !== 6) { setError('Please enter the 6-digit code'); return; }
        setLoading(true);
        try {
            const res = await fetch('/api/auth/verify-device', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ sessionToken, otpCode, trustDevice }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            onLoginSuccess(data.token, data.user);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An error occurred');
        } finally {
            setLoading(false);
        }
    };

    // ── Resend OTP ────────────────────────────────────────
    const handleResend = async () => {
        if (resendCooldown > 0) return;
        setError('');
        setLoading(true);
        try {
            // Re-call login with same credentials to trigger a fresh OTP
            const res = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password }),
            });
            const data = await res.json();
            if (data.step === 'mfa_required') {
                setSessionToken(data.sessionToken);
                setResendCooldown(60);
                setError('');
            } else if (!res.ok) {
                throw new Error(data.error ?? 'Resend failed');
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Resend failed');
        } finally {
            setLoading(false);
        }
    };

    // ── Step 3: Forgot Password ───────────────────────────
    const handleForgotPassword = async () => {
        setError('');
        setSuccessMsg('');
        if (!resetEmail) { setError('Please enter your email address'); return; }
        setLoading(true);
        try {
            const res = await fetch('/api/auth/forgot-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: resetEmail }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            setSuccessMsg('Verification code sent to your email. Valid for 10 minutes.');
            setStep('reset-password');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An error occurred');
        } finally {
            setLoading(false);
        }
    };

    const handleResetPassword = async () => {
        setError('');
        setSuccessMsg('');
        if (!resetOtp || !newPassword) { setError('Please enter the code and your new password'); return; }
        if (newPassword.length < 8) { setError('Password must be at least 8 characters'); return; }
        setLoading(true);
        try {
            const res = await fetch('/api/auth/reset-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: resetEmail, otpCode: resetOtp, newPassword }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);

            // Success
            setEmail(resetEmail);
            setPassword('');
            setSuccessMsg('Password reset complete. Please log in with your new password.');
            setStep('password');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An error occurred');
        } finally {
            setLoading(false);
        }
    };

    const riskLabel = (r: string) => {
        const labels: Record<string, string> = {
            new_device: 'Access from a new device',
            country_changed: 'Access from an unusual location',
            long_absence: 'First login in over 30 days',
            repeated_failures: 'Due to repeated login failures',
        };
        return labels[r] ?? 'Unusual access pattern detected';
    };

    // ── Shared styles ─────────────────────────────────────
    const inputStyle: React.CSSProperties = {
        width: '100%', padding: '12px 16px',
        background: 'rgba(255,255,255,0.05)',
        border: '1px solid rgba(255,255,255,0.15)',
        borderRadius: '10px', color: 'var(--text-primary)',
        fontSize: '0.95rem',
    };
    const btnPrimary: React.CSSProperties = {
        width: '100%', padding: '13px',
        background: 'var(--primary)',
        border: 'none', borderRadius: '10px',
        color: '#fff', fontSize: '1rem', fontWeight: 600,
        cursor: 'pointer', transition: 'opacity 0.2s',
    };
    const labelStyle: React.CSSProperties = {
        display: 'block', marginBottom: '6px',
        fontSize: '0.85rem', color: 'var(--text-secondary)',
    };

    return (
        <div className="auth-page">
            <div className="auth-container">
                {/* Logo */}
                <div className="auth-logo" style={{ display: 'flex', justifyContent: 'center', width: '100%', marginBottom: '24px' }}>
                    <img src="/logo-dark.png" alt="Image Nude" className="app-logo logo-dark" style={{ maxHeight: '72px', maxWidth: '280px' }} />
                    <img src="/logo-light.png" alt="Image Nude" className="app-logo logo-light" style={{ maxHeight: '72px', maxWidth: '280px' }} />
                </div>

                {error && (
                    <div className="auth-error">
                        <span>⚠️</span> {error}
                    </div>
                )}

                <div className="auth-card">
                    {/* ── STEP 1: Password ────────────── */}
                    {step === 'password' && (
                        <>
                            <h2>Welcome back</h2>
                            <p className="auth-subtitle">Sign in to your account</p>

                            <div className="auth-field">
                                <label style={labelStyle}>Email Address</label>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={e => setEmail(e.target.value)}
                                    placeholder="your@email.com"
                                    className="auth-input"
                                    autoFocus
                                    style={inputStyle}
                                    onKeyDown={e => e.key === 'Enter' && document.getElementById('pw-input')?.focus()}
                                />
                            </div>

                            <div className="auth-field">
                                <label style={labelStyle}>Password</label>
                                <input
                                    id="pw-input"
                                    type="password"
                                    value={password}
                                    onChange={e => setPassword(e.target.value)}
                                    placeholder="Enter your password"
                                    className="auth-input"
                                    style={inputStyle}
                                    onKeyDown={e => e.key === 'Enter' && handleLogin()}
                                />
                            </div>

                            <button
                                style={{ ...btnPrimary, opacity: (loading || !email || !password) ? 0.6 : 1 }}
                                onClick={handleLogin}
                                disabled={loading || !email || !password}
                            >
                                {loading ? 'Signing in...' : 'Sign In'}
                            </button>

                            <div style={{ textAlign: 'center', marginTop: '16px' }}>
                                <button
                                    onClick={() => { setError(''); setSuccessMsg(''); setStep('forgot-password'); }}
                                    style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '0.85rem', textDecoration: 'underline' }}
                                >
                                    {t('auth.forgotPassword')}
                                </button>
                            </div>

                            <div className="auth-link-row">
                                Don&apos;t have an account? <Link href="/register">Create one</Link>
                            </div>
                        </>
                    )}

                    {/* ── STEP 2: MFA / Device Verify ─── */}
                    {step === 'mfa' && (
                        <>
                            <div style={{ textAlign: 'center', marginBottom: '8px', fontSize: '2rem' }}>🔐</div>
                            <h2 style={{ textAlign: 'center' }}>Additional Verification Required</h2>
                            <p className="auth-subtitle" style={{ textAlign: 'center' }}>
                                {riskLabel(riskReason)}
                            </p>

                            <div style={{ background: 'rgba(167,139,250,0.1)', border: '1px solid rgba(167,139,250,0.3)', borderRadius: '10px', padding: '12px 16px', marginBottom: '20px', fontSize: '0.88rem', color: 'var(--text-secondary)', textAlign: 'center' }}>
                                Sent a 6-digit code to <strong style={{ color: '#a78bfa' }}>{emailHint}</strong>
                            </div>

                            <div className="auth-field">
                                <label style={labelStyle}>6-digit Verification Code</label>
                                <input
                                    type="text"
                                    inputMode="numeric"
                                    maxLength={6}
                                    value={otpCode}
                                    onChange={e => setOtpCode(e.target.value.replace(/\D/g, ''))}
                                    placeholder="123456"
                                    autoFocus
                                    style={{ ...inputStyle, fontSize: '1.5rem', textAlign: 'center', letterSpacing: '0.4em' }}
                                    onKeyDown={e => e.key === 'Enter' && handleVerify()}
                                />
                            </div>

                            {/* Trust this device */}
                            <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', cursor: 'pointer', marginBottom: '20px', padding: '12px 14px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px' }}>
                                <input
                                    type="checkbox"
                                    checked={trustDevice}
                                    onChange={e => setTrustDevice(e.target.checked)}
                                    style={{ marginTop: '2px', accentColor: 'var(--primary)', width: '16px', height: '16px', flexShrink: 0 }}
                                />
                                <div>
                                    <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)' }}>Trust this device (90 days)</div>
                                    <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                                        You can log in with just your password next time. Not recommended for shared computers.
                                    </div>
                                </div>
                            </label>

                            <button
                                style={{ ...btnPrimary, opacity: (loading || otpCode.length !== 6) ? 0.6 : 1 }}
                                onClick={handleVerify}
                                disabled={loading || otpCode.length !== 6}
                            >
                                {loading ? 'Verifying...' : 'Verify'}
                            </button>

                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px' }}>
                                <button
                                    onClick={() => setStep('password')}
                                    style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '0.85rem' }}
                                >
                                    ← Back
                                </button>
                                <button
                                    onClick={handleResend}
                                    disabled={resendCooldown > 0 || loading}
                                    style={{ background: 'none', border: 'none', color: resendCooldown > 0 ? 'var(--text-secondary)' : 'var(--primary)', cursor: resendCooldown > 0 ? 'default' : 'pointer', fontSize: '0.85rem' }}
                                >
                                    {resendCooldown > 0 ? `Resend (${resendCooldown}s)` : 'Resend Code'}
                                </button>
                            </div>
                        </>
                    )}

                    {/* ── STEP 3: Forgot Password (Email Input) ─── */}
                    {step === 'forgot-password' && (
                        <>
                            <div style={{ textAlign: 'center', marginBottom: '8px', fontSize: '2rem' }}>🔑</div>
                            <h2 style={{ textAlign: 'center' }}>Reset Password</h2>
                            <p className="auth-subtitle" style={{ textAlign: 'center', marginBottom: '24px' }}>
                                Enter your registered email address to receive a reset code.
                            </p>

                            {successMsg && (
                                <div style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', color: '#34d399', padding: '12px', borderRadius: '8px', marginBottom: '20px', fontSize: '0.9rem', textAlign: 'center' }}>
                                    {successMsg}
                                </div>
                            )}

                            <div className="auth-field">
                                <label style={labelStyle}>Email Address</label>
                                <input
                                    type="email"
                                    value={resetEmail}
                                    onChange={e => setResetEmail(e.target.value)}
                                    placeholder="your@email.com"
                                    className="auth-input"
                                    autoFocus
                                    style={inputStyle}
                                    onKeyDown={e => e.key === 'Enter' && handleForgotPassword()}
                                />
                            </div>

                            <button
                                style={{ ...btnPrimary, opacity: (loading || !resetEmail) ? 0.6 : 1 }}
                                onClick={handleForgotPassword}
                                disabled={loading || !resetEmail}
                            >
                                {loading ? 'Sending...' : 'Send Code'}
                            </button>

                            <div style={{ textAlign: 'center', marginTop: '20px' }}>
                                <button
                                    onClick={() => { setError(''); setSuccessMsg(''); setStep('password'); }}
                                    style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '0.9rem' }}
                                >
                                    ← Back to Login
                                </button>
                            </div>
                        </>
                    )}

                    {/* ── STEP 4: Reset Password (OTP & New Password) ─── */}
                    {step === 'reset-password' && (
                        <>
                            <div style={{ textAlign: 'center', marginBottom: '8px', fontSize: '2rem' }}>🛡️</div>
                            <h2 style={{ textAlign: 'center' }}>Set New Password</h2>
                            <p className="auth-subtitle" style={{ textAlign: 'center', marginBottom: '24px' }}>
                                Enter the 6-digit code sent to your email and your new password.
                            </p>

                            {successMsg && (
                                <div style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', color: '#34d399', padding: '12px', borderRadius: '8px', marginBottom: '20px', fontSize: '0.9rem', textAlign: 'center' }}>
                                    {successMsg}
                                </div>
                            )}

                            <div className="auth-field">
                                <label style={labelStyle}>6-digit Verification Code</label>
                                <input
                                    type="text"
                                    inputMode="numeric"
                                    maxLength={6}
                                    value={resetOtp}
                                    onChange={e => setResetOtp(e.target.value.replace(/\D/g, ''))}
                                    placeholder="123456"
                                    autoFocus
                                    style={{ ...inputStyle, fontSize: '1.2rem', textAlign: 'center', letterSpacing: '0.2em' }}
                                />
                            </div>

                            <div className="auth-field">
                                <label style={labelStyle}>New Password</label>
                                <input
                                    type="password"
                                    value={newPassword}
                                    onChange={e => setNewPassword(e.target.value)}
                                    placeholder="New password (at least 8 characters)"
                                    className="auth-input"
                                    style={inputStyle}
                                    onKeyDown={e => e.key === 'Enter' && handleResetPassword()}
                                />
                            </div>

                            <button
                                style={{ ...btnPrimary, opacity: (loading || resetOtp.length !== 6 || newPassword.length < 8) ? 0.6 : 1, marginTop: '10px' }}
                                onClick={handleResetPassword}
                                disabled={loading || resetOtp.length !== 6 || newPassword.length < 8}
                            >
                                {loading ? 'Saving...' : 'Reset Password'}
                            </button>

                            <div style={{ textAlign: 'center', marginTop: '20px' }}>
                                <button
                                    onClick={() => { setError(''); setSuccessMsg(''); setStep('password'); }}
                                    style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '0.9rem' }}
                                >
                                    Cancel and return to Login
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div >
    );
}
