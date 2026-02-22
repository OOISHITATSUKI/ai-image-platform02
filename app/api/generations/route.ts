import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, extractToken, findUserById } from '@/lib/auth';
import {
    saveGeneration,
    getGenerationsByUser,
    countGenerationsByUser,
    type GenerationRecord,
} from '@/lib/db/generations';

// Max items per page
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;
const STORAGE_LIMIT = 500; // max stored generations per user

// GET /api/generations — list user's generation history
export async function GET(req: NextRequest) {
    const token = extractToken(req.headers.get('Authorization'));
    const decoded = token ? verifyToken(token) : null;
    if (!decoded) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const offset = Math.max(0, parseInt(searchParams.get('offset') ?? '0', 10));
    const limit = Math.min(MAX_LIMIT, Math.max(1, parseInt(searchParams.get('limit') ?? String(DEFAULT_LIMIT), 10)));

    const generations = getGenerationsByUser(decoded.userId, { limit, offset });
    const total = countGenerationsByUser(decoded.userId);

    return NextResponse.json({
        generations,
        pagination: {
            total,
            limit,
            offset,
            hasMore: offset + limit < total,
        },
    });
}

// POST /api/generations — save a new generation record
export async function POST(req: NextRequest) {
    const token = extractToken(req.headers.get('Authorization'));
    const decoded = token ? verifyToken(token) : null;
    if (!decoded) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = findUserById(decoded.userId);
    if (!user || user.status !== 'active') {
        return NextResponse.json({ error: 'Account not active' }, { status: 403 });
    }

    // Check storage limit
    const storageCount = countGenerationsByUser(decoded.userId);
    if (storageCount >= STORAGE_LIMIT) {
        return NextResponse.json(
            { error: `Storage limit reached (${STORAGE_LIMIT} generations). Please delete older generations.` },
            { status: 429 }
        );
    }

    const body = await req.json() as Partial<Omit<GenerationRecord, 'id' | 'userId' | 'createdAt'>>;

    // Required fields
    if (!body.prompt || !body.modelName || !body.fileUrl) {
        return NextResponse.json({ error: 'Missing required fields: prompt, modelName, fileUrl' }, { status: 400 });
    }

    const record = saveGeneration({
        userId: decoded.userId,
        prompt: body.prompt,
        negativePrompt: body.negativePrompt,
        modelName: body.modelName,
        params: body.params ?? {},
        fileUrl: body.fileUrl,
        fileType: body.fileType ?? 'image',
        generationType: body.generationType ?? 'txt2img',
        creditsUsed: body.creditsUsed ?? 0,
        status: body.status ?? 'success',
    });

    return NextResponse.json({ generation: record }, { status: 201 });
}
