const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function cleanup() {
    const oneHourAgo = new Date(Date.now() - 3600000).toISOString();
    const { data, error } = await supabase
        .from('messages')
        .update({ image_url: null })
        .not('image_url', 'is', null)
        .lt('created_at', oneHourAgo)
        .select('id');

    if (error) {
        console.error('Supabase cleanup error:', error);
    } else {
        console.log(`Cleaned ${data?.length || 0} expired images from Supabase`);
    }
}

cleanup();
