const supabase = require('../supabaseClient');

const findFirstProfile = async (userId, client) => {
    return await client.from('profile').select('*').eq('user_id', userId).single();
};

const updateProfile = async (userId, updateData, client) => {
    return await client
        .from('profile')
        .update(updateData)
        .eq('user_id', userId)
        .select()
        .single();
};

const createProfile = async (userId, updateData, client) => {
    return await client
        .from('profile')
        .insert({ user_id: userId, ...updateData })
        .select()
        .single();
};

const findUserExperiences = async (userId, client) => {
    return await client
        .from('user_experiences')
        .select('*, roles_dictionary(*)')
        .eq('user_id', userId);
};

const syncUserExperiences = async (userId, experiences, client) => {
    // Simplified sync: delete all and re-insert
    await client.from('user_experiences').delete().eq('user_id', userId);
    if (experiences && experiences.length > 0) {
        const rows = experiences.map(exp => ({
            user_id: userId,
            role_id: exp.role_id,
            status: exp.status,
            years: exp.years || null,
            start_date: exp.start_date || null,
            end_date: exp.end_date || null
        }));
        await client.from('user_experiences').insert(rows);
    }
};

module.exports = {
    findFirstProfile,
    updateProfile,
    createProfile,
    findUserExperiences,
    syncUserExperiences
};