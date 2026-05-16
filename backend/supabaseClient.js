const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('⚠️ Supabase URL or Key is missing. Ensure they are set in your .env file.');
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

const createAuthClient = (token) => {
    if (!token) return supabase;
    return createClient(supabaseUrl, supabaseAnonKey, {
        global: { headers: { Authorization: `Bearer ${token}` } },
        auth: { persistSession: false }
    });
};

module.exports = supabase;
module.exports.createAuthClient = createAuthClient;
