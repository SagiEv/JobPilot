
const { getEmbedding } = require('../services/embedding.service');

const findAll = async (userId, client) => {
    return await client.from('skills').select('*').eq('user_id', userId);
};

const create = async (userId, skillData, client) => {
    const textToEmbed = `${skillData.name || ''} ${skillData.category || ''} ${skillData.level || ''}`;
    const embedding = await getEmbedding(textToEmbed);

    return await supabase
        .from('skills')
        .insert([{ user_id: userId, ...skillData, embedding }])
        .select()
        .single();
};

const update = async (userId, id, updateData, client) => {
    let embedding = undefined;
    if (updateData.name !== undefined || updateData.category !== undefined || updateData.level !== undefined) {
        const { data: current } = await client.from('skills').select('*').eq('id', id).single();
        if (current) {
            const merged = { ...current, ...updateData };
            const textToEmbed = `${merged.name || ''} ${merged.category || ''} ${merged.level || ''}`;
            embedding = await getEmbedding(textToEmbed);
        }
    }

    const payload = { ...updateData };
    if (embedding) payload.embedding = embedding;

    return await supabase
        .from('skills')
        .update(payload)
        .eq('id', id)
        .eq('user_id', userId)
        .select()
        .single();
};

const remove = async (userId, id, client) => {
    return await supabase
        .from('skills')
        .delete()
        .eq('id', id)
        .eq('user_id', userId);
};

module.exports = {
    findAll,
    create,
    update,
    remove
};