const eventsRepository = require('../repositories/events.repository');
const AppError = require('../utils/AppError');
const applicationHistoryService = require('./applicationHistory.service');

const getAllEvents = async (userId, supabaseClient) => {
    const { data, error } = await eventsRepository.findAll(userId, supabaseClient);
    if (error) throw new AppError(error.message, error.status || 400, error.code);
    return data;
};

const createEvent = async (userId, data, supabaseClient) => {
    const { data: newEvent, error } = await eventsRepository.create(userId, data, supabaseClient);
    if (error) throw new AppError(error.message, error.status || 400, error.code);

    if (newEvent?.application_id && newEvent?.type === 'interview') {
        try {
            await applicationHistoryService.logChange(
                newEvent.application_id,
                'Interview',
                null,
                null,
                null,
                null,
                `Scheduled interview: ${newEvent.title || 'Interview'}`,
                newEvent.company,
                null,
                newEvent.date || null,
                supabaseClient
            );
        } catch (logErr) {
            console.error('Failed to log event in application history:', logErr);
        }
    }

    return newEvent;
};

const updateEvent = async (userId, id, data, supabaseClient) => {
    const { data: updatedEvent, error } = await eventsRepository.update(userId, id, data, supabaseClient);
    if (error) throw new AppError(error.message, error.status || 400, error.code);
    return updatedEvent;
};

const deleteEvent = async (userId, id, supabaseClient) => {
    const { error } = await eventsRepository.remove(userId, id, supabaseClient);
    if (error) throw new AppError(error.message, error.status || 400, error.code);
    return { success: true };
};

module.exports = {
    getAllEvents,
    createEvent,
    updateEvent,
    deleteEvent
};
