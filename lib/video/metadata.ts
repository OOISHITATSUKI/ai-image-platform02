// ============================================================
// Client-side video metadata extraction (browser only)
// ============================================================

export interface VideoMetadata {
  durationSec: number;
  width: number;
  height: number;
}

export function extractVideoMetadata(file: File): Promise<VideoMetadata> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.preload = 'metadata';

    video.onloadedmetadata = () => {
      resolve({
        durationSec: video.duration,
        width: video.videoWidth,
        height: video.videoHeight,
      });
      URL.revokeObjectURL(video.src);
    };

    video.onerror = () => {
      URL.revokeObjectURL(video.src);
      reject(new Error('Failed to load video metadata'));
    };

    video.src = URL.createObjectURL(file);
  });
}

/** Check if aspect ratio is close to 9:16 (±5%) */
export function isCloseTo916(meta: VideoMetadata): boolean {
  const ratio = meta.width / meta.height;
  return Math.abs(ratio - 9 / 16) < 0.05;
}
