'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useAppStore } from '@/lib/store';
import { useTranslation } from '@/lib/useTranslation';
import type { SavedFace, ChatMessage } from '@/lib/types';

interface Props {
    onClose: () => void;
    onRegistered: (face: SavedFace) => void;
}

export default function FaceRegistrationModal({ onClose, onRegistered }: Props) {
    const { user, chats } = useAppStore();
    const { t } = useTranslation();

    const [activeTab, setActiveTab] = useState<'generation' | 'upload'>('generation');
    const [selectedImageUrl, setSelectedImageUrl] = useState<string | null>(null);
    const [faceName, setFaceName] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [uploadPreview, setUploadPreview] = useState<string | null>(null);
    const [uploadFile, setUploadFile] = useState<File | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const isPaid = user ? user.plan !== 'free' : false;

    // Collect recent generated images from chat messages
    const recentImages: { url: string; timestamp: number }[] = [];
    for (const chat of chats) {
        for (const msg of chat.messages) {
            if (msg.role === 'assistant' && msg.imageUrl) {
                recentImages.push({ url: msg.imageUrl, timestamp: msg.timestamp });
            }
        }
    }
    recentImages.sort((a, b) => b.timestamp - a.timestamp);
    const displayImages = recentImages.slice(0, 10);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
        if (!validTypes.includes(file.type)) {
            setError(t('faces.invalidFormat'));
            return;
        }

        setUploadFile(file);
        const reader = new FileReader();
        reader.onload = () => setUploadPreview(reader.result as string);
        reader.readAsDataURL(file);
        setError(null);
    };

    const handleSubmit = async () => {
        if (!faceName.trim()) {
            setError(t('faces.nameRequired'));
            return;
        }

        let imageUrl: string;

        if (activeTab === 'generation') {
            if (!selectedImageUrl) {
                setError(t('faces.selectImage'));
                return;
            }
            imageUrl = selectedImageUrl;
        } else {
            if (!uploadFile && !uploadPreview) {
                setError(t('faces.uploadRequired'));
                return;
            }
            // For uploads, we'll send the base64 data
            imageUrl = uploadPreview!;
        }

        setIsSubmitting(true);
        setError(null);

        try {
            const token = window.localStorage.getItem('auth_token');
            if (!token) throw new Error('Not authenticated');

            const res = await fetch('/api/faces', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    name: faceName.trim(),
                    image_url: imageUrl,
                    thumbnail_url: imageUrl,
                    source: activeTab === 'upload' ? 'upload' : 'generation',
                }),
            });

            const data = await res.json();

            if (!res.ok) {
                if (data.error === 'face_limit_reached') {
                    setError(t('faces.limitReached'));
                } else if (data.error === 'upload_requires_paid') {
                    setError(t('faces.uploadRequiresPaid'));
                } else {
                    setError(data.error || 'Failed to save face');
                }
                return;
            }

            onRegistered(data.face);
        } catch (e: any) {
            setError(e.message || 'Failed to save face');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="face-modal-overlay" onClick={onClose}>
            <div className="face-modal" onClick={(e) => e.stopPropagation()}>
                <div className="face-modal-header">
                    <h3>{t('faces.registerTitle')}</h3>
                    <button className="face-modal-close" onClick={onClose}>×</button>
                </div>

                {/* Tabs */}
                <div className="face-modal-tabs">
                    <button
                        className={`face-modal-tab ${activeTab === 'generation' ? 'active' : ''}`}
                        onClick={() => setActiveTab('generation')}
                    >
                        {t('faces.fromGeneration')}
                    </button>
                    {isPaid ? (
                        <button
                            className={`face-modal-tab ${activeTab === 'upload' ? 'active' : ''}`}
                            onClick={() => setActiveTab('upload')}
                        >
                            {t('faces.fromUpload')}
                        </button>
                    ) : (
                        <button
                            className="face-modal-tab locked"
                            onClick={() => setActiveTab('upload')}
                        >
                            🔒 {t('faces.fromUpload')}
                        </button>
                    )}
                </div>

                <div className="face-modal-body">
                    {activeTab === 'generation' ? (
                        <div className="face-modal-generation">
                            {displayImages.length === 0 ? (
                                <p className="face-modal-empty">{t('faces.noGenerations')}</p>
                            ) : (
                                <div className="face-modal-grid">
                                    {displayImages.map((img, i) => (
                                        <div
                                            key={i}
                                            className={`face-modal-grid-item ${selectedImageUrl === img.url ? 'selected' : ''}`}
                                            onClick={() => setSelectedImageUrl(img.url)}
                                        >
                                            <img src={img.url} alt={`Gen ${i + 1}`} />
                                            {selectedImageUrl === img.url && (
                                                <div className="face-modal-grid-check">✓</div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="face-modal-upload">
                            {!isPaid ? (
                                <div className="face-modal-locked">
                                    <p>🔒 {t('faces.uploadRequiresPaid')}</p>
                                    <a href="/pricing" className="face-modal-upgrade-btn">
                                        {t('faces.upgradePlan')}
                                    </a>
                                </div>
                            ) : (
                                <>
                                    <div
                                        className="face-modal-dropzone"
                                        onClick={() => fileInputRef.current?.click()}
                                    >
                                        {uploadPreview ? (
                                            <img src={uploadPreview} alt="Preview" className="face-modal-preview" />
                                        ) : (
                                            <div className="face-modal-dropzone-text">
                                                <span>📷</span>
                                                <p>{t('faces.dropzoneHint')}</p>
                                            </div>
                                        )}
                                        <input
                                            ref={fileInputRef}
                                            type="file"
                                            accept="image/jpeg,image/png,image/webp"
                                            onChange={handleFileChange}
                                            style={{ display: 'none' }}
                                        />
                                    </div>
                                    <p className="face-modal-upload-notice">
                                        {t('faces.uploadNotice')}
                                    </p>
                                </>
                            )}
                        </div>
                    )}

                    {/* Name input */}
                    <div className="face-modal-name-input">
                        <input
                            type="text"
                            value={faceName}
                            onChange={(e) => setFaceName(e.target.value)}
                            placeholder={t('faces.namePlaceholder')}
                            maxLength={50}
                        />
                    </div>

                    {error && <p className="face-modal-error">{error}</p>}
                </div>

                <div className="face-modal-footer">
                    <button className="face-modal-cancel" onClick={onClose}>
                        {t('faces.cancel')}
                    </button>
                    <button
                        className="face-modal-submit"
                        onClick={handleSubmit}
                        disabled={isSubmitting || !faceName.trim()}
                    >
                        {isSubmitting ? t('faces.registering') : t('faces.register')}
                    </button>
                </div>
            </div>
        </div>
    );
}
