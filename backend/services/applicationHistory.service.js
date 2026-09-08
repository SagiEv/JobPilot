const applicationHistoryRepo = require('../repositories/applicationHistory.repository');

const getHistoryByApplicationId = async (applicationId, supabaseClient) => {
    const { data, error } = await applicationHistoryRepo.findAllByApplicationId(applicationId, supabaseClient);
    if (error) throw new Error(error.message);
    return data;
};

const addHistory = async (historyData, supabaseClient) => {
    const { data, error } = await applicationHistoryRepo.create(historyData, supabaseClient);
    if (error) throw new Error(error.message);
    return data;
};

const updateHistory = async (id, historyData, supabaseClient) => {
    const { data, error } = await applicationHistoryRepo.update(id, historyData, supabaseClient);
    if (error) throw new Error(error.message);
    return data;
};


const logChange = async (applicationId, eventType, oldStatus, newStatus, oldStage, newStage, notes = '', withWho = '', interviewId = null, eventDate = null, supabaseClient = null) => {
    // Only log if something changed or if it's a specific manual event
    if (oldStatus === newStatus && oldStage === newStage && eventType !== 'Note' && eventType !== 'Interview') {
        return null;
    }

    const historyData = {
        application_id: applicationId,
        event_type: eventType,
        old_status: oldStatus,
        new_status: newStatus,
        old_stage: oldStage,
        new_stage: newStage,
        notes: notes,
        with_who: withWho,
        interview_id: interviewId
    };
    
    if (eventDate) {
        historyData.event_date = eventDate;
    }

    return await addHistory(historyData, supabaseClient);
};

module.exports = {
    getHistoryByApplicationId,
    addHistory,
    updateHistory,
    logChange
};
