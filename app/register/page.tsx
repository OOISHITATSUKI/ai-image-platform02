'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAppStore } from '@/lib/store';
import fpPromise from '@fingerprintjs/fingerprintjs';

type Step = 'email' | 'otp' | 'password' | 'agreements' | 'profile';

const COUNTRIES = [
    { code: 'JP', name: 'Japan' }, { code: 'US', name: 'United States' }, { code: 'GB', name: 'United Kingdom' },
    { code: 'CA', name: 'Canada' }, { code: 'AU', name: 'Australia' }, { code: 'DE', name: 'Germany' },
    { code: 'FR', name: 'France' }, { code: 'ES', name: 'Spain' }, { code: 'IT', name: 'Italy' },
    { code: 'BR', name: 'Brazil' }, { code: 'MX', name: 'Mexico' }, { code: 'KR', name: 'South Korea' },
    { code: 'CN', name: 'China' }, { code: 'TW', name: 'Taiwan' }, { code: 'HK', name: 'Hong Kong' },
    { code: 'SG', name: 'Singapore' }, { code: 'TH', name: 'Thailand' }, { code: 'PH', name: 'Philippines' },
    { code: 'IN', name: 'India' }, { code: 'ID', name: 'Indonesia' }, { code: 'MY', name: 'Malaysia' },
    { code: 'VN', name: 'Vietnam' }, { code: 'NL', name: 'Netherlands' }, { code: 'SE', name: 'Sweden' },
    { code: 'NO', name: 'Norway' }, { code: 'DK', name: 'Denmark' }, { code: 'FI', name: 'Finland' },
    { code: 'PL', name: 'Poland' }, { code: 'RU', name: 'Russia' }, { code: 'UA', name: 'Ukraine' },
    { code: 'CZ', name: 'Czech Republic' }, { code: 'AT', name: 'Austria' }, { code: 'CH', name: 'Switzerland' },
    { code: 'PT', name: 'Portugal' }, { code: 'NZ', name: 'New Zealand' }, { code: 'AR', name: 'Argentina' },
    { code: 'CL', name: 'Chile' }, { code: 'CO', name: 'Colombia' }, { code: 'ZA', name: 'South Africa' },
    { code: 'EG', name: 'Egypt' }, { code: 'SA', name: 'Saudi Arabia' }, { code: 'AE', name: 'UAE' },
    { code: 'TR', name: 'Turkey' }, { code: 'IL', name: 'Israel' },
].sort((a, b) => a.name.localeCompare(b.name));

