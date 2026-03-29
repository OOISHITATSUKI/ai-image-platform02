'use client';

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
};

interface LangSelectorProps {
  style?: React.CSSProperties;
}

export default function LangSelector({ style }: LangSelectorProps) {
  const { locale } = useTranslation();
  const { setLocale } = useAppStore();

  return (
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
        ...style,
      }}
    >
      {locales.map((l) => (
        <option key={l} value={l} style={{ background: '#1a1a2e' }}>
          {LANG_LABELS[l]}
        </option>
      ))}
    </select>
  );
}
