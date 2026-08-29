const applicationRepository = require('../repositories/applications.repository');
const applicationHistoryService = require('./applicationHistory.service');

const getAllApplications = async (userId) => {
    const { data, error } = await applicationRepository.findAll(userId);
    if (error) throw new Error(error.message);
    return data;
};

const createApplication = async (userId, data) => {
    const { data: newApp, error } = await applicationRepository.create(userId, data);
    if (error) throw new Error(error.message);

    // Log creation
    await applicationHistoryService.logChange(
        newApp.id,
        'Initial Import',
        null,
        newApp.status,
        null,
        newApp.stage,
        'Application created'
    );

    return newApp;
};

const updateApplication = async (userId, id, data) => {
    // Fetch existing application
    const { data: oldApp } = await applicationRepository.findById(userId, id);
    
    const { data: updatedApp, error } = await applicationRepository.update(userId, id, data);
    if (error) throw new Error(error.message);

    // Log change if status or stage is updated
    if (oldApp) {
        const isStatusChange = oldApp.status !== updatedApp.status;
        const isStageChange = oldApp.stage !== updatedApp.stage;

        if (isStatusChange || isStageChange) {
            let eventType = 'Status Change';
            if (isStatusChange && isStageChange) eventType = 'Status & Stage Change';
            else if (isStageChange) eventType = 'Stage Change';

            await applicationHistoryService.logChange(
                updatedApp.id,
                eventType,
                oldApp.status,
                updatedApp.status,
                oldApp.stage,
                updatedApp.stage
            );
        }
    }

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
const calculateTimeToReject = async (userId) => {
    const { data: apps, error: appError } = await applicationRepository.findAll(userId);
    if (appError) throw new Error(appError.message);

    const rejectedAppIds = apps.filter(a => a.status?.toLowerCase() === 'rejected').map(a => a.id);
    if (rejectedAppIds.length === 0) return { averageDays: 0, count: 0 };

    // Fetch history for these apps using supabase directly to save time creating a new repo function
    const supabase = require('../supabaseClient');
    const { data: history, error: histError } = await supabase
        .from('application_history')
        .select('*')
        .in('application_id', rejectedAppIds)
        .order('event_date', { ascending: true });

    if (histError) throw new Error(histError.message);

    let totalDays = 0;
    let count = 0;

    for (const appId of rejectedAppIds) {
        const appHistory = history.filter(h => h.application_id === appId);
        if (appHistory.length >= 2) {
            // first event is usually applied, last is rejected
            const firstDate = new Date(appHistory[0].event_date);
            const rejectEvent = appHistory.find(h => h.new_status?.toLowerCase() === 'rejected');
            if (rejectEvent) {
                const rejectDate = new Date(rejectEvent.event_date);
                const diffTime = Math.abs(rejectDate - firstDate);
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                totalDays += diffDays;
                count++;
            }
        }
    }

    return { 
        averageDays: count > 0 ? Math.round(totalDays / count) : 0, 
        count 
    };
};

module.exports = {
    getAllApplications,
    createApplication,
    updateApplication,
    deleteApplication,
    bulkCreateApplications,
    calculateTimeToReject
};