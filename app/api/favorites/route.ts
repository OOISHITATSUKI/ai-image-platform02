import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, extractToken } from '@/lib/auth';
import {
    addFavorite,
    removeFavorite,
    getFavoritesByUser,
} from '@/lib/db/favorites';

// GET /api/favorites — list current user's favorites
export async function GET(req: NextRequest) {
    const token = extractToken(req.headers.get('Authorization'));
    const decoded = token ? verifyToken(token) : null;
    if (!decoded) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const favorites = getFavoritesByUser(decoded.userId);
    return NextResponse.json({ favorites });
}

// POST /api/favorites — add or remove a favorite
export async function POST(req: NextRequest) {
    const token = extractToken(req.headers.get('Authorization'));
    const decoded = token ? verifyToken(token) : null;
    if (!decoded) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { generationId, action } = await req.json();
    if (!generationId) {
        return NextResponse.json({ error: 'generationId is required' }, { status: 400 });
    }

    if (action === 'remove') {
        const removed = removeFavorite(decoded.userId, generationId);
        return NextResponse.json({ success: removed });
    } else {
        const favorite = addFavorite(decoded.userId, generationId);
        return NextResponse.json({ favorite });
    }
}
