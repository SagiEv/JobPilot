const contactService = require('../services/contacts.service');

const getAll = async (req, res) => {
    const data = await contactService.getAllContacts(req.user.id, req.supabase);
    res.json(data);
};

const create = async (req, res) => {
    const data = await contactService.createContact(req.user.id, req.body, req.supabase);
    res.json(data);
};

const update = async (req, res) => {
    const data = await contactService.updateContact(req.user.id, req.params.id, req.body, req.supabase);
    res.json(data);
};

const remove = async (req, res) => {
    const result = await contactService.deleteContact(req.user.id, req.params.id, req.supabase);
    res.json(result);
};

const bulkCreate = async (req, res) => {
    const result = await contactService.bulkCreateContacts(req.user.id, req.body.contacts, req.supabase);
    res.json(result);
};

module.exports = { getAll, create, update, remove, bulkCreate };