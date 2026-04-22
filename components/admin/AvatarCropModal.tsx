'use client';

import React, { useState, useCallback } from 'react';
import Cropper, { Area } from 'react-easy-crop';

interface AvatarCropModalProps {
  imageSrc: string;
  onComplete: (croppedBlob: Blob) => void;
  onClose: () => void;
  aspect?: number;
}

const OUTPUT_SIZE = 400;

async function getCroppedImg(imageSrc: string, pixelCrop: Area): Promise<Blob> {
  const image = new Image();
  image.crossOrigin = 'anonymous';
  await new Promise<void>((resolve, reject) => {
    image.onload = () => resolve();
    image.onerror = reject;
    image.src = imageSrc;
  });

  const canvas = document.createElement('canvas');
  canvas.width = OUTPUT_SIZE;
  canvas.height = OUTPUT_SIZE;
  const ctx = canvas.getContext('2d')!;

  ctx.drawImage(
    image,
    pixelCrop.x, pixelCrop.y, pixelCrop.width, pixelCrop.height,
    0, 0, OUTPUT_SIZE, OUTPUT_SIZE,
  );

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error('Canvas toBlob failed'));
    }, 'image/webp', 0.82);
  });
}

export default function AvatarCropModal({ imageSrc, onComplete, onClose }: AvatarCropModalProps) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [saving, setSaving] = useState(false);

  const onCropComplete = useCallback((_: Area, areaPixels: Area) => {
    setCroppedAreaPixels(areaPixels);
  }, []);

  const handleSave = async () => {
    if (!croppedAreaPixels) return;
    setSaving(true);
    try {
      const blob = await getCroppedImg(imageSrc, croppedAreaPixels);
      onComplete(blob);
    } catch (e) {
      console.error('Crop error:', e);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center',
    }} onClick={onClose}>
      <div style={{
        background: '#1a1a2e', borderRadius: 12, padding: 24, width: '90%', maxWidth: 480,
        display: 'flex', flexDirection: 'column', gap: 16,
      }} onClick={(e) => e.stopPropagation()}>
        <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#fff' }}>画像の表示位置を調整</h3>

        <div style={{ position: 'relative', width: '100%', height: 350, background: '#000', borderRadius: 8, overflow: 'hidden' }}>
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            aspect={1}
            cropShape="round"
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={onCropComplete}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)', whiteSpace: 'nowrap' }}>1x</span>
          <input
            type="range" min={1} max={3} step={0.1} value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
            style={{ flex: 1, accentColor: '#7c5cfc' }}
          />
          <span style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)', whiteSpace: 'nowrap' }}>3x</span>
        </div>

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{
            padding: '8px 20px', borderRadius: 6, border: '1px solid rgba(255,255,255,0.2)',
            background: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '0.88rem',
          }}>キャンセル</button>
          <button onClick={handleSave} disabled={saving} style={{
            padding: '8px 20px', borderRadius: 6, border: 'none',
            background: '#7c5cfc', color: '#fff', cursor: 'pointer', fontSize: '0.88rem', fontWeight: 600,
            opacity: saving ? 0.6 : 1,
          }}>{saving ? '処理中...' : '保存する'}</button>
        </div>
      </div>
    </div>
  );
}
