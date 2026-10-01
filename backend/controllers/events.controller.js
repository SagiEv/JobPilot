const eventsService = require('../services/events.service');

const getAll = async (req, res) => {
    const data = await eventsService.getAllEvents(req.user.id, req.supabase);
    res.json(data);
};

const create = async (req, res) => {
    const data = await eventsService.createEvent(req.user.id, req.body, req.supabase);
    res.json(data);
};

const update = async (req, res) => {
    const data = await eventsService.updateEvent(req.user.id, req.params.id, req.body, req.supabase);
    res.json(data);
};

const remove = async (req, res) => {
    const result = await eventsService.deleteEvent(req.user.id, req.params.id, req.supabase);
    res.json(result);
};

module.exports = { getAll, create, update, remove };
