const interviewRepository = require('../repositories/interviews.repository');

const getAllInterviews = async () => {
    const { data, error } = await interviewRepository.findAll();
    if (error) throw new Error(error.message);
    return data;
};

const createInterview = async (data) => {
    const { data: newInterview, error } = await interviewRepository.create(data);
    if (error) throw new Error(error.message);
    return newInterview;
};

const updateInterview = async (id, data) => {
    const { data: updatedInterview, error } = await interviewRepository.update(id, data);
    if (error) throw new Error(error.message);
    return updatedInterview;
};

const deleteInterview = async (id) => {
    const { error } = await interviewRepository.remove(id);
    if (error) throw new Error(error.message);
    return { success: true };
};

module.exports = {
    getAllInterviews,
    createInterview,
    updateInterview,
    deleteInterview
};