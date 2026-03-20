import { supabaseAdmin } from '../supabase-server';

export interface RegistrationAttemptRecord {
    id: string;
    ipAddress: string;
    email: string;
    success: boolean;
    createdAt: number;
}

export async function logRegistrationAttempt(ipAddress: string, email: string, success: boolean): Promise<void> {
    const row = {
        ip_address: ipAddress,
        email,
        success,
        created_at: Date.now(),
    };
    const { error } = await supabaseAdmin
        .from('registration_attempts')
        .insert(row);
    if (error) {
        console.error('[registration_attempts] logRegistrationAttempt error:', error.message);
    }

    // Cleanup old attempts (older than 7 days)
    const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000;
    await supabaseAdmin
        .from('registration_attempts')
        .delete()
        .lt('created_at', Date.now() - SEVEN_DAYS);
}

export async function countRecentAttemptsByIp(ipAddress: string, timeWindowMs: number): Promise<number> {
    const cutoff = Date.now() - timeWindowMs;
    const { count, error } = await supabaseAdmin
        .from('registration_attempts')
        .select('*', { count: 'exact', head: true })
        .eq('ip_address', ipAddress)
        .gte('created_at', cutoff);
    if (error) {
        console.error('[registration_attempts] countRecentAttemptsByIp error:', error.message);
        return 0;
    }
    return count ?? 0;
}
