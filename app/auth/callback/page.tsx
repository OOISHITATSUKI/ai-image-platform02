'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAppStore } from '@/lib/store';

function getCookie(name: string): string | null {
    if (typeof document === 'undefined') return null;
    const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
    return match ? decodeURIComponent(match[2]) : null;
}

function deleteCookie(name: string) {
    document.cookie = `${name}=; Max-Age=0; path=/`;
}

export default function AuthCallbackPage() {
    const router = useRouter();
    const { setUser } = useAppStore();

    useEffect(() => {
        const raw = getCookie('google_auth_result');
        deleteCookie('google_auth_result');

        if (!raw) {
            router.replace('/login?error=google_callback_failed');
            return;
        }

        let result: {
            token: string;
            unlockedCount: number;
            user: Record<string, unknown>;
        };
        try {
            result = JSON.parse(raw);
        } catch {
            router.replace('/login?error=google_callback_failed');
            return;
        }

        localStorage.setItem('auth_token', result.token);
        setUser(result.user as any);
        useAppStore.setState({ isAuthenticated: true, ageVerified: true });

        if (result.unlockedCount > 0) {
            localStorage.setItem('guest_unlocked_count', String(result.unlockedCount));
            localStorage.setItem('guest_unlocked_new', String(result.unlockedCount));
        }
        localStorage.removeItem('guest_gen_count');

        const destination = result.unlockedCount > 0 ? '/library' : '/';
        router.replace(destination);
    }, [router, setUser]);

    return (
        <div style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--text-secondary)',
            fontSize: '1rem',
        }}>
            Signing you in...
        </div>
    );
}
