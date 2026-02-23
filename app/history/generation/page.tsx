'use client';

import React, { useCallback, useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAppStore } from '@/lib/store';
import { useTranslation } from '@/lib/useTranslation';

// ─── Types ────────────────────────────────────────────────────
interface Generation {
    id: string;
    userId: string;
    prompt: string;
    negativePrompt?: string;
    modelName: string;
    params: Record<string, unknown>;
    fileUrl: string;
    fileType: 'image' | 'video';
    generationType: string;
    creditsUsed: number;
    status: string;
    createdAt: number;
}

interface FavoriteRecord {
    id: string;
    userId: string;
    generationId: string;
    addedAt: number;
}

type FilterTab = 'all' | 'favorites' | 'txt2img' | 'img2img' | 'inpaint' | 'faceswap';

// ─── Component ────────────────────────────────────────────────
export default function GenerationHistoryPage() {
    const router = useRouter();
    const { user, isAuthenticated } = useAppStore();
    const { t } = useTranslation();

    const [generations, setGenerations] = useState<Generation[]>([]);
    const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [activeFilter, setActiveFilter] = useState<FilterTab>('all');
    const [lightbox, setLightbox] = useState<Generation | null>(null);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [page, setPage] = useState(0);
    const [hasMore, setHasMore] = useState(false);
    const [total, setTotal] = useState(0);
    const PAGE_SIZE = 24;

    const getToken = () => typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;

    // ─── Fetch Generations ──────────────────────────────────
    const fetchGenerations = useCallback(async (offset = 0, append = false) => {
        const token = getToken();
        if (!token) return;
        setLoading(true);
        try {
            const res = await fetch(`/api/generations?limit=${PAGE_SIZE}&offset=${offset}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            const data = await res.json();
            if (res.ok) {
                const gens = data.generations ?? [];
                setGenerations(prev => append ? [...prev, ...gens] : gens);
                setHasMore(data.pagination?.hasMore ?? false);
                setTotal(data.pagination?.total ?? 0);
            } else {
                setError(data.error || 'Failed to load');
            }
        } catch {
            setError('接続エラー');
        } finally {
            setLoading(false);
        }
    }, []);

    // ─── Fetch Favorites ────────────────────────────────────
    const fetchFavorites = useCallback(async () => {
        const token = getToken();
        if (!token) return;
        try {
            const res = await fetch('/api/favorites', {
                headers: { Authorization: `Bearer ${token}` },
            });
            const data = await res.json();
            if (res.ok) {
                const ids = new Set<string>((data.favorites ?? []).map((f: FavoriteRecord) => f.generationId));
                setFavoriteIds(ids);
            }
        } catch { /* ignore */ }
    }, []);

    useEffect(() => {
        fetchGenerations(0);
        fetchFavorites();
    }, [fetchGenerations, fetchFavorites]);

    // ─── Toggle Favorite ────────────────────────────────────
    const toggleFavorite = async (genId: string) => {
        const token = getToken();
        if (!token) return;
        const isFav = favoriteIds.has(genId);

        // Optimistic update
        setFavoriteIds(prev => {
            const next = new Set(prev);
            if (isFav) next.delete(genId); else next.add(genId);
            return next;
        });

        try {
            await fetch('/api/favorites', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ generationId: genId, action: isFav ? 'remove' : 'add' }),
            });
        } catch {
            // Revert on error
            setFavoriteIds(prev => {
                const next = new Set(prev);
                if (isFav) next.add(genId); else next.delete(genId);
                return next;
            });
        }
    };

    // ─── Delete Generation ──────────────────────────────────
    const deleteGeneration = async (genId: string) => {
        const token = getToken();
        if (!token) return;
        setDeletingId(genId);
        try {
            const res = await fetch(`/api/generations/${genId}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` },
            });
            if (res.ok) {
                setGenerations(prev => prev.filter(g => g.id !== genId));
                setTotal(prev => prev - 1);
                if (lightbox?.id === genId) setLightbox(null);
            }
        } catch { /* ignore */ }
        setDeletingId(null);
    };

    // ─── Download ───────────────────────────────────────────
    const handleDownload = (gen: Generation) => {
        const a = document.createElement('a');
        if (gen.fileUrl.startsWith('data:')) {
            a.href = gen.fileUrl;
        } else {
            a.href = `/api/download?url=${encodeURIComponent(gen.fileUrl)}`;
        }
        a.download = `generation_${gen.id.slice(0, 8)}.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    };

    // ─── Load More ──────────────────────────────────────────
    const loadMore = () => {
        const nextOffset = generations.length;
        setPage(prev => prev + 1);
        fetchGenerations(nextOffset, true);
    };

    // ─── Filtered Data ──────────────────────────────────────
    const filtered = generations.filter(g => {
        if (activeFilter === 'all') return true;
        if (activeFilter === 'favorites') return favoriteIds.has(g.id);
        return g.generationType === activeFilter;
    });

    // ─── Format Helpers ─────────────────────────────────────
    const formatDate = (ts: number) => {
        const d = new Date(ts);
        return d.toLocaleDateString('ja-JP', { year: 'numeric', month: '2-digit', day: '2-digit' });
    };
    const formatTime = (ts: number) => {
        const d = new Date(ts);
        return d.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' });
    };
    const genTypeLabel = (gt: string) => {
        const map: Record<string, string> = {
            txt2img: 'Text → Image',
            img2img: 'Image → Image',
            inpaint: 'Nude Mode',
            faceswap: 'Face Swap',
        };
        return map[gt] || gt;
    };
    const formatModelName = (name: string) => {
        if (!name) return 'Unknown';
        return name.replace(/^novita-/i, '');
    };

    // ─── Auth Gate ──────────────────────────────────────────
    if (!isAuthenticated && typeof window !== 'undefined' && !getToken()) {
        return (
            <div style={styles.emptyContainer}>
                <div style={{ fontSize: '3rem', marginBottom: 16 }}>🔒</div>
                <h2 style={styles.emptyTitle}>ログインが必要です</h2>
                <p style={styles.emptyDesc}>生成履歴を見るにはログインしてください。</p>
                <Link href="/login" style={styles.ctaButton}>ログイン</Link>
            </div>
        );
    }

    return (
        <div style={styles.page}>
            {/* ── Header ── */}
            <div style={styles.header}>
                <div style={styles.headerLeft}>
                    <button onClick={() => router.push('/editor')} style={styles.backBtn}>← 戻る</button>
                    <h1 style={styles.title}>生成履歴</h1>
                    <span style={styles.countBadge}>{total} 件</span>
                </div>
            </div>

            {/* ── Filter Tabs ── */}
            <div style={styles.filterBar}>
                {([
                    { key: 'all', label: 'すべて' },
                    { key: 'favorites', label: '♥ お気に入り' },
                    { key: 'txt2img', label: 'Text→Image' },
                    { key: 'img2img', label: 'Img→Img' },
                    { key: 'inpaint', label: 'Nude Mode' },
                    { key: 'faceswap', label: 'Face Swap' },
                ] as { key: FilterTab; label: string }[]).map(f => (
                    <button
                        key={f.key}
                        onClick={() => setActiveFilter(f.key)}
                        style={{
                            ...styles.filterTab,
                            ...(activeFilter === f.key ? styles.filterTabActive : {}),
                        }}
                    >
                        {f.label}
                        {f.key === 'favorites' && (
                            <span style={styles.filterCount}>{favoriteIds.size}</span>
                        )}
                    </button>
                ))}
            </div>

            {/* ── Content ── */}
            {loading && generations.length === 0 ? (
                <div style={styles.emptyContainer}>
                    <div style={styles.spinner} />
                    <p style={styles.emptyDesc}>読み込み中...</p>
                </div>
            ) : error ? (
                <div style={styles.emptyContainer}>
                    <div style={{ fontSize: '3rem', marginBottom: 16 }}>⚠️</div>
                    <p style={styles.emptyDesc}>{error}</p>
                    <button onClick={() => fetchGenerations(0)} style={styles.ctaButton}>再試行</button>
                </div>
            ) : filtered.length === 0 ? (
                <div style={styles.emptyContainer}>
                    <div style={{ fontSize: '3rem', marginBottom: 16 }}>
                        {activeFilter === 'favorites' ? '💔' : '🖼️'}
                    </div>
                    <h2 style={styles.emptyTitle}>
                        {activeFilter === 'favorites'
                            ? 'お気に入りはまだありません'
                            : '生成履歴がありません'}
                    </h2>
                    <p style={styles.emptyDesc}>
                        {activeFilter === 'favorites'
                            ? '画像のハートをクリックしてお気に入りに追加しましょう。'
                            : '画像を生成すると、ここに履歴が表示されます。'}
                    </p>
                    {activeFilter !== 'all' && (
                        <button onClick={() => setActiveFilter('all')} style={styles.ctaButton}>
                            すべて表示
                        </button>
                    )}
                </div>
            ) : (
                <>
                    {/* ── Image Grid ── */}
                    <div style={styles.grid}>
                        {filtered.map(gen => (
                            <div key={gen.id} style={styles.card}>
                                {/* Image */}
                                <div
                                    style={styles.cardImage}
                                    onClick={() => setLightbox(gen)}
                                >
                                    {gen.fileUrl ? (
                                        <img
                                            src={gen.fileUrl}
                                            alt={gen.prompt}
                                            style={styles.img}
                                            loading="lazy"
                                        />
                                    ) : (
                                        <div style={styles.noImage}>🖼️</div>
                                    )}
                                    {/* Overlay on hover */}
                                    <div style={styles.cardOverlay}>
                                        <span style={styles.overlayType}>
                                            {genTypeLabel(gen.generationType)}
                                        </span>
                                    </div>
                                </div>

                                {/* Actions Row */}
                                <div style={styles.cardActions}>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); toggleFavorite(gen.id); }}
                                        style={{
                                            ...styles.actionBtn,
                                            color: favoriteIds.has(gen.id) ? '#f43f5e' : 'var(--text-tertiary)',
                                        }}
                                        title="お気に入り"
                                    >
                                        {favoriteIds.has(gen.id) ? '❤️' : '🤍'}
                                    </button>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); handleDownload(gen); }}
                                        style={styles.actionBtn}
                                        title="ダウンロード"
                                    >
                                        ⬇️
                                    </button>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); deleteGeneration(gen.id); }}
                                        style={{ ...styles.actionBtn, color: 'var(--text-tertiary)' }}
                                        disabled={deletingId === gen.id}
                                        title="削除"
                                    >
                                        {deletingId === gen.id ? '⏳' : '🗑️'}
                                    </button>
                                    <span style={styles.cardDate}>
                                        {formatDate(gen.createdAt)}
                                    </span>
                                </div>

                                {/* Prompt Preview */}
                                <div style={styles.cardPrompt}>
                                    {gen.prompt.length > 60
                                        ? gen.prompt.slice(0, 60) + '…'
                                        : gen.prompt}
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Load More */}
                    {hasMore && activeFilter === 'all' && (
                        <div style={styles.loadMoreWrap}>
                            <button
                                onClick={loadMore}
                                style={styles.loadMoreBtn}
                                disabled={loading}
                            >
                                {loading ? '読み込み中...' : 'もっと見る'}
                            </button>
                        </div>
                    )}
                </>
            )}

            {/* ── Lightbox ── */}
            {lightbox && (
                <div style={styles.lightboxOverlay} onClick={() => setLightbox(null)}>
                    <div style={styles.lightboxContent} onClick={e => e.stopPropagation()}>
                        <button style={styles.lightboxClose} onClick={() => setLightbox(null)}>✕</button>

                        <div style={styles.lightboxImageWrap}>
                            <img
                                src={lightbox.fileUrl}
                                alt={lightbox.prompt}
                                style={styles.lightboxImg}
                            />
                        </div>

                        <div style={styles.lightboxInfo}>
                            <div style={styles.lightboxMeta}>
                                <span style={styles.lightboxType}>{genTypeLabel(lightbox.generationType)}</span>
                                <span style={styles.lightboxDate}>
                                    {formatDate(lightbox.createdAt)} {formatTime(lightbox.createdAt)}
                                </span>
                            </div>

                            <div style={styles.lightboxPrompt}>
                                <div style={styles.lightboxLabel}>プロンプト</div>
                                <div style={styles.lightboxPromptText}>{lightbox.prompt}</div>
                            </div>

                            <div style={styles.lightboxDetailRow}>
                                <span style={styles.lightboxLabel}>モデル</span>
                                <span style={styles.lightboxValue}>{formatModelName(lightbox.modelName)}</span>
                            </div>

                            {lightbox.params?.width && (
                                <div style={styles.lightboxDetailRow}>
                                    <span style={styles.lightboxLabel}>サイズ</span>
                                    <span style={styles.lightboxValue}>
                                        {String(lightbox.params.width)} × {String(lightbox.params.height)}
                                    </span>
                                </div>
                            )}

                            <div style={styles.lightboxDetailRow}>
                                <span style={styles.lightboxLabel}>クレジット</span>
                                <span style={styles.lightboxValue}>{lightbox.creditsUsed}</span>
                            </div>

                            <div style={styles.lightboxActions}>
                                <button
                                    onClick={() => toggleFavorite(lightbox.id)}
                                    style={{
                                        ...styles.lightboxActionBtn,
                                        background: favoriteIds.has(lightbox.id) ? 'rgba(244,63,94,0.15)' : 'var(--bg-card)',
                                        borderColor: favoriteIds.has(lightbox.id) ? '#f43f5e' : 'var(--border)',
                                        color: favoriteIds.has(lightbox.id) ? '#f43f5e' : 'var(--text-primary)',
                                    }}
                                >
                                    {favoriteIds.has(lightbox.id) ? '❤️ お気に入り済み' : '🤍 お気に入り'}
                                </button>
                                <button
                                    onClick={() => handleDownload(lightbox)}
                                    style={styles.lightboxActionBtn}
                                >
                                    ⬇️ ダウンロード
                                </button>
                                <button
                                    onClick={() => { deleteGeneration(lightbox.id); }}
                                    style={{ ...styles.lightboxActionBtn, color: '#ef4444', borderColor: '#ef4444' }}
                                >
                                    🗑️ 削除
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// ─── Styles (inline to match existing app pattern) ────────────
const styles: Record<string, React.CSSProperties> = {
    page: {
        height: '100vh',
        overflowY: 'auto',
        background: 'var(--bg-base)',
        color: 'var(--text-primary)',
        padding: '24px 32px 100px', // Extra padding bottom for mobile/nav space
        maxWidth: 1400,
        margin: '0 auto',
    },
    header: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 24,
    },
    headerLeft: {
        display: 'flex',
        alignItems: 'center',
        gap: 16,
    },
    backBtn: {
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderRadius: 8,
        padding: '8px 16px',
        color: 'var(--text-secondary)',
        cursor: 'pointer',
        fontSize: '0.85rem',
        fontWeight: 500,
        transition: 'all 0.2s',
    },
    title: {
        fontFamily: 'var(--font-display)',
        fontSize: '1.6rem',
        fontWeight: 700,
        background: 'linear-gradient(135deg, var(--primary), var(--secondary))',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
    },
    countBadge: {
        background: 'var(--bg-elevated)',
        border: '1px solid var(--border)',
        borderRadius: 20,
        padding: '4px 12px',
        fontSize: '0.75rem',
        fontWeight: 600,
        color: 'var(--text-secondary)',
    },
    filterBar: {
        display: 'flex',
        gap: 8,
        marginBottom: 24,
        flexWrap: 'wrap' as const,
        borderBottom: '1px solid var(--border)',
        paddingBottom: 16,
    },
    filterTab: {
        padding: '8px 16px',
        borderRadius: 8,
        border: '1px solid var(--border)',
        background: 'var(--bg-card)',
        color: 'var(--text-secondary)',
        fontSize: '0.82rem',
        fontWeight: 500,
        cursor: 'pointer',
        transition: 'all 0.2s',
        display: 'flex',
        alignItems: 'center',
        gap: 6,
    },
    filterTabActive: {
        background: 'var(--primary)',
        borderColor: 'var(--primary)',
        color: '#fff',
    },
    filterCount: {
        background: 'rgba(255,255,255,0.2)',
        borderRadius: 10,
        padding: '1px 7px',
        fontSize: '0.7rem',
        fontWeight: 700,
    },
    grid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
        gap: 16,
    },
    card: {
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderRadius: 12,
        overflow: 'hidden',
        transition: 'transform 0.2s, box-shadow 0.2s',
    },
    cardImage: {
        position: 'relative' as const,
        aspectRatio: '1',
        overflow: 'hidden',
        cursor: 'pointer',
        background: 'var(--bg-elevated)',
    },
    img: {
        width: '100%',
        height: '100%',
        objectFit: 'cover' as const,
        display: 'block',
        transition: 'transform 0.3s',
    },
    noImage: {
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '2rem',
        color: 'var(--text-tertiary)',
    },
    cardOverlay: {
        position: 'absolute' as const,
        bottom: 0,
        left: 0,
        right: 0,
        background: 'linear-gradient(transparent, rgba(0,0,0,0.7))',
        padding: '24px 10px 8px',
        opacity: 0,
        transition: 'opacity 0.2s',
    },
    overlayType: {
        color: '#fff',
        fontSize: '0.72rem',
        fontWeight: 600,
        background: 'rgba(255,255,255,0.15)',
        borderRadius: 6,
        padding: '3px 8px',
        backdropFilter: 'blur(4px)',
    },
    cardActions: {
        display: 'flex',
        alignItems: 'center',
        gap: 4,
        padding: '8px 10px 4px',
    },
    actionBtn: {
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        fontSize: '0.9rem',
        padding: '4px 6px',
        borderRadius: 6,
        transition: 'all 0.2s',
        color: 'var(--text-secondary)',
    },
    cardDate: {
        marginLeft: 'auto',
        fontSize: '0.68rem',
        color: 'var(--text-tertiary)',
    },
    cardPrompt: {
        padding: '4px 10px 10px',
        fontSize: '0.73rem',
        color: 'var(--text-secondary)',
        lineHeight: 1.4,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap' as const,
    },
    loadMoreWrap: {
        display: 'flex',
        justifyContent: 'center',
        padding: '32px 0',
    },
    loadMoreBtn: {
        padding: '12px 32px',
        borderRadius: 10,
        border: '1px solid var(--border)',
        background: 'var(--bg-card)',
        color: 'var(--text-primary)',
        fontWeight: 600,
        fontSize: '0.9rem',
        cursor: 'pointer',
        transition: 'all 0.2s',
    },
    emptyContainer: {
        display: 'flex',
        flexDirection: 'column' as const,
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 400,
        textAlign: 'center' as const,
    },
    emptyTitle: {
        fontSize: '1.3rem',
        fontWeight: 700,
        color: 'var(--text-primary)',
        marginBottom: 8,
    },
    emptyDesc: {
        fontSize: '0.9rem',
        color: 'var(--text-secondary)',
        marginBottom: 16,
    },
    ctaButton: {
        padding: '10px 24px',
        borderRadius: 10,
        background: 'linear-gradient(135deg, var(--primary), var(--secondary))',
        color: '#fff',
        fontWeight: 600,
        fontSize: '0.9rem',
        textDecoration: 'none',
        cursor: 'pointer',
        border: 'none',
    },
    spinner: {
        width: 32,
        height: 32,
        border: '3px solid var(--border)',
        borderTop: '3px solid var(--primary)',
        borderRadius: '50%',
        animation: 'spin 0.8s linear infinite',
        marginBottom: 16,
    },

    // Lightbox
    lightboxOverlay: {
        position: 'fixed' as const,
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0,0,0,0.85)',
        backdropFilter: 'blur(8px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
    },
    lightboxContent: {
        display: 'flex',
        maxWidth: 1100,
        maxHeight: '90vh',
        width: '100%',
        background: 'var(--bg-surface)',
        borderRadius: 16,
        overflow: 'hidden',
        border: '1px solid var(--border)',
        boxShadow: '0 20px 80px rgba(0,0,0,0.5)',
        position: 'relative' as const,
    },
    lightboxClose: {
        position: 'absolute' as const,
        top: 12,
        right: 12,
        background: 'rgba(0,0,0,0.5)',
        border: 'none',
        color: '#fff',
        width: 36,
        height: 36,
        borderRadius: '50%',
        fontSize: '1.1rem',
        cursor: 'pointer',
        zIndex: 10,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
    },
    lightboxImageWrap: {
        flex: '1 1 60%',
        background: '#000',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 400,
        overflow: 'hidden',
    },
    lightboxImg: {
        maxWidth: '100%',
        maxHeight: '90vh',
        objectFit: 'contain' as const,
    },
    lightboxInfo: {
        flex: '0 0 320px',
        padding: '24px 20px',
        overflowY: 'auto' as const,
        display: 'flex',
        flexDirection: 'column' as const,
        gap: 16,
        borderLeft: '1px solid var(--border)',
    },
    lightboxMeta: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    lightboxType: {
        background: 'var(--primary)',
        color: '#fff',
        padding: '4px 12px',
        borderRadius: 6,
        fontSize: '0.75rem',
        fontWeight: 600,
    },
    lightboxDate: {
        color: 'var(--text-tertiary)',
        fontSize: '0.78rem',
    },
    lightboxPrompt: {
        background: 'var(--bg-elevated)',
        borderRadius: 10,
        padding: 14,
    },
    lightboxLabel: {
        fontSize: '0.7rem',
        fontWeight: 600,
        color: 'var(--text-tertiary)',
        textTransform: 'uppercase' as const,
        letterSpacing: '0.04em',
        marginBottom: 6,
    },
    lightboxPromptText: {
        fontSize: '0.85rem',
        color: 'var(--text-primary)',
        lineHeight: 1.5,
        wordBreak: 'break-word' as const,
    },
    lightboxDetailRow: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '0 4px',
    },
    lightboxValue: {
        fontSize: '0.82rem',
        color: 'var(--text-primary)',
        fontWeight: 500,
    },
    lightboxActions: {
        display: 'flex',
        flexDirection: 'column' as const,
        gap: 8,
        marginTop: 'auto',
        paddingTop: 16,
        borderTop: '1px solid var(--border)',
    },
    lightboxActionBtn: {
        padding: '10px 16px',
        borderRadius: 8,
        border: '1px solid var(--border)',
        background: 'var(--bg-card)',
        color: 'var(--text-primary)',
        fontWeight: 500,
        fontSize: '0.85rem',
        cursor: 'pointer',
        transition: 'all 0.2s',
        textAlign: 'center' as const,
    },
};
