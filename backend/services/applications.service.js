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
    
    // Extract event_date so it's not saved in the applications table, 
    // unless you want to update the application's main date too.
    // Actually, in useApplications we send `date` and `eventDate`.
    // So `data.date` is the app date, `data.event_date` is for history.
    const { event_date, ...updateData } = data;
    
    const { data: updatedApp, error } = await applicationRepository.update(userId, id, updateData);
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
                updatedApp.stage,
                '', // notes
                '', // with_who
                null, // interviewId
                event_date || null
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
const getAnalyticsMetrics = async (userId) => {
    const { data: apps, error: appError } = await applicationRepository.findAll(userId);
    if (appError) throw new Error(appError.message);

    if (!apps || apps.length === 0) {
        return {
            timeToReject: { averageDays: 0, count: 0 },
            timeToInterview: { averageDays: 0, count: 0 },
            timeToOffer: { averageDays: 0, count: 0 },
            hrToTechnical: { averageDays: 0, count: 0 },
            technicalToFinal: { averageDays: 0, count: 0 }
        };
    }

    const appIds = apps.map(a => a.id);

    // Fetch all history for user's applications
    const supabase = require('../supabaseClient');
    const { data: history, error: histError } = await supabase
        .from('application_history')
        .select('*')
        .in('application_id', appIds)
        .order('event_date', { ascending: true });

    if (histError) throw new Error(histError.message);

    // Helper to calculate days diff
    const calcDays = (start, end) => Math.ceil(Math.abs(new Date(end) - new Date(start)) / (1000 * 60 * 60 * 24));

    const metrics = {
        timeToReject: { totalDays: 0, count: 0 },
        timeToInterview: { totalDays: 0, count: 0 },
        timeToOffer: { totalDays: 0, count: 0 },
        hrToTechnical: { totalDays: 0, count: 0 },
        technicalToFinal: { totalDays: 0, count: 0 }
    };

    for (const appId of appIds) {
        const appHistory = history.filter(h => h.application_id === appId);
        if (appHistory.length < 2) continue;

        const firstDate = appHistory[0].event_date;
        
        // Find specific transition events
        const firstReject = appHistory.find(h => h.new_status?.toLowerCase() === 'rejected');
        const firstInterview = appHistory.find(h => h.new_status?.toLowerCase() === 'interviewing');
        const firstOffer = appHistory.find(h => h.new_status?.toLowerCase() === 'offer');

        const hrScreen = appHistory.find(h => h.new_stage?.toLowerCase().includes('hr') || h.new_stage?.toLowerCase().includes('recruiter'));
        const techScreen = appHistory.find(h => h.new_stage?.toLowerCase().includes('technical'));
        const finalScreen = appHistory.find(h => h.new_stage?.toLowerCase().includes('final'));

        if (firstReject) {
            metrics.timeToReject.totalDays += calcDays(firstDate, firstReject.event_date);
            metrics.timeToReject.count++;
        }
        if (firstInterview) {
            metrics.timeToInterview.totalDays += calcDays(firstDate, firstInterview.event_date);
            metrics.timeToInterview.count++;
        }
        if (firstOffer) {
            metrics.timeToOffer.totalDays += calcDays(firstDate, firstOffer.event_date);
            metrics.timeToOffer.count++;
        }

        // Transitions within stages
        if (hrScreen && techScreen && new Date(techScreen.event_date) >= new Date(hrScreen.event_date)) {
            metrics.hrToTechnical.totalDays += calcDays(hrScreen.event_date, techScreen.event_date);
            metrics.hrToTechnical.count++;
        }
        
        if (techScreen && finalScreen && new Date(finalScreen.event_date) >= new Date(techScreen.event_date)) {
            metrics.technicalToFinal.totalDays += calcDays(techScreen.event_date, finalScreen.event_date);
            metrics.technicalToFinal.count++;
        }
    }

    const formatMetric = (metric) => ({
        averageDays: metric.count > 0 ? Math.round(metric.totalDays / metric.count) : 0,
        count: metric.count
    });

    return {
        timeToReject: formatMetric(metrics.timeToReject),
        timeToInterview: formatMetric(metrics.timeToInterview),
        timeToOffer: formatMetric(metrics.timeToOffer),
        hrToTechnical: formatMetric(metrics.hrToTechnical),
        technicalToFinal: formatMetric(metrics.technicalToFinal)
    };
};

module.exports = {
    getAllApplications,
    createApplication,
    updateApplication,
    deleteApplication,
    bulkCreateApplications,
    getAnalyticsMetrics
};