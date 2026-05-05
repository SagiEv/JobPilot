const supabase = require('../supabaseClient.js');

const signUp = async (email, password) => {
    return await supabase.auth.signUp({ email, password });
};

const signIn = async (email, password) => {
    return await supabase.auth.signInWithPassword({ email, password });
};

const refresh = async (refresh_token) => {
    return await supabase.auth.refreshSession({ refresh_token });
};

const getProfile = async (userId) => {
    // Standard Supabase call (Assumes RLS is handled or using service key)
    return await supabase.from('profiles').select('*').eq('id', userId).single();
};

module.exports = { signUp, signIn, refresh, getProfile };