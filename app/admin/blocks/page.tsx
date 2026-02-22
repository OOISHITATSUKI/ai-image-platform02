'use client';

import { useEffect, useState } from 'react';

interface BlockEntry {
    id: string;
    userId?: string;
    prompt: string;
    hitCategory: number;
    hitRule: string;
    action: string;
    ipAddress?: string;
    createdAt: number;
}

const actionColor = (action: string) => {
    if (action === 'permanent_ban') return '#ef4444';
    if (action === 'temp_ban') return '#f59e0b';
    return '#60a5fa';
};

const actionLabel = (action: string) => {
    if (action === 'permanent_ban') return '永久BAN';
    if (action === 'temp_ban') return '一時停止';
    return '警告';
};

export default function AdminBlocksPage() {
    const [blocks, setBlocks] = useState<BlockEntry[]>([]);
    const [filtered, setFiltered] = useState<BlockEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [filterAction, setFilterAction] = useState('all');
    const [filterCat, setFilterCat] = useState('all');

    useEffect(() => {
        const token = localStorage.getItem('auth_token');
        fetch('/api/admin/blocks', {
            headers: { Authorization: token ?? '' },
        })
            .then(r => r.json())
            .then(data => { setBlocks(data.blocks ?? []); setLoading(false); });
    }, []);

    useEffect(() => {
        let f = [...blocks];
        if (search) f = f.filter(b => b.userId?.includes(search) || b.ipAddress?.includes(search));
        if (filterAction !== 'all') f = f.filter(b => b.action === filterAction);
        if (filterCat !== 'all') f = f.filter(b => b.hitCategory === Number(filterCat));
        setFiltered(f);
    }, [blocks, search, filterAction, filterCat]);

    const exportCSV = () => {
        const header = 'ID,UserID,Prompt,Category,Rule,Action,IP,Date\n';
        const rows = filtered.map(b =>
            `"${b.id}","${b.userId ?? ''}","${b.prompt.replace(/"/g, '""')}",${b.hitCategory},"${b.hitRule}","${b.action}","${b.ipAddress ?? ''}","${new Date(b.createdAt).toISOString()}"`
        ).join('\n');
        const blob = new Blob([header + rows], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a'); a.href = url; a.download = 'block_logs.csv'; a.click();
        URL.revokeObjectURL(url);
    };

    const inputStyle: React.CSSProperties = { padding: '8px 12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '8px', color: 'var(--text-primary)', fontSize: '0.85rem' };

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <h1 style={{ fontSize: '1.5rem', fontWeight: 700 }}>🚫 ブロックログ</h1>
                <button onClick={exportCSV} style={{ padding: '8px 16px', background: 'var(--primary)', border: 'none', borderRadius: '8px', color: '#fff', cursor: 'pointer', fontSize: '0.85rem' }}>
                    📥 CSVエクスポート
                </button>
            </div>

            {/* Filters */}
            <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' }}>
                <input style={inputStyle} placeholder="ユーザーID / IP で検索" value={search} onChange={e => setSearch(e.target.value)} />
                <select style={inputStyle} value={filterCat} onChange={e => setFilterCat(e.target.value)}>
                    <option value="all">カテゴリ: すべて</option>
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(c => <option key={c} value={c}>Cat.{c}</option>)}
                </select>
                <select style={inputStyle} value={filterAction} onChange={e => setFilterAction(e.target.value)}>
                    <option value="all">アクション: すべて</option>
                    <option value="warning">警告</option>
                    <option value="temp_ban">一時停止</option>
                    <option value="permanent_ban">永久BAN</option>
                </select>
                <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', alignSelf: 'center' }}>{filtered.length}件</span>
            </div>

            {loading ? (
                <div style={{ color: 'var(--text-secondary)' }}>Loading...</div>
            ) : (
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                        <thead>
                            <tr style={{ background: 'rgba(255,255,255,0.04)', color: 'var(--text-secondary)' }}>
                                {['日時', 'ユーザーID', 'プロンプト', 'カテゴリ', 'ルール', 'アクション', 'IP'].map(h => (
                                    <th key={h} style={{ padding: '10px 14px', textAlign: 'left', borderBottom: '1px solid rgba(255,255,255,0.08)', whiteSpace: 'nowrap' }}>{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.map(b => (
                                <tr key={b.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                    <td style={{ padding: '9px 14px', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>{new Date(b.createdAt).toLocaleString('ja-JP')}</td>
                                    <td style={{ padding: '9px 14px', maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis' }}>{b.userId ?? '-'}</td>
                                    <td style={{ padding: '9px 14px', color: '#f59e0b', maxWidth: 260, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={b.prompt}>{b.prompt}</td>
                                    <td style={{ padding: '9px 14px' }}><span style={{ padding: '2px 8px', borderRadius: '4px', background: 'rgba(239,68,68,0.2)', color: '#f87171', fontSize: '0.8rem' }}>Cat.{b.hitCategory}</span></td>
                                    <td style={{ padding: '9px 14px', color: 'var(--text-secondary)', fontSize: '0.8rem' }}>{b.hitRule}</td>
                                    <td style={{ padding: '9px 14px' }}><span style={{ padding: '2px 8px', borderRadius: '4px', background: `${actionColor(b.action)}25`, color: actionColor(b.action), fontSize: '0.8rem' }}>{actionLabel(b.action)}</span></td>
                                    <td style={{ padding: '9px 14px', color: 'var(--text-secondary)', fontSize: '0.8rem' }}>{b.ipAddress ?? '-'}</td>
                                </tr>
                            ))}
                            {filtered.length === 0 && (
                                <tr><td colSpan={7} style={{ padding: '32px', textAlign: 'center', color: 'var(--text-secondary)' }}>ブロックログはありません</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