export default function RegisterPage() {
    const router = useRouter();
    const { setUser } = useAppStore();
    const [step, setStep] = useState<Step>('email');
    const [email, setEmail] = useState('');
    const [otp, setOtp] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [username, setUsername] = useState('');
    const [dobYear, setDobYear] = useState('');
    const [dobMonth, setDobMonth] = useState('');
    const [dobDay, setDobDay] = useState('');
    const [country, setCountry] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [devOtp, setDevOtp] = useState('');
    const [termsAgreed, setTermsAgreed] = useState(false);
    const [cooldown, setCooldown] = useState(0);
    const [fingerprintHash, setFingerprintHash] = useState('');

    // Agreements checkboxes
    const [agreements, setAgreements] = useState({
        termsOfService: false,
        contentPolicy: false,
        privacyPolicy: false,
        ageConfirmation: false,
        minorContentBan: false,
        noRefund: false,
        personalUseOnly: false,
    });

    const allAgreed = Object.values(agreements).every(Boolean);

    const toggleAgreement = (key: keyof typeof agreements) => {
        setAgreements(prev => ({ ...prev, [key]: !prev[key] }));
    };

    // Cooldown timer for OTP resend
    React.useEffect(() => {
        if (cooldown <= 0) return;
        const timer = setInterval(() => setCooldown(c => c - 1), 1000);
        return () => clearInterval(timer);
    }, [cooldown]);

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

    // STEP 1: Email submission
    const handleEmailSubmit = async (resend = false) => {
        setError('');
        setLoading(true);
        try {
            const res = await fetch('/api/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, resend, fingerprintHash }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);

            if (data.devOtp) setDevOtp(data.devOtp);
            setCooldown(60);
            if (!resend) setStep('otp');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An error occurred');
        } finally {
            setLoading(false);
        }
    };

    // STEP 2: OTP verification
    const handleOtpSubmit = async () => {
        setError('');
        setLoading(true);
        try {
            const res = await fetch('/api/auth/verify-otp', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, code: otp }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);

            setStep('password');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An error occurred');
        } finally {
            setLoading(false);
        }
    };

    // STEP 3: Password creation
    const handlePasswordSubmit = async () => {
        setError('');
        if (password !== confirmPassword) {
            setError('Passwords do not match');
            return;
        }
        setLoading(true);
        try {
            const res = await fetch('/api/auth/set-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password, confirmPassword }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);

            // Save agreements
            try {
                await fetch('/api/auth/agree-terms', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + data.token },
                    body: JSON.stringify({
                        email,
                        agreements: {
                            termsOfService: true,
                            contentPolicy: true,
                            privacyPolicy: true,
                            ageConfirmation: true,
                            minorContentBan: true,
                            statement2257: true,
                        }
                    }),
                });
            } catch (_) {}

            // Save token and go straight to editor
            localStorage.setItem('auth_token', data.token);
            const userWithTerms = { ...data.user, termsAgreedAt: new Date().toISOString() };
            setUser(userWithTerms);
            useAppStore.setState({ isAuthenticated: true, ageVerified: true });
            setTimeout(() => router.push('/editor'), 100);
            return;
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An error occurred');
        } finally {
            setLoading(false);
        }
    };

    // STEP 4: Agreements
    const handleAgreementsSubmit = async () => {
        setError('');
        setLoading(true);
        try {
            const res = await fetch('/api/auth/complete-registration', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, agreements }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);

            setStep('profile');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An error occurred');
        } finally {
            setLoading(false);
        }
    };

    // STEP 6: Profile setup
    const handleProfileSubmit = async () => {
        setError('');
        if (!dobYear || !dobMonth || !dobDay) {
            setError('Please enter your date of birth');
            return;
        }
        setLoading(true);
        try {
            const dateOfBirth = `${dobYear}-${dobMonth.padStart(2, '0')}-${dobDay.padStart(2, '0')}`;
            const res = await fetch('/api/auth/profile', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, username, dateOfBirth, country }),
            });
            const data = await res.json();
            if (!res.ok) {
                if (data.ageRestricted) {
                    setError('You must be 18 or older to use this service. Your account has been restricted.');
                    setTimeout(() => router.push('/'), 3000);
                    return;
                }
                throw new Error(data.error);
            }

            // Save auth token and user
            localStorage.setItem('auth_token', data.token);
            setUser(data.user);
            useAppStore.setState({ isAuthenticated: true, ageVerified: true });

            // Wait for Zustand persist to flush to localStorage before navigating
            setTimeout(() => router.push('/editor'), 100);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An error occurred');
        } finally {
            setLoading(false);
        }
    };

    const stepIndex = ['email', 'otp', 'password'].indexOf(step);
    const strength = getPasswordStrength();

    // Generate year options
    const currentYear = new Date().getFullYear();
    const years = Array.from({ length: 100 }, (_, i) => currentYear - 18 - i);

    return (
        <div className="auth-page">
            <div className="auth-container">
                {/* Logo */}
                <div className="auth-logo" style={{ display: 'flex', justifyContent: 'center', width: '100%', marginBottom: '24px' }}>
                    <img src="/logo-dark.png" alt="Image Nude" className="app-logo logo-dark" style={{ maxHeight: '72px', maxWidth: '280px' }} />
                    <img src="/logo-light.png" alt="Image Nude" className="app-logo logo-light" style={{ maxHeight: '72px', maxWidth: '280px' }} />
                </div>

                {/* Step indicator */}
                <div className="auth-steps">
                    {['Email', 'Verify', 'Password'].map((label, i) => (
                        <div key={i} className={`auth-step ${i <= stepIndex ? 'active' : ''} ${i < stepIndex ? 'completed' : ''}`}>
                            <div className="auth-step-circle">
                                {i < stepIndex ? '✓' : i + 1}
                            </div>
                            <span className="auth-step-label">{label}</span>
                        </div>
                    ))}
                </div>

                {/* Error message */}
                {error && (
                    <div className="auth-error">
                        <span>⚠️</span> {error}
                    </div>
                )}

                {/* STEP 1: Email */}
                {step === 'email' && (
                    <div className="auth-card">
                        <h2>Create your account</h2>
                        <p className="auth-subtitle">Enter your email address to get started</p>

                        <div className="auth-field">
                            <label>Email address</label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="your@email.com"
                                className="auth-input"
                                autoFocus
                                onKeyDown={(e) => e.key === 'Enter' && handleEmailSubmit()}
                            />
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
                            onClick={() => handleEmailSubmit()}
                            disabled={loading || !email || !termsAgreed}
                        >
                            {loading ? 'Sending...' : 'Next →'}
                        </button>

                        <div className="auth-link-row">
                            Already have an account? <Link href="/login">Log in</Link>
                        </div>
                    </div>
                )}

                {/* STEP 2: OTP */}
                {step === 'otp' && (
                    <div className="auth-card">
                        <h2>Verify your email</h2>
                        <p className="auth-subtitle">
                            Enter the 6-digit code sent to <strong>{email}</strong>
                        </p>

                        {devOtp && (
                            <div className="auth-dev-otp">
                                🔧 Dev mode — OTP: <strong>{devOtp}</strong>
                            </div>
                        )}

                        <div className="auth-field">
                            <label>Verification code</label>
                            <input
                                type="text"
                                value={otp}
                                onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                placeholder="000000"
                                className="auth-input auth-otp-input"
                                maxLength={6}
                                autoFocus
                                onKeyDown={(e) => e.key === 'Enter' && otp.length === 6 && handleOtpSubmit()}
                            />
                        </div>

                        <button
                            className="auth-btn-primary"
                            onClick={handleOtpSubmit}
                            disabled={loading || otp.length !== 6}
                        >
                            {loading ? 'Verifying...' : 'Verify'}
                        </button>

                        <div className="auth-link-row">
                            {cooldown > 0 ? (
                                <span style={{ color: 'var(--text-muted)' }}>Resend code in {cooldown}s</span>
                            ) : (
                                <button className="auth-link-btn" onClick={() => handleEmailSubmit(true)}>
                                    Resend code
                                </button>
                            )}
                        </div>
                    </div>
                )}

                {/* STEP 3: Password */}
                {step === 'password' && (
                    <div className="auth-card">
                        <h2>Create password</h2>
                        <p className="auth-subtitle">Choose a strong password for your account</p>

                        <div className="auth-field">
                            <label>Password</label>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="At least 6 characters"
                                className="auth-input"
                                autoFocus
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

                        <div className="auth-field">
                            <label>Confirm password</label>
                            <input
                                type="password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                placeholder="Re-enter password"
                                className="auth-input"
                                onKeyDown={(e) => e.key === 'Enter' && handlePasswordSubmit()}
                            />
                        </div>

                        <button
                            className="auth-btn-primary"
                            onClick={handlePasswordSubmit}
                            disabled={loading || !password || !confirmPassword}
                        >
                            {loading ? 'Saving...' : 'Next →'}
                        </button>
                    </div>
                )}

                {/* STEP 4: Agreements */}
                {step === 'agreements' && (
                    <div className="auth-card auth-card-wide">
                        <h2>Terms & Agreements</h2>
                        <p className="auth-subtitle">Please read and agree to the following terms</p>

                        <div className="auth-policy-links">
                            <div className="auth-policy-item">
                                <span>📄 Terms of Service</span>
                                <Link href="/terms" target="_blank">Read full text →</Link>
                            </div>
                            <div className="auth-policy-item">
                                <span>📄 Content Policy</span>
                                <Link href="/content-policy" target="_blank">Read full text →</Link>
                            </div>
                            <div className="auth-policy-item">
                                <span>📄 Privacy Policy</span>
                                <Link href="/privacy" target="_blank">Read full text →</Link>
                            </div>
                            <div className="auth-policy-item">
                                <span>📄 DMCA Policy</span>
                                <Link href="/dmca" target="_blank">Read full text →</Link>
                            </div>
                            <div className="auth-policy-item">
                                <span>📄 2257 Statement</span>
                                <Link href="/2257" target="_blank">Read full text →</Link>
                            </div>
                        </div>

                        <div className="auth-agreements-list">
                            <label className="auth-checkbox-label" onClick={() => toggleAgreement('termsOfService')}>
                                <input type="checkbox" checked={agreements.termsOfService} readOnly />
                                <span>I have read and agree to the Terms of Service.</span>
                            </label>

                            <label className="auth-checkbox-label" onClick={() => toggleAgreement('contentPolicy')}>
                                <input type="checkbox" checked={agreements.contentPolicy} readOnly />
                                <span>I have read and agree to the Content Policy.</span>
                            </label>

                            <label className="auth-checkbox-label" onClick={() => toggleAgreement('privacyPolicy')}>
                                <input type="checkbox" checked={agreements.privacyPolicy} readOnly />
                                <span>I have read and agree to the Privacy Policy.</span>
                            </label>

                            <label className="auth-checkbox-label" onClick={() => toggleAgreement('ageConfirmation')}>
                                <input type="checkbox" checked={agreements.ageConfirmation} readOnly />
                                <span>I am 18 years of age or older.</span>
                            </label>

                            <label className="auth-checkbox-label" onClick={() => toggleAgreement('minorContentBan')}>
                                <input type="checkbox" checked={agreements.minorContentBan} readOnly />
                                <span>I understand that generating content depicting minors is prohibited. I agree that my account will be permanently suspended if I violate this rule.</span>
                            </label>

                            <label className="auth-checkbox-label" onClick={() => toggleAgreement('noRefund')}>
                                <input type="checkbox" checked={agreements.noRefund} readOnly />
                                <span>I understand that credit balances are non-refundable.</span>
                            </label>

                            <label className="auth-checkbox-label" onClick={() => toggleAgreement('personalUseOnly')}>
                                <input type="checkbox" checked={agreements.personalUseOnly} readOnly />
                                <span>I understand that generated content is for personal use only. Commercial use or distribution is prohibited and will result in permanent account suspension.</span>
                            </label>
                        </div>

                        <button
                            className="auth-btn-primary"
                            onClick={handleAgreementsSubmit}
                            disabled={loading || !allAgreed}
                        >
                            {loading ? 'Creating account...' : 'Create Account'}
                        </button>
                    </div>
                )}

                {/* STEP 6: Profile */}
                {step === 'profile' && (
                    <div className="auth-card">
                        <h2>🎉 Account Created!</h2>
                        <p className="auth-subtitle">Set up your profile to get started</p>

                        <div className="auth-field">
                            <label>Username *</label>
                            <input
                                type="text"
                                value={username}
                                onChange={(e) => setUsername(e.target.value.replace(/[^a-zA-Z0-9_]/g, ''))}
                                placeholder="your_username"
                                className="auth-input"
                                maxLength={20}
                                autoFocus
                            />
                            <span className="auth-hint">3-20 characters, alphanumeric and underscores only</span>
                        </div>

                        <div className="auth-field">
                            <label>Date of Birth *</label>
                            <div className="auth-dob-row">
                                <select
                                    value={dobYear}
                                    onChange={(e) => setDobYear(e.target.value)}
                                    className="auth-select"
                                >
                                    <option value="">Year</option>
                                    {years.map(y => (
                                        <option key={y} value={y}>{y}</option>
                                    ))}
                                </select>
                                <select
                                    value={dobMonth}
                                    onChange={(e) => setDobMonth(e.target.value)}
                                    className="auth-select"
                                >
                                    <option value="">Month</option>
                                    {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                                        <option key={m} value={m}>{m}</option>
                                    ))}
                                </select>
                                <select
                                    value={dobDay}
                                    onChange={(e) => setDobDay(e.target.value)}
                                    className="auth-select"
                                >
                                    <option value="">Day</option>
                                    {Array.from({ length: 31 }, (_, i) => i + 1).map(d => (
                                        <option key={d} value={d}>{d}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="auth-field">
                            <label>Country *</label>
                            <select
                                value={country}
                                onChange={(e) => setCountry(e.target.value)}
                                className="auth-select auth-select-full"
                            >
                                <option value="">Select country</option>
                                {COUNTRIES.map(c => (
                                    <option key={c.code} value={c.code}>{c.name}</option>
                                ))}
                            </select>
                        </div>

                        <button
                            className="auth-btn-primary"
                            onClick={handleProfileSubmit}
                            disabled={loading || !username || username.length < 3 || !dobYear || !dobMonth || !dobDay || !country}
                        >
                            {loading ? 'Saving...' : 'Save & Get Started'}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
