'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAppStore } from '@/lib/store';
import { useTranslation } from '@/lib/useTranslation';

interface ClaimInfo {
  credits: number;
  purchaseType: string;
  amountCents: number;
  expiresAt: string;
  status: string;
}

type ClaimState = 'loading' | 'login_required' | 'ready' | 'claiming' | 'success' | 'error';

export default function ClaimPage() {
  const params = useParams();
  const router = useRouter();
  const { t } = useTranslation();
  const { user, addCredits } = useAppStore();
  const token = params.token as string;

  const [state, setState] = useState<ClaimState>('loading');
  const [claimInfo, setClaimInfo] = useState<ClaimInfo | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [newBalance, setNewBalance] = useState(0);

  const getAuthToken = () => localStorage.getItem('auth_token');

  // Fetch token info
  useEffect(() => {
    if (!token) return;
    fetch(`/api/claim?token=${token}`)
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) {
          setErrorMsg(data.error || 'Invalid token');
          setState('error');
          return;
        }
        setClaimInfo(data);
        if (!user) {
          setState('login_required');
        } else {
          setState('ready');
        }
      })
      .catch(() => {
        setErrorMsg('Network error');
        setState('error');
      });
  }, [token, user]);

  // Handle claim
  const handleClaim = async () => {
    const authToken = getAuthToken();
    if (!authToken) {
      setState('login_required');
      return;
    }

    setState('claiming');
    try {
      const res = await fetch('/api/claim', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ token }),
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || 'Claim failed');
        setState('error');
        return;
      }

      setNewBalance(data.newBalance);
      addCredits(data.credits);
      setState('success');
    } catch {
      setErrorMsg('Network error');
      setState('error');
    }
  };

  // Redirect to login with return URL
  const handleLogin = () => {
    const returnUrl = `/claim/${token}`;
    router.push(`/login?redirect=${encodeURIComponent(returnUrl)}`);
  };

  // Styles
  const container: React.CSSProperties = {
    maxWidth: 480,
    margin: '60px auto',
    padding: '0 20px',
    textAlign: 'center',
  };
  const card: React.CSSProperties = {
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 16,
    padding: '36px 28px',
  };
  const btn: React.CSSProperties = {
    padding: '14px 28px',
    borderRadius: 12,
    fontWeight: 700,
    fontSize: '1rem',
    cursor: 'pointer',
    border: 'none',
    background: 'linear-gradient(135deg, #a78bfa, #f472b6)',
    color: '#fff',
    width: '100%',
    marginTop: 20,
  };
  const btnSecondary: React.CSSProperties = {
    ...btn,
    background: 'rgba(255,255,255,0.08)',
    border: '1px solid rgba(255,255,255,0.15)',
  };
  const creditsDisplay: React.CSSProperties = {
    fontSize: '2.5rem',
    fontWeight: 800,
    background: 'linear-gradient(135deg, #a78bfa, #f472b6)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    margin: '16px 0 8px',
  };

  return (
    <div style={container}>
      <div style={card}>
        {/* Loading */}
        {state === 'loading' && (
          <p style={{ color: 'var(--text-secondary)' }}>Loading...</p>
        )}

        {/* Login Required */}
        {state === 'login_required' && claimInfo && (
          <>
            <div style={{ fontSize: '2rem', marginBottom: 12 }}>🎁</div>
            <h1 style={{ fontSize: '1.3rem', margin: '0 0 8px' }}>
              {t('claim.loginRequired')}
            </h1>
            <div style={creditsDisplay}>{claimInfo.credits} {t('claim.credits')}</div>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: 4 }}>
              Fanvue {claimInfo.purchaseType} — ${(claimInfo.amountCents / 100).toFixed(2)}
            </p>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
              {t('claim.expires')}: {new Date(claimInfo.expiresAt).toLocaleDateString()}
            </p>
            <button style={btn} onClick={handleLogin}>
              {t('claim.loginBtn')}
            </button>
            <p style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)', marginTop: 12 }}>
              {t('claim.noAccount')}
            </p>
          </>
        )}

        {/* Ready to Claim */}
        {state === 'ready' && claimInfo && (
          <>
            <div style={{ fontSize: '2rem', marginBottom: 12 }}>🎁</div>
            <h1 style={{ fontSize: '1.3rem', margin: '0 0 8px' }}>
              {t('claim.title')}
            </h1>
            <div style={creditsDisplay}>{claimInfo.credits} {t('claim.credits')}</div>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: 4 }}>
              Fanvue {claimInfo.purchaseType} — ${(claimInfo.amountCents / 100).toFixed(2)}
            </p>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
              {t('claim.expires')}: {new Date(claimInfo.expiresAt).toLocaleDateString()}
            </p>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', margin: '16px 0 0' }}>
              {t('claim.loggedAs')}: <strong>{user?.email}</strong>
            </p>
            <button style={btn} onClick={handleClaim}>
              {t('claim.claimBtn')}
            </button>
          </>
        )}

        {/* Claiming */}
        {state === 'claiming' && (
          <>
            <div style={{ fontSize: '2rem', marginBottom: 12 }}>⏳</div>
            <p style={{ color: 'var(--text-secondary)' }}>{t('claim.processing')}</p>
          </>
        )}

        {/* Success */}
        {state === 'success' && (
          <>
            <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>✅</div>
            <h1 style={{ fontSize: '1.3rem', margin: '0 0 8px' }}>
              {t('claim.success')}
            </h1>
            <div style={creditsDisplay}>{claimInfo?.credits} {t('claim.credits')}</div>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: 4 }}>
              {t('claim.newBalance')}: <strong>{newBalance} {t('claim.credits')}</strong>
            </p>
            <button style={btn} onClick={() => router.push('/')}>
              {t('claim.goGenerate')}
            </button>
            <button style={btnSecondary} onClick={() => router.push('/companions')}>
              {t('claim.goCompanions')}
            </button>
          </>
        )}

        {/* Error */}
        {state === 'error' && (
          <>
            <div style={{ fontSize: '2rem', marginBottom: 12 }}>❌</div>
            <h1 style={{ fontSize: '1.3rem', margin: '0 0 8px', color: '#f87171' }}>
              {errorMsg === 'Already claimed'
                ? t('claim.alreadyClaimed')
                : errorMsg === 'Token expired'
                  ? t('claim.expired')
                  : errorMsg === 'Token not found'
                    ? t('claim.invalidLink')
                    : t('claim.error')}
            </h1>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: 16 }}>
              {errorMsg === 'Already claimed'
                ? t('claim.alreadyClaimedDesc')
                : errorMsg === 'Token expired'
                  ? t('claim.expiredDesc')
                  : errorMsg === 'Token not found'
                    ? t('claim.invalidLinkDesc')
                    : errorMsg}
            </p>
            <button style={btnSecondary} onClick={() => router.push('/')}>
              {t('claim.goHome')}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
