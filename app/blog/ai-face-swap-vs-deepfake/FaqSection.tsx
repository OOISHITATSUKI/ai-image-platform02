'use client';

import { useState } from 'react';
import styles from './page.module.css';

const FAQS = [
  {
    q: 'Is AI face swap the same as deepfake?',
    a: 'No. Deepfake refers specifically to AI-manipulated video of real people, typically without consent. AI face swap is a broader term — it covers tools that blend faces in images or video and can be used legally with AI-generated content.',
  },
  {
    q: 'Is AI face swap legal?',
    a: 'AI face swap on AI-generated images is generally legal. Creating non-consensual imagery of real, identifiable people is illegal in many jurisdictions and prohibited on all reputable platforms.',
  },
  {
    q: "What's the best AI face swap tool for adult content?",
    a: 'Image Nude leads in 2026 for NSFW AI face swap — realistic results, automatic 1-hour image deletion for privacy, and cryptocurrency payment support for anonymous purchases.',
  },
  {
    q: 'Can AI face swap work on fully AI-generated images?',
    a: 'Yes — and AI-generated bodies actually produce the best face swap results. Consistent lighting and skin rendering in AI images makes the face blend more seamlessly than real photographs.',
  },
];

export default function FaqSection() {
  const [open, setOpen] = useState<number | null>(null);

  return (
    <div>
      {FAQS.map((item, i) => (
        <div key={i} className={styles.faqItem}>
          <button
            className={styles.faqQ}
            onClick={() => setOpen(open === i ? null : i)}
            aria-expanded={open === i}
          >
            <span>{item.q}</span>
            <span className={styles.faqToggle}>{open === i ? '−' : '+'}</span>
          </button>
          {open === i && (
            <p className={styles.faqA}>{item.a}</p>
          )}
        </div>
      ))}
    </div>
  );
}
