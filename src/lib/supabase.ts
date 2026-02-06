import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabaseServiceKey = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

// Standard client for public operations
export const supabase = createClient(supabaseUrl || '', supabaseKey || '');

// Admin client for restricted operations (like creating users)
// WARNING: Only use this on the server side or within admin-protected UI components
export const supabaseAdmin = createClient(supabaseUrl || '', supabaseServiceKey || '', {
    auth: {
        autoRefreshToken: false,
        persistSession: false,
        storageKey: 'sb-admin-storage' // Avoid conflict with standard client
    }
});
