const interviewRepository = require('../repositories/interviews.repository');

const getAllInterviews = async (userId) => {
    const { data, error } = await interviewRepository.findAll(userId);
    if (error) throw new Error(error.message);
    return data;
};

const createInterview = async (userId, data) => {
    const { data: newInterview, error } = await interviewRepository.create(userId, data);
    if (error) throw new Error(error.message);
    return newInterview;
};

const updateInterview = async (userId, id, data) => {
    const { data: updatedInterview, error } = await interviewRepository.update(userId, id, data);
    if (error) throw new Error(error.message);
    return updatedInterview;
};

const deleteInterview = async (userId, id) => {
    const { error } = await interviewRepository.remove(userId, id);
    if (error) throw new Error(error.message);
    return { success: true };
};

module.exports = {
    getAllInterviews,
    createInterview,
    updateInterview,
    deleteInterview
};