const experienceRepository = require('../repositories/experience.repository');

// --- Project Business Logic ---
const getAllProjects = async (userId, supabaseClient) => {
    const { data, error } = await experienceRepository.findAllProjects(userId, supabaseClient);
    if (error) throw new Error(error.message);
    return data;
};

const createProject = async (userId, data, supabaseClient) => {
    const { data: newProject, error } = await experienceRepository.createProject(userId, data, supabaseClient);
    if (error) throw error; // Throwing full error for detail logging in controller
    return newProject;
};

const updateProject = async (userId, id, data, supabaseClient) => {
    const { data: updatedProject, error } = await experienceRepository.updateProject(userId, id, data, supabaseClient);
    if (error) throw new Error(error.message);
    return updatedProject;
};

const deleteProject = async (userId, id, supabaseClient) => {
    const { error } = await experienceRepository.removeProject(userId, id, supabaseClient);
    if (error) throw new Error(error.message);
    return { success: true };
};

// --- Experience Text Business Logic ---
const getExperienceText = async (userId, supabaseClient) => {
    const { data, error } = await experienceRepository.findExperienceText(userId, supabaseClient);
    if (error && error.code !== 'PGRST116') throw new Error(error.message);
    return data || { text: '' };
};

const saveExperienceText = async (userId, id, text, supabaseClient) => {
    const { data, error } = await experienceRepository.upsertExperienceText(userId, id, text, supabaseClient);
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