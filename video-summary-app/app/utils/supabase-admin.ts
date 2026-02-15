import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
    if (typeof window === 'undefined') {
        // Only warn on server side to avoid noise in client if file is accidentally imported (though it shouldn't be)
        console.warn('⚠️ Supabase Service Role credentials (SUPABASE_SERVICE_ROLE_KEY) needed in .env for Admin operations');
    }
}

// NOTE: This client bypasses RLS. Use only in secure server-side contexts.
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});
