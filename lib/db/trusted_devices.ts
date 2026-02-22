import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

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

const TRUSTED_DEVICES_FILE = path.join(process.cwd(), 'data', 'trusted_devices.json');

function readDevices(): Record<string, TrustedDeviceRecord> {
    if (!fs.existsSync(TRUSTED_DEVICES_FILE)) return {};
    try {
        return JSON.parse(fs.readFileSync(TRUSTED_DEVICES_FILE, 'utf8'));
    } catch {
        return {};
    }
}

function writeDevices(devices: Record<string, TrustedDeviceRecord>): void {
    const dir = path.dirname(TRUSTED_DEVICES_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(TRUSTED_DEVICES_FILE, JSON.stringify(devices, null, 2));
}

export function findDeviceByToken(token: string): TrustedDeviceRecord | null {
    const devices = readDevices();
    const device = Object.values(devices).find(d => d.deviceToken === token);
    if (!device) return null;
    // Check expiry
    if (Date.now() > device.expiresAt) {
        deleteDevice(device.id);
        return null;
    }
    return device;
}

export function saveDevice(record: Omit<TrustedDeviceRecord, 'id' | 'createdAt' | 'lastUsedAt'>): TrustedDeviceRecord {
    const devices = readDevices();
    const newDevice: TrustedDeviceRecord = {
        id: crypto.randomUUID(),
        ...record,
        lastUsedAt: Date.now(),
        createdAt: Date.now(),
    };
    devices[newDevice.id] = newDevice;
    writeDevices(devices);
    return newDevice;
}

export function touchDevice(id: string, ipAddress?: string, countryCode?: string): void {
    const devices = readDevices();
    if (!devices[id]) return;
    devices[id].lastUsedAt = Date.now();
    if (ipAddress) devices[id].ipAddress = ipAddress;
    if (countryCode) devices[id].countryCode = countryCode;
    writeDevices(devices);
}

export function deleteDevice(id: string): void {
    const devices = readDevices();
    delete devices[id];
    writeDevices(devices);
}

export function deleteDevicesForUser(userId: string): void {
    const devices = readDevices();
    const filtered = Object.fromEntries(
        Object.entries(devices).filter(([, d]) => d.userId !== userId)
    );
    writeDevices(filtered);
}

/** Removes expired device records (call periodically) */
export function purgeExpiredDevices(): number {
    const devices = readDevices();
    const now = Date.now();
    let count = 0;
    for (const [id, device] of Object.entries(devices)) {
        if (now > device.expiresAt) {
            delete devices[id];
            count++;
        }
    }
    if (count > 0) writeDevices(devices);
    return count;
}

/** Generate a fresh secure device token (UUID v4) */
export function generateDeviceToken(): string {
    return crypto.randomUUID();
}

/** 90-day TTL in ms */
export const DEVICE_TRUST_TTL_MS = 90 * 24 * 60 * 60 * 1000;
