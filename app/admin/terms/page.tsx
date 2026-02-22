'use client';

export default function AdminTermsPage() {
    const terms = [
        { label: '利用規約 (Terms of Service)', version: '2025-01-01', path: '/terms', status: '有効' },
        { label: 'コンテンツポリシー (Content Policy)', version: '2025-01-01', path: '/content-policy', status: '有効' },
        { label: 'プライバシーポリシー (Privacy Policy)', version: '2025-01-01', path: '/privacy', status: '有効' },
        { label: 'DMCAポリシー', version: '2025-01-01', path: '/dmca', status: '有効' },
        { label: '18 U.S.C 2257 コンプライアンス声明', version: '2025-01-01', path: '/2257', status: '有効' },
    ];

    return (
        <div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '24px' }}>📄 規約管理</h1>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {terms.map(t => (
                    <div key={t.path} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div>
                            <div style={{ fontWeight: 600, marginBottom: '4px' }}>{t.label}</div>
                            <div style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>バージョン: {t.version}</div>
                        </div>
                        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                            <span style={{ padding: '2px 10px', borderRadius: '6px', background: 'rgba(16,185,129,0.1)', color: '#10b981', fontSize: '0.8rem' }}>{t.status}</span>
                            <a href={t.path} target="_blank" rel="noreferrer" style={{ padding: '6px 14px', background: 'rgba(96,165,250,0.1)', border: '1px solid rgba(96,165,250,0.3)', color: '#60a5fa', borderRadius: '8px', textDecoration: 'none', fontSize: '0.8rem' }}>
                                👁️ 表示
                            </a>
                        </div>
                    </div>
                ))}
            </div>
            <p style={{ marginTop: '20px', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                ※ ページの内容は各 `app/(ポリシーページ)/page.tsx` ファイルを直接編集してください。
            </p>
        </div>
    );
}
