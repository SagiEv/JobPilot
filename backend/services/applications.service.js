const applicationRepository = require('../repositories/applications.repository');

const getAllApplications = async () => {
    const { data, error } = await applicationRepository.findAll();
    if (error) throw new Error(error.message);
    return data;
};

const createApplication = async (data) => {
    const { data: newApp, error } = await applicationRepository.create(data);
    if (error) throw new Error(error.message);
    return newApp;
};

const updateApplication = async (id, data) => {
    const { data: updatedApp, error } = await applicationRepository.update(id, data);
    if (error) throw new Error(error.message);
    return updatedApp;
};

const deleteApplication = async (id) => {
    const { error } = await applicationRepository.remove(id);
    if (error) throw new Error(error.message);
    return { success: true };
};

const bulkCreateApplications = async (applications) => {
    const { data, error } = await applicationRepository.bulkInsert(applications);
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