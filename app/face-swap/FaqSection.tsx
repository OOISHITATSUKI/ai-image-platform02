'use client';

import { useState } from 'react';
import styles from './page.module.css';

const FAQS = [
  { q: 'How realistic is the AI face swap?', a: 'Our AI uses advanced face blending technology that matches skin tone, lighting, shadows, and facial proportions. The results are virtually indistinguishable from real photos in most cases.' },
  { q: 'What kind of photos work best?', a: 'For best results, use clear, well-lit face photos where the face is front-facing or at a slight angle. The base image can be any pose or scene — our AI handles complex angles and lighting.' },
  { q: 'Is my data secure?', a: 'Yes. All uploaded images are automatically deleted within 1 hour. We use end-to-end encryption and never store or share your photos. Your sessions are fully private.' },
  { q: 'How many credits does a face swap cost?', a: 'Each face swap costs 2 credits. You get 20 free credits on sign up, enough for 10 face swaps to try the tool. No credit card required.' },
  { q: 'Can I pay anonymously?', a: 'Yes. We accept 50+ cryptocurrencies including Bitcoin, Ethereum, and USDT. No personal payment information is required.' },
];

export default function FaqSection() {
  const [openIdx, setOpenIdx] = useState<number | null>(null);

  return (
    <section className={styles['fs-section']}>
      <div className={styles['fs-container']}>
        <div className={styles['fs-section-header']}>
          <span className={styles['fs-label']}>FAQ</span>
          <h2 className={styles['fs-h2']}>Common questions</h2>
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
