import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, extractToken } from '@/lib/auth';
import { getGenerationById, deleteGeneration } from '@/lib/db/generations';

// DELETE /api/generations/[id] — delete a generation record
export async function DELETE(
    req: NextRequest,
    { params }: { params: { id: string } }
) {
    const token = extractToken(req.headers.get('Authorization'));
    const decoded = token ? verifyToken(token) : null;
    if (!decoded) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = params;
    const gen = getGenerationById(id);

    if (!gen) {
        return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    // Only allow the owner to delete their own generations
    if (gen.userId !== decoded.userId) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const deleted = deleteGeneration(id);
    return NextResponse.json({ success: deleted });
}

// GET /api/generations/[id] — get a single generation record
export async function GET(
    req: NextRequest,
    { params }: { params: { id: string } }
) {
    const token = extractToken(req.headers.get('Authorization'));
    const decoded = token ? verifyToken(token) : null;
    if (!decoded) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = params;
    const gen = getGenerationById(id);

    if (!gen) {
        return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    if (gen.userId !== decoded.userId) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    return NextResponse.json({ generation: gen });
}
