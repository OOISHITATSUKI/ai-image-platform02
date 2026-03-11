import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, findUserById } from '@/lib/auth';
import { getFacesByUser, countFacesByUser, createFace, deleteFace } from '@/lib/db/faces';
import { MAX_FACES } from '@/lib/types';

function getUserFromRequest(request: NextRequest) {
    const authHeader = request.headers.get('authorization');
    if (!authHeader) return null;
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (!token) return null;
    return verifyToken(token);
}

function isPaidUser(plan: string): boolean {
    return plan !== 'free';
}

// GET /api/faces — list saved faces for the current user
export async function GET(request: NextRequest) {
    const decoded = getUserFromRequest(request);
    if (!decoded) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const faces = getFacesByUser(decoded.userId);

    // Map to frontend format
    const mapped = faces.map((f) => ({
        id: f.id,
        user_id: f.userId,
        name: f.name,
        image_url: f.imageUrl,
        thumbnail_url: f.thumbnailUrl,
        is_active: f.isActive,
        created_at: new Date(f.createdAt).toISOString(),
    }));

    return NextResponse.json({ faces: mapped });
}

// POST /api/faces — register a new face
export async function POST(request: NextRequest) {
    const decoded = getUserFromRequest(request);
    if (!decoded) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name, image_url, thumbnail_url, source } = body;

    if (!name || !image_url) {
        return NextResponse.json({ error: 'Name and image_url are required' }, { status: 400 });
    }

    // Get user plan
    const user = findUserById(decoded.userId);
    const paid = user ? isPaidUser(user.plan) : false;
    const limit = paid ? MAX_FACES.paid : MAX_FACES.free;

    // Count existing faces
    const currentCount = countFacesByUser(decoded.userId);

    if (currentCount >= limit) {
        return NextResponse.json({
            error: 'face_limit_reached',
            limit,
            isPaid: paid,
        }, { status: 403 });
    }

    // Check if source is 'upload' and user is free
    if (source === 'upload' && !paid) {
        return NextResponse.json({
            error: 'upload_requires_paid',
        }, { status: 403 });
    }

    const record = createFace({
        userId: decoded.userId,
        name: name.slice(0, 50),
        imageUrl: image_url,
        thumbnailUrl: thumbnail_url || image_url,
    });

    // Map to frontend format
    const face = {
        id: record.id,
        user_id: record.userId,
        name: record.name,
        image_url: record.imageUrl,
        thumbnail_url: record.thumbnailUrl,
        is_active: record.isActive,
        created_at: new Date(record.createdAt).toISOString(),
    };

    return NextResponse.json({ face });
}

// DELETE /api/faces?id=xxx — delete a saved face
export async function DELETE(request: NextRequest) {
    const decoded = getUserFromRequest(request);
    if (!decoded) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const faceId = request.nextUrl.searchParams.get('id');
    if (!faceId) {
        return NextResponse.json({ error: 'Face ID is required' }, { status: 400 });
    }

    const deleted = deleteFace(faceId, decoded.userId);
    if (!deleted) {
        return NextResponse.json({ error: 'Face not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
}
