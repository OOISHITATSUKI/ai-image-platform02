'use client';

export default function AdminContentPage() {
    return (
        <div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '24px' }}>🖼️ コンテンツ管理</h1>
            <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', padding: '32px', color: 'var(--text-secondary)' }}>
                <p style={{ marginBottom: '16px', fontSize: '1rem', color: 'var(--text-primary)' }}>⚠️ 将来的な実装用ページです</p>
                <ul style={{ lineHeight: 2, listStyle: 'disc', paddingLeft: '24px' }}>
                    <li>ユーザーが報告したコンテンツの一覧</li>
                    <li>生成画像の手動レビュー</li>
                    <li>問題のある画像の一括削除</li>
                    <li>ユーザーからの問い合わせ管理</li>
                </ul>
            </div>
        </div>
    );
}
