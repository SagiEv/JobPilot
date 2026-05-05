const supabase = require('../supabaseClient');

// --- Project Methods ---
const findAllProjects = async (userId) => {
    return await supabase.from('projects').select('*').eq('user_id', userId);
};

const createProject = async (userId, projectData) => {
    return await supabase
        .from('projects')
        .insert({ ...projectData, user_id: userId })
        .select()
        .single();
};

const updateProject = async (userId, id, updateData) => {
    return await supabase
        .from('projects')
        .update(updateData)
        .eq('id', id)
        .eq('user_id', userId)
        .select()
        .single();
};

const removeProject = async (userId, id) => {
    return await supabase
        .from('projects')
        .delete()
        .eq('id', id)
        .eq('user_id', userId);
};

// --- Experience Text Methods ---
const findExperienceText = async (userId) => {
    return await supabase.from('experience_text').select('*').eq('user_id', userId).single();
};

const upsertExperienceText = async (userId, id, text) => {
    if (id) {
        return await supabase
            .from('experience_text')
            .update({ text })
            .eq('id', id)
            .eq('user_id', userId)
            .select()
            .single();
    } else {
        return await supabase
            .from('experience_text')
            .insert({ text, user_id: userId })
            .select()
            .single();
    }
};

module.exports = {
    findAllProjects,
    createProject,
    updateProject,
    removeProject,
    findExperienceText,
    upsertExperienceText
};