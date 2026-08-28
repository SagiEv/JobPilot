const supabase = require('../supabaseClient');
const { getEmbedding } = require('../services/embedding.service');

// --- Project Methods ---
const findAllProjects = async (userId) => {
    return await supabase.from('projects').select('*').eq('user_id', userId);
};

const createProject = async (userId, projectData) => {
    const textToEmbed = `${projectData.title || ''} ${projectData.description || ''} ${projectData.tech_stack || ''}`;
    const embedding = await getEmbedding(textToEmbed);

    return await supabase
        .from('projects')
        .insert({ ...projectData, user_id: userId, embedding })
        .select()
        .single();
};

const updateProject = async (userId, id, updateData) => {
    let embedding = undefined;
    // Only re-embed if relevant text fields changed
    if (updateData.title !== undefined || updateData.description !== undefined || updateData.tech_stack !== undefined) {
        // Fetch current to merge with updates for accurate embedding
        const { data: current } = await supabase.from('projects').select('*').eq('id', id).single();
        if (current) {
            const merged = { ...current, ...updateData };
            const textToEmbed = `${merged.title || ''} ${merged.description || ''} ${merged.tech_stack || ''}`;
            embedding = await getEmbedding(textToEmbed);
        }
    }

    const payload = { ...updateData };
    if (embedding) payload.embedding = embedding;

    return await supabase
        .from('projects')
        .update(payload)
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