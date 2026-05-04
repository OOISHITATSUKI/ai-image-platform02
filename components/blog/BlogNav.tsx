'use client';

import Link from 'next/link';
import { useTranslation } from '@/lib/useTranslation';
import { useAppStore } from '@/lib/store';
import { locales } from '@/lib/i18n';
import type { Locale } from '@/lib/types';

const LANG_LABELS: Record<Locale, string> = {
  en: 'EN',
  ja: '日本語',
  es: 'ES',
  zh: '中文',
  ko: '한국어',
  pt: 'PT',
  hi: 'हिन्दी',
};

export default function BlogNav() {
  const { t, locale } = useTranslation();
  const { setLocale } = useAppStore();

  return (
    <nav style={{
      position: 'sticky',
      top: 0,
      zIndex: 100,
      background: 'rgba(20, 20, 46, 0.92)',
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
      borderBottom: '1px solid rgba(255,255,255,0.06)',
      padding: '14px 40px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
    }}>
      <Link href="/" style={{
        fontSize: '16px',
        fontWeight: 700,
        color: '#e5342a',
        textDecoration: 'none',
      }}>
        Image Nude
      </Link>
      <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
        <select
          value={locale}
          onChange={(e) => setLocale(e.target.value as Locale)}
          style={{
            padding: '5px 8px',
            borderRadius: '6px',
            border: '1px solid rgba(255,255,255,0.12)',
            background: 'rgba(255,255,255,0.06)',
            color: '#ccc',
            fontSize: '12px',
            cursor: 'pointer',
            outline: 'none',
          }}
        >
          {locales.map((l) => (
            <option key={l} value={l} style={{ background: '#1a1a2e' }}>
              {LANG_LABELS[l]}
            </option>
          ))}
        </select>
        <Link href="/blog" style={{
          fontSize: '14px',
          color: '#888',
          textDecoration: 'none',
        }}>
          {t('blog.nav.allArticles')}
        </Link>
        <Link href="/register" style={{
          background: '#e5342a',
          color: 'white',
          padding: '8px 20px',
          borderRadius: '8px',
          fontSize: '13px',
          fontWeight: 700,
          textDecoration: 'none',
        }}>
          {t('blog.nav.tryFree')}
        </Link>
      </div>
    </nav>
  );
}
