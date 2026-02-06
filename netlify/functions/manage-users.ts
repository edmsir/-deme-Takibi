import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

export const handler = async (event: any) => {
    // Only allow POST requests
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    const supabase = createClient(supabaseUrl || '', supabaseServiceKey || '', {
        auth: {
            autoRefreshToken: false,
            persistSession: false
        }
    });

    try {
        const { action, data } = JSON.parse(event.body);

        // 1. Verify that the requester is an admin (Optional but recommended)
        // For now, we rely on the fact that this function is only called from the admin UI
        // and the Service Role Key is kept secret. In a real app, you should verify the JWT.

        if (action === 'createUser') {
            const { email, password, role } = data;

            const { data: authData, error: authError } = await supabase.auth.admin.createUser({
                email,
                password,
                email_confirm: true,
                user_metadata: { role }
            });

            if (authError) throw authError;

            // Ensure profile role is set correctly
            if (authData.user) {
                const { error: profileError } = await supabase
                    .from('profiles')
                    .update({ role })
                    .eq('id', authData.user.id);

                if (profileError) console.error('Profile role update error:', profileError);
            }

            return {
                statusCode: 200,
                body: JSON.stringify({ message: 'User created successfully', user: authData.user })
            };
        }

        if (action === 'deleteUser') {
            const { id } = data;

            const { error: authError } = await supabase.auth.admin.deleteUser(id);
            if (authError) throw authError;

            return {
                statusCode: 200,
                body: JSON.stringify({ message: 'User deleted successfully' })
            };
        }

        return { statusCode: 400, body: 'Invalid action' };

    } catch (error: any) {
        console.error('Function error:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: error.message })
        };
    }
};
