'use client';

import { useMemo } from 'react';
import { useAppStore } from './store';
import { createT } from './i18n';

/**
 * Custom hook for i18n translations.
 * Usage:
 *   const { t } = useTranslation();
 *   t('nav.home') // => "Home" or "ホーム" etc.
 */
export function useTranslation() {
    const locale = useAppStore((s) => s.locale);
    const t = useMemo(() => createT(locale), [locale]);
    return { t, locale };
}
