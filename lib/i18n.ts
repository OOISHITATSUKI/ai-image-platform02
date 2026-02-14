// ============================================================
// Simple i18n utility (client-side, using Zustand locale)
// ============================================================

import en from '@/messages/en.json';
import ja from '@/messages/ja.json';
import es from '@/messages/es.json';
import zh from '@/messages/zh.json';
import ko from '@/messages/ko.json';
import pt from '@/messages/pt.json';
import type { Locale } from './types';

export const locales: Locale[] = ['en', 'ja', 'es', 'zh', 'ko', 'pt'];
export const defaultLocale: Locale = 'en';

const messages: Record<Locale, Record<string, unknown>> = { en, ja, es, zh, ko, pt };

/**
 * Get a nested translation value by dot-separated key.
 * E.g. t('nav.home') returns 'Home' for locale 'en'.
 */
export function getTranslation(locale: Locale, key: string): string {
    const parts = key.split('.');
    let current: unknown = messages[locale] || messages['en'];
    for (const part of parts) {
        if (current && typeof current === 'object' && part in current) {
            current = (current as Record<string, unknown>)[part];
        } else {
            return key; // fallback to key if not found
        }
    }
    return typeof current === 'string' ? current : key;
}

/**
 * React hook-friendly translation function factory.
 */
export function createT(locale: Locale) {
    return (key: string, params?: Record<string, string | number>) => {
        let value = getTranslation(locale, key);
        if (params) {
            Object.entries(params).forEach(([k, v]) => {
                value = value.replace(`{${k}}`, String(v));
            });
        }
        return value;
    };
}
