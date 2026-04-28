'use client';

import { useEffect } from 'react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[ErrorBoundary]', error);

    // Auto-cleanup localStorage on storage/React errors
    const isStorageRelated =
      error.message?.includes('Minified React error') ||
      error.message?.includes('quota') ||
      error.message?.includes('Hooks') ||
      error.message?.includes('#310');

    if (isStorageRelated) {
      try {
        const keysToDelete: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && (key.startsWith('chat_history_') || key.startsWith('recent_messages_'))) {
            keysToDelete.push(key);
          }
        }
        keysToDelete.forEach(key => localStorage.removeItem(key));
        console.log(`[ErrorBoundary] Auto-cleaned ${keysToDelete.length} keys`);
      } catch {}
    }
  }, [error]);

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 20,
      background: '#1a1a2e',
      color: '#fff',
      textAlign: 'center',
    }}>
      <h2 style={{ fontSize: '1.5rem', marginBottom: 16 }}>
        Something went wrong
      </h2>
      <p style={{ color: '#aaa', marginBottom: 24, maxWidth: 480 }}>
        A temporary error occurred. Click below to reload.
      </p>
      <button
        onClick={() => {
          reset();
          window.location.reload();
        }}
        style={{
          padding: '12px 32px',
          background: '#7c3aed',
          color: '#fff',
          border: 'none',
          borderRadius: 8,
          fontSize: '1rem',
          cursor: 'pointer',
        }}
      >
        Reload
      </button>
    </div>
  );
}
