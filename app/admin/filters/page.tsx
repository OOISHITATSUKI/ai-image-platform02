'use client';

import { useState, useEffect } from 'react';

const CATEGORIES: Record<number, { label: string; keywords: string[] }> = {
    1: { label: 'Cat.1: 直接的な未成年表現', keywords: ['child', 'children', 'kid', 'minor', 'underage', 'preteen', 'infant', 'baby', 'toddler'] },
    2: { label: 'Cat.2: 実在人物', keywords: ['(real_persons.json で管理)'] },
    7: { label: 'Cat.7: サブカル隠語', keywords: ['loli', 'lolicon', 'shota', 'shotacon', 'jailbait', '萌え幼女', '幼女', 'ロリ', 'ショタ'] },
    9: { label: 'Cat.9: 変形スペル・隠語', keywords: ['ch1ld', 'k1d', 'l0li', 'sch00l', 'l0l1', 'c4ild', 'кид'] },
};

export default function AdminFiltersPage() {
    const [expandedCat, setExpandedCat] = useState<number | null>(1);
    const [testPrompt, setTestPrompt] = useState('');
    const [testResult, setTestResult] = useState<{ blocked: boolean; message: string } | null>(null);
    const [testLoading, setTestLoading] = useState(false);

    // Dynamic Keywords State
    const [dynamicKeywords, setDynamicKeywords] = useState<Record<string, string[]>>({});
    const [newKeyword, setNewKeyword] = useState<Record<number, string>>({});
    const [kwAdding, setKwAdding] = useState<number | null>(null);

    // Real Person State
    const [personCount, setPersonCount] = useState<number | null>(null);
    const [newNameEn, setNewNameEn] = useState('');
    const [newNameJa, setNewNameJa] = useState('');
    const [addLoading, setAddLoading] = useState(false);
    const [addMessage, setAddMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

    // Fetch on mount
    useEffect(() => {
        const fetchData = async () => {
            const token = localStorage.getItem('auth_token');
            const headers = { ...(token ? { Authorization: `Bearer ${token}` } : {}) };

            try {
                // Fetch Persons Count
                const pRes = await fetch('/api/admin/persons', { headers });
                if (pRes.ok) {
                    const pData = await pRes.json();
                    setPersonCount(pData.blocked_persons?.length || 0);
                }

                // Fetch Dynamic Keywords
                const kRes = await fetch('/api/admin/keywords', { headers });
                if (kRes.ok) {
                    const kData = await kRes.json();
                    setDynamicKeywords(kData.dynamicKeywords || {});
                }
            } catch (e) {
                console.error('Failed to load filter data', e);
            }
        };
        fetchData();
    }, []);

    const handleAddKeyword = async (catNum: number, e: React.FormEvent) => {
        e.preventDefault();
        const kw = newKeyword[catNum]?.trim();
        if (!kw) return;

        setKwAdding(catNum);
        const token = localStorage.getItem('auth_token');

        try {
            const res = await fetch('/api/admin/keywords', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { Authorization: `Bearer ${token}` } : {})
                },
                body: JSON.stringify({ category: String(catNum), keyword: kw }),
            });

            if (res.ok) {
                const data = await res.json();
                setDynamicKeywords(data.dynamicKeywords || {});
                setNewKeyword(prev => ({ ...prev, [catNum]: '' }));
            } else {
                alert('キーワードの追加に失敗しました');
            }
        } catch (e) {
            alert('通信エラーが発生しました');
        }
        setKwAdding(null);
    };

    const handleAddPerson = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newNameEn.trim() || !newNameJa.trim()) return;

        setAddLoading(true);
        setAddMessage(null);
        const token = localStorage.getItem('auth_token');

        try {
            const res = await fetch('/api/admin/persons', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { Authorization: `Bearer ${token}` } : {})
                },
                body: JSON.stringify({
                    name_en: newNameEn,
                    name_ja: newNameJa,
                    category: 'international_celebrity' // Default category for quick add
                }),
            });

            const data = await res.json();

            if (res.ok) {
                setAddMessage({ text: '✅ 登録しました', type: 'success' });
                setNewNameEn('');
                setNewNameJa('');
                setPersonCount(prev => (prev !== null ? prev + 1 : 1));
            } else {
                setAddMessage({ text: `❌ ${data.error}`, type: 'error' });
            }
        } catch (e) {
            setAddMessage({ text: '❌ 通信エラーが発生しました', type: 'error' });
        }
        setAddLoading(false);
    };

    const runTest = async () => {
        if (!testPrompt.trim()) return;
        setTestLoading(true);
        setTestResult(null);
        const token = localStorage.getItem('auth_token');
        try {
            const res = await fetch('/api/admin/test-filter', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
                body: JSON.stringify({ prompt: testPrompt }),
            });
            const data = await res.json();
            setTestResult(data);
        } catch (e) {
            setTestResult({ blocked: false, message: 'テストエラー: APIに接続できません' });
        }
        setTestLoading(false);
    };

    const inputStyle: React.CSSProperties = { padding: '10px 14px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '8px', color: 'var(--text-primary)', fontSize: '0.9rem' };
    const sectionStyle: React.CSSProperties = { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', padding: '20px 24px', marginBottom: '16px' };

    return (
        <div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '28px' }}>🔧 フィルター管理</h1>

            {/* Keyword Categories */}
            <div style={{ marginBottom: '32px' }}>
                <h2 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '16px', color: 'var(--text-secondary)' }}>ブロックキーワード（カテゴリ別）</h2>
                {Object.entries(CATEGORIES).map(([catNum, cat]) => {
                    const dynamicCatKws = dynamicKeywords[catNum] || [];
                    const allKws = [...cat.keywords, ...dynamicCatKws];
                    return (
                        <div key={catNum} style={sectionStyle}>
                            <button
                                onClick={() => setExpandedCat(expandedCat === Number(catNum) ? null : Number(catNum))}
                                style={{ background: 'none', border: 'none', color: 'var(--text-primary)', cursor: 'pointer', fontSize: '0.95rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px', width: '100%', textAlign: 'left', padding: 0 }}
                            >
                                <span style={{ color: '#f59e0b' }}>{expandedCat === Number(catNum) ? '▼' : '▶'}</span>
                                {cat.label} ({allKws.length})
                            </button>
                            {expandedCat === Number(catNum) && (
                                <div style={{ marginTop: '16px' }}>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                        {cat.keywords.map(kw => (
                                            <span key={kw} style={{ padding: '3px 10px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '6px', color: '#f87171', fontSize: '0.8rem' }}>
                                                {kw}
                                            </span>
                                        ))}
                                        {dynamicCatKws.map(kw => (
                                            <span key={`dyn-${kw}`} style={{ padding: '3px 10px', background: 'rgba(245,158,11,0.1)', border: '1px dashed rgba(245,158,11,0.5)', borderRadius: '6px', color: '#fbbf24', fontSize: '0.8rem' }}>
                                                {kw}
                                            </span>
                                        ))}
                                    </div>

                                    {/* Add Keyword Form */}
                                    {Number(catNum) !== 2 && ( /* Skip Category 2 since it has its own UI */
                                        <div style={{ marginTop: '16px', background: 'rgba(0,0,0,0.2)', padding: '12px', borderRadius: '8px', display: 'flex', gap: '8px', alignItems: 'center' }}>
                                            <input
                                                style={{ ...inputStyle, flex: 1, padding: '6px 10px' }}
                                                placeholder="追加するキーワード..."
                                                value={newKeyword[Number(catNum)] || ''}
                                                onChange={e => setNewKeyword(prev => ({ ...prev, [Number(catNum)]: e.target.value }))}
                                                onKeyDown={e => {
                                                    if (e.key === 'Enter') handleAddKeyword(Number(catNum), e);
                                                }}
                                            />
                                            <button
                                                onClick={e => handleAddKeyword(Number(catNum), e)}
                                                disabled={kwAdding === Number(catNum) || !newKeyword[Number(catNum)]?.trim()}
                                                style={{ padding: '6px 16px', background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '6px', color: '#fff', cursor: 'pointer', fontSize: '0.85rem', whiteSpace: 'nowrap' }}
                                            >
                                                {kwAdding === Number(catNum) ? '追加中...' : '追加'}
                                            </button>
                                        </div>
                                    )}

                                    <p style={{ marginTop: '12px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                                        ※ 静的キーワードの編集は `lib/security.ts` を直接編集してください。オレンジ枠は動的追加された項目です。
                                    </p>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Real Person Blocklist */}
            <div style={{ ...sectionStyle, marginBottom: '32px' }}>
                <h2 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '16px' }}>実在人物ブロックリスト</h2>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', marginBottom: '20px' }}>
                    <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                        現在登録: <strong style={{ color: 'var(--text-primary)' }}>{personCount !== null ? `${personCount}名` : '読み込み中...'}</strong> &nbsp;/&nbsp; 管理: <code style={{ color: '#60a5fa' }}>data/real_persons.json</code>
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <a href="/admin/filters/persons" style={{ padding: '6px 14px', background: 'rgba(167,139,250,0.1)', border: '1px solid rgba(167,139,250,0.3)', color: '#a78bfa', borderRadius: '8px', textDecoration: 'none', fontSize: '0.85rem' }}>
                            👁️ 一覧・詳細管理
                        </a>
                    </div>
                </div>

                {/* Quick Add Form */}
                <div style={{ background: 'rgba(0,0,0,0.2)', padding: '16px', borderRadius: '8px', border: '1px dashed rgba(255,255,255,0.1)' }}>
                    <h3 style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '12px' }}>＋ クイック追加</h3>
                    <form onSubmit={handleAddPerson} style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'flex-start' }}>
                        <div style={{ flex: '1 1 200px' }}>
                            <input
                                style={{ ...inputStyle, width: '100%', padding: '8px 12px' }}
                                placeholder="英語名 (例: Taylor Swift)"
                                value={newNameEn}
                                onChange={e => setNewNameEn(e.target.value)}
                                required
                            />
                        </div>
                        <div style={{ flex: '1 1 200px' }}>
                            <input
                                style={{ ...inputStyle, width: '100%', padding: '8px 12px' }}
                                placeholder="日本語名 (例: テイラースウィフト)"
                                value={newNameJa}
                                onChange={e => setNewNameJa(e.target.value)}
                                required
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={addLoading}
                            style={{ padding: '8px 24px', background: 'var(--primary)', border: 'none', borderRadius: '8px', color: '#fff', cursor: 'pointer', fontSize: '0.9rem', whiteSpace: 'nowrap', height: '37px' }}
                        >
                            {addLoading ? '...' : '追加'}
                        </button>
                    </form>
                    {addMessage && (
                        <div style={{ marginTop: '12px', fontSize: '0.85rem', color: addMessage.type === 'success' ? '#34d399' : '#f87171' }}>
                            {addMessage.text}
                        </div>
                    )}
                </div>
            </div>

            {/* Filter Test Tool */}
            <div style={sectionStyle}>
                <h2 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '16px' }}>🧪 フィルターテスト</h2>
                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                    <input
                        style={{ ...inputStyle, flex: 1, minWidth: '300px' }}
                        placeholder="テストプロンプトを入力..."
                        value={testPrompt}
                        onChange={e => setTestPrompt(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') runTest(); }}
                    />
                    <button
                        onClick={runTest}
                        disabled={testLoading}
                        style={{ padding: '10px 20px', background: 'var(--primary)', border: 'none', borderRadius: '8px', color: '#fff', cursor: 'pointer', fontSize: '0.9rem', whiteSpace: 'nowrap' }}
                    >
                        {testLoading ? '...' : '▶ テスト実行'}
                    </button>
                </div>

                {testResult && (
                    <div style={{
                        marginTop: '16px',
                        padding: '14px 18px',
                        borderRadius: '8px',
                        background: testResult.blocked ? 'rgba(239,68,68,0.1)' : 'rgba(16,185,129,0.1)',
                        border: `1px solid ${testResult.blocked ? 'rgba(239,68,68,0.4)' : 'rgba(16,185,129,0.4)'}`,
                        color: testResult.blocked ? '#f87171' : '#34d399',
                        fontSize: '0.9rem',
                    }}>
                        {testResult.blocked ? '🚫 ブロック' : '✅ 通過'} — {testResult.message}
                    </div>
                )}
            </div>
        </div>
    );
}
