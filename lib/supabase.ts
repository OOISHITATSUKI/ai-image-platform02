import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
    if (typeof window !== 'undefined') {
        console.error('CRITICAL: Supabase credentials are missing from the client-side bundle. Ensure you ran `npm run build` AFTER updating .env');
    }
} else {
    if (typeof window !== 'undefined') {
        console.log('Supabase client initialized with URL:', supabaseUrl);
    }
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
