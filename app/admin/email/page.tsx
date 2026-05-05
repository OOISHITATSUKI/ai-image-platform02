'use client';

import { useCallback, useEffect, useState } from 'react';

interface EmailTemplate {
    id: string;
    name: string;
    subject: string;
    body: string;
    createdAt?: number;
}

interface StepEmailStep {
    delayHours: number;
    subject: string;
    body: string;
}

interface StepEmailSequence {
    id: string;
    name: string;
    trigger: 'on_registration' | 'manual';
    steps: StepEmailStep[];
    active: boolean;
    pendingCount?: number;
    createdAt?: number;
}

const inputStyle: React.CSSProperties = { padding: '8px 12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '8px', color: 'var(--text-primary)', fontSize: '0.85rem' };
const btnStyle = (color: string): React.CSSProperties => ({ padding: '4px 10px', background: `${color}20`, border: `1px solid ${color}50`, color, borderRadius: '6px', cursor: 'pointer', fontSize: '0.75rem', whiteSpace: 'nowrap' });
const sectionStyle: React.CSSProperties = { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '24px', marginBottom: '28px' };
const sectionTitle: React.CSSProperties = { fontSize: '1.1rem', fontWeight: 700, margin: '0 0 16px', color: '#e0e0ee' };
const labelStyle: React.CSSProperties = { display: 'block', marginBottom: '6px', fontSize: '0.8rem', color: '#9999ae' };
const modalOverlay: React.CSSProperties = { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 };
const modalBox: React.CSSProperties = { background: '#1a1a2e', borderRadius: '12px', padding: '32px', width: '600px', maxWidth: '90vw', maxHeight: '85vh', overflowY: 'auto', border: '1px solid rgba(255,255,255,0.1)' };

export default function AdminEmailPage() {
    // ========== TEMPLATES STATE ==========
    const [templates, setTemplates] = useState<EmailTemplate[]>([]);
    const [templatesLoading, setTemplatesLoading] = useState(true);
    const [templateModal, setTemplateModal] = useState<{ mode: 'create' | 'edit'; template?: EmailTemplate } | null>(null);
    const [tplName, setTplName] = useState('');
    const [tplSubject, setTplSubject] = useState('');
    const [tplBody, setTplBody] = useState('');
    const [tplSaving, setTplSaving] = useState(false);

    // ========== BULK EMAIL STATE ==========
    const [bulkFilter, setBulkFilter] = useState('all');
    const [bulkTemplate, setBulkTemplate] = useState('custom');
    const [bulkSubject, setBulkSubject] = useState('');
    const [bulkBody, setBulkBody] = useState('');
    const [bulkSending, setBulkSending] = useState(false);

    // ========== STEP EMAILS STATE ==========
    const [sequences, setSequences] = useState<StepEmailSequence[]>([]);
    const [seqLoading, setSeqLoading] = useState(true);
    const [seqModal, setSeqModal] = useState<{ mode: 'create' | 'edit'; sequence?: StepEmailSequence } | null>(null);
    const [seqName, setSeqName] = useState('');
    const [seqTrigger, setSeqTrigger] = useState<'on_registration' | 'manual'>('on_registration');
    const [seqSteps, setSeqSteps] = useState<StepEmailStep[]>([{ delayHours: 0, subject: '', body: '' }]);
    const [seqSaving, setSeqSaving] = useState(false);

    const authHeaders = (): Record<string, string> => {
        const token = localStorage.getItem('auth_token');
        return { 'Content-Type': 'application/json', Authorization: token ?? '' };
    };

    // ========== TEMPLATES API ==========
    const fetchTemplates = useCallback(async () => {
        setTemplatesLoading(true);
        try {
            const res = await fetch('/api/admin/email-templates', { headers: authHeaders() });
            const data = await res.json();
            setTemplates(data.templates ?? []);
        } catch { /* ignore */ }
        setTemplatesLoading(false);
    }, []);

    const saveTemplate = async () => {
        if (!tplName.trim() || !tplSubject.trim() || !tplBody.trim()) return;
        setTplSaving(true);
        try {
            const method = templateModal?.mode === 'edit' ? 'PUT' : 'POST';
            const payload: Record<string, string> = { name: tplName, subject: tplSubject, body: tplBody };
            if (templateModal?.mode === 'edit' && templateModal.template) {
                payload.id = templateModal.template.id;
            }
            const res = await fetch('/api/admin/email-templates', { method, headers: authHeaders(), body: JSON.stringify(payload) });
            const data = await res.json();
            if (data.success) {
                setTemplateModal(null);
                fetchTemplates();
            } else {
                alert(`エラー: ${data.error}`);
            }
        } catch { alert('テンプレートの保存に失敗しました'); }
        setTplSaving(false);
    };

    const deleteTemplate = async (id: string) => {
        if (!confirm('このテンプレートを削除しますか？')) return;
        try {
            const res = await fetch('/api/admin/email-templates', { method: 'DELETE', headers: authHeaders(), body: JSON.stringify({ id }) });
            const data = await res.json();
            if (data.success) fetchTemplates();
            else alert(`エラー: ${data.error}`);
        } catch { alert('テンプレートの削除に失敗しました'); }
    };

    // ========== BULK EMAIL API ==========
    const sendBulkEmail = async () => {
        if (!bulkSubject.trim() || !bulkBody.trim()) return;
        const filterLabel = bulkFilter === 'all' ? '全ユーザー' : bulkFilter === 'free' ? '無料プランユーザー' : '有料プランユーザー';
        if (!confirm(`${filterLabel}にメールを送信しますか？`)) return;
        setBulkSending(true);
        try {
            const res = await fetch('/api/admin/send-email', {
                method: 'POST',
                headers: authHeaders(),
                body: JSON.stringify({ filter: bulkFilter, subject: bulkSubject, body: bulkBody }),
            });
            const data = await res.json();
            if (data.success) {
                alert(`${data.sentCount ?? 0}人にメールを送信しました`);
                setBulkSubject('');
                setBulkBody('');
                setBulkTemplate('custom');
            } else {
                alert(`エラー: ${data.error}`);
            }
        } catch { alert('一括メールの送信に失敗しました'); }
        setBulkSending(false);
    };

    // ========== STEP EMAILS API ==========
    const fetchSequences = useCallback(async () => {
        setSeqLoading(true);
        try {
            const res = await fetch('/api/admin/step-emails', { headers: authHeaders() });
            const data = await res.json();
            setSequences(data.sequences ?? []);
        } catch { /* ignore */ }
        setSeqLoading(false);
    }, []);

    const saveSequence = async () => {
        if (!seqName.trim() || seqSteps.length === 0) return;
        setSeqSaving(true);
        try {
            const method = seqModal?.mode === 'edit' ? 'PUT' : 'POST';
            const payload: Record<string, unknown> = { name: seqName, trigger: seqTrigger, steps: seqSteps };
            if (seqModal?.mode === 'edit' && seqModal.sequence) {
                payload.id = seqModal.sequence.id;
            }
            const res = await fetch('/api/admin/step-emails', { method, headers: authHeaders(), body: JSON.stringify(payload) });
            const data = await res.json();
            if (data.success) {
                setSeqModal(null);
                fetchSequences();
            } else {
                alert(`エラー: ${data.error}`);
            }
        } catch { alert('シーケンスの保存に失敗しました'); }
        setSeqSaving(false);
    };

    const deleteSequence = async (id: string) => {
        if (!confirm('このシーケンスを削除しますか？待機中のメールもキャンセルされます。')) return;
        try {
            const res = await fetch('/api/admin/step-emails', { method: 'DELETE', headers: authHeaders(), body: JSON.stringify({ id }) });
            const data = await res.json();
            if (data.success) fetchSequences();
            else alert(`エラー: ${data.error}`);
        } catch { alert('シーケンスの削除に失敗しました'); }
    };

    const toggleSequence = async (seq: StepEmailSequence) => {
        try {
            const res = await fetch('/api/admin/step-emails', {
                method: 'PUT',
                headers: authHeaders(),
                body: JSON.stringify({ id: seq.id, name: seq.name, trigger: seq.trigger, steps: seq.steps, active: !seq.active }),
            });
            const data = await res.json();
            if (data.success) fetchSequences();
            else alert(`エラー: ${data.error}`);
        } catch { alert('ステータスの切り替えに失敗しました'); }
    };

    useEffect(() => { fetchTemplates(); fetchSequences(); }, [fetchTemplates, fetchSequences]);

    const handleBulkTemplateChange = (templateId: string) => {
        setBulkTemplate(templateId);
        if (templateId === 'custom') {
            setBulkSubject('');
            setBulkBody('');
        } else {
            const tpl = templates.find(t => t.id === templateId);
            if (tpl) {
                setBulkSubject(tpl.subject);
                setBulkBody(tpl.body);
            }
        }
    };

    const openTemplateModal = (mode: 'create' | 'edit', template?: EmailTemplate) => {
        setTemplateModal({ mode, template });
        setTplName(template?.name ?? '');
        setTplSubject(template?.subject ?? '');
        setTplBody(template?.body ?? '');
    };

    const openSeqModal = (mode: 'create' | 'edit', sequence?: StepEmailSequence) => {
        setSeqModal({ mode, sequence });
        setSeqName(sequence?.name ?? '');
        setSeqTrigger(sequence?.trigger ?? 'on_registration');
        setSeqSteps(sequence?.steps?.length ? [...sequence.steps] : [{ delayHours: 0, subject: '', body: '' }]);
    };

    const updateStep = (idx: number, field: keyof StepEmailStep, value: string | number) => {
        setSeqSteps(prev => prev.map((s, i) => i === idx ? { ...s, [field]: value } : s));
    };

    const addStep = () => {
        setSeqSteps(prev => [...prev, { delayHours: 24, subject: '', body: '' }]);
    };

    const removeStep = (idx: number) => {
        if (seqSteps.length <= 1) return;
        setSeqSteps(prev => prev.filter((_, i) => i !== idx));
    };

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '24px' }}>
                <h1 style={{ fontSize: '1.5rem', fontWeight: 700 }}>メール管理</h1>
            </div>

            {/* ========== SECTION A: TEMPLATES ========== */}
            <div style={sectionStyle}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <h2 style={sectionTitle}>テンプレート管理</h2>
                    <button
                        onClick={() => openTemplateModal('create')}
                        disabled={templates.length >= 5}
                        style={{
                            ...btnStyle('#7c5cfc'),
                            padding: '6px 14px',
                            fontSize: '0.85rem',
                            opacity: templates.length >= 5 ? 0.4 : 1,
                            cursor: templates.length >= 5 ? 'not-allowed' : 'pointer',
                        }}
                    >
                        + 新規作成 {templates.length >= 5 ? '(上限5件)' : `(${templates.length}/5)`}
                    </button>
                </div>

                {templatesLoading ? (
                    <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>読み込み中...</div>
                ) : templates.length === 0 ? (
                    <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', padding: '20px 0', textAlign: 'center' }}>テンプレートがありません。最初のテンプレートを作成してください。</div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {templates.map(tpl => (
                            <div key={tpl.id} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '8px', padding: '14px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ fontWeight: 600, fontSize: '0.9rem', color: '#e0e0ee', marginBottom: '4px' }}>{tpl.name}</div>
                                    <div style={{ fontSize: '0.8rem', color: '#60a5fa', marginBottom: '2px' }}>{tpl.subject}</div>
                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '500px' }}>
                                        {tpl.body.replace(/<[^>]*>/g, '').substring(0, 100)}...
                                    </div>
                                </div>
                                <div style={{ display: 'flex', gap: '6px', marginLeft: '12px', flexShrink: 0 }}>
                                    <button onClick={() => openTemplateModal('edit', tpl)} style={btnStyle('#60a5fa')}>編集</button>
                                    <button onClick={() => deleteTemplate(tpl.id)} style={btnStyle('#ef4444')}>削除</button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* ========== SECTION B: BULK EMAIL ========== */}
            <div style={sectionStyle}>
                <h2 style={sectionTitle}>一括メール送信</h2>
                <div style={{ display: 'flex', gap: '12px', marginBottom: '14px', flexWrap: 'wrap' }}>
                    <div>
                        <label style={labelStyle}>送信対象</label>
                        <select style={{ ...inputStyle, minWidth: '160px' }} value={bulkFilter} onChange={e => setBulkFilter(e.target.value)}>
                            <option value="all">全ユーザー</option>
                            <option value="free">無料プラン</option>
                            <option value="paid">有料プラン</option>
                        </select>
                    </div>
                    <div>
                        <label style={labelStyle}>テンプレート</label>
                        <select style={{ ...inputStyle, minWidth: '200px' }} value={bulkTemplate} onChange={e => handleBulkTemplateChange(e.target.value)}>
                            <option value="custom">カスタム</option>
                            {templates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                        </select>
                    </div>
                </div>
                <div style={{ marginBottom: '14px' }}>
                    <label style={labelStyle}>件名</label>
                    <input style={{ ...inputStyle, width: '100%', boxSizing: 'border-box' }} placeholder="メールの件名..." value={bulkSubject} onChange={e => setBulkSubject(e.target.value)} />
                </div>
                <div style={{ marginBottom: '16px' }}>
                    <label style={labelStyle}>本文（HTML対応）</label>
                    <textarea style={{ ...inputStyle, width: '100%', boxSizing: 'border-box', minHeight: '120px', resize: 'vertical', fontFamily: 'inherit' }} placeholder="メール本文..." value={bulkBody} onChange={e => setBulkBody(e.target.value)} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <button
                        onClick={sendBulkEmail}
                        disabled={bulkSending || !bulkSubject.trim() || !bulkBody.trim()}
                        style={{
                            padding: '8px 20px',
                            background: bulkSending ? '#333' : '#7c5cfc',
                            border: 'none',
                            color: '#fff',
                            borderRadius: '8px',
                            cursor: bulkSending ? 'not-allowed' : 'pointer',
                            fontSize: '0.85rem',
                            fontWeight: 600,
                        }}
                    >
                        {bulkSending ? '送信中...' : '一括送信'}
                    </button>
                </div>
            </div>

            {/* ========== SECTION C: STEP EMAILS ========== */}
            <div style={sectionStyle}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <h2 style={sectionTitle}>ステップメール</h2>
                    <button onClick={() => openSeqModal('create')} style={{ ...btnStyle('#7c5cfc'), padding: '6px 14px', fontSize: '0.85rem' }}>
                        + 新規シーケンス
                    </button>
                </div>

                {seqLoading ? (
                    <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>読み込み中...</div>
                ) : sequences.length === 0 ? (
                    <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', padding: '20px 0', textAlign: 'center' }}>シーケンスがありません。最初のステップメールを作成してください。</div>
                ) : (
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                            <thead>
                                <tr style={{ background: 'rgba(255,255,255,0.04)', color: 'var(--text-secondary)' }}>
                                    {['名前', 'トリガー', 'ステップ数', 'ステータス', '待機中', 'アクション'].map(h => (
                                        <th key={h} style={{ padding: '10px 14px', textAlign: 'left', borderBottom: '1px solid rgba(255,255,255,0.08)', whiteSpace: 'nowrap' }}>{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {sequences.map(seq => (
                                    <tr key={seq.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                        <td style={{ padding: '9px 14px', fontWeight: 600 }}>{seq.name}</td>
                                        <td style={{ padding: '9px 14px', color: '#a78bfa' }}>
                                            {seq.trigger === 'on_registration' ? '登録時' : '手動'}
                                        </td>
                                        <td style={{ padding: '9px 14px', color: '#60a5fa' }}>{seq.steps.length}</td>
                                        <td style={{ padding: '9px 14px' }}>
                                            <span style={{
                                                padding: '2px 8px', borderRadius: '4px', fontSize: '0.8rem',
                                                background: seq.active ? '#10b98120' : '#ef444420',
                                                color: seq.active ? '#10b981' : '#ef4444',
                                            }}>
                                                {seq.active ? '有効' : '無効'}
                                            </span>
                                        </td>
                                        <td style={{ padding: '9px 14px', color: '#f59e0b' }}>{seq.pendingCount ?? 0}件</td>
                                        <td style={{ padding: '9px 14px' }}>
                                            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                                                <button onClick={() => toggleSequence(seq)} style={btnStyle(seq.active ? '#f59e0b' : '#10b981')}>
                                                    {seq.active ? '無効化' : '有効化'}
                                                </button>
                                                <button onClick={() => openSeqModal('edit', seq)} style={btnStyle('#60a5fa')}>編集</button>
                                                <button onClick={() => deleteSequence(seq.id)} style={btnStyle('#ef4444')}>削除</button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* ========== TEMPLATE MODAL ========== */}
            {templateModal && (
                <div style={modalOverlay} onClick={() => setTemplateModal(null)}>
                    <div style={modalBox} onClick={e => e.stopPropagation()}>
                        <h2 style={{ margin: '0 0 20px', fontSize: '1.2rem', color: '#e0e0ee' }}>
                            {templateModal.mode === 'create' ? 'テンプレート作成' : 'テンプレート編集'}
                        </h2>

                        <div style={{ marginBottom: '14px' }}>
                            <label style={labelStyle}>テンプレート名</label>
                            <input style={{ ...inputStyle, width: '100%', boxSizing: 'border-box' }} placeholder="例: ウェルカムメール" value={tplName} onChange={e => setTplName(e.target.value)} />
                        </div>

                        <div style={{ marginBottom: '14px' }}>
                            <label style={labelStyle}>件名</label>
                            <input style={{ ...inputStyle, width: '100%', boxSizing: 'border-box' }} placeholder="メールの件名..." value={tplSubject} onChange={e => setTplSubject(e.target.value)} />
                        </div>

                        <div style={{ marginBottom: '20px' }}>
                            <label style={labelStyle}>本文（HTML）</label>
                            <textarea style={{ ...inputStyle, width: '100%', boxSizing: 'border-box', minHeight: '200px', resize: 'vertical', fontFamily: 'monospace', fontSize: '0.8rem' }} placeholder="<h1>こんにちは！</h1><p>メール本文をここに...</p>" value={tplBody} onChange={e => setTplBody(e.target.value)} />
                        </div>

                        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                            <button onClick={() => setTemplateModal(null)} style={{ ...btnStyle('#6b6b85'), padding: '8px 16px', fontSize: '0.85rem' }}>キャンセル</button>
                            <button
                                onClick={saveTemplate}
                                disabled={tplSaving || !tplName.trim() || !tplSubject.trim() || !tplBody.trim()}
                                style={{
                                    padding: '8px 20px', background: tplSaving ? '#333' : '#7c5cfc', border: 'none', color: '#fff',
                                    borderRadius: '8px', cursor: tplSaving ? 'not-allowed' : 'pointer', fontSize: '0.85rem', fontWeight: 600,
                                }}
                            >
                                {tplSaving ? '保存中...' : '保存'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ========== SEQUENCE MODAL ========== */}
            {seqModal && (
                <div style={modalOverlay} onClick={() => setSeqModal(null)}>
                    <div style={modalBox} onClick={e => e.stopPropagation()}>
                        <h2 style={{ margin: '0 0 20px', fontSize: '1.2rem', color: '#e0e0ee' }}>
                            {seqModal.mode === 'create' ? 'シーケンス作成' : 'シーケンス編集'}
                        </h2>

                        <div style={{ display: 'flex', gap: '12px', marginBottom: '14px' }}>
                            <div style={{ flex: 1 }}>
                                <label style={labelStyle}>シーケンス名</label>
                                <input style={{ ...inputStyle, width: '100%', boxSizing: 'border-box' }} placeholder="例: ウェルカムシリーズ" value={seqName} onChange={e => setSeqName(e.target.value)} />
                            </div>
                            <div style={{ minWidth: '180px' }}>
                                <label style={labelStyle}>トリガー</label>
                                <select style={{ ...inputStyle, width: '100%', boxSizing: 'border-box' }} value={seqTrigger} onChange={e => setSeqTrigger(e.target.value as 'on_registration' | 'manual')}>
                                    <option value="on_registration">登録時</option>
                                    <option value="manual">手動</option>
                                </select>
                            </div>
                        </div>

                        <div style={{ marginBottom: '14px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                                <label style={{ ...labelStyle, margin: 0 }}>ステップ</label>
                                <button onClick={addStep} style={{ ...btnStyle('#10b981'), padding: '4px 12px' }}>+ ステップ追加</button>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                {seqSteps.map((step, idx) => (
                                    <div key={idx} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '8px', padding: '14px' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                                            <span style={{ fontSize: '0.8rem', color: '#a78bfa', fontWeight: 600 }}>ステップ {idx + 1}</span>
                                            {seqSteps.length > 1 && (
                                                <button onClick={() => removeStep(idx)} style={btnStyle('#ef4444')}>削除</button>
                                            )}
                                        </div>
                                        <div style={{ display: 'flex', gap: '10px', marginBottom: '8px' }}>
                                            <div style={{ width: '140px' }}>
                                                <label style={{ ...labelStyle, fontSize: '0.7rem' }}>遅延（時間）</label>
                                                <input type="number" min={0} style={{ ...inputStyle, width: '100%', boxSizing: 'border-box' }} value={step.delayHours} onChange={e => updateStep(idx, 'delayHours', Number(e.target.value))} />
                                            </div>
                                            <div style={{ flex: 1 }}>
                                                <label style={{ ...labelStyle, fontSize: '0.7rem' }}>件名</label>
                                                <input style={{ ...inputStyle, width: '100%', boxSizing: 'border-box' }} placeholder="ステップの件名..." value={step.subject} onChange={e => updateStep(idx, 'subject', e.target.value)} />
                                            </div>
                                        </div>
                                        <div>
                                            <label style={{ ...labelStyle, fontSize: '0.7rem' }}>本文（HTML）</label>
                                            <textarea style={{ ...inputStyle, width: '100%', boxSizing: 'border-box', minHeight: '80px', resize: 'vertical', fontFamily: 'monospace', fontSize: '0.75rem' }} placeholder="ステップの本文..." value={step.body} onChange={e => updateStep(idx, 'body', e.target.value)} />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '20px' }}>
                            <button onClick={() => setSeqModal(null)} style={{ ...btnStyle('#6b6b85'), padding: '8px 16px', fontSize: '0.85rem' }}>キャンセル</button>
                            <button
                                onClick={saveSequence}
                                disabled={seqSaving || !seqName.trim()}
                                style={{
                                    padding: '8px 20px', background: seqSaving ? '#333' : '#7c5cfc', border: 'none', color: '#fff',
                                    borderRadius: '8px', cursor: seqSaving ? 'not-allowed' : 'pointer', fontSize: '0.85rem', fontWeight: 600,
                                }}
                            >
                                {seqSaving ? '保存中...' : '保存'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
