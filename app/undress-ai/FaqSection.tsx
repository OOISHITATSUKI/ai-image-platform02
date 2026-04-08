'use client';

import { useState } from 'react';
import styles from './page.module.css';
import { useTranslation } from '@/lib/useTranslation';

export default function FaqSection() {
  const { t } = useTranslation();
  const [openIdx, setOpenIdx] = useState<number | null>(null);

  const FAQS = [
    { q: t('undressLp.faq.q1'), a: t('undressLp.faq.a1') },
    { q: t('undressLp.faq.q2'), a: t('undressLp.faq.a2') },
    { q: t('undressLp.faq.q3'), a: t('undressLp.faq.a3') },
    { q: t('undressLp.faq.q4'), a: t('undressLp.faq.a4') },
    { q: t('undressLp.faq.q5'), a: t('undressLp.faq.a5') },
  ];

  return (
    <section className={`${styles['lp-section']} ${styles['lp-faq-bg']}`}>
      <div className={styles['lp-section-inner']}>
        <div className={styles['lp-section-tag']}>{t('undressLp.faq.label')}</div>
        <h2 className={styles['lp-h2']}>{t('undressLp.faq.h2')}</h2>
        <div className={styles['lp-faq-list']}>
          {FAQS.map((faq, i) => (
            <div key={i} className={styles['lp-faq-item']}>
              <div className={styles['lp-faq-q']} onClick={() => setOpenIdx(openIdx === i ? null : i)}>
                {faq.q}
                <span className={styles['lp-faq-q-icon']}>{openIdx === i ? '\u2212' : '+'}</span>
              </div>
              <div className={`${styles['lp-faq-a']} ${openIdx === i ? styles['lp-faq-a-open'] : ''}`}>
                {faq.a}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
