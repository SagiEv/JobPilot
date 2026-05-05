const contactService = require('../services/contacts.service');

const getAll = async (req, res) => {
    try {
        const userId = req.user.id;
        const data = await contactService.getAllContacts(userId);
        res.json(data);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

const create = async (req, res) => {
    try {
        const userId = req.user.id;
        const data = await contactService.createContact(userId, req.body);
        res.json(data);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

const update = async (req, res) => {
    try {
        const userId = req.user.id;
        const data = await contactService.updateContact(userId, req.params.id, req.body);
        res.json(data);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

const remove = async (req, res) => {
    try {
        const userId = req.user.id;
        const result = await contactService.deleteContact(userId, req.params.id);
        res.json(result);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

const bulkCreate = async (req, res) => {
    try {
        const userId = req.user.id;
        const result = await contactService.bulkCreateContacts(userId, req.body.contacts);
        res.json(result);
    } catch (error) {
        res.status(400).json({ error: error.message, details: error.details });
    }
};

module.exports = {
    getAll,
    create,
    update,
    remove,
    bulkCreate
};