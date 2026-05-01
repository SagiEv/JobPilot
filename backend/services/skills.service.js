const skillRepository = require('../repositories/skills.repository');

const getAllSkills = async () => {
    const { data, error } = await skillRepository.findAll();
    if (error) throw new Error(error.message);
    return data;
};

const createSkill = async (skillData) => {
    const { data, error } = await skillRepository.create(skillData);
    if (error) throw new Error(error.message);
    return data;
};

const updateSkill = async (id, updateData) => {
    const { data, error } = await skillRepository.update(id, updateData);
    if (error) throw new Error(error.message);
    return data;
};

const deleteSkill = async (id) => {
    const { error } = await skillRepository.remove(id);
    if (error) throw new Error(error.message);
    return { success: true };
};

module.exports = {
    getAllSkills,
    createSkill,
    updateSkill,
    deleteSkill
};