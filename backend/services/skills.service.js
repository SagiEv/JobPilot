const skillRepository = require('../repositories/skills.repository');

const getAllSkills = async (userId, supabaseClient) => {
    const { data, error } = await skillRepository.findAll(userId, supabaseClient);
    if (error) throw new Error(error.message);
    return data;
};

const createSkill = async (userId, skillData, supabaseClient) => {
    const { data, error } = await skillRepository.create(userId, skillData, supabaseClient);
    if (error) throw new Error(error.message);
    return data;
};

const updateSkill = async (userId, id, updateData, supabaseClient) => {
    const { data, error } = await skillRepository.update(userId, id, updateData, supabaseClient);
    if (error) throw new Error(error.message);
    return data;
};

const deleteSkill = async (userId, id, supabaseClient) => {
    const { error } = await skillRepository.remove(userId, id, supabaseClient);
    if (error) throw new Error(error.message);
    return { success: true };
};

module.exports = {
    getAllSkills,
    createSkill,
    updateSkill,
    deleteSkill
};