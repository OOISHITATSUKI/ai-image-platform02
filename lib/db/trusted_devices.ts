import crypto from 'crypto';
import { supabaseAdmin } from '../supabase-server';

export interface TrustedDeviceRecord {
    id: string;          // UUID
    userId: string;      // FK → UserRecord.id
    deviceToken: string; // Random UUID stored in cookie
    deviceName?: string; // e.g. "Chrome / Windows"
    ipAddress?: string;
    countryCode?: string;
    lastUsedAt: number;  // Unix ms
    expiresAt: number;   // Unix ms
    createdAt: number;   // Unix ms
}

function rowToDevice(row: any): TrustedDeviceRecord {
    return {
        id: row.id,
        userId: row.user_id,
        deviceToken: row.device_token,
        deviceName: row.device_name ?? undefined,
        ipAddress: row.ip_address ?? undefined,
        countryCode: row.country_code ?? undefined,
        lastUsedAt: row.last_used_at,
        expiresAt: row.expires_at,
        createdAt: row.created_at,
    };
}

export async function findDeviceByToken(token: string): Promise<TrustedDeviceRecord | null> {
    const { data, error } = await supabaseAdmin
        .from('trusted_devices')
        .select('*')
        .eq('device_token', token)
        .maybeSingle();
    if (error) {
        console.error('[trusted_devices] findDeviceByToken error:', error.message);
        return null;
    }
    if (!data) return null;
    const device = rowToDevice(data);
    // Check expiry
    if (Date.now() > device.expiresAt) {
        await deleteDevice(device.id);
        return null;
    }
    return device;
}

export async function saveDevice(record: Omit<TrustedDeviceRecord, 'id' | 'createdAt' | 'lastUsedAt'>): Promise<TrustedDeviceRecord> {
    const now = Date.now();
    const row = {
        user_id: record.userId,
        device_token: record.deviceToken,
        device_name: record.deviceName ?? null,
        ip_address: record.ipAddress ?? null,
        country_code: record.countryCode ?? null,
        last_used_at: now,
        expires_at: record.expiresAt,
        created_at: now,
    };
    const { data, error } = await supabaseAdmin
        .from('trusted_devices')
        .insert(row)
        .select()
        .single();
    if (error) {
        console.error('[trusted_devices] saveDevice error:', error.message);
        throw error;
    }
    return rowToDevice(data);
}

export async function touchDevice(id: string, ipAddress?: string, countryCode?: string): Promise<void> {
    const updates: any = { last_used_at: Date.now() };
    if (ipAddress) updates.ip_address = ipAddress;
    if (countryCode) updates.country_code = countryCode;
    const { error } = await supabaseAdmin
        .from('trusted_devices')
        .update(updates)
        .eq('id', id);
    if (error) {
        console.error('[trusted_devices] touchDevice error:', error.message);
    }
}

export async function deleteDevice(id: string): Promise<void> {
    const { error } = await supabaseAdmin
        .from('trusted_devices')
        .delete()
        .eq('id', id);
    if (error) {
        console.error('[trusted_devices] deleteDevice error:', error.message);
    }
}

export async function deleteDevicesForUser(userId: string): Promise<void> {
    const { error } = await supabaseAdmin
        .from('trusted_devices')
        .delete()
        .eq('user_id', userId);
    if (error) {
        console.error('[trusted_devices] deleteDevicesForUser error:', error.message);
    }
}

/** Removes expired device records (call periodically) */
export async function purgeExpiredDevices(): Promise<number> {
    const now = Date.now();
    const { data, error } = await supabaseAdmin
        .from('trusted_devices')
        .delete()
        .lt('expires_at', now)
        .select('id');
    if (error) {
        console.error('[trusted_devices] purgeExpiredDevices error:', error.message);
        return 0;
    }
    return data?.length ?? 0;
}

/** Generate a fresh secure device token (UUID v4) */
export function generateDeviceToken(): string {
    return crypto.randomUUID();
}

/** 90-day TTL in ms */
export const DEVICE_TRUST_TTL_MS = 90 * 24 * 60 * 60 * 1000;
