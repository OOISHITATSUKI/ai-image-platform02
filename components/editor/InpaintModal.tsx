'use client';

import React, { useRef, useState, useEffect, useCallback } from 'react';
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
    const [displaySize, setDisplaySize] = useState<{ w: number; h: number } | null>(null);
    const [naturalSize, setNaturalSize] = useState<{ w: number; h: number } | null>(null);

    // Calculate display size to fill available space while preserving aspect ratio
    const calculateDisplaySize = useCallback(() => {
        if (!naturalSize || !containerRef.current) return;

        const container = containerRef.current;
        const availW = container.clientWidth - 40; // padding
        const availH = container.clientHeight - 40;
        const { w: natW, h: natH } = naturalSize;
        const imgAspect = natW / natH;

        // Scale image to fill as much space as possible
        let displayW: number, displayH: number;

        if (imgAspect > availW / availH) {
            // Image is wider than container → fit by width
            displayW = Math.min(availW, natW * 1.5); // Allow upscale for small images
            displayH = displayW / imgAspect;
        } else {
            // Image is taller than container → fit by height
            displayH = Math.min(availH, natH * 1.5);
            displayW = displayH * imgAspect;
        }

        // Ensure minimum size for small images (at least 400px on short side)
        const minShortSide = 400;
        const shortSide = Math.min(displayW, displayH);
        if (shortSide < minShortSide) {
            const scale = minShortSide / shortSide;
            displayW *= scale;
            displayH *= scale;
        }

        // Final clamp to container
        if (displayW > availW) {
            const s = availW / displayW;
            displayW *= s;
            displayH *= s;
        }
        if (displayH > availH) {
            const s = availH / displayH;
            displayW *= s;
            displayH *= s;
        }

        setDisplaySize({ w: Math.round(displayW), h: Math.round(displayH) });
    }, [naturalSize]);

    // Load image and set up canvas
    useEffect(() => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
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

    // Recalculate display size when natural size or container changes
    useEffect(() => {
        calculateDisplaySize();

        const observer = new ResizeObserver(() => calculateDisplaySize());
        if (containerRef.current) observer.observe(containerRef.current);

        // Handle window resize for mobile orientation changes
        const handleResize = () => calculateDisplaySize();
        window.addEventListener('resize', handleResize);

        return () => {
            observer.disconnect();
            window.removeEventListener('resize', handleResize);
        };
    }, [calculateDisplaySize]);

    const lastPos = useRef<{ x: number; y: number } | null>(null);

    const getCanvasCoords = (e: React.MouseEvent | React.TouchEvent) => {
        const canvas = canvasRef.current;
        if (!canvas) return null;

        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;

        let clientX: number, clientY: number;
        if ('touches' in e) {
            clientX = e.touches[0].clientX;
            clientY = e.touches[0].clientY;
        } else {
            clientX = (e as React.MouseEvent).clientX;
            clientY = (e as React.MouseEvent).clientY;
        }

        return {
            x: (clientX - rect.left) * scaleX,
            y: (clientY - rect.top) * scaleY,
            scaleX,
        };
    };

    const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
        e.preventDefault();
        setIsDrawing(true);
        const coords = getCanvasCoords(e);
        if (coords) {
            lastPos.current = { x: coords.x, y: coords.y };
            // Draw a dot at the starting point
            const canvas = canvasRef.current;
            if (canvas) {
                const ctx = canvas.getContext('2d');
                if (ctx) {
                    const effectiveBrushSize = brushSize * coords.scaleX;
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
        e.preventDefault();
        if (!isDrawing) return;

        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const coords = getCanvasCoords(e);
        if (!coords) return;

        const effectiveBrushSize = brushSize * coords.scaleX;
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

    return (
        <div className="inpaint-modal-overlay">
            <div className="inpaint-modal-header">
                <h2>✨ {t('chat.inpaintModalTitle')}</h2>
                <button className="close-btn" onClick={onClose}>
                    {t('chat.inpaintClose')} ✕
                </button>
            </div>

            {/* Quality Notice */}
            <div style={{
                padding: '12px 16px',
                fontSize: '0.85rem',
                color: 'var(--text-secondary)',
                background: 'var(--bg-elevated)',
                borderBottom: '1px solid var(--border)',
                lineHeight: '1.6'
            }}>
                <div style={{ whiteSpace: 'pre-line' }}>{t('chat.inpaintClothingHint')}</div>
            </div>

            {/* Canvas Area — image and canvas are exactly overlapping */}
            <div
                ref={containerRef}
                style={{
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    overflow: 'hidden',
                    background: '#111',
                    padding: '20px',
                    minHeight: 0,
                }}
            >
                {displaySize && (
                    <div
                        ref={wrapperRef}
                        style={{
                            position: 'relative',
                            width: `${displaySize.w}px`,
                            height: `${displaySize.h}px`,
                            borderRadius: '8px',
                            overflow: 'hidden',
                            boxShadow: '0 0 40px rgba(0,0,0,0.5)',
                            flexShrink: 0,
                        }}
                    >
                        {/* Background image */}
                        <img
                            src={imageUrl}
                            alt="Base"
                            style={{
                                position: 'absolute',
                                top: 0,
                                left: 0,
                                width: '100%',
                                height: '100%',
                                objectFit: 'fill',
                                display: 'block',
                                userSelect: 'none',
                                pointerEvents: 'none',
                            }}
                            draggable={false}
                        />
                        {/* Drawing canvas — exactly same size as wrapper */}
                        <canvas
                            ref={canvasRef}
                            style={{
                                position: 'absolute',
                                top: 0,
                                left: 0,
                                width: '100%',
                                height: '100%',
                                cursor: 'crosshair',
                                touchAction: 'none',
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

            <div className="inpaint-modal-footer">
                <div className="inpaint-tools">
                    <button
                        className={`inpaint-tool-btn ${tool === 'brush' ? 'active' : ''}`}
                        onClick={() => setTool('brush')}
                    >
                        🖌 {t('chat.inpaintBrush')}
                    </button>
                    <button
                        className={`inpaint-tool-btn ${tool === 'eraser' ? 'active' : ''}`}
                        onClick={() => setTool('eraser')}
                    >
                        🧹 {t('chat.inpaintEraser')}
                    </button>
                    <button className="inpaint-tool-btn" onClick={handleUndo}>
                        ↩ {t('chat.inpaintUndo')}
                    </button>
                    <button className="inpaint-tool-btn" onClick={handleClear}>
                        🗑 {t('chat.inpaintClear')}
                    </button>
                </div>

                <div className="inpaint-size-control">
                    <span>{t('chat.inpaintSize')}: {brushSize}px</span>
                    <input
                        type="range"
                        min="5"
                        max="100"
                        value={brushSize}
                        onChange={(e) => setBrushSize(parseInt(e.target.value))}
                        className="inpaint-size-slider"
                    />
                </div>

                <button className="inpaint-done-btn" onClick={handleDone}>
                    {t('chat.inpaintDone')} ✓
                </button>
            </div>
        </div>
    );
}
