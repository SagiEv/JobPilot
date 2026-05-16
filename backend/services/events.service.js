const eventsRepository = require('../repositories/events.repository');

const getAllEvents = async (userId) => {
    const { data, error } = await eventsRepository.findAll(userId);
    if (error) throw new Error(error.message);
    return data;
};

const createEvent = async (userId, data) => {
    const { data: newEvent, error } = await eventsRepository.create(userId, data);
    if (error) throw new Error(error.message);
    return newEvent;
};

const updateEvent = async (userId, id, data) => {
    const { data: updatedEvent, error } = await eventsRepository.update(userId, id, data);
    if (error) throw new Error(error.message);
    return updatedEvent;
};

const deleteEvent = async (userId, id) => {
    const { error } = await eventsRepository.remove(userId, id);
    if (error) throw new Error(error.message);
    return { success: true };
};

module.exports = {
    getAllEvents,
    createEvent,
    updateEvent,
    deleteEvent
};
