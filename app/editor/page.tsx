'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useAppStore } from '@/lib/store';
import { useTranslation } from '@/lib/useTranslation';
import type { AspectRatio, GenerationType } from '@/lib/types';
import LeftPanel from '@/components/editor/LeftPanel';
import RightPanel from '@/components/editor/RightPanel';
import Img2VidPanel from '@/components/editor/Img2VidPanel';

interface UploadSlot {
    file: File;
    previewUrl: string;
    label: string;
    maskBase64?: string;
}

export default function EditorPage() {
    const {
        chats, activeChatId, createChat, addMessage,
        isGenerating, setIsGenerating, submitTrigger,
        img2vidImageUrl, settings, user,
        deductCredits, addCredits, updateSettings,
        tagSettings, setGenerationType,
        selectedFaceId, savedFaces,
    } = useAppStore();
    const { t } = useTranslation();

    const isImg2Vid = settings.generationType === 'img2vid';
    const pollAbortRef = useRef<(() => void) | null>(null);

    // Shared state between Left and Right panels
    const [inputText, setInputText] = useState('');
    const [uploads, setUploads] = useState<UploadSlot[]>([]);
    // Derive face swap / inpaint mode from generationType (no longer separate state)
    const faceSwapMode = settings.generationType === 'face_swap';
    const inpaintMode = settings.generationType === 'inpaint';
    const setFaceSwapMode = (v: boolean) => setGenerationType(v ? 'face_swap' : 'txt2img');
    const setInpaintMode = (v: boolean) => setGenerationType(v ? 'inpaint' : 'txt2img');
    const [reposeMode, setReposeMode] = useState(false);
    const [showInpaintModal, setShowInpaintModal] = useState(false);
    const [generationError, setGenerationError] = useState<string | null>(null);
    const [showRegisterModal, setShowRegisterModal] = useState(false);
    const [showRegisterToast, setShowRegisterToast] = useState(false);
    const [showTermsModal, setShowTermsModal] = useState(false);
    const [termsChecks, setTermsChecks] = useState({ terms: false, content: false, age: false });
    const rightPanelRef = useRef<HTMLDivElement>(null);
    const inputTextRef = useRef(inputText);
    const uploadsRef = useRef(uploads);
    inputTextRef.current = inputText;
    uploadsRef.current = uploads;

    // When generating starts: close keyboard + scroll to generating card on mobile
    useEffect(() => {
        if (isGenerating) {
            if (document.activeElement instanceof HTMLElement) {
                document.activeElement.blur();
            }
            if (window.innerWidth < 1024) {
                setTimeout(() => {
                    const container = document.querySelector('.editor-layout-v2');
                    const genCard = document.querySelector('.editor-generate-sticky');
                    if (container && genCard) {
                        const cardTop = (genCard as HTMLElement).offsetTop;
                        container.scrollTo({ top: cardTop - 20, behavior: 'smooth' });
                    }
                }, 400);
            }
        }
    }, [isGenerating]);

    // Consent state for img2img
    // Consent moved to modal

    // Reset on chat switch
    useEffect(() => {
        setInputText('');
        setUploads([]);
        setGenerationError(null);
    }, [activeChatId]);

    // Clear files when switching to text-only mode
    useEffect(() => {
        const showAttach = !['txt2img', 'txt2vid'].includes(settings.generationType);
        if (!showAttach && uploads.length > 0) {
            uploads.forEach((s) => URL.revokeObjectURL(s.previewUrl));
            setUploads([]);
        }
    }, [settings.generationType]);

    // Recover pending generation results after mobile screen-off / tab restore
    const recoverPendingGeneration = async () => {
        const pendingJson = localStorage.getItem('pending_generation');
        if (!pendingJson) return;
        try {
            const pending = JSON.parse(pendingJson);
            const { taskId, chatId: pendingChatId, prompt: pendingPrompt, generationType: pendingGenType, model: pendingModel, creditCost: pendingCreditCost, startedAt } = pending;
            // Expire after 3 minutes
            if (Date.now() - startedAt > 3 * 60 * 1000) {
                localStorage.removeItem('pending_generation');
                setIsGenerating(false);
                return;
            }
            const statusRes = await fetch(`/api/generate/status?taskId=${taskId}`);
            const statusData = await statusRes.json();
            if (statusData.status === 'SUCCEED' && statusData.images?.length > 0) {
                localStorage.removeItem('pending_generation');
                // Cancel any existing poll
                if (pollAbortRef.current) { pollAbortRef.current(); pollAbortRef.current = null; }
                for (const img of statusData.images) {
                    addMessage(pendingChatId, {
                        role: 'assistant',
                        content: `Generated from: "${pendingPrompt || 'uploaded reference'}"`,
                        imageUrl: img.url,
                        generationType: pendingGenType,
                        model: pendingModel,
                        isFavorite: false,
                    });
                    try {
                        const saveToken = localStorage.getItem('auth_token');
                        if (saveToken) {
                            fetch('/api/generations', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${saveToken}` },
                                body: JSON.stringify({
                                    prompt: pendingPrompt || 'uploaded reference',
                                    modelName: pendingModel,
                                    fileUrl: img.url,
                                    fileType: 'image',
                                    generationType: pendingGenType,
                                    creditsUsed: pendingCreditCost,
                                    status: 'success',
                                    params: {},
                                }),
                            }).catch(() => {});
                        }
                    } catch {}
                }
                setIsGenerating(false);
            } else if (statusData.status === 'FAILED') {
                localStorage.removeItem('pending_generation');
                if (pollAbortRef.current) { pollAbortRef.current(); pollAbortRef.current = null; }
                setGenerationError(statusData.error || 'Generation failed');
                setIsGenerating(false);
            } else if (statusData.status === 'PROCESSING') {
                // Still processing — restart polling if no active poll running
                if (!pollAbortRef.current) {
                    setIsGenerating(true);
                    startPolling(taskId, pendingChatId, pendingPrompt, pendingGenType as GenerationType, pendingModel, pendingCreditCost, startedAt);
                }
            }
        } catch {
            localStorage.removeItem('pending_generation');
            setIsGenerating(false);
        }
    };

    // Reusable polling function (abortable)
    const startPolling = (taskId: string, chatId: string, prompt: string, genType: GenerationType, model: string, creditCost: number, startedAt: number) => {
        // Cancel any existing poll first
        if (pollAbortRef.current) { pollAbortRef.current(); }
        let cancelled = false;
        pollAbortRef.current = () => { cancelled = true; };

        const poll = async () => {
            if (cancelled) return;
            // Timeout after 3 minutes from original start
            if (Date.now() - startedAt > 180_000) {
                localStorage.removeItem('pending_generation');
                pollAbortRef.current = null;
                setGenerationError('Generation timed out');
                setIsGenerating(false);
                return;
            }
            try {
                const statusRes = await fetch(`/api/generate/status?taskId=${taskId}`);
                if (cancelled) return;
                const statusData = await statusRes.json();
                if (statusData.status === 'SUCCEED' && statusData.images?.length > 0) {
                    localStorage.removeItem('pending_generation');
                    pollAbortRef.current = null;
                    for (const img of statusData.images) {
                        addMessage(chatId, {
                            role: 'assistant',
                            content: `Generated from: "${prompt || 'uploaded reference'}"`,
                            imageUrl: img.url,
                            generationType: genType,
                            model,
                            isFavorite: false,
                        });
                        try {
                            const saveToken = localStorage.getItem('auth_token');
                            if (saveToken) {
                                fetch('/api/generations', {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${saveToken}` },
                                    body: JSON.stringify({
                                        prompt: prompt || 'uploaded reference',
                                        modelName: model,
                                        fileUrl: img.url,
                                        fileType: 'image',
                                        generationType: genType,
                                        creditsUsed: creditCost,
                                        status: 'success',
                                        params: {},
                                    }),
                                }).catch(() => {});
                            }
                        } catch {}
                    }
                    setIsGenerating(false);
                    return;
                } else if (statusData.status === 'FAILED') {
                    localStorage.removeItem('pending_generation');
                    pollAbortRef.current = null;
                    setGenerationError(statusData.error || 'Generation failed');
                    setIsGenerating(false);
                    return;
                }
            } catch (err) {
                console.error('Poll error:', err);
            }
            // Schedule next poll
            if (!cancelled) {
                setTimeout(poll, 3000);
            }
        };
        setTimeout(poll, 3000);
    };

    // On mount + visibility change: try to recover
    useEffect(() => {
        recoverPendingGeneration();
        const handleVisibility = () => {
            if (document.visibilityState === 'visible') {
                recoverPendingGeneration();
            }
        };
        document.addEventListener('visibilitychange', handleVisibility);
        return () => document.removeEventListener('visibilitychange', handleVisibility);
    }, []);

    // Toast for unregistered users
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

    // Convert file utilities
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
                resolve(dataUrl.split(',')[1]);
            };
            img.onerror = () => reject(new Error('Failed to decode image'));
            img.src = URL.createObjectURL(file);
        });
    };

    const fileToBase64 = async (file: File): Promise<string> => {
        const safeTypes = ['image/jpeg', 'image/png'];
        if (!safeTypes.includes(file.type)) return convertImageToPng(file);
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve((reader.result as string).split(',')[1]);
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    };

    const friendlyError = (raw: string): string => {
        if (raw.includes('INVALID_IMAGE_FORMAT')) {
            return '❌ この画像形式には対応していません。\n対応形式：JPG、PNG';
        }
        if (raw.includes('Account temporarily suspended')) return t('chat.error_temp_ban');
        if (raw.includes('Account permanently banned')) return t('chat.error_permanent_ban');
        return raw;
    };

    const reUploadImage = async (url: string) => {
        try {
            const res = await fetch(url);
            const blob = await res.blob();
            const file = new File([blob], `ai_ref_${Date.now()}.png`, { type: 'image/png' });
            uploads.forEach((s) => URL.revokeObjectURL(s.previewUrl));
            const newSlot: UploadSlot = { file, previewUrl: URL.createObjectURL(file), label: '画像1' };
            setUploads([newSlot]);
            return true;
        } catch {
            setGenerationError('画像の読み込みに失敗しました。');
            return false;
        }
    };

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

    // Main submit handler
    const handleSubmit = async (e?: React.FormEvent, skipGuard?: boolean) => {
        try { e?.preventDefault(); } catch (_) {}
        if (!skipGuard && isGenerating) return;

        // Always read latest values from refs (avoids stale closure on iOS touch)
        const currentInputText = inputTextRef.current;
        const currentUploadsList = uploadsRef.current;

        if (user && !user.termsAgreedAt) {
            setShowTermsModal(true);
            if (skipGuard) setIsGenerating(false);
            return;
        }

        // Mode validations
        if (faceSwapMode) {
            const hasSavedFace = !!selectedFaceId;
            if (currentUploadsList.length < 2 && !(currentUploadsList.length >= 1 && hasSavedFace)) {
                setGenerationError(t('chat.faceSwapNoImage'));
                if (skipGuard) setIsGenerating(false);
                return;
            }
        } else if (inpaintMode) {
            if (currentUploadsList.length === 0) { setGenerationError(t('chat.uploadRequiredForInpaint')); if (skipGuard) setIsGenerating(false); return; }
        } else if (settings.generationType === 'img2img') {
            if (reposeMode && currentUploadsList.length === 0) { setGenerationError(t('chat.reposeNoImage')); if (skipGuard) setIsGenerating(false); return; }
            else if (currentUploadsList.length === 0) { setGenerationError(t('chat.img2imgNoImage')); if (skipGuard) setIsGenerating(false); return; }
            else if (!currentInputText.trim()) { setGenerationError(t('chat.promptRequired')); if (skipGuard) setIsGenerating(false); return; }
        }

        const isImageGeneration = ['txt2img', 'img2img', 'img_edit', 'face_swap', 'inpaint'].includes(settings.generationType);
        const isVideoGeneration = ['txt2vid', 'img2vid', 'ref2vid', 'vid2vid'].includes(settings.generationType);

        let creditCost = settings.count * 1;
        if (isVideoGeneration) creditCost = settings.count * 5;
        else if (faceSwapMode) creditCost = settings.count * 5;
        else if (inpaintMode) creditCost = settings.count * 3;

        if (!user || !user.email) { setShowRegisterModal(true); if (skipGuard) setIsGenerating(false); return; }
        const isTestAccount = user?.email === 'ooisidegesu@gmail.com';
        if (!isTestAccount && user.credits < creditCost) {
            setGenerationError(`❌ クレジットが不足しています。（必要: ${creditCost}, 保有: ${user.credits}）`);
            if (skipGuard) setIsGenerating(false);
            return;
        }

        setGenerationError(null);

        let chatId = activeChatId;
        if (!chatId) chatId = createChat();

        addMessage(chatId, {
            role: 'user',
            content: currentInputText.trim(),
            imageUrl: currentUploadsList[0]?.previewUrl ?? undefined,
            isFavorite: false,
        });

        const userPrompt = currentInputText.trim();
        const currentUploads = [...currentUploadsList];

        setIsGenerating(true);

        // Delay clearing input to prevent layout shift that hides generating card on mobile
        setTimeout(() => {
            setInputText('');
            setUploads([]);
        }, 500);
        if (!isTestAccount) {
            deductCredits(creditCost);
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
                if (token) headers['Authorization'] = `Bearer ${token}`;

                const res = await fetch('/api/generate', {
                    method: 'POST',
                    headers,
                    body: JSON.stringify({
                        prompt: userPrompt,
                        modelId: settings.model,
                        generationType: ['face_swap', 'inpaint'].includes(settings.generationType) ? 'img2img' : settings.generationType,
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

                const contentType = res.headers.get('content-type') || '';
                if (!contentType.includes('application/json')) {
                    throw new Error(`API error: ${res.status}`);
                }
                const data = await res.json();
                if (!res.ok || data.error) throw new Error(data.error || `API error: ${res.status}`);

                // Handle async polling if taskId returned (non-face-swap)
                let images: { url: string; type: string }[] = [];
                if (data.taskId && !data.images) {
                    const pollStartedAt = Date.now();
                    // Save taskId to localStorage for recovery after screen-off
                    localStorage.setItem('pending_generation', JSON.stringify({
                        taskId: data.taskId,
                        chatId,
                        prompt: userPrompt,
                        generationType: settings.generationType,
                        model: settings.model,
                        creditCost,
                        startedAt: pollStartedAt,
                    }));
                    // Delegate to abortable polling — handles completion, sets isGenerating(false)
                    startPolling(data.taskId, chatId, userPrompt, settings.generationType, settings.model, creditCost, pollStartedAt);
                    setInpaintMode(false);
                    setFaceSwapMode(false);
                    setReposeMode(false);
                    return; // Don't setIsGenerating(false) here — polling handles it
                } else {
                    // Face swap returned images directly
                    images = data.images || [];
                }

                setInpaintMode(false);
                setFaceSwapMode(false);
                setReposeMode(false);

                if (images.length === 0) throw new Error('No images returned from API');

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

                    try {
                        const saveToken = window.localStorage.getItem('auth_token');
                        if (saveToken) {
                            fetch('/api/generations', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${saveToken}` },
                                body: JSON.stringify({
                                    prompt: userPrompt || 'uploaded reference',
                                    modelName: settings.model,
                                    fileUrl: img.url,
                                    fileType: 'image',
                                    generationType: inpaintMode ? 'inpaint' : faceSwapMode ? 'faceswap' : settings.generationType === 'img2img' ? 'img2img' : 'txt2img',
                                    creditsUsed: creditCost,
                                    status: 'success',
                                    params: { aspectRatio: settings.aspectRatio, resolution: settings.resolution, qualityPreset: settings.qualityPreset },
                                }),
                            }).catch(err => console.error('Failed to save generation:', err));
                        }
                    } catch (e) { console.error('Generation save error:', e); }
                }
            } catch (err) {
                const errorMsg = err instanceof Error ? err.message : 'Unknown error';
                const i18nKeys = ['error_safety_violation', 'error_temp_ban', 'error_permanent_ban', 'error_access_denied', 'error_rate_limit', 'error_free_credits_expired', 'error_free_credits_feature'];
                const isSafetyErrorCode = i18nKeys.some(k => errorMsg.includes(k));

                let friendly = friendlyError(errorMsg);
                if (errorMsg.startsWith('error_access_denied')) {
                    friendly = t('errors.error_access_denied') + errorMsg.replace('error_access_denied', '').trim();
                } else if (i18nKeys.includes(errorMsg)) {
                    friendly = t(`errors.${errorMsg}`);
                }
                if (errorMsg.includes('Face Swap once per day')) friendly = t('chat.faceSwapLimitReached');

                setGenerationError(friendly);
                addMessage(chatId, {
                    role: 'assistant',
                    content: `❌ ${isSafetyErrorCode || errorMsg.includes('INVALID_IMAGE_FORMAT') ? '' : 'Generation failed: '}${friendly}`,
                    isFavorite: false,
                });

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
                        fellatio: 'blowjob, oral sex', cowgirl: 'cowgirl position, riding on top',
                        insertion: 'penetration, vaginal insertion', kiss: 'passionate kissing',
                        missionary: 'missionary position', doggy: 'doggy style, from behind',
                        standing: 'standing sex position', handjob: 'handjob, stroking penis',
                        paizuri: 'paizuri, titjob',
                    } as Record<string, string>)[f]).filter(Boolean).join(', ');

                const authToken = localStorage.getItem('auth_token') ?? '';
                const res = await fetch('/api/video', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${authToken}` },
                    body: JSON.stringify({ imageBase64, prompt: userPrompt, actionTag, duration: settings.duration, model: settings.model }),
                });
                const data = await res.json();
                if (!res.ok) {
                    const errMsg = data.error === 'plan_upgrade_required' ? '動画生成は有料プランが必要です。'
                        : data.error === 'insufficient_credits' ? `クレジットが不足しています。必要: ${data.required} / 残り: ${data.current}`
                        : `動画生成に失敗しました: ${data.error}`;
                    addMessage(chatId, { role: 'assistant', content: errMsg, generationType: settings.generationType, model: settings.model, isFavorite: false });
                } else {
                    addMessage(chatId, { role: 'assistant', content: '', videoUrl: data.videoUrl, generationType: settings.generationType, model: settings.model, isFavorite: false, settings: { ...settings } });
                }
            } catch {
                addMessage(chatId, { role: 'assistant', content: '動画生成中にエラーが発生しました。', generationType: settings.generationType, model: settings.model, isFavorite: false });
            }
        }

        setIsGenerating(false);
    };

    // Auto-submit flag for one-click generate
    const [autoSubmitPending, setAutoSubmitPending] = useState(false);

    // Submit trigger from store (used by mobile touch)
    useEffect(() => {
        if (submitTrigger > 0) {
            // isGenerating was already set to true by the touch handler,
            // so call handleSubmit with skipGuard=true
            handleSubmit(undefined, true);
        }
    }, [submitTrigger]);

    // Effect: fire handleSubmit after state updates from one-click generate
    useEffect(() => {
        if (autoSubmitPending && inputText) {
            setAutoSubmitPending(false);
            handleSubmit(new Event('submit') as unknown as React.FormEvent);
        }
    }, [autoSubmitPending, inputText]);

    // One-click generate
    const handleOneClickGenerate = () => {
        const preset = {
            prompt: 'beautiful woman, beach, golden hour, bikini, wind in hair, photorealistic',
            model: 'novita-helloworld-xl',
            aspectRatio: '9:16' as AspectRatio,
            resolution: '512' as const,
            nudeMode: true,
        };
        setInputText(preset.prompt);
        updateSettings({
            model: preset.model,
            aspectRatio: preset.aspectRatio,
            resolution: preset.resolution,
            nudeMode: preset.nudeMode,
            generationType: 'txt2img',
        });
        setAutoSubmitPending(true);
    };

    const handleSamplePrompt = (prompt: string) => {
        setInputText(prompt);
    };

    const handleActionInpaint = async (imgUrl: string) => {
        setGenerationType('inpaint');
        const success = await reUploadImage(imgUrl);
        if (success) {
            setShowInpaintModal(true);
        }
    };

    const handleActionFaceSwap = async (imgUrl: string) => {
        setGenerationType('face_swap');
        await reUploadImage(imgUrl);
    };

    const handleActionRegenerate = async (imgUrl: string, originalPrompt: string) => {
        const success = await reUploadImage(imgUrl);
        if (success) setInputText(originalPrompt);
    };

    return (
        <div className="editor-layout-v2">
            {/* Terms Agreement Modal */}
            {showTermsModal && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
                    <div style={{ background: '#1a1a2e', borderRadius: 12, padding: 32, maxWidth: 480, width: '100%', border: '1px solid #2a2a3e' }}>
                        <h2 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: 8, color: '#e0e0e8' }}>Before You Start Generating</h2>
                        <p style={{ fontSize: '0.85rem', color: '#8b8ba7', marginBottom: 20 }}>Please review and agree to continue.</p>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 24 }}>
                            <label style={{ display: 'flex', gap: 10, alignItems: 'flex-start', cursor: 'pointer', fontSize: '0.85rem', color: '#e0e0e8' }}>
                                <input type="checkbox" checked={termsChecks.terms} onChange={(e) => setTermsChecks(p => ({ ...p, terms: e.target.checked }))} style={{ marginTop: 3 }} />
                                <span>I agree to the <a href="/terms" target="_blank" style={{ color: '#7c5cfc' }}>Terms of Service</a> and <a href="/privacy" target="_blank" style={{ color: '#7c5cfc' }}>Privacy Policy</a></span>
                            </label>
                            <label style={{ display: 'flex', gap: 10, alignItems: 'flex-start', cursor: 'pointer', fontSize: '0.85rem', color: '#e0e0e8' }}>
                                <input type="checkbox" checked={termsChecks.content} onChange={(e) => setTermsChecks(p => ({ ...p, content: e.target.checked }))} style={{ marginTop: 3 }} />
                                <span>I agree to the <a href="/content-policy" target="_blank" style={{ color: '#7c5cfc' }}>Content Policy</a></span>
                            </label>
                            <label style={{ display: 'flex', gap: 10, alignItems: 'flex-start', cursor: 'pointer', fontSize: '0.85rem', color: '#e0e0e8' }}>
                                <input type="checkbox" checked={termsChecks.age} onChange={(e) => setTermsChecks(p => ({ ...p, age: e.target.checked }))} style={{ marginTop: 3 }} />
                                <span>I confirm I am 18+ and will not generate prohibited content (minors, real persons)</span>
                            </label>
                        </div>
                        <div style={{ display: 'flex', gap: 10 }}>
                            <button onClick={() => setShowTermsModal(false)} style={{ flex: 1, padding: '10px 16px', borderRadius: 8, border: '1px solid #2a2a3e', background: 'transparent', color: '#8b8ba7', cursor: 'pointer', fontSize: '0.9rem' }}>Cancel</button>
                            <button onClick={handleAgreeTerms} disabled={!termsChecks.terms || !termsChecks.content || !termsChecks.age} style={{ flex: 1, padding: '10px 16px', borderRadius: 8, border: 'none', background: termsChecks.terms && termsChecks.content && termsChecks.age ? 'linear-gradient(135deg,#7c5cfc,#6a4ff0)' : '#333', color: '#fff', cursor: termsChecks.terms && termsChecks.content && termsChecks.age ? 'pointer' : 'not-allowed', fontSize: '0.9rem', fontWeight: 600 }}>Agree & Continue</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Registration Toast */}
            {showRegisterToast && (
                <div onClick={() => { window.location.href = '/register'; }} style={{
                    position: 'fixed', top: '16px', left: '50%', transform: 'translateX(-50%)',
                    background: 'linear-gradient(135deg, #7c5cfc, #6366f1)',
                    color: '#fff', padding: '12px 24px', borderRadius: '12px',
                    cursor: 'pointer', zIndex: 10000, fontSize: '0.95rem', fontWeight: 600,
                    boxShadow: '0 8px 30px rgba(124,92,252,0.4)', animation: 'slideDown 0.3s ease-out',
                    display: 'flex', alignItems: 'center', gap: '8px', maxWidth: '90%'
                }}>
                    <span>{t('auth.toastMessage')}</span>
                    <span onClick={(e) => { e.stopPropagation(); setShowRegisterToast(false); }} style={{ marginLeft: '8px', opacity: 0.7, cursor: 'pointer' }}>✕</span>
                </div>
            )}

            {/* Registration Modal */}
            {showRegisterModal && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, backdropFilter: 'blur(4px)' }} onClick={() => setShowRegisterModal(false)}>
                    <div style={{ background: 'var(--bg-card, #1a1a2e)', borderRadius: '16px', padding: '32px', maxWidth: '420px', width: '90%', border: '1px solid var(--border-subtle, #333)', boxShadow: '0 20px 60px rgba(0,0,0,0.5)', textAlign: 'center' }} onClick={e => e.stopPropagation()}>
                        <div style={{ fontSize: '48px', marginBottom: '16px' }}>🎨</div>
                        <h2 style={{ color: 'var(--text-primary, #fff)', fontSize: '1.4rem', fontWeight: 700, marginBottom: '12px' }}>{t('auth.registerRequired')}</h2>
                        <p style={{ color: 'var(--text-secondary, #aaa)', fontSize: '0.95rem', lineHeight: 1.6, marginBottom: '24px' }}>{t('auth.registerMessage')}</p>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            <a href="/register" style={{ display: 'block', padding: '14px 24px', background: 'linear-gradient(135deg, #7c5cfc, #6366f1)', color: '#fff', borderRadius: '12px', fontWeight: 700, fontSize: '1rem', textDecoration: 'none', boxShadow: '0 4px 15px rgba(124,92,252,0.4)' }}>{t('auth.registerFree')}</a>
                            <button onClick={() => setShowRegisterModal(false)} style={{ padding: '12px 24px', background: 'transparent', color: 'var(--text-tertiary, #888)', border: '1px solid var(--border-subtle, #333)', borderRadius: '12px', cursor: 'pointer', fontSize: '0.9rem' }}>{t('auth.closeModal')}</button>
                        </div>
                    </div>
                </div>
            )}

            {isImg2Vid ? (
                <>
                    <Img2VidPanel />
                    <RightPanel
                        onOneClickGenerate={handleOneClickGenerate}
                        onSamplePrompt={handleSamplePrompt}
                        onActionInpaint={handleActionInpaint}
                        onActionFaceSwap={handleActionFaceSwap}
                        onActionRegenerate={handleActionRegenerate}
                        isGenerating={isGenerating}
                    />
                </>
            ) : (
                <>
                    <LeftPanel
                        inputText={inputText}
                        setInputText={setInputText}
                        uploads={uploads}
                        setUploads={setUploads}
                        faceSwapMode={faceSwapMode}
                        setFaceSwapMode={setFaceSwapMode}
                        inpaintMode={inpaintMode}
                        setInpaintMode={setInpaintMode}
                        reposeMode={reposeMode}
                        setReposeMode={setReposeMode}
                        showInpaintModal={showInpaintModal}
                        setShowInpaintModal={setShowInpaintModal}
                        onSubmit={handleSubmit}
                        isGenerating={isGenerating}
                        generationError={generationError}
                        setGenerationError={setGenerationError}
                    />
                    <div ref={rightPanelRef} className="editor-right-wrapper">
                        <RightPanel
                            onOneClickGenerate={handleOneClickGenerate}
                            onSamplePrompt={handleSamplePrompt}
                            onActionInpaint={handleActionInpaint}
                            onActionFaceSwap={handleActionFaceSwap}
                            onActionRegenerate={handleActionRegenerate}
                            isGenerating={isGenerating}
                        />
                    </div>
                </>
            )}
        </div>
    );
}
