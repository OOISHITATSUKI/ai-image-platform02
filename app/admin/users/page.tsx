'use client';

import { useCallback, useEffect, useState } from 'react';

interface AdminUser {
    id: string;
    email: string;
    username: string;
    status: string;
    plan: string;
    termsAgreedAt?: string | null;
    credits: number;
    country?: string;
    createdAt: number;
    lastLoginAt?: number;
    emailVerified: boolean;
}

interface EmailTemplate {
    id: string;
    name: string;
    subject: string;
    body: string;
}

export default function AdminUsersPage() {
    const [users, setUsers] = useState<AdminUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');

    // Email templates
    const [templates, setTemplates] = useState<EmailTemplate[]>([]);

    // Individual email modal state
    const [emailModal, setEmailModal] = useState<{ userId: string; email: string } | null>(null);
    const [emailSubject, setEmailSubject] = useState('');
    const [emailBody, setEmailBody] = useState('');
    const [emailSending, setEmailSending] = useState(false);
    const [emailTemplate, setEmailTemplate] = useState('custom');

    // Bulk email modal state
    const [bulkModal, setBulkModal] = useState(false);
    const [bulkFilter, setBulkFilter] = useState('all');
    const [bulkSubject, setBulkSubject] = useState('');
    const [bulkBody, setBulkBody] = useState('');
    const [bulkSending, setBulkSending] = useState(false);
    const [bulkTemplate, setBulkTemplate] = useState('custom');

    const fetchUsers = useCallback(async () => {
        setLoading(true);
        const token = localStorage.getItem('auth_token');
        const headers: Record<string, string> = { Authorization: token ?? '' };
        const res = await fetch('/api/admin/users', { headers });
        const data = await res.json();
        setUsers(data.users ?? []);
        setLoading(false);
    }, []);

    const fetchTemplates = useCallback(async () => {
        try {
            const token = localStorage.getItem('auth_token');
            const headers: Record<string, string> = { Authorization: token ?? '' };
            const res = await fetch('/api/admin/email-templates', { headers });
            const data = await res.json();
            setTemplates(data.templates ?? []);
        } catch { /* ignore */ }
    }, []);

    useEffect(() => { fetchUsers(); fetchTemplates(); }, [fetchUsers, fetchTemplates]);

    const doAction = async (userId: string, action: string, value?: number, strValue?: string) => {
        const token = localStorage.getItem('auth_token');
        const headers: Record<string, string> = { 'Content-Type': 'application/json', Authorization: token ?? '' };
        await fetch('/api/admin/users', {
            method: 'POST',
            headers,
            body: JSON.stringify({ userId, action, value, strValue }),
        });
        fetchUsers();
    };

    const sendEmail = async () => {
        if (!emailModal || !emailSubject.trim() || !emailBody.trim()) return;
        setEmailSending(true);
        try {
            const res = await fetch('/api/admin/send-email', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: emailModal.userId, subject: emailSubject, body: emailBody }),
            });
            const data = await res.json();
            if (data.success) {
                alert(`Email sent to ${data.sentTo}`);
                setEmailModal(null);
                setEmailSubject('');
                setEmailBody('');
                setEmailTemplate('custom');
            } else {
                alert(`Failed: ${data.error}`);
            }
        } catch {
            alert('Failed to send email');
        }
        setEmailSending(false);
    };

    const sendBulkEmail = async () => {
        if (!bulkSubject.trim() || !bulkBody.trim()) return;
        if (!confirm(`Send email to ${bulkFilter === 'all' ? 'ALL' : bulkFilter.toUpperCase()} users?`)) return;
        setBulkSending(true);
        try {
            const token = localStorage.getItem('auth_token');
            const res = await fetch('/api/admin/send-email', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: token ?? '' },
                body: JSON.stringify({ filter: bulkFilter, subject: bulkSubject, body: bulkBody }),
            });
            const data = await res.json();
            if (data.success) {
                alert(`Bulk email sent to ${data.sentCount ?? 0} users`);
                setBulkModal(false);
                setBulkSubject('');
                setBulkBody('');
                setBulkTemplate('custom');
            } else {
                alert(`Failed: ${data.error}`);
            }
        } catch {
            alert('Failed to send bulk email');
        }
        setBulkSending(false);
    };

    const handleEmailTemplateChange = (templateId: string) => {
        setEmailTemplate(templateId);
        if (templateId === 'custom') {
            setEmailSubject('');
            setEmailBody('');
        } else {
            const tpl = templates.find(t => t.id === templateId);
            if (tpl) {
                setEmailSubject(tpl.subject);
                setEmailBody(tpl.body);
            }
        }
    };

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

    const filteredUsers = users.filter(u => {
        if (!search) return true;
        const q = search.toLowerCase();
        return u.email.toLowerCase().includes(q) || u.username?.toLowerCase().includes(q) || u.id.includes(q);
    });

    const statusColor = (s: string) => ({ active: '#10b981', banned: '#ef4444', suspended: '#f59e0b', age_restricted: '#a78bfa' }[s] ?? '#aaa');
    const inputStyle: React.CSSProperties = { padding: '8px 12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '8px', color: 'var(--text-primary)', fontSize: '0.85rem' };
    const btnStyle = (color: string): React.CSSProperties => ({ padding: '4px 10px', background: `${color}20`, border: `1px solid ${color}50`, color, borderRadius: '6px', cursor: 'pointer', fontSize: '0.75rem', whiteSpace: 'nowrap' });

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <h1 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Users</h1>
                <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Total: {users.length}</span>
            </div>

            <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', alignItems: 'center' }}>
                <input style={{ ...inputStyle, minWidth: '300px' }} placeholder="Search by email / username / ID" value={search} onChange={e => setSearch(e.target.value)} />
                <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{filteredUsers.length} results</span>
                <button
                    onClick={() => { setBulkModal(true); setBulkFilter('all'); setBulkSubject(''); setBulkBody(''); setBulkTemplate('custom'); }}
                    style={{ ...btnStyle('#7c5cfc'), padding: '8px 16px', fontSize: '0.85rem', marginLeft: 'auto' }}
                >
                    Bulk Email
                </button>
            </div>

            {loading ? <div style={{ color: 'var(--text-secondary)' }}>Loading...</div> : (
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                        <thead>
                            <tr style={{ background: 'rgba(255,255,255,0.04)', color: 'var(--text-secondary)' }}>
                                {['Username', 'Email', 'Status', 'Plan', 'Credits', 'Country', 'Terms', 'Registered', 'Actions'].map(h => (
                                    <th key={h} style={{ padding: '10px 14px', textAlign: 'left', borderBottom: '1px solid rgba(255,255,255,0.08)', whiteSpace: 'nowrap' }}>{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {filteredUsers.map(u => (
                                <tr key={u.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                    <td style={{ padding: '9px 14px' }}>{u.username || '-'}</td>
                                    <td style={{ padding: '9px 14px', color: '#60a5fa' }}>{u.email}</td>
                                    <td style={{ padding: '9px 14px' }}>
                                        <span style={{ padding: '2px 8px', borderRadius: '4px', background: `${statusColor(u.status)}20`, color: statusColor(u.status), fontSize: '0.8rem' }}>{u.status}</span>
                                    </td>
                                    <td style={{ padding: '9px 14px', color: '#a78bfa' }}>{u.plan}</td>
                                    <td style={{ padding: '9px 14px', color: '#f59e0b' }}>{u.credits}</td>
                                    <td style={{ padding: '9px 14px', color: 'var(--text-secondary)' }}>{u.country || '-'}</td>
                                    <td style={{ padding: '9px 14px' }}>{u.termsAgreedAt ? <span style={{ color: '#10b981' }}>Yes</span> : <span style={{ color: '#ef4444' }}>No</span>}</td>
                                    <td style={{ padding: '9px 14px', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>{new Date(u.createdAt).toLocaleDateString('en-US')}</td>
                                    <td style={{ padding: '9px 14px' }}>
                                        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                                            {u.status !== 'banned'
                                                ? <button onClick={() => doAction(u.id, 'ban')} style={btnStyle('#ef4444')}>BAN</button>
                                                : <button onClick={() => doAction(u.id, 'unban')} style={btnStyle('#10b981')}>Unban</button>}
                                            <button onClick={async () => {
                                                const c = prompt('New credit amount:', String(u.credits));
                                                if (c !== null) doAction(u.id, 'set_credits', Number(c));
                                            }} style={btnStyle('#60a5fa')}>Credits</button>
                                            <button onClick={async () => {
                                                const c = prompt('コイン数を入力:', '0');
                                                if (c !== null) doAction(u.id, 'set_coins', Number(c));
                                            }} style={btnStyle('#f59e0b')}>🪙Coins</button>
                                            <button onClick={() => { const p = prompt('Enter plan (free / paid):', u.plan); if (p !== null) doAction(u.id, 'set_plan', undefined, p); }} style={btnStyle('#a78bfa')}>Plan</button>
                                            <button onClick={() => { setEmailModal({ userId: u.id, email: u.email }); setEmailSubject(''); setEmailBody(''); setEmailTemplate('custom'); }} style={btnStyle('#06b6d4')}>Email</button>
                                            <button onClick={() => { if (confirm('Delete this user? This cannot be undone.')) doAction(u.id, 'delete'); }} style={btnStyle('#991b1b')}>Delete</button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {filteredUsers.length === 0 && (
                                <tr><td colSpan={9} style={{ padding: '32px', textAlign: 'center', color: 'var(--text-secondary)' }}>No users found</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Individual Email Modal */}
            {emailModal && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }} onClick={() => setEmailModal(null)}>
                    <div style={{ background: '#1a1a2e', borderRadius: '12px', padding: '32px', width: '520px', maxWidth: '90vw', border: '1px solid rgba(255,255,255,0.1)' }} onClick={e => e.stopPropagation()}>
                        <h2 style={{ margin: '0 0 8px', fontSize: '1.2rem', color: '#e0e0ee' }}>Send Email</h2>
                        <p style={{ margin: '0 0 20px', fontSize: '0.85rem', color: '#6b6b85' }}>To: {emailModal.email}</p>

                        <div style={{ marginBottom: '14px' }}>
                            <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.8rem', color: '#9999ae' }}>Template</label>
                            <select
                                style={{ ...inputStyle, width: '100%', boxSizing: 'border-box' }}
                                value={emailTemplate}
                                onChange={e => handleEmailTemplateChange(e.target.value)}
                            >
                                <option value="custom">Custom</option>
                                {templates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                            </select>
                        </div>

                        <div style={{ marginBottom: '14px' }}>
                            <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.8rem', color: '#9999ae' }}>Subject</label>
                            <input
                                style={{ ...inputStyle, width: '100%', boxSizing: 'border-box' }}
                                placeholder="Email subject..."
                                value={emailSubject}
                                onChange={e => setEmailSubject(e.target.value)}
                            />
                        </div>

                        <div style={{ marginBottom: '20px' }}>
                            <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.8rem', color: '#9999ae' }}>Body (HTML supported)</label>
                            <textarea
                                style={{ ...inputStyle, width: '100%', boxSizing: 'border-box', minHeight: '150px', resize: 'vertical', fontFamily: 'inherit' }}
                                placeholder="Email body content..."
                                value={emailBody}
                                onChange={e => setEmailBody(e.target.value)}
                            />
                        </div>

                        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                            <button onClick={() => setEmailModal(null)} style={{ ...btnStyle('#6b6b85'), padding: '8px 16px', fontSize: '0.85rem' }}>Cancel</button>
                            <button
                                onClick={sendEmail}
                                disabled={emailSending || !emailSubject.trim() || !emailBody.trim()}
                                style={{
                                    padding: '8px 20px', background: emailSending ? '#333' : '#7c5cfc', border: 'none', color: '#fff',
                                    borderRadius: '8px', cursor: emailSending ? 'not-allowed' : 'pointer', fontSize: '0.85rem', fontWeight: 600,
                                }}
                            >
                                {emailSending ? 'Sending...' : 'Send'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Bulk Email Modal */}
            {bulkModal && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }} onClick={() => setBulkModal(false)}>
                    <div style={{ background: '#1a1a2e', borderRadius: '12px', padding: '32px', width: '520px', maxWidth: '90vw', border: '1px solid rgba(255,255,255,0.1)' }} onClick={e => e.stopPropagation()}>
                        <h2 style={{ margin: '0 0 8px', fontSize: '1.2rem', color: '#e0e0ee' }}>Bulk Email</h2>
                        <p style={{ margin: '0 0 20px', fontSize: '0.85rem', color: '#6b6b85' }}>Send email to multiple users at once</p>

                        <div style={{ marginBottom: '14px' }}>
                            <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.8rem', color: '#9999ae' }}>Filter</label>
                            <select
                                style={{ ...inputStyle, width: '100%', boxSizing: 'border-box' }}
                                value={bulkFilter}
                                onChange={e => setBulkFilter(e.target.value)}
                            >
                                <option value="all">All Users</option>
                                <option value="free">Free Plan</option>
                                <option value="paid">Paid Plan</option>
                            </select>
                        </div>

                        <div style={{ marginBottom: '14px' }}>
                            <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.8rem', color: '#9999ae' }}>Template</label>
                            <select
                                style={{ ...inputStyle, width: '100%', boxSizing: 'border-box' }}
                                value={bulkTemplate}
                                onChange={e => handleBulkTemplateChange(e.target.value)}
                            >
                                <option value="custom">Custom</option>
                                {templates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                            </select>
                        </div>

                        <div style={{ marginBottom: '14px' }}>
                            <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.8rem', color: '#9999ae' }}>Subject</label>
                            <input
                                style={{ ...inputStyle, width: '100%', boxSizing: 'border-box' }}
                                placeholder="Email subject..."
                                value={bulkSubject}
                                onChange={e => setBulkSubject(e.target.value)}
                            />
                        </div>

                        <div style={{ marginBottom: '20px' }}>
                            <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.8rem', color: '#9999ae' }}>Body (HTML supported)</label>
                            <textarea
                                style={{ ...inputStyle, width: '100%', boxSizing: 'border-box', minHeight: '150px', resize: 'vertical', fontFamily: 'inherit' }}
                                placeholder="Email body content..."
                                value={bulkBody}
                                onChange={e => setBulkBody(e.target.value)}
                            />
                        </div>

                        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                            <button onClick={() => setBulkModal(false)} style={{ ...btnStyle('#6b6b85'), padding: '8px 16px', fontSize: '0.85rem' }}>Cancel</button>
                            <button
                                onClick={sendBulkEmail}
                                disabled={bulkSending || !bulkSubject.trim() || !bulkBody.trim()}
                                style={{
                                    padding: '8px 20px', background: bulkSending ? '#333' : '#7c5cfc', border: 'none', color: '#fff',
                                    borderRadius: '8px', cursor: bulkSending ? 'not-allowed' : 'pointer', fontSize: '0.85rem', fontWeight: 600,
                                }}
                            >
                                {bulkSending ? 'Sending...' : 'Send Bulk Email'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
