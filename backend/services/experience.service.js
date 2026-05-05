const experienceRepository = require('../repositories/experience.repository');

// --- Project Business Logic ---
const getAllProjects = async (userId) => {
    const { data, error } = await experienceRepository.findAllProjects(userId);
    if (error) throw new Error(error.message);
    return data;
};

const createProject = async (userId, data) => {
    const { data: newProject, error } = await experienceRepository.createProject(userId, data);
    if (error) throw error; // Throwing full error for detail logging in controller
    return newProject;
};

const updateProject = async (userId, id, data) => {
    const { data: updatedProject, error } = await experienceRepository.updateProject(userId, id, data);
    if (error) throw new Error(error.message);
    return updatedProject;
};

const deleteProject = async (userId, id) => {
    const { error } = await experienceRepository.removeProject(userId, id);
    if (error) throw new Error(error.message);
    return { success: true };
};

// --- Experience Text Business Logic ---
const getExperienceText = async (userId) => {
    const { data, error } = await experienceRepository.findExperienceText(userId);
    if (error && error.code !== 'PGRST116') throw new Error(error.message);
    return data || { text: '' };
};

const saveExperienceText = async (userId, id, text) => {
    const { data, error } = await experienceRepository.upsertExperienceText(userId, id, text);
    if (error) throw new Error(error.message);
    return data;
};

module.exports = {
    getAllProjects,
    createProject,
    updateProject,
    deleteProject,
    getExperienceText,
    saveExperienceText
};