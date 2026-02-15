'use client';

import React, { useRef, useState, useEffect } from 'react';
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
    const imgRef = useRef<HTMLImageElement>(null);

    const [brushSize, setBrushSize] = useState(30);
    const [tool, setTool] = useState<'brush' | 'eraser'>('brush');
    const [isDrawing, setIsDrawing] = useState(false);
    const [history, setHistory] = useState<ImageData[]>([]);

    // Initialize canvas size based on image
    useEffect(() => {
        const img = imgRef.current;
        if (!img) return;

        const handleLoad = () => {
            const canvas = canvasRef.current;
            if (!canvas) return;
            canvas.width = img.clientWidth;
            canvas.height = img.clientHeight;

            const ctx = canvas.getContext('2d');
            if (ctx) {
                ctx.lineCap = 'round';
                ctx.lineJoin = 'round';
                // Save initial state
                setHistory([ctx.getImageData(0, 0, canvas.width, canvas.height)]);
            }
        };

        if (img.complete) {
            handleLoad();
        } else {
            img.addEventListener('load', handleLoad);
        }
        return () => img.removeEventListener('load', handleLoad);
    }, [imageUrl]);

    const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
        setIsDrawing(true);
        draw(e);
    };

    const stopDrawing = () => {
        if (!isDrawing) return;
        setIsDrawing(false);
        saveToHistory();
    };

    const draw = (e: React.MouseEvent | React.TouchEvent) => {
        const canvas = canvasRef.current;
        if (!canvas || !isDrawing) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const rect = canvas.getBoundingClientRect();
        let x, y;

        if ('touches' in e) {
            x = e.touches[0].clientX - rect.left;
            y = e.touches[0].clientY - rect.top;
        } else {
            x = (e as React.MouseEvent).clientX - rect.left;
            y = (e as React.MouseEvent).clientY - rect.top;
        }

        ctx.lineWidth = brushSize;

        if (tool === 'brush') {
            ctx.globalCompositeOperation = 'source-over';
            ctx.strokeStyle = 'rgba(255, 0, 0, 0.6)'; // Semi-transparent red for mask
        } else {
            ctx.globalCompositeOperation = 'destination-out';
            ctx.strokeStyle = 'rgba(0,0,0,1)';
        }

        // Draw point
        ctx.beginPath();
        ctx.arc(x, y, brushSize / 2, 0, Math.PI * 2);
        ctx.fill();

        // Connect lines for smoother feel
        // (Simplified for this task, just drawing circles works well for masking)
    };

    const saveToHistory = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        setHistory((prev) => [...prev.slice(-10), imageData]); // Keep last 10 steps
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

        // In Novita/SD inpainting, masks are usually black background (nothing) and white (re-generate)
        // We'll create a temporary canvas to convert our transparent red to black/white
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = canvas.width;
        tempCanvas.height = canvas.height;
        const tctx = tempCanvas.getContext('2d');
        if (!tctx) return;

        // Fill black
        tctx.fillStyle = 'black';
        tctx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);

        // Draw our mask as white
        // We can use globalCompositeOperation to only draw where alpha > 0
        tctx.globalCompositeOperation = 'source-over';

        // Get the mask pixels
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        const maskData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const pixels = maskData.data;

        // Create a processed mask data
        const processedData = tctx.createImageData(canvas.width, canvas.height);
        const pPixels = processedData.data;

        for (let i = 0; i < pixels.length; i += 4) {
            const alpha = pixels[i + 3];
            if (alpha > 0) {
                pPixels[i] = 255;     // R
                pPixels[i + 1] = 255; // G
                pPixels[i + 2] = 255; // B
                pPixels[i + 3] = 255; // A
            } else {
                pPixels[i] = 0;
                pPixels[i + 1] = 0;
                pPixels[i + 2] = 0;
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

            <div className="inpaint-modal-content" ref={containerRef}>
                <div className="inpaint-canvas-container">
                    <img
                        ref={imgRef}
                        src={imageUrl}
                        alt="Base"
                        className="inpaint-base-img"
                        onDragStart={(e) => e.preventDefault()}
                    />
                    <canvas
                        ref={canvasRef}
                        className="inpaint-mask-canvas"
                        onMouseDown={startDrawing}
                        onMouseMove={draw}
                        onMouseUp={stopDrawing}
                        onMouseLeave={stopDrawing}
                        onTouchStart={startDrawing}
                        onTouchMove={draw}
                        onTouchEnd={stopDrawing}
                    />
                </div>
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
