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
        'Application Added',
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
    if (!oldApp) throw new Error("Application not found");
    
    // Extract event_date and conflict_resolution so they're not saved directly in applications table
    const { event_date, conflict_resolution, notes, with_who, ...updateData } = data;

    // We check if the update intends to change the status or stage
    const inputStatus = updateData.status !== undefined ? updateData.status : oldApp.status;
    const inputStage = updateData.stage !== undefined ? updateData.stage : oldApp.stage;
    
    const isStatusChange = oldApp.status !== inputStatus;
    const isStageChange = oldApp.stage !== inputStage;

    // 1. Fetch history to detect conflicts
    const history = await applicationHistoryService.getHistoryByApplicationId(id);

    // 2. Log the change FIRST if status or stage changed
    if (isStatusChange || isStageChange) {
        let eventType = 'Status Change';
        if (isStatusChange && isStageChange) eventType = 'Status & Stage Change';
        else if (isStageChange) eventType = 'Stage Change';

        const targetDate = event_date ? new Date(event_date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
        const existingEvent = history.find(h => {
            if (!h.event_date) return false;
            const hDate = new Date(h.event_date).toISOString().split('T')[0];
            return hDate === targetDate && (h.event_type === 'Status Change' || h.event_type === 'Stage Change' || h.event_type === 'Status & Stage Change');
        });

        if (existingEvent) {
            if (existingEvent.new_status === inputStatus && existingEvent.new_stage === inputStage) {
                // Exact duplicate: ignore new event
            } else {
                if (conflict_resolution === 'keep_both') {
                    await applicationHistoryService.logChange(
                        id,
                        eventType,
                        oldApp.status,
                        inputStatus,
                        oldApp.stage,
                        inputStage,
                        notes || '', with_who || '', null, event_date || null
                    );
                } else if (conflict_resolution === 'overwrite') {
                    await applicationHistoryService.updateHistory(existingEvent.id, {
                        event_type: eventType,
                        new_status: inputStatus,
                        new_stage: inputStage,
                        notes: notes !== undefined ? notes : existingEvent.notes,
                        with_who: with_who !== undefined ? with_who : existingEvent.with_who
                    });
                } else {
                    const error = new Error('Conflicting event on this date');
                    error.code = 'CONFLICTING_EVENT';
                    error.conflictData = { existingEvent, inputStatus, inputStage, targetDate };
                    throw error;
                }
            }
        } else {
            await applicationHistoryService.logChange(
                id,
                eventType,
                oldApp.status,
                inputStatus,
                oldApp.stage,
                inputStage,
                notes || '', with_who || '', null, event_date || null
            );
        }
    }
    
    // 3. Recalculate latest status and stage from history
    const updatedHistory = await applicationHistoryService.getHistoryByApplicationId(id);
    const statusEvents = updatedHistory
        .filter(h => h.new_status != null)
        .sort((a, b) => {
            const timeA = new Date(a.event_date || a.created_at || 0).getTime();
            const timeB = new Date(b.event_date || b.created_at || 0).getTime();
            if (timeB !== timeA) return timeB - timeA;
            return b.id - a.id;
        });
        
    if (statusEvents.length > 0) {
        const latestEvent = statusEvents[0];
        updateData.status = latestEvent.new_status;
        if (latestEvent.new_stage !== undefined) {
            updateData.stage = latestEvent.new_stage;
        }
    } else {
        // Fallback to input if no history exists (e.g. legacy apps)
        updateData.status = inputStatus;
        updateData.stage = inputStage;
    }

    // 3. Update the applications table with the true latest state
    if (updateData.status && updateData.status.toLowerCase() !== 'rejected') {
        updateData.rejection_reason = null;
        updateData.automatic_rejection = false;
    }

    const { data: updatedApp, error } = await applicationRepository.update(userId, id, updateData);
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