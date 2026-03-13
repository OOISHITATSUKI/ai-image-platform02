'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAppStore } from '@/lib/store';
import fpPromise from '@fingerprintjs/fingerprintjs';

export default function RegisterPage() {
    const router = useRouter();
    const { setUser } = useAppStore();
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
        if (password.length >= 8) score++;
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
            setError('Please agree to the terms to continue');
            return;
        }

        setLoading(true);
        try {
            const res = await fetch('/api/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password, fingerprintHash }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);

            // Save token and user, redirect to editor
            localStorage.setItem('auth_token', data.token);
            setUser(data.user);
            useAppStore.setState({ isAuthenticated: true, ageVerified: true });
            setTimeout(() => router.push('/editor'), 100);
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
                    <p className="auth-subtitle">Start generating in seconds</p>

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
                            placeholder="Minimum 8 characters"
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
