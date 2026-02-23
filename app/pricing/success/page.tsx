'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAppStore } from '@/lib/store';

export default function PaymentSuccessPage() {
    const { user } = useAppStore();
    const [refreshed, setRefreshed] = useState(false);
    const [newBalance, setNewBalance] = useState<number | null>(null);

    // On mount, refresh user data from server to get updated credits
    useEffect(() => {
        const refreshCredits = async () => {
            const token = localStorage.getItem('auth_token');
            if (!token) return;

            try {
                const res = await fetch('/api/auth/me', {
                    headers: { Authorization: `Bearer ${token}` },
                });
                if (res.ok) {
                    const data = await res.json();
                    // Update Zustand store with fresh server data
                    useAppStore.setState({
                        user: data.user,
                        isAuthenticated: true,
                    });
                    setNewBalance(data.user.credits);
                }
            } catch (e) {
                console.error('Failed to refresh credits:', e);
            }
            setRefreshed(true);
        };

        // Poll a few times — webhook may take a moment to process
        let attempts = 0;
        const interval = setInterval(async () => {
            attempts++;
            await refreshCredits();
            if (attempts >= 5) clearInterval(interval);
        }, 3000);

        refreshCredits(); // Initial fetch
        return () => clearInterval(interval);
    }, []);

    return (
        <div style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'var(--bg-base)',
            padding: 24,
        }}>
            <div style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--border)',
                borderRadius: 20,
                padding: '48px 40px',
                maxWidth: 480,
                width: '100%',
                textAlign: 'center',
                boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
            }}>
                <div style={{ fontSize: '4rem', marginBottom: 16 }}>✅</div>

                <h1 style={{
                    fontSize: '1.6rem',
                    fontWeight: 700,
                    color: 'var(--text-primary)',
                    marginBottom: 12,
                    fontFamily: 'var(--font-display)',
                }}>
                    お支払いありがとうございます！
                </h1>

                <p style={{
                    color: 'var(--text-secondary)',
                    fontSize: '0.95rem',
                    lineHeight: 1.6,
                    marginBottom: 24,
                }}>
                    仮想通貨の入金確認中です。<br />
                    ブロックチェーンの承認後、クレジットが自動的に反映されます。<br />
                    通常 5〜30分 ほどかかります。
                </p>

                {newBalance !== null && (
                    <div style={{
                        background: 'var(--bg-elevated)',
                        borderRadius: 12,
                        padding: '16px 24px',
                        marginBottom: 24,
                        border: '1px solid var(--border)',
                    }}>
                        <div style={{
                            fontSize: '0.7rem',
                            fontWeight: 600,
                            color: 'var(--text-tertiary)',
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em',
                            marginBottom: 6,
                        }}>
                            現在のクレジット残高
                        </div>
                        <div style={{
                            fontSize: '2rem',
                            fontWeight: 700,
                            background: 'linear-gradient(135deg, var(--primary), var(--secondary))',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                        }}>
                            {newBalance.toLocaleString()}
                        </div>
                    </div>
                )}

                <div style={{
                    background: 'rgba(59, 130, 246, 0.1)',
                    border: '1px solid rgba(59, 130, 246, 0.2)',
                    borderRadius: 10,
                    padding: '12px 16px',
                    marginBottom: 24,
                    fontSize: '0.82rem',
                    color: '#93c5fd',
                    lineHeight: 1.5,
                }}>
                    💡 入金が反映されない場合は、ページをリロードするか、<br />
                    しばらく待ってから再度ログインしてください。
                </div>

                <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
                    <Link
                        href="/editor"
                        style={{
                            padding: '12px 28px',
                            borderRadius: 10,
                            background: 'linear-gradient(135deg, var(--primary), var(--secondary))',
                            color: '#fff',
                            fontWeight: 600,
                            fontSize: '0.9rem',
                            textDecoration: 'none',
                            transition: 'all 0.2s',
                        }}
                    >
                        🎨 画像を生成する
                    </Link>
                    <Link
                        href="/pricing"
                        style={{
                            padding: '12px 28px',
                            borderRadius: 10,
                            background: 'var(--bg-elevated)',
                            border: '1px solid var(--border)',
                            color: 'var(--text-primary)',
                            fontWeight: 500,
                            fontSize: '0.9rem',
                            textDecoration: 'none',
                            transition: 'all 0.2s',
                        }}
                    >
                        料金プランに戻る
                    </Link>
                </div>
            </div>
        </div>
    );
}
