'use client';

import React, { useRef, useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from '@/lib/useTranslation';

interface InpaintModalProps {
    imageUrl: string;
    onClose: () => void;
    onSave: (maskBase64: string) => void;
}

export default function InpaintModal({ imageUrl, onClose, onSave }: InpaintModalProps) {
    const { t } = useTranslation();
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const wrapperRef = useRef<HTMLDivElement>(null);

    const [brushSize, setBrushSize] = useState(12);
    const [tool, setTool] = useState<'brush' | 'eraser'>('brush');
    const [isDrawing, setIsDrawing] = useState(false);
    const [history, setHistory] = useState<ImageData[]>([]);
    const [displayScale, setDisplayScale] = useState(1);
    const [naturalSize, setNaturalSize] = useState<{ w: number; h: number } | null>(null);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        // Disable body scroll when modal is open
        const originalOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = originalOverflow;
        };
    }, []);

    // Calculate display scale based on container dimensions
    const updateScale = useCallback(() => {
        if (!naturalSize || !containerRef.current) return;

        const isMobile = window.innerWidth <= 768;
        const imageWidth = naturalSize.w;
        const imageHeight = naturalSize.h;
        const container = containerRef.current;

        let scale = 1;

        if (isMobile) {
            // Force full viewport width, height follows aspect ratio
            const containerWidth = window.innerWidth;
            scale = containerWidth / imageWidth;
        } else {
            // PC: fit within container while capping scale at 1.0
            const containerWidth = container.clientWidth;
            const containerHeight = container.clientHeight || (window.innerHeight * 0.7);
            if (containerWidth <= 0) return;
            scale = Math.min(1, containerWidth / imageWidth, containerHeight / imageHeight);
        }

        console.log('[InpaintModal] updateScale:', {
            isMobile,
            naturalSize,
            scale,
            calculatedW: imageWidth * scale,
            calculatedH: imageHeight * scale,
            windowW: window.innerWidth,
            windowH: window.innerHeight
        });

        setDisplayScale(scale);
    }, [naturalSize]);

    // Load image and set up canvas
    useEffect(() => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
            console.log('[InpaintModal] img.onload:', {
                src: imageUrl.substring(0, 50) + '...',
                w: img.naturalWidth,
                h: img.naturalHeight
            });
            setNaturalSize({ w: img.naturalWidth, h: img.naturalHeight });

            const canvas = canvasRef.current;
            if (canvas) {
                canvas.width = img.naturalWidth;
                canvas.height = img.naturalHeight;
                const ctx = canvas.getContext('2d');
                if (ctx) {
                    ctx.lineCap = 'round';
                    ctx.lineJoin = 'round';
                    setHistory([ctx.getImageData(0, 0, canvas.width, canvas.height)]);
                }
            }
        };
        img.src = imageUrl;
    }, [imageUrl]);

    // Handle resizing
    useEffect(() => {
        updateScale();
        const observer = new ResizeObserver(() => updateScale());
        if (containerRef.current) observer.observe(containerRef.current);
        window.addEventListener('resize', updateScale);
        return () => {
            observer.disconnect();
            window.removeEventListener('resize', updateScale);
        };
    }, [updateScale]);

    const lastPos = useRef<{ x: number; y: number } | null>(null);

    const getCanvasCoords = (e: React.MouseEvent | React.TouchEvent) => {
        const canvas = canvasRef.current;
        if (!canvas) return null;

        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;

        const clientX = 'touches' in e ? (e as React.TouchEvent).touches[0].clientX : (e as React.MouseEvent).clientX;
        const clientY = 'touches' in e ? (e as React.TouchEvent).touches[0].clientY : (e as React.MouseEvent).clientY;

        return {
            x: (clientX - rect.left) * scaleX,
            y: (clientY - rect.top) * scaleY,
            scaleCorrection: scaleX,
        };
    };

    const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
        if ('touches' in e) {
            // Check if user is trying to scroll (two fingers or panning not on canvas)
            // But here we want to paint. To allow scrolling, we could use a toggle, 
            // but usually a fixed canvas is better.
        }
        setIsDrawing(true);
        const coords = getCanvasCoords(e);
        if (coords) {
            lastPos.current = { x: coords.x, y: coords.y };
            const canvas = canvasRef.current;
            if (canvas) {
                const ctx = canvas.getContext('2d');
                if (ctx) {
                    const effectiveBrushSize = brushSize * coords.scaleCorrection;
                    ctx.lineWidth = effectiveBrushSize;
                    ctx.lineCap = 'round';
                    if (tool === 'brush') {
                        ctx.globalCompositeOperation = 'source-over';
                        ctx.fillStyle = 'rgba(124, 92, 252, 0.7)';
                    } else {
                        ctx.globalCompositeOperation = 'destination-out';
                        ctx.fillStyle = 'rgba(0,0,0,1)';
                    }
                    ctx.beginPath();
                    ctx.arc(coords.x, coords.y, effectiveBrushSize / 2, 0, Math.PI * 2);
                    ctx.fill();
                }
            }
        }
    };

    const stopDrawing = () => {
        if (!isDrawing) return;
        setIsDrawing(false);
        lastPos.current = null;
        saveToHistory();
    };

    const draw = (e: React.MouseEvent | React.TouchEvent) => {
        if (!isDrawing) return;

        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const coords = getCanvasCoords(e);
        if (!coords) return;

        const effectiveBrushSize = brushSize * coords.scaleCorrection;
        ctx.lineWidth = effectiveBrushSize;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        if (tool === 'brush') {
            ctx.globalCompositeOperation = 'source-over';
            ctx.strokeStyle = 'rgba(124, 92, 252, 0.7)';
        } else {
            ctx.globalCompositeOperation = 'destination-out';
            ctx.strokeStyle = 'rgba(0,0,0,1)';
        }

        ctx.beginPath();
        if (lastPos.current) {
            ctx.moveTo(lastPos.current.x, lastPos.current.y);
            ctx.lineTo(coords.x, coords.y);
        } else {
            ctx.moveTo(coords.x, coords.y);
            ctx.lineTo(coords.x, coords.y);
        }
        ctx.stroke();

        lastPos.current = { x: coords.x, y: coords.y };
    };

    const saveToHistory = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        setHistory((prev) => [...prev.slice(-10), ctx.getImageData(0, 0, canvas.width, canvas.height)]);
    };

    const handleUndo = () => {
        if (history.length <= 1) return;
        const newHistory = history.slice(0, -1);
        const lastState = newHistory[newHistory.length - 1];
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.putImageData(lastState, 0, 0);
        setHistory(newHistory);
    };

    const handleClear = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        saveToHistory();
    };

    const handleDone = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = canvas.width;
        tempCanvas.height = canvas.height;
        const tctx = tempCanvas.getContext('2d');
        if (!tctx) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        const maskData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const pixels = maskData.data;
        const processedData = tctx.createImageData(canvas.width, canvas.height);
        const pPixels = processedData.data;
        for (let i = 0; i < pixels.length; i += 4) {
            if (pixels[i + 3] > 0) {
                pPixels[i] = pPixels[i + 1] = pPixels[i + 2] = pPixels[i + 3] = 255;
            } else {
                pPixels[i] = pPixels[i + 1] = pPixels[i + 2] = 0;
                pPixels[i + 3] = 255;
            }
        }
        tctx.putImageData(processedData, 0, 0);
        onSave(tempCanvas.toDataURL('image/png'));
    };

    if (!mounted) return null;

    const modalContent = (
        <div
            className="inpaint-modal-overlay"
            style={{
                position: 'fixed',
                top: 0,
                bottom: 0,
                left: 0,
                right: 0,
                width: '100%',
                height: '100dvh', // Use dynamic viewport height
                zIndex: 3500,
                display: 'flex',
                flexDirection: 'column',
                background: '#000',
                overflow: 'hidden'
            }}
        >
            <div className="inpaint-modal-header" style={{ padding: '8px 16px', minHeight: '44px' }}>
                <h2 style={{ fontSize: '1rem' }}>✨ {t('chat.inpaintModalTitle')}</h2>
                <button className="close-btn" onClick={onClose} style={{ padding: '8px' }}>
                    ✕
                </button>
            </div>

            {/* Quality Notice - Compact and Hidden on very small screens if necessary */}
            <div className="inpaint-quality-notice" style={{
                padding: '8px 16px',
                fontSize: '0.75rem',
                color: 'var(--text-secondary)',
                background: 'rgba(255,255,255,0.02)',
                borderBottom: '1px solid var(--border)',
                lineHeight: '1.4'
            }}>
                <div style={{ whiteSpace: 'pre-line' }}>{t('chat.inpaintClothingHint')}</div>
            </div>

            {/* Canvas Area - Scrollable on mobile */}
            <div
                ref={containerRef}
                className="inpaint-v3-area"
                style={{
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'flex-start',
                    overflowY: 'auto', // Explicit vertical scroll
                    overflowX: 'hidden',
                    background: '#000',
                    width: '100%',
                    height: '100%', // Ensure it takes available flex space
                    WebkitOverflowScrolling: 'touch',
                    minHeight: 0,
                    maxHeight: 'none'
                }}
            >
                {naturalSize && (
                    <div
                        ref={wrapperRef}
                        className="inpaint-v3-container"
                        style={{
                            position: 'relative',
                            width: `${Math.round(naturalSize.w * displayScale)}px`,
                            height: `${Math.round(naturalSize.h * displayScale)}px`,
                            flexShrink: 0,
                            margin: '0 auto',
                            padding: 0,
                            maxWidth: 'none',
                            maxHeight: 'none',
                            minWidth: 'none',
                            minHeight: 'none',
                        }}
                    >
                        <img
                            src={imageUrl}
                            alt="Base"
                            style={{
                                position: 'absolute',
                                top: 0,
                                left: 0,
                                width: '100%',
                                height: '100%',
                                objectFit: 'contain', // Preserve aspect ratio
                                display: 'block',
                                userSelect: 'none',
                                pointerEvents: 'none',
                            }}
                            draggable={false}
                        />
                        <canvas
                            ref={canvasRef}
                            width={naturalSize.w}
                            height={naturalSize.h}
                            style={{
                                position: 'absolute',
                                top: 0,
                                left: 0,
                                width: '100%',
                                height: '100%',
                                cursor: 'crosshair',
                                touchAction: 'none' // Important for drawing precision
                            }}
                            onMouseDown={startDrawing}
                            onMouseMove={draw}
                            onMouseUp={stopDrawing}
                            onMouseLeave={stopDrawing}
                            onTouchStart={startDrawing}
                            onTouchMove={draw}
                            onTouchEnd={stopDrawing}
                        />
                    </div>
                )}
            </div>

            <div className="inpaint-modal-footer" style={{ padding: '8px', background: 'var(--bg-panel)' }}>
                <div className="inpaint-tools" style={{ marginBottom: '8px' }}>
                    <button
                        className={`inpaint-tool-btn ${tool === 'brush' ? 'active' : ''}`}
                        onClick={() => setTool('brush')}
                    >
                        {t('chat.inpaintBrush')}
                    </button>
                    <button
                        className={`inpaint-tool-btn ${tool === 'eraser' ? 'active' : ''}`}
                        onClick={() => setTool('eraser')}
                    >
                        {t('chat.inpaintEraser')}
                    </button>
                    <button className="inpaint-tool-btn" onClick={handleUndo}>
                        {t('chat.inpaintUndo')}
                    </button>
                    <button className="inpaint-tool-btn" onClick={handleClear}>
                        {t('chat.inpaintClear')}
                    </button>
                </div>

                <div className="inpaint-size-control" style={{ marginBottom: '8px', padding: '0 8px' }}>
                    <span style={{ fontSize: '0.8rem', minWidth: '80px' }}>{t('chat.inpaintSize')}: {brushSize}</span>
                    <input
                        type="range"
                        min="5"
                        max="100"
                        value={brushSize}
                        onChange={(e) => setBrushSize(parseInt(e.target.value))}
                        className="inpaint-size-slider"
                    />
                </div>

                <button className="inpaint-done-btn" onClick={handleDone} style={{ padding: '12px' }}>
                    {t('chat.inpaintDone')} ✓
                </button>
            </div>
        </div>
    );

    return createPortal(modalContent, document.body);
}
