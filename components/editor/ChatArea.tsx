'use client';

import React, { useRef, useEffect, useState } from 'react';
import { useAppStore } from '@/lib/store';
import { useTranslation } from '@/lib/useTranslation';
import { AVAILABLE_MODELS } from '@/lib/types';
import type { MediaFilter, AspectRatio } from '@/lib/types';
import InpaintModal from './InpaintModal';
import MyFaces from './MyFaces';

// ── Uploaded image slot ──
interface UploadSlot {
    file: File;
    previewUrl: string;
    label: string;
    maskBase64?: string;
}

const MAX_UPLOADS = 4;

export default function ChatArea() {
    const {
        chats,
        activeChatId,
        createChat,
        addMessage,
        toggleFavorite,
        mediaFilter,
        setMediaFilter,
        isGenerating,
        setIsGenerating,
        submitTrigger,
        img2vidImageUrl,
        settings,
        settingsPanelVisible,
        toggleSettingsPanel,
        user,
        deductCredits,
        addCredits,
        updateSettings,
        tagSettings,
        selectedFaceId,
        savedFaces,
    } = useAppStore();

    const { t } = useTranslation();
    const [inputText, setInputText] = useState('');
    // BUG-02: multi-image support
    const [uploads, setUploads] = useState<UploadSlot[]>([]);
    const [faceSwapMode, setFaceSwapMode] = useState(false);
    const [showRegisterModal, setShowRegisterModal] = useState(false);
    const [showRegisterToast, setShowRegisterToast] = useState(false);
    const [inpaintMode, setInpaintMode] = useState(false);
    const [reposeMode, setReposeMode] = useState(false);
    const [poseType, setPoseType] = useState<string>('standing');
    const [showInpaintModal, setShowInpaintModal] = useState(false);
    const [showImageLimitModal, setShowImageLimitModal] = useState(false);
    const [showUploadConsentModal, setShowUploadConsentModal] = useState(false);
    const [uploadConsentChecks, setUploadConsentChecks] = useState([false, false, false]);
    const [uploadConsentConfirmed, setUploadConsentConfirmed] = useState(false);
    const [pendingGenerate, setPendingGenerate] = useState(false);
    const [generationError, setGenerationError] = useState<string | null>(null);
    const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

    // Security: Img2Img Consent

    const [isDragging, setIsDragging] = useState(false);
    const [draggedThumbIndex, setDraggedThumbIndex] = useState<number | null>(null);
    const dragCounter = useRef(0);
    const chatContainerRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Mobile Accordion state
    const [mobileSettingsOpen, setMobileSettingsOpen] = useState(false);

    const activeChat = chats.find((c) => c.id === activeChatId) || null;

    // Derived states for model selection
    const isImageMode = ['txt2img', 'img2img', 'img_edit'].includes(settings.generationType);
    const filteredModels = AVAILABLE_MODELS.filter((m) =>
        isImageMode ? m.type === 'image' : m.type === 'video'
    );
    const activeModel = AVAILABLE_MODELS.find(m => m.id === settings.model);
    const modelDisplayName = activeModel ? activeModel.name : settings.model;

    // Show attach for modes that need images
    const showAttach = !['txt2img', 'txt2vid'].includes(settings.generationType);

    const filters: { key: MediaFilter; label: string }[] = [
        { key: 'all', label: t('chat.filterAll') },
        { key: 'images', label: t('chat.filterImages') },
        { key: 'videos', label: t('chat.filterVideos') },
        { key: 'favorites', label: `♥ ${t('chat.filterFavorites')}` },
    ];

    // Filter messages based on active filter
    const filteredMessages = activeChat?.messages.filter((msg) => {
        if (mediaFilter === 'all') return true;
        if (mediaFilter === 'images') return msg.imageUrl;
        if (mediaFilter === 'videos') return msg.videoUrl;
        if (mediaFilter === 'favorites') return msg.isFavorite;
        return true;
    }) ?? [];

    // Auto-scroll on new messages
    useEffect(() => {
        if (chatContainerRef.current) {
            chatContainerRef.current.scrollTo({
                top: chatContainerRef.current.scrollHeight,
                behavior: 'smooth',
            });
        }
    }, [activeChat?.messages.length, isGenerating]);

    // Auto-resize textarea
    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
        }
    }, [inputText]);

    // BUG-01: Reset input when switching chats
    useEffect(() => {
        setInputText('');
        setUploads([]);
        setGenerationError(null);
        // Clean up old messages (1h TTL) on mount
        useAppStore.getState().cleanupOldMessages();
    }, [activeChatId]);

    // Clear files when switching to text-only mode
    useEffect(() => {
        if (!showAttach && uploads.length > 0) {
            cleanupUploads();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [settings.generationType]);

    // ── File handling ──

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files) return;
        addFiles(Array.from(files));
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const addFiles = (files: File[]) => {
        const remaining = MAX_UPLOADS - uploads.length;
        const toAdd = files.slice(0, remaining);
        const newSlots: UploadSlot[] = toAdd.map((file, i) => ({
            file,
            previewUrl: URL.createObjectURL(file),
            label: `画像${uploads.length + i + 1}`,
        }));

        // Auto-detect and set aspect ratio based on the first image
        if (uploads.length === 0 && toAdd.length > 0) {
            const firstFile = toAdd[0];
            const img = new Image();
            img.onload = () => {
                const ratio = img.width / img.height;
                let detected: AspectRatio = '1:1';
                if (ratio > 2.0) detected = '21:9';
                else if (ratio > 1.5) detected = '16:9';
                else if (ratio > 1.1) detected = '4:3';
                else if (ratio < 0.5) detected = '9:16';
                else if (ratio < 0.9) detected = '3:4';

                updateSettings({ aspectRatio: detected });
                URL.revokeObjectURL(img.src);
            };
            img.src = URL.createObjectURL(firstFile);
        }

        setUploads((prev) => [...prev, ...newSlots]);
    };

    const handleDragEnter = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        dragCounter.current++;
        if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
            setIsDragging(true);
        }
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        dragCounter.current--;
        if (dragCounter.current === 0) {
            setIsDragging(false);
        }
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
        dragCounter.current = 0;
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            addFiles(Array.from(e.dataTransfer.files));
            e.dataTransfer.clearData();
        }
    };

    const handleThumbClick = (label: string) => {
        if (!textareaRef.current) return;
        const start = textareaRef.current.selectionStart;
        const end = textareaRef.current.selectionEnd;
        const text = inputText;
        const before = text.substring(0, start);
        const after = text.substring(end);

        // Add space around the label if needed
        const labelWithSpacing = `${before.endsWith(' ') || before === '' ? '' : ' '}${label}${after.startsWith(' ') ? '' : ' '}`;

        const newText = before + labelWithSpacing + after;
        setInputText(newText);

        // Return focus and move cursor
        setTimeout(() => {
            if (textareaRef.current) {
                textareaRef.current.focus();
                const newPos = start + labelWithSpacing.length;
                textareaRef.current.setSelectionRange(newPos, newPos);
            }
        }, 0);
    };

    const handleRemoveUpload = (index: number) => {
        setUploads((prev) => {
            const updated = prev.filter((_, i) => i !== index);
            // Re-label
            return updated.map((slot, i) => ({ ...slot, label: `画像${i + 1}` }));
        });
    };

    const cleanupUploads = () => {
        uploads.forEach((s) => URL.revokeObjectURL(s.previewUrl));
        setUploads([]);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    // ── Re-upload helper: used by Regenerate/Edit actions ──
    const reUploadImage = async (url: string) => {
        try {
            const res = await fetch(url);
            const blob = await res.blob();
            const file = new File([blob], `ai_ref_${Date.now()}.png`, { type: 'image/png' });

            // Cleanup existing
            uploads.forEach((s) => URL.revokeObjectURL(s.previewUrl));

            const newSlot: UploadSlot = {
                file,
                previewUrl: URL.createObjectURL(file),
                label: '画像1',
            };
            setUploads([newSlot]);
            return true;
        } catch (err) {
            console.error('Failed to re-upload image:', err);
            setGenerationError('画像の読み込みに失敗しました。');
            return false;
        }
    };

    // BUG-03: Convert image to PNG via Canvas (handles WebP, AVIF, BMP, etc.)
    const convertImageToPng = (file: File): Promise<string> => {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                canvas.width = img.width;
                canvas.height = img.height;
                const ctx = canvas.getContext('2d');
                if (!ctx) return reject(new Error('Canvas not supported'));
                ctx.drawImage(img, 0, 0);
                const dataUrl = canvas.toDataURL('image/png');
                const base64 = dataUrl.split(',')[1];
                resolve(base64);
            };
            img.onerror = () => reject(new Error('Failed to decode image'));
            img.src = URL.createObjectURL(file);
        });
    };

    // Convert File to base64 string — auto-converts non-JPG/PNG via Canvas
    const fileToBase64 = async (file: File): Promise<string> => {
        const safeTypes = ['image/jpeg', 'image/png'];
        if (!safeTypes.includes(file.type)) {
            // Auto-convert WebP, AVIF, BMP, etc. to PNG
            return convertImageToPng(file);
        }
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
                const result = reader.result as string;
                const base64 = result.split(',')[1];
                resolve(base64);
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    };

    // BUG-03: Friendly error messages
    const friendlyError = (raw: string): string => {
        if (raw.includes('INVALID_IMAGE_FORMAT')) {
            return '❌ この画像形式には対応していません。\n対応形式：JPG、PNG\n対処法：画像をJPGまたはPNGに変換してから再度アップロードしてください。';
        }
        if (raw.includes('prompt_required')) {
            return t('chat.promptRequired');
        }
        if (raw.includes('Account temporarily suspended for repeated violations (24h).')) {
            return t('chat.error_temp_ban');
        }
        if (raw.includes('Account permanently banned')) {
            return t('chat.error_permanent_ban');
        }
        return raw;
    };

    
    // Toast for unregistered users (once per session)
    useEffect(() => {
        if (!user || !user.email) {
            const toastShown = window.sessionStorage.getItem('register_toast_shown');
            if (!toastShown) {
                setShowRegisterToast(true);
                window.sessionStorage.setItem('register_toast_shown', '1');
                const timer = setTimeout(() => setShowRegisterToast(false), 5000);
                return () => clearTimeout(timer);
            }
        }
    }, [user]);
    const [showTermsModal, setShowTermsModal] = useState(false);
    const [termsChecks, setTermsChecks] = useState({ terms: false, content: false, age: false });

    const handleAgreeTerms = async () => {
        const token = localStorage.getItem('auth_token');
        if (!token) return;
        try {
            const res = await fetch('/api/auth/agree-terms', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
            });
            const data = await res.json();
            if (res.ok && user) {
                useAppStore.getState().setUser({ ...user, termsAgreedAt: data.termsAgreedAt });
                setShowTermsModal(false);
            }
        } catch (err) {
            console.error('Failed to agree terms:', err);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (isGenerating) return;
        // Terms agreement is now handled during registration

        // Check upload consent for img2img/faceswap/inpaint
        const genType = settings.generationType;
        if ((genType === 'img2img' || genType === 'img_edit') && !uploadConsentConfirmed) {
            setShowUploadConsentModal(true);
            setPendingGenerate(true);
            return;
        }

        // ★ 追加: モード別バリデーション（UIをバイパスされた場合の防御）
        if (settings.generationType === 'img2img') {
            if (reposeMode) {
                if (uploads.length === 0) {
                    setGenerationError(t('chat.reposeNoImage'));
                    return;
                }
            } else if (faceSwapMode) {
                if (uploads.length < 2) {
                    setGenerationError(t('chat.faceSwapNoImage'));
                    return;
                }

            } else if (inpaintMode) {
                if (uploads.length === 0) {
                    setGenerationError(t('chat.uploadRequiredForInpaint'));
                    return;
                }

            } else {
                // Standard img2img
                if (uploads.length === 0) {
                    setGenerationError(t('chat.img2imgNoImage'));
                    return;
                }
                if (!inputText.trim()) {
                    setGenerationError(t('chat.promptRequired'));
                    return;
                }

            }
        }

        const isImageGeneration = ['txt2img', 'img2img', 'img_edit'].includes(settings.generationType);
        const isVideoGeneration = ['txt2vid', 'img2vid', 'ref2vid', 'vid2vid'].includes(settings.generationType);

        let creditCost = settings.count * 1; // txt2img
        if (isVideoGeneration) creditCost = settings.count * 5;
        else if (faceSwapMode) creditCost = settings.count * 5;
        else if (inpaintMode) creditCost = settings.count * 3;
        else if (settings.generationType === 'img2img') creditCost = settings.count * 2;

        // ── Require login ──
        if (!user || !user.email) {
            setShowRegisterModal(true);
            return;
        }
        const isTestAccount = user?.email === 'ooisidegesu@gmail.com';

        if (!isTestAccount && user && user.credits < creditCost) {
            setGenerationError(`❌ クレジットが不足しています。（必要: ${creditCost}, 保有: ${user.credits}）`);
            return;
        }

        setGenerationError(null);

        // Ensure we have a chat
        let chatId = activeChatId;
        if (!chatId) {
            chatId = createChat();
        }

        // Add user message (show first uploaded image as preview)
        addMessage(chatId, {
            role: 'user',
            content: inputText.trim(),
            imageUrl: uploads[0]?.previewUrl ?? undefined,
            isFavorite: false,
        });

        const userPrompt = inputText.trim();
        const currentUploads = [...uploads];
        setInputText('');
        setUploads([]);
        // Consent reset removed - now handled by modal
        if (fileInputRef.current) fileInputRef.current.value = '';

        setIsGenerating(true);
        if (!isTestAccount) {
            deductCredits(creditCost);
            // Persistent sync
            const token = window.localStorage.getItem('auth_token');
            if (token) {
                fetch('/api/billing', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                    body: JSON.stringify({ action: 'deduct', amount: creditCost }),
                }).catch(e => console.error('Failed to sync credit deduction:', e));
            }
        }

        if (isImageGeneration) {
            try {
                // Convert files to base64 for img2img / img_edit
                let imageBase64: string | undefined;
                let additionalImages: string[] | undefined;
                if (currentUploads.length > 0 && (settings.generationType !== 'txt2img' || inpaintMode)) {
                    imageBase64 = await fileToBase64(currentUploads[0].file);
                    if (currentUploads.length > 1) {
                        additionalImages = await Promise.all(
                            currentUploads.slice(1).map((s) => fileToBase64(s.file))
                        );
                    }
                }
                const token = window.localStorage.getItem('auth_token');
                const headers: Record<string, string> = { 'Content-Type': 'application/json' };
                if (token) {
                    headers['Authorization'] = `Bearer ${token}`;
                }

                const res = await fetch('/api/generate', {
                    method: 'POST',
                    headers,
                    body: JSON.stringify({
                        prompt: userPrompt,
                        modelId: settings.model,
                        generationType: settings.generationType,
                        aspectRatio: settings.aspectRatio,
                        resolution: settings.resolution,
                        count: settings.count,
                        qualityPreset: settings.qualityPreset,
                        imageBase64,
                        additionalImages,
                        faceSwapMode,
                        inpaintMode,
                        reposeMode,
                        maskBase64: inpaintMode ? currentUploads[0]?.maskBase64 : undefined,
                        nudeMode: settings.nudeMode ?? true,
                        tagSettings,
                        selectedFaceImageUrl: selectedFaceId
                            ? savedFaces.find(f => f.id === selectedFaceId)?.image_url
                            : undefined,
                    }),
                });

                const data = await res.json();

                if (!res.ok || data.error) {
                    throw new Error(data.error || `API error: ${res.status}`);
                }

                setInpaintMode(false);
                setFaceSwapMode(false);
                setReposeMode(false);

                // Add AI response for each generated image
                const images = data.images || [];
                if (images.length === 0) {
                    throw new Error('No images returned from API');
                }

                for (const img of images) {
                    addMessage(chatId, {
                        role: 'assistant',
                        content: `Generated from: "${userPrompt || 'uploaded reference'}"`,
                        imageUrl: img.url,
                        generationType: settings.generationType,
                        model: settings.model,
                        isFavorite: false,
                        settings: { ...settings },
                    });

                    // ★ 生成履歴をサーバーに保存
                    try {
                        const saveToken = window.localStorage.getItem('auth_token');
                        if (saveToken) {
                            fetch('/api/generations', {
                                method: 'POST',
                                headers: {
                                    'Content-Type': 'application/json',
                                    Authorization: `Bearer ${saveToken}`,
                                },
                                body: JSON.stringify({
                                    prompt: userPrompt || 'uploaded reference',
                                    modelName: settings.model,
                                    fileUrl: img.url,
                                    fileType: 'image',
                                    generationType: inpaintMode
                                        ? 'inpaint'
                                        : faceSwapMode
                                            ? 'faceswap'
                                            : settings.generationType === 'img2img'
                                                ? 'img2img'
                                                : 'txt2img',
                                    creditsUsed: creditCost,
                                    status: 'success',
                                    params: {
                                        aspectRatio: settings.aspectRatio,
                                        resolution: settings.resolution,
                                        qualityPreset: settings.qualityPreset,
                                    },
                                }),
                            }).catch(err => console.error('Failed to save generation:', err));
                        }
                    } catch (e) {
                        console.error('Generation save error:', e);
                    }
                }
            } catch (err) {
                const errorMsg = err instanceof Error ? err.message : 'Unknown error';
                const i18nKeys = [
                    'error_safety_violation',
                    'error_temp_ban',
                    'error_permanent_ban',
                    'error_access_denied',
                    'error_rate_limit',
                    'error_free_credits_expired',
                    'error_free_credits_feature'
                ];
                const isSafetyErrorCode = i18nKeys.some(k => errorMsg.includes(k));

                let friendly = friendlyError(errorMsg);
                if (errorMsg.startsWith('error_access_denied')) {
                    const reason = errorMsg.replace('error_access_denied', '').trim();
                    friendly = t('errors.error_access_denied') + reason;
                } else if (i18nKeys.includes(errorMsg)) {
                    // Map to the translation key
                    friendly = t(`errors.${errorMsg}`);
                }

                if (errorMsg.includes('Face Swap once per day')) {
                    friendly = t('chat.faceSwapLimitReached');
                }
                setGenerationError(friendly);
                addMessage(chatId, {
                    role: 'assistant',
                    content: `❌ ${isSafetyErrorCode || errorMsg.includes('INVALID_IMAGE_FORMAT') ? '' : 'Generation failed: '}${friendly}`,
                    isFavorite: false,
                });

                // Refund credits on failure
                if (!isTestAccount && user) {
                    addCredits(creditCost);
                    const token = window.localStorage.getItem('auth_token');
                    if (token) {
                        fetch('/api/billing', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                            body: JSON.stringify({ action: 'refund', amount: creditCost, reason: errorMsg }),
                        }).catch(e => console.error('Failed to sync credit refund:', e));
                    }
                }
            }
        } else if (isVideoGeneration) {
            try {
                const imageBase64 = img2vidImageUrl ?? '';
                if (!imageBase64) {
                    addMessage(chatId, { role: 'assistant', content: '画像をアップロードしてください。', generationType: settings.generationType, model: settings.model, isFavorite: false });
                    setIsGenerating(false);
                    return;
                }
                const actionTag = (tagSettings.fetish || [])
                    .map((f: string) => ({
                        fellatio: 'blowjob, oral sex',
                        cowgirl: 'cowgirl position, riding on top',
                        insertion: 'penetration, vaginal insertion',
                        kiss: 'passionate kissing',
                        missionary: 'missionary position',
                        doggy: 'doggy style, from behind',
                        standing: 'standing sex position',
                        handjob: 'handjob, stroking penis',
                        paizuri: 'paizuri, titjob',
                    } as Record<string, string>)[f])
                    .filter(Boolean)
                    .join(', ');

                const authToken = localStorage.getItem('auth_token') ?? '';
                const res = await fetch('/api/video', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${authToken}`,
                    },
                    body: JSON.stringify({
                        imageBase64,
                        prompt: userPrompt,
                        actionTag,
                        duration: settings.duration,
                        model: settings.model,
                    }),
                });

                const data = await res.json();

                if (!res.ok) {
                    const errorMsg = data.error === 'plan_upgrade_required'
                        ? '動画生成は有料プランが必要です。アップグレードしてください。'
                        : data.error === 'insufficient_credits'
                        ? `クレジットが不足しています。必要: ${data.required} / 残り: ${data.current}`
                        : data.error === 'duration_exceeded'
                        ? '選択した動画時間は現在のプランでは利用できません。'
                        : `動画生成に失敗しました: ${data.error}`;
                    addMessage(chatId, {
                        role: 'assistant',
                        content: errorMsg,
                        generationType: settings.generationType,
                        model: settings.model,
                        isFavorite: false,
                    });
                } else {
                    addMessage(chatId, {
                        role: 'assistant',
                        content: '',
                        videoUrl: data.videoUrl,
                        generationType: settings.generationType,
                        model: settings.model,
                        isFavorite: false,
                        settings: { ...settings },
                    });
                }
            } catch (err) {
                console.error('Video generation error:', err);
                addMessage(chatId, {
                    role: 'assistant',
                    content: '動画生成中にエラーが発生しました。しばらくしてから再試してください。',
                    generationType: settings.generationType,
                    model: settings.model,
                    isFavorite: false,
                });
            }
        }

        // Check if chat has more than 10 images - show modal
        const currentChat = chats.find((c) => c.id === chatId);
        if (currentChat) {
            const imgCount = currentChat.messages.filter((m) => m.imageUrl).length;
            if (imgCount > 10) {
                setShowImageLimitModal(true);
            }
        }

        setIsGenerating(false);
    };

    const handleActionRegenerate = async (imgUrl: string, originalPrompt: string) => {
        const success = await reUploadImage(imgUrl);
        if (success) {
            // Just set the prompt, but don't auto-generate
            setInputText(originalPrompt);
        }
    };

    const handleActionEdit = async (imgUrl: string) => {
        const success = await reUploadImage(imgUrl);
        if (success) {
            setInpaintMode(true);
            setFaceSwapMode(false);
            setShowInpaintModal(true);
        }
    };

    // Action: start Inpaint from a generated image
    const handleActionInpaint = async (imgUrl: string) => {
        // Switch to img2img mode to enable attach/inpaint tools
        updateSettings({ generationType: 'img2img' });
        const success = await reUploadImage(imgUrl);
        if (success) {
            setInpaintMode(true);
            setFaceSwapMode(false);
            setShowInpaintModal(true);
        }
    };

    // Action: start Face Swap from a generated image
    const handleActionFaceSwap = async (imgUrl: string) => {
        updateSettings({ generationType: 'img2img' });
        const success = await reUploadImage(imgUrl);
        if (success) {
            setFaceSwapMode(true);
            setInpaintMode(false);
        }
    };

    // Swap uploaded images (for Face to Face ordering)
    const handleSwapUploads = () => {
        if (uploads.length < 2) return;
        setUploads((prev) => {
            const swapped = [prev[1], prev[0], ...prev.slice(2)];
            return swapped.map((slot, i) => ({ ...slot, label: `画像${i + 1}` }));
        });
    };

    // Drag & Drop for thumbnail reordering (Face Swap)
    const handleThumbDragStart = (index: number) => {
        setDraggedThumbIndex(index);
    };

    const handleThumbDragOver = (e: React.DragEvent, index: number) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    };

    const handleThumbDrop = (e: React.DragEvent, dropIndex: number) => {
        e.preventDefault();
        if (draggedThumbIndex === null || draggedThumbIndex === dropIndex) {
            setDraggedThumbIndex(null);
            return;
        }
        setUploads((prev) => {
            const newUploads = [...prev];
            const [dragged] = newUploads.splice(draggedThumbIndex, 1);
            newUploads.splice(dropIndex, 0, dragged);
            return newUploads.map((slot, i) => ({ ...slot, label: `画像${i + 1}` }));
        });
        setDraggedThumbIndex(null);
    };

    const handleThumbDragEnd = () => {
        setDraggedThumbIndex(null);
    };

    useEffect(() => {
        console.log('submitTrigger changed:', submitTrigger);
        if (submitTrigger > 0) {
            console.log('calling handleSubmit from trigger');
            handleSubmit(new Event('submit') as unknown as React.FormEvent);
        }
    }, [submitTrigger]);

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSubmit(e);
        }
    };

    const formatTime = (ts: number) => {
        const d = new Date(ts);
        return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    // Download an image from a URL as PNG
    const handleDownload = (url: string) => {
        const isDataUri = url.startsWith('data:');

        if (isDataUri) {
            // Case 1: Data URI (e.g. Face Swap results)
            // These are huge, so we MUST handle them locally to avoid URL length limits.
            const a = document.createElement('a');
            a.href = url;
            // Force PNG extension even if source is JPEG
            a.download = `ai_image_${Date.now()}.png`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
        } else {
            // Case 2: Remote URL (e.g. standard generation)
            // We use the proxy to bypass CORS and ensure a clean PNG conversion.
            const proxyUrl = `/api/download?url=${encodeURIComponent(url)}`;
            const a = document.createElement('a');
            a.href = proxyUrl;
            a.download = `ai_image_${Date.now()}.png`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
        }
    };

    return (
        <section className="chat-area">
            {/* Upload Consent Modal */}
            {showUploadConsentModal && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(0,0,0,0.75)', zIndex: 9999,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    padding: 20, backdropFilter: 'blur(8px)',
                }} onClick={() => { setShowUploadConsentModal(false); setPendingGenerate(false); }}>
                    <div style={{
                        background: 'linear-gradient(145deg, #1a1a2e 0%, #16162a 100%)',
                        borderRadius: 16, padding: 0, maxWidth: 460, width: '100%',
                        border: '1px solid rgba(124,92,252,0.2)',
                        boxShadow: '0 25px 60px rgba(0,0,0,0.6), 0 0 40px rgba(124,92,252,0.1)',
                        overflow: 'hidden',
                    }} onClick={e => e.stopPropagation()}>
                        <div style={{ height: 3, background: 'linear-gradient(90deg, #f59e0b, #7c5cfc, #f59e0b)', backgroundSize: '200% 100%' }} />
                        <div style={{ padding: '28px 28px 24px' }}>
                            <div style={{
                                width: 56, height: 56, borderRadius: 14,
                                background: 'rgba(245,158,11,0.12)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                margin: '0 auto 16px', fontSize: 28
                            }}>⚠️</div>
                            <h2 style={{
                                fontSize: '1.15rem', fontWeight: 700,
                                color: '#e8e8f0', textAlign: 'center',
                                marginBottom: 6, letterSpacing: '-0.01em'
                            }}>{t('img2imgConsent.modal.title')}</h2>
                            <p style={{
                                fontSize: '0.82rem', color: '#8b8ba7',
                                textAlign: 'center', marginBottom: 20
                            }}>{t('img2imgConsent.modal.subtitle')}</p>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 22 }}>
                                {[0, 1, 2].map((i) => (
                                    <label key={i} style={{
                                        display: 'flex', gap: 10, alignItems: 'flex-start',
                                        cursor: 'pointer', fontSize: '0.84rem', color: '#d0d0e0',
                                        lineHeight: 1.5, padding: '10px 14px', borderRadius: 10,
                                        background: uploadConsentChecks[i] ? 'rgba(124,92,252,0.08)' : 'rgba(255,255,255,0.03)',
                                        border: uploadConsentChecks[i] ? '1px solid rgba(124,92,252,0.25)' : '1px solid rgba(255,255,255,0.06)',
                                        transition: 'all 0.2s',
                                    }} onClick={() => {
                                        const next = [...uploadConsentChecks];
                                        next[i] = !next[i];
                                        setUploadConsentChecks(next);
                                    }}>
                                        <input type="checkbox" checked={uploadConsentChecks[i]} readOnly
                                            style={{ marginTop: 2, accentColor: '#7c5cfc', width: 16, height: 16, flexShrink: 0 }} />
                                        <span>{t(`img2imgConsent.modal.check${i}`)}</span>
                                    </label>
                                ))}
                            </div>
                            <div style={{ display: 'flex', gap: 10 }}>
                                <button onClick={() => { setShowUploadConsentModal(false); setPendingGenerate(false); }}
                                    style={{
                                        flex: 1, padding: '12px 16px', borderRadius: 10,
                                        border: '1px solid rgba(255,255,255,0.08)',
                                        background: 'rgba(255,255,255,0.04)',
                                        color: '#8b8ba7', cursor: 'pointer',
                                        fontSize: '0.88rem', fontWeight: 500,
                                    }}>{t('img2imgConsent.modal.cancel')}</button>
                                <button
                                    disabled={!uploadConsentChecks.every(Boolean)}
                                    onClick={() => {
                                        setUploadConsentConfirmed(true);
                                        setShowUploadConsentModal(false);
                                        setPendingGenerate(false);
                                        // Auto-submit after confirming
                                        setTimeout(() => {
                                            const btn = document.querySelector('.editor-send-btn') as HTMLButtonElement;
                                            if (btn) btn.click();
                                        }, 100);
                                    }}
                                    style={{
                                        flex: 1, padding: '12px 16px', borderRadius: 10,
                                        border: 'none',
                                        background: uploadConsentChecks.every(Boolean)
                                            ? 'linear-gradient(135deg, #7c5cfc 0%, #6a4ff0 100%)'
                                            : '#333',
                                        color: '#fff',
                                        cursor: uploadConsentChecks.every(Boolean) ? 'pointer' : 'not-allowed',
                                        fontSize: '0.88rem', fontWeight: 600,
                                        boxShadow: uploadConsentChecks.every(Boolean) ? '0 4px 20px rgba(124,92,252,0.35)' : 'none',
                                    }}>{t('img2imgConsent.modal.confirm')}</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Image Limit Modal */}
            {showImageLimitModal && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(0,0,0,0.75)', zIndex: 9999,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    padding: 20, backdropFilter: 'blur(8px)',
                    animation: 'fadeIn 0.2s ease-out'
                }} onClick={() => setShowImageLimitModal(false)}>
                    <div style={{
                        background: 'linear-gradient(145deg, #1a1a2e 0%, #16162a 100%)',
                        borderRadius: 16, padding: 0, maxWidth: 440, width: '100%',
                        border: '1px solid rgba(124,92,252,0.2)',
                        boxShadow: '0 25px 60px rgba(0,0,0,0.6), 0 0 40px rgba(124,92,252,0.1)',
                        overflow: 'hidden',
                        animation: 'slideUp 0.3s ease-out'
                    }} onClick={e => e.stopPropagation()}>
                        {/* Header gradient bar */}
                        <div style={{
                            height: 3,
                            background: 'linear-gradient(90deg, #7c5cfc, #a78bfa, #7c5cfc)',
                            backgroundSize: '200% 100%',
                        }} />
                        <div style={{ padding: '28px 28px 24px' }}>
                            {/* Icon */}
                            <div style={{
                                width: 56, height: 56, borderRadius: 14,
                                background: 'rgba(124,92,252,0.12)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                margin: '0 auto 16px', fontSize: 28
                            }}>🖼️</div>
                            {/* Title */}
                            <h2 style={{
                                fontSize: '1.15rem', fontWeight: 700,
                                color: '#e8e8f0', textAlign: 'center',
                                marginBottom: 10, letterSpacing: '-0.01em'
                            }}>{t('chat.imageLimit.title')}</h2>
                            {/* Message */}
                            <p style={{
                                fontSize: '0.88rem', color: '#8b8ba7',
                                textAlign: 'center', lineHeight: 1.65,
                                marginBottom: 24, maxWidth: 340, margin: '0 auto 24px'
                            }}>{t('chat.imageLimit.message')}</p>
                            {/* Buttons */}
                            <div style={{ display: 'flex', gap: 10 }}>
                                <button
                                    onClick={() => setShowImageLimitModal(false)}
                                    style={{
                                        flex: 1, padding: '12px 16px', borderRadius: 10,
                                        border: '1px solid rgba(255,255,255,0.08)',
                                        background: 'rgba(255,255,255,0.04)',
                                        color: '#8b8ba7', cursor: 'pointer',
                                        fontSize: '0.88rem', fontWeight: 500,
                                        transition: 'all 0.2s',
                                    }}
                                >{t('chat.imageLimit.close')}</button>
                                <button
                                    onClick={() => {
                                        setShowImageLimitModal(false);
                                        window.location.href = '/history';
                                    }}
                                    style={{
                                        flex: 1, padding: '12px 16px', borderRadius: 10,
                                        border: 'none',
                                        background: 'linear-gradient(135deg, #7c5cfc 0%, #6a4ff0 100%)',
                                        color: '#fff', cursor: 'pointer',
                                        fontSize: '0.88rem', fontWeight: 600,
                                        boxShadow: '0 4px 20px rgba(124,92,252,0.35)',
                                        transition: 'all 0.2s',
                                    }}
                                >{t('chat.imageLimit.button')}</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Terms Agreement Modal */}
            {showTermsModal && (<div style={{position:'fixed',top:0,left:0,right:0,bottom:0,background:'rgba(0,0,0,0.7)',zIndex:9999,display:'flex',alignItems:'center',justifyContent:'center',padding:20}}><div style={{background:'#1a1a2e',borderRadius:12,padding:32,maxWidth:480,width:'100%',border:'1px solid #2a2a3e'}}><h2 style={{fontSize:'1.2rem',fontWeight:700,marginBottom:8,color:'#e0e0e8'}}>Before You Start Generating</h2><p style={{fontSize:'0.85rem',color:'#8b8ba7',marginBottom:20}}>Please review and agree to continue.</p><div style={{display:'flex',flexDirection:'column',gap:12,marginBottom:24}}><label style={{display:'flex',gap:10,alignItems:'flex-start',cursor:'pointer',fontSize:'0.85rem',color:'#e0e0e8'}}><input type="checkbox" checked={termsChecks.terms} onChange={(e)=>setTermsChecks(p=>({...p,terms:e.target.checked}))} style={{marginTop:3}}/><span>I agree to the <a href="/terms" target="_blank" style={{color:'#7c5cfc'}}>Terms of Service</a> and <a href="/privacy" target="_blank" style={{color:'#7c5cfc'}}>Privacy Policy</a></span></label><label style={{display:'flex',gap:10,alignItems:'flex-start',cursor:'pointer',fontSize:'0.85rem',color:'#e0e0e8'}}><input type="checkbox" checked={termsChecks.content} onChange={(e)=>setTermsChecks(p=>({...p,content:e.target.checked}))} style={{marginTop:3}}/><span>I agree to the <a href="/content-policy" target="_blank" style={{color:'#7c5cfc'}}>Content Policy</a></span></label><label style={{display:'flex',gap:10,alignItems:'flex-start',cursor:'pointer',fontSize:'0.85rem',color:'#e0e0e8'}}><input type="checkbox" checked={termsChecks.age} onChange={(e)=>setTermsChecks(p=>({...p,age:e.target.checked}))} style={{marginTop:3}}/><span>I confirm I am 18+ and will not generate prohibited content (minors, real persons)</span></label></div><div style={{display:'flex',gap:10}}><button onClick={()=>setShowTermsModal(false)} style={{flex:1,padding:'10px 16px',borderRadius:8,border:'1px solid #2a2a3e',background:'transparent',color:'#8b8ba7',cursor:'pointer',fontSize:'0.9rem'}}>Cancel</button><button onClick={handleAgreeTerms} disabled={!termsChecks.terms||!termsChecks.content||!termsChecks.age} style={{flex:1,padding:'10px 16px',borderRadius:8,border:'none',background:termsChecks.terms&&termsChecks.content&&termsChecks.age?'linear-gradient(135deg,#7c5cfc,#6a4ff0)':'#333',color:'#fff',cursor:termsChecks.terms&&termsChecks.content&&termsChecks.age?'pointer':'not-allowed',fontSize:'0.9rem',fontWeight:600}}>Agree & Continue</button></div></div></div>)}
            {/* Filter Tabs + Settings Toggle */}
            <div className="chat-filter-tabs">
                {filters.map((f) => (
                    <button
                        key={f.key}
                        className={`filter-tab ${mediaFilter === f.key ? 'active' : ''}`}
                        onClick={() => setMediaFilter(f.key)}
                    >
                        {f.label}
                    </button>
                ))}
                {!settingsPanelVisible && (
                    <button
                        className="settings-toggle-btn"
                        onClick={toggleSettingsPanel}
                        style={{ marginLeft: 'auto' }}
                    >
                        ⚙️ {t('editor.showSettings')}
                    </button>
                )}
            </div>

            
            
            {/* Registration Toast */}
            {showRegisterToast && (
                <div onClick={() => { window.location.href = '/register'; }} style={{
                    position: 'fixed', top: '16px', left: '50%', transform: 'translateX(-50%)',
                    background: 'linear-gradient(135deg, #7c5cfc, #6366f1)',
                    color: '#fff', padding: '12px 24px', borderRadius: '12px',
                    cursor: 'pointer', zIndex: 10000, fontSize: '0.95rem', fontWeight: 600,
                    boxShadow: '0 8px 30px rgba(124,92,252,0.4)',
                    animation: 'slideDown 0.3s ease-out',
                    display: 'flex', alignItems: 'center', gap: '8px',
                    maxWidth: '90%'
                }}>
                    <span>{t('auth.toastMessage')}</span>
                    <span onClick={(e) => { e.stopPropagation(); setShowRegisterToast(false); }}
                        style={{ marginLeft: '8px', opacity: 0.7, cursor: 'pointer' }}>✕</span>
                </div>
            )}
            {/* Registration Modal */}
            {showRegisterModal && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex',
                    alignItems: 'center', justifyContent: 'center', zIndex: 9999,
                    backdropFilter: 'blur(4px)'
                }} onClick={() => setShowRegisterModal(false)}>
                    <div style={{
                        background: 'var(--bg-card, #1a1a2e)', borderRadius: '16px',
                        padding: '32px', maxWidth: '420px', width: '90%',
                        border: '1px solid var(--border-subtle, #333)',
                        boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
                        textAlign: 'center'
                    }} onClick={e => e.stopPropagation()}>
                        <div style={{ fontSize: '48px', marginBottom: '16px' }}>🎨</div>
                        <h2 style={{
                            color: 'var(--text-primary, #fff)', fontSize: '1.4rem',
                            fontWeight: 700, marginBottom: '12px'
                        }}>{t('auth.registerRequired')}</h2>
                        <p style={{
                            color: 'var(--text-secondary, #aaa)', fontSize: '0.95rem',
                            lineHeight: 1.6, marginBottom: '24px'
                        }}>{t('auth.registerMessage')}</p>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            <a href="/register" style={{
                                display: 'block', padding: '14px 24px',
                                background: 'linear-gradient(135deg, #7c5cfc, #6366f1)',
                                color: '#fff', borderRadius: '12px', fontWeight: 700,
                                fontSize: '1rem', textDecoration: 'none',
                                transition: 'transform 0.2s, box-shadow 0.2s',
                                boxShadow: '0 4px 15px rgba(124,92,252,0.4)'
                            }}>{t('auth.registerFree')}</a>
                            <button onClick={() => setShowRegisterModal(false)} style={{
                                padding: '12px 24px', background: 'transparent',
                                color: 'var(--text-tertiary, #888)', border: '1px solid var(--border-subtle, #333)',
                                borderRadius: '12px', cursor: 'pointer', fontSize: '0.9rem',
                                transition: 'background 0.2s'
                            }}>{t('auth.closeModal')}</button>
                        </div>
                    </div>
                </div>
            )}
            {/* Messages */}
            <div className="chat-messages" ref={chatContainerRef}>
                {!activeChat || filteredMessages.length === 0 ? (
                    settings.generationType !== 'img2vid' && (
                        <div className="chat-empty-state">
                            <div className="empty-icon">🎨</div>
                            <h3>{t('chat.empty')}</h3>
                            <p>{t('chat.emptyDesc')}</p>
                        </div>
                    )
                ) : (
                    filteredMessages.map((msg) => (
                        <div key={msg.id} className={`message-bubble ${msg.role}`}>
                            <div className="message-role">
                                {msg.role === 'user' ? 'You' : 'AI'}
                            </div>
                            <div className="message-body">
                                {msg.content && <div>{msg.content}</div>}
                                {msg.translatedPrompt && msg.role === 'assistant' && (
                                    <div style={{
                                        fontSize: '0.75rem',
                                        color: 'var(--text-tertiary)',
                                        marginTop: 6,
                                        fontStyle: 'italic',
                                    }}>
                                        Prompt: {msg.translatedPrompt}
                                    </div>
                                )}
                                {msg.imageUrl && (
                                    <div className="message-image-wrapper">
                                        <img
                                            src={msg.imageUrl}
                                            alt="Generated content"
                                            style={{
                                                maxWidth: msg.role === 'user' ? 200 : '100%',
                                                maxHeight: msg.role === 'user' ? 200 : 600,
                                                cursor: 'pointer',
                                            }}
                                            onClick={() => setLightboxUrl(msg.imageUrl!)}
                                        />
                                        <button
                                            className="image-download-btn"
                                            onClick={(e) => { e.stopPropagation(); handleDownload(msg.imageUrl!); }}
                                            title="Download"
                                        >
                                            ⬇
                                        </button>
                                    </div>
                                )}
                                {msg.videoUrl && (
                                    <video
                                        src={msg.videoUrl}
                                        controls
                                        autoPlay
                                        loop
                                        muted
                                        style={{ maxWidth: 500 }}
                                    />
                                )}
                            </div>
                            <div className="message-meta">
                                <span>{formatTime(msg.timestamp)}</span>
                                {msg.generationType && <span>• {msg.generationType}</span>}
                            </div>
                            {msg.role === 'assistant' && (
                                <div className="message-actions">
                                    <button
                                        className={`msg-action-btn ${msg.isFavorite ? 'favorite-active' : ''}`}
                                        onClick={() => activeChatId && toggleFavorite(activeChatId, msg.id)}
                                    >
                                        {msg.isFavorite ? '❤️' : '🤍'} {t('actions.favorite')}
                                    </button>
                                    <button
                                        className="msg-action-btn"
                                        onClick={() => msg.imageUrl && handleActionRegenerate(msg.imageUrl, msg.content.replace(/^Generated from: "(.*)"$/, '$1'))}
                                    >
                                        🔄 {t('actions.regenerate')}
                                    </button>
                                    {msg.imageUrl && (
                                        <>
                                            <button
                                                className="msg-action-btn"
                                                onClick={() => handleActionInpaint(msg.imageUrl!)}
                                            >
                                                🖌 {t('chat.actionInpaint')}
                                            </button>
                                            <button
                                                className="msg-action-btn"
                                                onClick={() => handleActionFaceSwap(msg.imageUrl!)}
                                            >
                                                🔄 {t('chat.actionFaceSwap')}
                                            </button>
                                            <button
                                                className="msg-action-btn"
                                                onClick={() => {
                                                    updateSettings({ generationType: 'img2img' });
                                                    reUploadImage(msg.imageUrl!).then(ok => {
                                                        if (ok) {
                                                            setReposeMode(true);
                                                            setFaceSwapMode(false);
                                                            setInpaintMode(false);
                                                        }
                                                    });
                                                }}
                                            >
                                                🎯 Change Pose
                                            </button>
                                        </>
                                    )}
                                </div>
                            )}
                        </div>
                    ))
                )}

                {/* Generating Indicator */}
                {isGenerating && settings.generationType !== 'img2vid' && (
                    <div className="generating-indicator">
                        <div className="generating-dots">
                            <span /><span /><span />
                        </div>
                        <span className="generating-text">{t('editor.generating')}</span>
                    </div>
                )}
                {isGenerating && settings.generationType === 'img2vid' && (
                    <div className="vid-generating-overlay">
                        <div className="vid-generating-inner">
                            <div className="vid-generating-spinner">
                                <div className="vid-spinner-ring" />
                                <div className="vid-spinner-ring vid-spinner-ring--2" />
                                <div className="vid-spinner-core">🎬</div>
                            </div>
                            <p className="vid-generating-title">動画を生成中...</p>
                            <p className="vid-generating-sub">AIが動画を作成しています。最大4分かかることがあります</p>
                            <div className="vid-generating-bar">
                                <div className="vid-generating-bar-fill" />
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Input */}
            <div className="chat-input-container" style={settings.generationType === 'img2vid' ? { display: 'none' } : {}}>
                {/* Credit Display */}
                {user && (
                    <div className={`credit-display ${user.credits <= 10 ? 'credit-low' : ''}`}>
                        ✨ {t('credits.remaining').replace('{count}', user.credits.toString())}
                    </div>
                )}
                <div
                    className={`chat-input-wrapper ${isDragging ? 'dragging' : ''}`}
                    onDragEnter={handleDragEnter}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                >
                    {isDragging && (
                        <div className="drag-overlay">
                            <div className="drag-overlay-content">
                                <div className="drag-icon">📥</div>
                                <div className="drag-text">{t('chat.dropFiles')}</div>
                            </div>
                        </div>
                    )}
                    {/* BUG-02: Multi-image upload thumbnails */}
                    {uploads.length > 0 && (
                        <div className="upload-thumbnails">
                            {uploads.map((slot, i) => {
                                const isFaceSwap = faceSwapMode;
                                const roleLabel = isFaceSwap
                                    ? (i === 0 ? `📷 ${t('chat.faceSwapBody')}` : i === 1 ? `🧑 ${t('chat.faceSwapFace')}` : slot.label)
                                    : slot.label;
                                const borderColor = isFaceSwap
                                    ? (i === 0 ? '#3b82f6' : i === 1 ? '#22c55e' : 'var(--border)')
                                    : 'var(--border)';
                                return (
                                    <div
                                        key={i}
                                        className={`upload-thumb ${draggedThumbIndex === i ? 'dragging' : ''}`}
                                        onClick={() => handleThumbClick(slot.label)}
                                        draggable={isFaceSwap}
                                        onDragStart={() => handleThumbDragStart(i)}
                                        onDragOver={(e) => handleThumbDragOver(e, i)}
                                        onDrop={(e) => handleThumbDrop(e, i)}
                                        onDragEnd={handleThumbDragEnd}
                                        style={{
                                            borderColor,
                                            borderWidth: isFaceSwap ? '2px' : '1px',
                                            cursor: isFaceSwap ? 'grab' : 'pointer',
                                            opacity: draggedThumbIndex === i ? 0.5 : 1,
                                            transition: 'all 0.2s ease',
                                        }}
                                    >
                                        <div className="thumb-img-container">
                                            <img src={slot.previewUrl} alt={roleLabel} />
                                            {slot.maskBase64 && (
                                                <img src={slot.maskBase64} alt="Mask" className="thumb-mask-overlay" />
                                            )}
                                        </div>
                                        <span
                                            className="upload-thumb-label"
                                            style={{
                                                background: isFaceSwap
                                                    ? (i === 0 ? 'rgba(59, 130, 246, 0.85)' : i === 1 ? 'rgba(34, 197, 94, 0.85)' : 'rgba(0,0,0,0.7)')
                                                    : 'rgba(0,0,0,0.7)',
                                            }}
                                        >
                                            {roleLabel}
                                        </span>
                                        <button
                                            className="upload-thumb-remove"
                                            onClick={(e) => { e.stopPropagation(); handleRemoveUpload(i); }}
                                        >
                                            ✕
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {/* Attach + input row */}
                    {showAttach && (
                        <div className="chat-input-tools">
                            <button
                                className="input-tool-btn"
                                onClick={() => fileInputRef.current?.click()}
                                disabled={uploads.length >= MAX_UPLOADS}
                            >
                                📎 {t('chat.attachFile')} ({uploads.length}/{MAX_UPLOADS})
                            </button>

                            {/* Mode Selection — exclusive toggle */}
                            <div className="img2img-mode-selector">
                                <button
                                    className={`mode-btn ${reposeMode ? 'active' : ''}`}
                                    onClick={() => {
                                        setReposeMode((v) => !v);
                                        setFaceSwapMode(false);
                                        setInpaintMode(false);
                                    }}
                                    disabled={uploads.length === 0}
                                    title={t('chat.repose')}
                                >
                                    🎯 Change Pose
                                </button>
                                <button
                                    className={`mode-btn ${faceSwapMode ? 'active' : ''}`}
                                    onClick={() => {
                                        setFaceSwapMode((v) => !v);
                                        setReposeMode(false);
                                        setInpaintMode(false);
                                    }}
                                    disabled={uploads.length === 0}
                                    title={t('chat.faceSwap')}
                                >
                                    👤 {t('chat.faceSwap')}
                                </button>
                                <button
                                    className={`mode-btn ${inpaintMode ? 'active' : ''}`}
                                    onClick={() => {
                                        if (uploads.length === 0) {
                                            setGenerationError(t('chat.uploadRequiredForInpaint') || 'Please upload an image first.');
                                            return;
                                        }
                                        setInpaintMode(true);
                                        setReposeMode(false);
                                        setFaceSwapMode(false);
                                        setShowInpaintModal(true);
                                    }}
                                    title={t('chat.inpaint')}
                                >
                                    ✏️ {t('chat.nudeModeBtn')}
                                </button>
                            </div>


                            
                            {faceSwapMode && uploads.length >= 2 && (
                                <button
                                    className="input-tool-btn"
                                    onClick={handleSwapUploads}
                                    title={t('chat.swapImages')}
                                >
                                    ↔ {t('chat.swapImages')}
                                </button>
                            )}
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*"
                                multiple
                                onChange={handleFileChange}
                                hidden
                            />
                        </div>
                    )}

                    {/* Face to Face guide */}
                    {faceSwapMode && (
                        <div className="face-swap-guide">
                            {uploads.length < 2
                                ? t('chat.faceSwapNoImage')
                                : t('chat.faceSwapGuide')
                            }
                        </div>
                    )}

                    {/* Consent moved to modal on generate */}

                    <div style={{ padding: '8px 16px', fontSize: '0.75rem', color: 'var(--warning)', background: 'rgba(245, 158, 11, 0.05)', borderRadius: '8px', marginBottom: '8px', border: '1px solid rgba(245, 158, 11, 0.1)' }}>
                        {t('editor.autoDeleteWarning')}
                    </div>

                    {/* Mobile Settings Accordion */}
                    <div className="mobile-settings-container">
                        <div
                            className="mobile-settings-summary"
                            onClick={() => setMobileSettingsOpen(!mobileSettingsOpen)}
                        >
                            <span className="summary-text">
                                {modelDisplayName} / {settings.aspectRatio} / {settings.resolution} / Nude {settings.nudeMode ? 'ON' : 'OFF'} / {settings.count}枚
                            </span>
                            <span className={`summary-icon ${mobileSettingsOpen ? 'open' : ''}`}>▼</span>
                        </div>
                        <div className={`mobile-settings-content ${mobileSettingsOpen ? 'open' : ''}`}>
                            <div className="mobile-settings-inner">
                                <div className="mobile-param-row">
                                    <label>Model</label>
                                    <select
                                        value={settings.model}
                                        onChange={(e) => updateSettings({ model: e.target.value })}
                                        style={{ maxWidth: '65%', textOverflow: 'ellipsis' }}
                                    >
                                        {/* NSFW Realistic Models */}
                                        {filteredModels.some((m) => m.category === 'nsfw-realistic') && (
                                            <optgroup label="🔞 NSFW — Realistic">
                                                {filteredModels.filter((m) => m.category === 'nsfw-realistic').map((model) => (
                                                    <option key={model.id} value={model.id}>
                                                        {model.name}
                                                    </option>
                                                ))}
                                            </optgroup>
                                        )}
                                        {/* Video Models */}
                                        {filteredModels.filter((m) => m.type === 'video').length > 0 && (
                                            <optgroup label="🎬 Video Models">
                                                {filteredModels.filter((m) => m.type === 'video').map((model) => (
                                                    <option key={model.id} value={model.id}>
                                                        {model.name}
                                                    </option>
                                                ))}
                                            </optgroup>
                                        )}
                                    </select>
                                </div>
                                <div className="mobile-param-row">
                                    <label>Aspect</label>
                                    <select
                                        value={settings.aspectRatio}
                                        onChange={(e) => updateSettings({ aspectRatio: e.target.value as AspectRatio })}
                                    >
                                        <option value="1:1">1:1</option>
                                        <option value="4:3">4:3</option>
                                        <option value="3:4">3:4</option>
                                        <option value="16:9">16:9</option>
                                        <option value="9:16">9:16</option>
                                    </select>
                                </div>
                                <div className="mobile-param-row">
                                    <label>Res</label>
                                    <select
                                        value={settings.resolution}
                                        onChange={(e) => updateSettings({ resolution: e.target.value as any })}
                                    >
                                        <option value="512">512</option>
                                        <option value="1024">1024</option>
                                        <option value="2K">2K</option>
                                        <option value="4K">4K</option>
                                    </select>
                                </div>
                                {settings.generationType === 'txt2img' && (
                                    <div className="mobile-param-row">
                                        <label>Nude</label>
                                        <label className="toggle-switch">
                                            <input
                                                type="checkbox"
                                                checked={settings.nudeMode ?? true}
                                                onChange={(e) => updateSettings({ nudeMode: e.target.checked })}
                                            />
                                            <span className="toggle-slider" />
                                        </label>
                                    </div>
                                )}
                                <div className="mobile-param-row">
                                    <label>Count</label>
                                    <div className="counter-control mobile-counter">
                                        <button onClick={(e) => { e.preventDefault(); updateSettings({ count: Math.max(1, settings.count - 1) }) }}>−</button>
                                        <span>{settings.count}</span>
                                        <button onClick={(e) => { e.preventDefault(); updateSettings({ count: Math.min(4, settings.count + 1) }) }}>＋</button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* My Faces — above the input area */}
                    <MyFaces />

                    {/* Error Banner — directly above textarea */}
                    {generationError && (
                        <div className="chat-error-banner" style={{ margin: '0 0 8px 0' }}>
                            <div className="chat-error-content">
                                {generationError}
                            </div>
                            <button
                                className="chat-error-close"
                                onClick={() => setGenerationError(null)}
                            >
                                ✕
                            </button>
                        </div>
                    )}
                    <form onSubmit={handleSubmit} style={{ position: 'relative' }}>
                        <textarea
                            ref={textareaRef}
                            className="chat-textarea"
                            value={inputText}
                            onChange={(e) => setInputText(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder={
                                inpaintMode
                                    ? t('chat.inpaintHint') || 'Describe what to change in the masked area...'
                                    : faceSwapMode && uploads.length > 0
                                        ? t('chat.faceSwapHint')
                                        : uploads.length > 0
                                            ? t('chat.imageRefHint')
                                            : t('chat.placeholder')
                            }
                            rows={1}
                            disabled={isGenerating}
                        />
                        <button
                            type="submit"
                            className={`send-btn ${isGenerating ? 'generating' : ''}`}
                            disabled={
                                isGenerating ||
                                // txt2img: プロンプト必須
                                (settings.generationType === 'txt2img' && !inputText.trim()) ||
                                // img2img (通常): 画像+プロンプト+同意チェック全て必須
                                (settings.generationType === 'img2img' && !faceSwapMode && !inpaintMode && (
                                    uploads.length === 0 || !inputText.trim()
                                )) ||
                                // inpaint: 画像+同意チェック必須（プロンプトはオプション）
                                (settings.generationType === 'img2img' && inpaintMode && (
                                    uploads.length === 0
                                )) ||
                                // faceSwap: 画像2枚+同意チェック必須（プロンプトはオプション）
                                (settings.generationType === 'img2img' && faceSwapMode && (
                                    uploads.length < 2
                                ))
                            }
                            style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: '4px', position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', padding: '8px 14px', borderRadius: '8px', fontSize: '0.75rem', lineHeight: '1' }}
                        >
                            {isGenerating ? (
                                <span className="send-btn-spinner" />
                            ) : (
                                <>
                                    <span style={{ fontSize: '0.75rem', lineHeight: 1 }}>▶</span>
                                    <span style={{ fontSize: '0.75rem', fontWeight: 700 }}>
                                        {(() => {
                                            let cost = settings.count * 1;
                                            if (['txt2vid', 'img2vid', 'ref2vid', 'vid2vid'].includes(settings.generationType)) cost = settings.count * 5;
                                            else if (faceSwapMode) cost = settings.count * 5;
                                            else if (inpaintMode) cost = settings.count * 3;
                                            else if (settings.generationType === 'img2img') cost = settings.count * 2;
                                            return '⚡ ' + cost;
                                        })()}
                                    </span>
                                </>
                            )}
                        </button>
                    </form>
                </div>
            </div>

            {/* Lightbox Overlay */}
            {
                lightboxUrl && (
                    <div className="lightbox-overlay" onClick={() => setLightboxUrl(null)}>
                        <div className="lightbox-content" onClick={(e) => e.stopPropagation()}>
                            <img src={lightboxUrl} alt="Full size" />
                            <div className="lightbox-actions">
                                <button
                                    className="lightbox-btn lightbox-download"
                                    onClick={() => handleDownload(lightboxUrl)}
                                >
                                    ⬇ Download
                                </button>
                                <button
                                    className="lightbox-btn lightbox-close"
                                    onClick={() => setLightboxUrl(null)}
                                >
                                    ✕ Close
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Inpaint Modal */}
            {
                showInpaintModal && uploads.length > 0 && (
                    <InpaintModal
                        imageUrl={uploads[0].previewUrl}
                        onClose={() => {
                            setShowInpaintModal(false);
                            if (!uploads[0].maskBase64) setInpaintMode(false);
                        }}
                        onSave={(maskBase64) => {
                            const newUploads = [...uploads];
                            newUploads[0] = { ...newUploads[0], maskBase64 };
                            setUploads(newUploads);
                            setShowInpaintModal(false);
                            setInpaintMode(true);
                        }}
                    />
                )
            }
        </section >
    );
}

