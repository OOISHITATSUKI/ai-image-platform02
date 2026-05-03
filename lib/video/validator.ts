// ============================================================
// Video file validation (MP4 only, no server-side conversion)
// ============================================================

export type VideoType = 'hover' | 'emotion' | 'liveaction' | 'liveaction_nsfw';

const LIMITS: Record<VideoType, { maxSizeMB: number; maxDurationSec: number }> = {
  hover:           { maxSizeMB: 2,  maxDurationSec: 8 },
  emotion:         { maxSizeMB: 3,  maxDurationSec: 8 },
  liveaction:      { maxSizeMB: 15, maxDurationSec: 30 },
  liveaction_nsfw: { maxSizeMB: 25, maxDurationSec: 60 },
};

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export function validateVideoFile(
  file: { name: string; type: string; size: number },
  videoType: VideoType,
): ValidationResult {
  const limits = LIMITS[videoType];
  const errors: string[] = [];
  const warnings: string[] = [];

  // MIME type
  if (file.type !== 'video/mp4') {
    errors.push(`Invalid format: ${file.type}. Only MP4 is supported.`);
  }

  // Extension
  if (!file.name.toLowerCase().endsWith('.mp4')) {
    errors.push('File extension must be .mp4');
  }

  // File size
  const sizeMB = file.size / (1024 * 1024);
  if (sizeMB > limits.maxSizeMB) {
    errors.push(
      `File too large: ${sizeMB.toFixed(2)}MB (max ${limits.maxSizeMB}MB). Please compress before upload.`,
    );
  } else if (sizeMB > limits.maxSizeMB * 0.7) {
    warnings.push('File is close to size limit. Consider further compression.');
  }

  return { valid: errors.length === 0, errors, warnings };
}

export function getLimits(videoType: VideoType) {
  return LIMITS[videoType];
}
