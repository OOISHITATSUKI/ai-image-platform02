'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAppStore } from '@/lib/store';
import { useTranslation } from '@/lib/useTranslation';

interface PendingToken {
  token: string;
  credits: number;
  purchaseType: string;
  amountCents: number;
  expiresAt: string;
}

export default function ClaimBanner() {
  const { user } = useAppStore();
  const { t } = useTranslation();
  const router = useRouter();
  const [pending, setPending] = useState<PendingToken[]>([]);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (!user) return;

    const token = localStorage.getItem('auth_token');
    if (!token) return;

    fetch('/api/claim/pending', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(res => res.json())
      .then(data => {
        if (data.tokens?.length > 0) {
          setPending(data.tokens);
        }
      })
      .catch(() => {});
  }, [user]);

  if (!pending.length || dismissed) return null;

  const totalCredits = pending.reduce((sum, t) => sum + t.credits, 0);

  return (
    <div style={{
      position: 'fixed',
      bottom: 20,
      left: '50%',
      transform: 'translateX(-50%)',
      zIndex: 9999,
      maxWidth: 440,
      width: 'calc(100% - 40px)',
      background: 'linear-gradient(135deg, rgba(167,139,250,0.95), rgba(244,114,182,0.95))',
      borderRadius: 16,
      padding: '16px 20px',
      boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
      display: 'flex',
      alignItems: 'center',
      gap: 12,
    }}>
      <div style={{ fontSize: '1.5rem' }}>🎁</div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#fff', marginBottom: 2 }}>
          {t('claim.bannerTitle') || `You have ${totalCredits} unclaimed credits!`}
        </div>
        <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.8)' }}>
          {pending.length === 1
            ? (t('claim.bannerDesc1') || 'From your Fanvue purchase')
            : (t('claim.bannerDescN') || `From ${pending.length} Fanvue purchases`)}
        </div>
      </div>
      <button
        onClick={() => router.push(`/claim/${pending[0].token}`)}
        style={{
          padding: '8px 16px',
          borderRadius: 10,
          fontWeight: 700,
          fontSize: '0.8rem',
          cursor: 'pointer',
          border: 'none',
          background: '#fff',
          color: '#7c3aed',
          whiteSpace: 'nowrap',
        }}
      >
        {t('claim.bannerBtn') || 'Claim'}
      </button>
      <button
        onClick={() => setDismissed(true)}
        style={{
          background: 'none',
          border: 'none',
          color: 'rgba(255,255,255,0.7)',
          cursor: 'pointer',
          fontSize: '1.1rem',
          padding: '0 4px',
        }}
      >
        ×
      </button>
    </div>
  );
}
