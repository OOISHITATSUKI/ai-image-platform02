import fs from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';

// ============================================================
// Generation Records — Data Layer
// ============================================================

const GENERATIONS_FILE = path.join(process.cwd(), 'data', 'generations.json');

export interface GenerationParams {
    cfgScale?: number;
    steps?: number;
    sampler?: string;
    seed?: number;
    width?: number;
    height?: number;
    [key: string]: unknown;
}

export interface GenerationRecord {
    id: string;                     // UUID
    userId: string;                 // FK → UserRecord.id
    prompt: string;
    negativePrompt?: string;
    modelName: string;
    params: GenerationParams;       // JSON blob of generation parameters
    fileUrl: string;                // Stored path or CDN URL
    fileType: 'image' | 'video';   // Future video support
    generationType: 'txt2img' | 'img2img' | 'inpaint' | 'faceswap';
    creditsUsed: number;
    status: 'success' | 'failed' | 'blocked';
    createdAt: number;              // Unix ms
}

// ----- File Storage Helpers -----

function readGenerations(): Record<string, GenerationRecord> {
    if (!fs.existsSync(GENERATIONS_FILE)) return {};
    try {
        return JSON.parse(fs.readFileSync(GENERATIONS_FILE, 'utf8'));
    } catch {
        return {};
    }
}

function writeGenerations(data: Record<string, GenerationRecord>): void {
    const dir = path.dirname(GENERATIONS_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(GENERATIONS_FILE, JSON.stringify(data, null, 2));
}

// ----- CRUD -----

export function saveGeneration(record: Omit<GenerationRecord, 'id' | 'createdAt'>): GenerationRecord {
    const generations = readGenerations();
    const newRecord: GenerationRecord = {
        ...record,
        id: randomUUID(),
        createdAt: Date.now(),
    };
    generations[newRecord.id] = newRecord;
    writeGenerations(generations);
    return newRecord;
}

export function getGenerationById(id: string): GenerationRecord | null {
    const generations = readGenerations();
    return generations[id] ?? null;
}

export function getGenerationsByUser(
    userId: string,
    options: { limit?: number; offset?: number } = {}
): GenerationRecord[] {
    const { limit = 50, offset = 0 } = options;
    const generations = readGenerations();
    const userGenerations = Object.values(generations)
        .filter(g => g.userId === userId)
        .sort((a, b) => b.createdAt - a.createdAt);  // newest first
    return userGenerations.slice(offset, offset + limit);
}

export function countGenerationsByUser(userId: string): number {
    const generations = readGenerations();
    return Object.values(generations).filter(g => g.userId === userId).length;
}

export function deleteGeneration(id: string): boolean {
    const generations = readGenerations();
    if (!generations[id]) return false;
    delete generations[id];
    writeGenerations(generations);
    return true;
}

// Storage usage estimate: count per user
export function getUserStorageCount(userId: string): { images: number; videos: number; total: number } {
    const generations = readGenerations();
    const userGens = Object.values(generations).filter(g => g.userId === userId && g.status === 'success');
    const images = userGens.filter(g => g.fileType === 'image').length;
    const videos = userGens.filter(g => g.fileType === 'video').length;
    return { images, videos, total: images + videos };
}
