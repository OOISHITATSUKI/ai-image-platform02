import { supabaseAdmin } from '../supabase-server';

// ============================================================
// Saved Faces — Data Layer (Supabase for paid, local-only for free)
// ============================================================

export interface SavedFaceRecord {
    id: string;
    userId: string;
    name: string;
    imageUrl: string;
    thumbnailUrl: string;
    isActive: boolean;
    createdAt: number; // Unix ms
}

function rowToFace(row: any): SavedFaceRecord {
    return {
        id: row.id,
        userId: row.user_id,
        name: row.name ?? '',
        imageUrl: row.image_url ?? '',
        thumbnailUrl: row.thumbnail_url ?? '',
        isActive: row.is_active ?? false,
        createdAt: row.created_at,
    };
}

// ----- CRUD -----

export async function getFacesByUser(userId: string): Promise<SavedFaceRecord[]> {
    const { data, error } = await supabaseAdmin
        .from('saved_faces')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
    if (error) {
        console.error('[faces] getFacesByUser error:', error.message);
        return [];
    }
    return (data ?? []).map(rowToFace);
}

export async function countFacesByUser(userId: string): Promise<number> {
    const { count, error } = await supabaseAdmin
        .from('saved_faces')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId);
    if (error) {
        console.error('[faces] countFacesByUser error:', error.message);
        return 0;
    }
    return count ?? 0;
}

export async function createFace(params: {
    userId: string;
    name: string;
    imageUrl: string;
    thumbnailUrl: string;
}): Promise<SavedFaceRecord> {
    const row = {
        user_id: params.userId,
        name: params.name,
        image_url: params.imageUrl,
        thumbnail_url: params.thumbnailUrl,
        is_active: false,
        created_at: Date.now(),
    };
    const { data, error } = await supabaseAdmin
        .from('saved_faces')
        .insert(row)
        .select()
        .single();
    if (error) {
        console.error('[faces] createFace error:', error.message);
        throw error;
    }
    return rowToFace(data);
}

export async function deleteFace(faceId: string, userId: string): Promise<boolean> {
    const { data, error } = await supabaseAdmin
        .from('saved_faces')
        .delete()
        .eq('id', faceId)
        .eq('user_id', userId)
        .select('id');
    if (error) {
        console.error('[faces] deleteFace error:', error.message);
        return false;
    }
    return (data?.length ?? 0) > 0;
}

export async function getFaceById(faceId: string): Promise<SavedFaceRecord | null> {
    const { data, error } = await supabaseAdmin
        .from('saved_faces')
        .select('*')
        .eq('id', faceId)
        .maybeSingle();
    if (error) {
        console.error('[faces] getFaceById error:', error.message);
        return null;
    }
    return data ? rowToFace(data) : null;
}
