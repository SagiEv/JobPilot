const eventsRepository = require('../repositories/events.repository');
const AppError = require('../utils/AppError');

const getAllEvents = async (userId, supabaseClient) => {
    const { data, error } = await eventsRepository.findAll(userId, supabaseClient);
    if (error) throw new AppError(error.message, error.status || 400, error.code);
    return data;
};

const createEvent = async (userId, data, supabaseClient) => {
    const { data: newEvent, error } = await eventsRepository.create(userId, data, supabaseClient);
    if (error) throw new AppError(error.message, error.status || 400, error.code);
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
