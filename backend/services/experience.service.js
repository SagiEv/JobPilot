const experienceRepository = require('../repositories/experience.repository');

// --- Project Business Logic ---
const getAllProjects = async () => {
    const { data, error } = await experienceRepository.findAllProjects();
    if (error) throw new Error(error.message);
    return data;
};

const createProject = async (data) => {
    const { data: newProject, error } = await experienceRepository.createProject(data);
    if (error) throw error; // Throwing full error for detail logging in controller
    return newProject;
};

const updateProject = async (id, data) => {
    const { data: updatedProject, error } = await experienceRepository.updateProject(id, data);
    if (error) throw new Error(error.message);
    return updatedProject;
};

const deleteProject = async (id) => {
    const { error } = await experienceRepository.removeProject(id);
    if (error) throw new Error(error.message);
    return { success: true };
};

// --- Experience Text Business Logic ---
const getExperienceText = async () => {
    const { data, error } = await experienceRepository.findExperienceText();
    if (error && error.code !== 'PGRST116') throw new Error(error.message);
    return data || { text: '' };
};

const saveExperienceText = async (id, text) => {
    const { data, error } = await experienceRepository.upsertExperienceText(id, text);
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