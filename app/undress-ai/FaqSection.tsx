'use client';

import { useState } from 'react';
import styles from './page.module.css';

const FAQS = [
  { q: 'Is Image Nude free to use?', a: 'Yes. You receive 20 free credits upon registration — no credit card required. Each undress generation costs 5 credits, giving you 4 free generations to start.' },
  { q: 'Are my photos private and secure?', a: 'Absolutely. All uploaded and generated images are automatically deleted within 1 hour. We do not store, share, or train on your images. Your activity is never logged beyond session data.' },
  { q: 'What types of photos work best?', a: 'High-quality, well-lit photos with a single subject produce the best results. The clearer the original photo, the more realistic the output. Blurry or heavily compressed images may produce lower quality results.' },
  { q: 'Can I pay anonymously?', a: 'Yes. We accept 50+ cryptocurrencies including Bitcoin, Ethereum, and USDT. No personal payment information is required. The charge will not appear as an adult site on any statement.' },
  { q: 'Is this legal?', a: 'Image Nude is an AI tool for generating fictional AI imagery. All outputs are AI-generated and do not depict real individuals. You must be 18+ to use this service. Use is strictly prohibited for generating content depicting minors or non-consenting real individuals.' },
];

export default function FaqSection() {
  const [openIdx, setOpenIdx] = useState<number | null>(null);

  return (
    <section className={`${styles['lp-section']} ${styles['lp-faq-bg']}`}>
      <div className={styles['lp-section-inner']}>
        <div className={styles['lp-section-tag']}>FAQ</div>
        <h2 className={styles['lp-h2']}>Common questions</h2>

        <div className={styles['lp-faq-list']}>
          {FAQS.map((faq, i) => (
            <div key={i} className={styles['lp-faq-item']}>
              <div
                className={styles['lp-faq-q']}
                onClick={() => setOpenIdx(openIdx === i ? null : i)}
              >
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
