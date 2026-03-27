'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAppStore } from '@/lib/store';
import fpPromise from '@fingerprintjs/fingerprintjs';

export default function RegisterPage() {
    const router = useRouter();
    const { setUser, locale } = useAppStore();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [termsAgreed, setTermsAgreed] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [fingerprintHash, setFingerprintHash] = useState('');

    // Fingerprint collection
    React.useEffect(() => {
        const loadFingerprint = async () => {
            try {
                const fp = await fpPromise.load();
                const result = await fp.get();
                setFingerprintHash(result.visitorId);
            } catch (err) {
                console.error('Fingerprint generation failed:', err);
            }
        };
        loadFingerprint();
    }, []);

    // Password strength indicator
    const getPasswordStrength = () => {
        if (!password) return { level: 0, label: '', color: '' };
        let score = 0;
        if (password.length >= 6) score++;
        if (password.length >= 12) score++;
        if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
        if (/[0-9]/.test(password)) score++;
        if (/[^a-zA-Z0-9]/.test(password)) score++;

        if (score <= 1) return { level: 1, label: 'Weak', color: '#ef4444' };
        if (score <= 2) return { level: 2, label: 'Fair', color: '#f59e0b' };
        if (score <= 3) return { level: 3, label: 'Good', color: '#22c55e' };
        return { level: 4, label: 'Strong', color: '#10b981' };
    };

    const handleRegister = async () => {
        setError('');

        if (!email) {
            setError('Please enter your email address');
            return;
        }
        if (!password || password.length < 8) {
            setError('Password must be at least 8 characters');
            return;
        }
        if (!termsAgreed) {
            setError('You must agree to the terms');
            return;
        }

        setLoading(true);
        try {
            const res = await fetch('/api/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password, fingerprintHash, locale }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);

            // Save token and redirect to editor
            localStorage.setItem('auth_token', data.token);
            setUser(data.user);
            useAppStore.setState({ isAuthenticated: true, ageVerified: true });

            // Store unlocked count for post-registration notification
            if (data.unlockedCount && data.unlockedCount > 0) {
                localStorage.setItem('guest_unlocked_count', String(data.unlockedCount));
                localStorage.setItem('guest_unlocked_new', String(data.unlockedCount));
            }

            // Clear guest gen count
            localStorage.removeItem('guest_gen_count');

            // Redirect to library if images were unlocked, otherwise to home
            const destination = (data.unlockedCount && data.unlockedCount > 0) ? '/library' : '/';
            setTimeout(() => router.push(destination), 100);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An error occurred');
        } finally {
            setLoading(false);
        }
    };

    const strength = getPasswordStrength();

    return (
        <div className="auth-page">
            <div className="auth-container">
                {/* Logo */}
                <div className="auth-logo" style={{ display: 'flex', justifyContent: 'center', width: '100%', marginBottom: '24px' }}>
                    <img src="/logo-dark.png" alt="Image Nude" className="app-logo logo-dark" style={{ maxHeight: '72px', maxWidth: '280px' }} />
                    <img src="/logo-light.png" alt="Image Nude" className="app-logo logo-light" style={{ maxHeight: '72px', maxWidth: '280px' }} />
                </div>

                {/* Error message */}
                {error && (
                    <div className="auth-error">
                        <span>⚠️</span> {error}
                    </div>
                )}

                <div className="auth-card">
                    <h2>Create your account</h2>
                    <p className="auth-subtitle">Start generating with 20 free credits</p>

                    {/* Google OAuth button */}
                    <a
                        href={`/api/auth/google?locale=${encodeURIComponent(locale)}`}
                        style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            gap: '10px', width: '100%', padding: '12px 16px',
                            background: '#fff', border: '1px solid #dadce0',
                            borderRadius: '10px', color: '#3c4043',
                            fontSize: '0.95rem', fontWeight: 600,
                            textDecoration: 'none', marginBottom: '8px',
                            boxSizing: 'border-box', cursor: 'pointer',
                        }}
                    >
                        <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
                            <path d="M17.64 9.205c0-.639-.057-1.252-.164-1.841H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
                            <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
                            <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
                            <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
                        </svg>
                        Continue with Google
                    </a>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', margin: '8px 0 16px' }}>
                        <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.1)' }} />
                        <span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>or</span>
                        <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.1)' }} />
                    </div>

                    <div className="auth-field">
                        <label>Email address</label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="your@email.com"
                            className="auth-input"
                            autoFocus
                        />
                    </div>

                    <div className="auth-field">
                        <label>Password</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="At least 8 characters"
                            className="auth-input"
                            onKeyDown={(e) => e.key === 'Enter' && handleRegister()}
                        />
                        {password && (
                            <div className="auth-password-strength">
                                <div className="auth-strength-bar">
                                    {[1, 2, 3, 4].map(i => (
                                        <div
                                            key={i}
                                            className="auth-strength-segment"
                                            style={{ background: i <= strength.level ? strength.color : 'var(--bg-tertiary)' }}
                                        />
                                    ))}
                                </div>
                                <span style={{ color: strength.color, fontSize: '0.75rem' }}>{strength.label}</span>
                            </div>
                        )}
                    </div>

                    <label
                        style={{
                            display: 'flex', gap: 10, alignItems: 'flex-start',
                            cursor: 'pointer', fontSize: '0.82rem', color: '#b0b0c0',
                            lineHeight: 1.55, marginTop: 4, marginBottom: 2,
                            padding: '10px 14px', borderRadius: 10,
                            background: 'rgba(124,92,252,0.05)',
                            border: '1px solid rgba(124,92,252,0.12)',
                            transition: 'all 0.2s',
                        }}
                        onClick={() => setTermsAgreed(!termsAgreed)}
                    >
                        <input
                            type="checkbox"
                            checked={termsAgreed}
                            readOnly
                            style={{ marginTop: 2, accentColor: '#7c5cfc', width: 16, height: 16, flexShrink: 0 }}
                        />
                        <span>
                            I am 18+ and agree to the{' '}
                            <a href="/terms" target="_blank" style={{ color: '#7c5cfc' }} onClick={e => e.stopPropagation()}>Terms</a>,{' '}
                            <a href="/privacy" target="_blank" style={{ color: '#7c5cfc' }} onClick={e => e.stopPropagation()}>Privacy Policy</a>,{' '}
                            <a href="/content-policy" target="_blank" style={{ color: '#7c5cfc' }} onClick={e => e.stopPropagation()}>Content Policy</a>, and{' '}
                            <a href="/2257" target="_blank" style={{ color: '#7c5cfc' }} onClick={e => e.stopPropagation()}>2257 Statement</a>.
                        </span>
                    </label>

                    <button
                        className="auth-btn-primary"
                        onClick={handleRegister}
                        disabled={loading || !email || !password || !termsAgreed}
                    >
                        {loading ? 'Creating account...' : 'Create Account'}
                    </button>

                    <div className="auth-link-row">
                        Already have an account? <Link href="/login">Log in</Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
