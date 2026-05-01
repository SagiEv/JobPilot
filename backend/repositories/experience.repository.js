const supabase = require('../supabaseClient');

// --- Project Methods ---
const findAllProjects = async () => {
    return await supabase.from('projects').select('*');
};

const createProject = async (projectData) => {
    return await supabase
        .from('projects')
        .insert([projectData])
        .select()
        .single();
};

const updateProject = async (id, updateData) => {
    return await supabase
        .from('projects')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();
};

const removeProject = async (id) => {
    return await supabase
        .from('projects')
        .delete()
        .eq('id', id);
};

// --- Experience Text Methods ---
const findExperienceText = async () => {
    return await supabase.from('experience_text').select('*').single();
};

const upsertExperienceText = async (id, text) => {
    if (id) {
        return await supabase
            .from('experience_text')
            .update({ text })
            .eq('id', id)
            .select()
            .single();
    } else {
        return await supabase
            .from('experience_text')
            .insert([{ text }])
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