'use client';

import { useState } from 'react';
import styles from './page.module.css';
import { useTranslation } from '@/lib/useTranslation';

export default function FaqSection() {
  const { t } = useTranslation();
  const [openIdx, setOpenIdx] = useState<number | null>(null);

  const FAQS = [
    { q: t('faceSwapLp.faq.q1'), a: t('faceSwapLp.faq.a1') },
    { q: t('faceSwapLp.faq.q2'), a: t('faceSwapLp.faq.a2') },
    { q: t('faceSwapLp.faq.q3'), a: t('faceSwapLp.faq.a3') },
    { q: t('faceSwapLp.faq.q4'), a: t('faceSwapLp.faq.a4') },
    { q: t('faceSwapLp.faq.q5'), a: t('faceSwapLp.faq.a5') },
  ];

  return (
    <section className={styles['fs-section']}>
      <div className={styles['fs-container']}>
        <div className={styles['fs-section-header']}>
          <span className={styles['fs-label']}>{t('faceSwapLp.faq.label')}</span>
          <h2 className={styles['fs-h2']}>{t('faceSwapLp.faq.h2')}</h2>
        </div>
        <div style={{ maxWidth: 700, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 12 }}>
          {FAQS.map((faq, i) => (
            <div key={i} style={{ background: '#111', border: '1px solid #2a1515', borderRadius: 12, overflow: 'hidden' }}>
              <div
                onClick={() => setOpenIdx(openIdx === i ? null : i)}
                style={{ padding: '20px 24px', fontSize: 15, fontWeight: 600, cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
              >
                {faq.q}
                <span style={{ fontSize: 20, color: '#ff6b4a', fontWeight: 400 }}>{openIdx === i ? '\u2212' : '+'}</span>
              </div>
              <div style={{
                maxHeight: openIdx === i ? 300 : 0,
                overflow: 'hidden',
                transition: 'max-height 0.3s ease',
              }}>
                <p style={{ padding: '0 24px 20px', fontSize: 14, color: '#888', lineHeight: 1.7, margin: 0 }}>
                  {faq.a}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
