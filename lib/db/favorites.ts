import fs from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';

// ============================================================
// Favorites & Collections — Schema Only (no UI yet)
// ============================================================

const FAVORITES_FILE = path.join(process.cwd(), 'data', 'favorites.json');
const COLLECTIONS_FILE = path.join(process.cwd(), 'data', 'collections.json');

// ----- Favorite Record -----

export interface FavoriteRecord {
    id: string;
    userId: string;         // FK → UserRecord.id
    generationId: string;   // FK → GenerationRecord.id
    addedAt: number;        // Unix ms
}

// ----- Collection Record -----

export interface CollectionRecord {
    id: string;
    userId: string;         // FK → UserRecord.id
    name: string;
    createdAt: number;      // Unix ms
    updatedAt: number;      // Unix ms
    generationIds: string[];// FK → GenerationRecord.id[]
}

// ============================================================
// Favorites CRUD (stub)
// ============================================================

function readFavorites(): Record<string, FavoriteRecord> {
    if (!fs.existsSync(FAVORITES_FILE)) return {};
    try {
        return JSON.parse(fs.readFileSync(FAVORITES_FILE, 'utf8'));
    } catch {
        return {};
    }
}

function writeFavorites(data: Record<string, FavoriteRecord>): void {
    const dir = path.dirname(FAVORITES_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(FAVORITES_FILE, JSON.stringify(data, null, 2));
}

export function addFavorite(userId: string, generationId: string): FavoriteRecord {
    const favorites = readFavorites();
    // Prevent duplicate favorites
    const existing = Object.values(favorites).find(
        f => f.userId === userId && f.generationId === generationId
    );
    if (existing) return existing;

    const newRecord: FavoriteRecord = {
        id: randomUUID(),
        userId,
        generationId,
        addedAt: Date.now(),
    };
    favorites[newRecord.id] = newRecord;
    writeFavorites(favorites);
    return newRecord;
}

export function removeFavorite(userId: string, generationId: string): boolean {
    const favorites = readFavorites();
    const entry = Object.entries(favorites).find(
        ([, f]) => f.userId === userId && f.generationId === generationId
    );
    if (!entry) return false;
    delete favorites[entry[0]];
    writeFavorites(favorites);
    return true;
}

export function getFavoritesByUser(userId: string): FavoriteRecord[] {
    const favorites = readFavorites();
    return Object.values(favorites)
        .filter(f => f.userId === userId)
        .sort((a, b) => b.addedAt - a.addedAt);
}

// ============================================================
// Collections CRUD (stub)
// ============================================================

function readCollections(): Record<string, CollectionRecord> {
    if (!fs.existsSync(COLLECTIONS_FILE)) return {};
    try {
        return JSON.parse(fs.readFileSync(COLLECTIONS_FILE, 'utf8'));
    } catch {
        return {};
    }
}

function writeCollections(data: Record<string, CollectionRecord>): void {
    const dir = path.dirname(COLLECTIONS_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(COLLECTIONS_FILE, JSON.stringify(data, null, 2));
}

export function createCollection(userId: string, name: string): CollectionRecord {
    const collections = readCollections();
    const now = Date.now();
    const newRecord: CollectionRecord = {
        id: randomUUID(),
        userId,
        name,
        createdAt: now,
        updatedAt: now,
        generationIds: [],
    };
    collections[newRecord.id] = newRecord;
    writeCollections(collections);
    return newRecord;
}

export function addToCollection(collectionId: string, generationId: string): CollectionRecord | null {
    const collections = readCollections();
    const collection = collections[collectionId];
    if (!collection) return null;
    if (!collection.generationIds.includes(generationId)) {
        collection.generationIds.push(generationId);
        collection.updatedAt = Date.now();
        writeCollections(collections);
    }
    return collection;
}

export function getCollectionsByUser(userId: string): CollectionRecord[] {
    const collections = readCollections();
    return Object.values(collections)
        .filter(c => c.userId === userId)
        .sort((a, b) => b.createdAt - a.createdAt);
}

export function deleteCollection(id: string, userId: string): boolean {
    const collections = readCollections();
    if (!collections[id] || collections[id].userId !== userId) return false;
    delete collections[id];
    writeCollections(collections);
    return true;
}
