const skillRepository = require('../repositories/skills.repository');

const getAllSkills = async (userId) => {
    const { data, error } = await skillRepository.findAll(userId);
    if (error) throw new Error(error.message);
    return data;
};

const createSkill = async (userId, skillData) => {
    const { data, error } = await skillRepository.create(userId, skillData);
    if (error) throw new Error(error.message);
    return data;
};

const updateSkill = async (userId, id, updateData) => {
    const { data, error } = await skillRepository.update(userId, id, updateData);
    if (error) throw new Error(error.message);
    return data;
};

const deleteSkill = async (userId, id) => {
    const { error } = await skillRepository.remove(userId, id);
    if (error) throw new Error(error.message);
    return { success: true };
};

module.exports = {
    getAllSkills,
    createSkill,
    updateSkill,
    deleteSkill
};