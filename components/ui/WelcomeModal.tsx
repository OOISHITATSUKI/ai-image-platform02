'use client';

import React, { useState } from 'react';
import { useAppStore } from '@/lib/store';

export default function WelcomeModal() {
    const { user, setUser } = useAppStore();
    const [loading, setLoading] = useState(false);

    // Don't show if already confirmed or not authenticated
    if (!user || user.firstGenerationConfirmed) return null;

    const handleStart = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('auth_token');
            if (token) {
                await fetch('/api/auth/me', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify({ firstGenerationConfirmed: true }),
                });
            }
            setUser({ ...user, firstGenerationConfirmed: true });
        } catch (err) {
            console.error('WelcomeModal error:', err);
            // Still dismiss even on error
            setUser({ ...user, firstGenerationConfirmed: true });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="firstgen-overlay">
            <div className="firstgen-card" style={{ textAlign: 'center', maxWidth: '400px' }}>
                <div style={{ fontSize: '3rem', marginBottom: '12px' }}>🎁</div>
                <h2 style={{ fontSize: '1.5rem', marginBottom: '8px' }}>20 Credits Gift!</h2>
                <p style={{
                    color: 'var(--text-secondary, #a0a0b0)',
                    fontSize: '0.95rem',
                    marginBottom: '24px',
                    lineHeight: 1.6,
                }}>
                    Welcome! You have <strong style={{ color: '#7c5cfc' }}>20 free credits</strong> to start generating amazing AI images.
                </p>
                <button
                    className="auth-btn-primary firstgen-submit"
                    onClick={handleStart}
                    disabled={loading}
                    style={{
                        width: '100%',
                        fontSize: '1.1rem',
                        padding: '14px 24px',
                        background: 'linear-gradient(135deg, #7c5cfc, #6c47f5)',
                    }}
                >
                    {loading ? '...' : 'Start Generating! →'}
                </button>
            </div>
        </div>
    );
}
