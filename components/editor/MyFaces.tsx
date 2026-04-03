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
    const [showLoginPrompt, setShowLoginPrompt] = useState(false);

    const isLoggedIn = !!user;
    const isPaid = user ? user.plan !== 'free' : false;
    const limit = isPaid ? MAX_FACES.paid : MAX_FACES.free;
    const canAdd = isLoggedIn ? savedFaces.length < limit : true;

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
        if (!isLoggedIn) {
            setShowLoginPrompt(true);
            return;
        }
        if (!canAdd) return;
        setShowRegisterModal(true);
    };

    const SLOT_COUNT = 3;
    const slots = Array.from({ length: SLOT_COUNT }, (_, i) => savedFaces[i] || null);

    return (
        <>
            <div className="my-faces-slots-container">
                <div className="my-faces-slots-header">
                    <span className="my-faces-slots-title">{t('faces.title')}</span>
                    {isLoggedIn && (
                        <span className="my-faces-slots-count">{savedFaces.length}/{limit}</span>
                    )}
                </div>
                <div className="my-faces-slots-row">
                    {slots.map((face, i) => (
                        <div
                            key={face?.id || `empty-${i}`}
                            className={`my-faces-slot ${face && selectedFaceId === face.id ? 'selected' : ''} ${face ? 'has-face' : ''}`}
                            onClick={() => {
                                if (face) {
                                    handleToggleFace(face.id);
                                } else {
                                    handleAddClick();
                                }
                            }}
                            onContextMenu={(e) => {
                                if (face) {
                                    e.preventDefault();
                                    setShowDeleteConfirm(face.id);
                                }
                            }}
                        >
                            {face ? (
                                <>
                                    <img
                                        src={face.thumbnail_url || face.image_url}
                                        alt={face.name}
                                        className="my-faces-slot-img"
                                    />
                                    {selectedFaceId === face.id && (
                                        <div className="my-faces-slot-check">✓</div>
                                    )}
                                    <span className="my-faces-slot-name">{face.name}</span>
                                    <button
                                        className="my-faces-slot-delete"
                                        onClick={(e) => { e.stopPropagation(); setShowDeleteConfirm(face.id); }}
                                    >×</button>
                                </>
                            ) : (
                                <>
                                    <div className="my-faces-slot-empty">
                                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                                            <circle cx="12" cy="7" r="4"/>
                                        </svg>
                                    </div>
                                    <span className="my-faces-slot-label">+</span>
                                    <span className="my-faces-slot-add-text">{t('faces.addFace')}</span>
                                    <div className="my-faces-slot-tooltip">{t('faces.slotTooltip')}</div>
                                </>
                            )}
                        </div>
                    ))}
                </div>
                <p className="my-faces-slots-desc">{t('faces.slotDesc')}</p>
                {selectedFaceId && (
                    <p className="my-faces-active-label">
                        ✨ {t('faces.activeLabel').replace('{name}', savedFaces.find(f => f.id === selectedFaceId)?.name || '')}
                    </p>
                )}
            </div>

            {/* Login Prompt Modal for guests */}
            {showLoginPrompt && (
                <div className="my-faces-overlay" onClick={() => setShowLoginPrompt(false)}>
                    <div className="my-faces-confirm-dialog" onClick={(e) => e.stopPropagation()}>
                        <p style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '8px' }}>
                            {t('faces.title')}
                        </p>
                        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '16px' }}>
                            {t('faces.guestSlotMessage')}
                        </p>
                        <div className="my-faces-confirm-actions">
                            <button
                                className="my-faces-confirm-cancel"
                                onClick={() => setShowLoginPrompt(false)}
                            >
                                {t('faces.cancel')}
                            </button>
                            <button
                                className="my-faces-guide-ok"
                                onClick={() => { window.location.href = '/register'; }}
                            >
                                {t('faces.signUp')}
                            </button>
                        </div>
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginTop: '10px', textAlign: 'center' }}>
                            {t('faces.alreadyHaveAccount')}{' '}
                            <a href="/login" style={{ color: '#7c5cfc' }}>{t('faces.logIn')}</a>
                        </p>
                    </div>
                </div>
            )}

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
                        <p style={{ fontSize: '0.8rem', color: '#ef4444', marginTop: '8px', lineHeight: 1.5 }}>{t('faces.deleteWarning')}</p>
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
