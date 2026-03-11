'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useAppStore } from '@/lib/store';
import { useTranslation } from '@/lib/useTranslation';
import { MAX_FACES } from '@/lib/types';
import type { SavedFace } from '@/lib/types';
import FaceRegistrationModal from './FaceRegistrationModal';

export default function MyFaces() {
    const {
        user,
        savedFaces,
        selectedFaceId,
        isFacesLoading,
        setSavedFaces,
        setSelectedFaceId,
        removeSavedFace,
        setIsFacesLoading,
    } = useAppStore();

    const { t } = useTranslation();
    const [showRegisterModal, setShowRegisterModal] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
    const [collapsed, setCollapsed] = useState(false);
    const [showGuide, setShowGuide] = useState(false);

    const isPaid = user ? user.plan !== 'free' : false;
    const limit = isPaid ? MAX_FACES.paid : MAX_FACES.free;
    const canAdd = savedFaces.length < limit;

    // Load faces from API on mount
    const loadFaces = useCallback(async () => {
        if (!user) return;
        const token = window.localStorage.getItem('auth_token');
        if (!token) return;

        setIsFacesLoading(true);
        try {
            const res = await fetch('/api/faces', {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (res.ok) {
                const data = await res.json();
                setSavedFaces(data.faces || []);
            } else {
                console.warn('Faces API returned', res.status);
            }
        } catch (e) {
            console.error('Failed to load faces:', e);
        } finally {
            setIsFacesLoading(false);
        }
    }, [user?.id]);

    useEffect(() => {
        if (user) loadFaces();
    }, [user?.id]);

    const handleToggleFace = (faceId: string) => {
        setSelectedFaceId(selectedFaceId === faceId ? null : faceId);
    };

    const handleDelete = async (faceId: string) => {
        const token = window.localStorage.getItem('auth_token');
        if (!token) return;

        try {
            const res = await fetch(`/api/faces?id=${faceId}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` },
            });
            if (res.ok) {
                removeSavedFace(faceId);
            }
        } catch (e) {
            console.error('Failed to delete face:', e);
        }
        setShowDeleteConfirm(null);
    };

    const handleAddClick = () => {
        if (!canAdd) return;
        setShowRegisterModal(true);
    };

    // Always show for logged-in users
    if (!user) return null;

    return (
        <>
            <div className="my-faces-container">
                <div
                    className="my-faces-header"
                    onClick={() => setCollapsed(!collapsed)}
                    style={{ cursor: 'pointer', userSelect: 'none' }}
                >
                    <span className="my-faces-title">
                        <span style={{ marginRight: '6px' }}>👤</span>
                        {t('faces.title')}
                        <span style={{ marginLeft: '6px', fontSize: '0.7rem', opacity: 0.5 }}>
                            {collapsed ? '▸' : '▾'}
                        </span>
                    </span>
                    <span className="my-faces-count">
                        {savedFaces.length} / {limit}
                    </span>
                </div>

                {!collapsed && (
                    <>
                        {isFacesLoading ? (
                            <div className="my-faces-loading">
                                <div className="my-faces-spinner" />
                            </div>
                        ) : savedFaces.length === 0 ? (
                            <button
                                className="my-faces-empty-btn"
                                onClick={() => setShowRegisterModal(true)}
                            >
                                + {t('faces.emptyHint')}
                            </button>
                        ) : (
                            <>
                                <div className="my-faces-list">
                                    {savedFaces.map((face) => (
                                        <div
                                            key={face.id}
                                            className={`my-faces-item ${selectedFaceId === face.id ? 'selected' : ''}`}
                                            onClick={() => handleToggleFace(face.id)}
                                            onContextMenu={(e) => {
                                                e.preventDefault();
                                                setShowDeleteConfirm(face.id);
                                            }}
                                        >
                                            <div className="my-faces-thumb-wrap">
                                                <img
                                                    src={face.thumbnail_url || face.image_url}
                                                    alt={face.name}
                                                    className="my-faces-thumb"
                                                />
                                                {selectedFaceId === face.id && (
                                                    <div className="my-faces-check">✓</div>
                                                )}
                                            </div>
                                            <span className="my-faces-name">{face.name}</span>
                                            <button
                                                className="my-faces-delete-btn"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setShowDeleteConfirm(face.id);
                                                }}
                                                title={t('actions.delete')}
                                            >
                                                ×
                                            </button>
                                        </div>
                                    ))}

                                    {canAdd ? (
                                        <button
                                            className="my-faces-add-btn"
                                            onClick={handleAddClick}
                                        >
                                            +
                                        </button>
                                    ) : (
                                        <button
                                            className="my-faces-upgrade-btn"
                                            onClick={() => window.location.href = '/pricing'}
                                        >
                                            🔒
                                        </button>
                                    )}
                                </div>
                                {/* Hint when faces exist but none selected */}
                                {!selectedFaceId && (
                                    <p className="my-faces-hint">{t('faces.selectHint')}</p>
                                )}
                                {/* Active indicator */}
                                {selectedFaceId && (
                                    <p className="my-faces-active-label">
                                        ✨ {t('faces.activeLabel').replace('{name}', savedFaces.find(f => f.id === selectedFaceId)?.name || '')}
                                    </p>
                                )}
                            </>
                        )}
                    </>
                )}
            </div>

            {/* Guide Modal — shown after first registration */}
            {showGuide && (
                <div className="my-faces-overlay" onClick={() => setShowGuide(false)}>
                    <div className="my-faces-guide-dialog" onClick={(e) => e.stopPropagation()}>
                        <div className="my-faces-guide-icon">🎉</div>
                        <h4>{t('faces.guideTitle')}</h4>
                        <div className="my-faces-guide-steps">
                            <div className="my-faces-guide-step">
                                <span className="my-faces-guide-num">1</span>
                                <span>{t('faces.guideStep1')}</span>
                            </div>
                            <div className="my-faces-guide-step">
                                <span className="my-faces-guide-num">2</span>
                                <span>{t('faces.guideStep2')}</span>
                            </div>
                            <div className="my-faces-guide-step">
                                <span className="my-faces-guide-num">3</span>
                                <span>{t('faces.guideStep3')}</span>
                            </div>
                        </div>
                        <p className="my-faces-guide-note">{t('faces.guideNote')}</p>
                        <button
                            className="my-faces-guide-ok"
                            onClick={() => setShowGuide(false)}
                        >
                            {t('faces.guideOk')}
                        </button>
                    </div>
                </div>
            )}

            {/* Delete Confirmation */}
            {showDeleteConfirm && (
                <div className="my-faces-overlay" onClick={() => setShowDeleteConfirm(null)}>
                    <div className="my-faces-confirm-dialog" onClick={(e) => e.stopPropagation()}>
                        <p>{t('faces.deleteConfirm')}</p>
                        <div className="my-faces-confirm-actions">
                            <button
                                className="my-faces-confirm-cancel"
                                onClick={() => setShowDeleteConfirm(null)}
                            >
                                {t('faces.cancel')}
                            </button>
                            <button
                                className="my-faces-confirm-delete"
                                onClick={() => handleDelete(showDeleteConfirm)}
                            >
                                {t('actions.delete')}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Face Registration Modal */}
            {showRegisterModal && (
                <FaceRegistrationModal
                    onClose={() => setShowRegisterModal(false)}
                    onRegistered={(face) => {
                        setShowRegisterModal(false);
                        loadFaces();
                        setShowGuide(true);
                    }}
                />
            )}
        </>
    );
}
