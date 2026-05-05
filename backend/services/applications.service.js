const applicationRepository = require('../repositories/applications.repository');

const getAllApplications = async (userId) => {
    const { data, error } = await applicationRepository.findAll(userId);
    if (error) throw new Error(error.message);
    return data;
};

const createApplication = async (userId, data) => {
    const { data: newApp, error } = await applicationRepository.create(userId, data);
    if (error) throw new Error(error.message);
    return newApp;
};

const updateApplication = async (userId, id, data) => {
    const { data: updatedApp, error } = await applicationRepository.update(userId, id, data);
    if (error) throw new Error(error.message);
    return updatedApp;
};

const deleteApplication = async (userId, id) => {
    const { error } = await applicationRepository.remove(userId, id);
    if (error) throw new Error(error.message);
    return { success: true };
};

const bulkCreateApplications = async (userId, applications) => {
    const { data, error } = await applicationRepository.bulkInsert(userId, applications);
    if (error) {
        // Log internal details for debugging, but throw standard message
        console.error("Bulk Insert Error:", error);
        throw error;
    }
    return { success: true, count: data ? data.length : 0 };
};

module.exports = {
    getAllApplications,
    createApplication,
    updateApplication,
    deleteApplication,
    bulkCreateApplications
};