import fs from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';

// ============================================================
// Saved Faces — Data Layer (JSON file-based)
// ============================================================

const FACES_FILE = path.join(process.cwd(), 'data', 'saved_faces.json');

export interface SavedFaceRecord {
    id: string;
    userId: string;
    name: string;
    imageUrl: string;
    thumbnailUrl: string;
    isActive: boolean;
    createdAt: number; // Unix ms
}

// ----- File Storage Helpers -----

function readFaces(): Record<string, SavedFaceRecord> {
    if (!fs.existsSync(FACES_FILE)) return {};
    try {
        return JSON.parse(fs.readFileSync(FACES_FILE, 'utf-8'));
    } catch {
        return {};
    }
}

function writeFaces(data: Record<string, SavedFaceRecord>): void {
    const dir = path.dirname(FACES_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(FACES_FILE, JSON.stringify(data, null, 2));
}

// ----- CRUD -----

export function getFacesByUser(userId: string): SavedFaceRecord[] {
    const all = readFaces();
    return Object.values(all)
        .filter((f) => f.userId === userId)
        .sort((a, b) => b.createdAt - a.createdAt);
}

export function countFacesByUser(userId: string): number {
    const all = readFaces();
    return Object.values(all).filter((f) => f.userId === userId).length;
}

export function createFace(params: {
    userId: string;
    name: string;
    imageUrl: string;
    thumbnailUrl: string;
}): SavedFaceRecord {
    const all = readFaces();
    const id = randomUUID();
    const record: SavedFaceRecord = {
        id,
        userId: params.userId,
        name: params.name,
        imageUrl: params.imageUrl,
        thumbnailUrl: params.thumbnailUrl,
        isActive: false,
        createdAt: Date.now(),
    };
    all[id] = record;
    writeFaces(all);
    return record;
}

export function deleteFace(faceId: string, userId: string): boolean {
    const all = readFaces();
    const face = all[faceId];
    if (!face || face.userId !== userId) return false;
    delete all[faceId];
    writeFaces(all);
    return true;
}

export function getFaceById(faceId: string): SavedFaceRecord | null {
    const all = readFaces();
    return all[faceId] || null;
}
