const contactRepository = require('../repositories/contacts.repository');

const getAllContacts = async (userId) => {
    const { data, error } = await contactRepository.findAll(userId);
    if (error) throw new Error(error.message);
    return data;
};

const createContact = async (userId, data) => {
    const { data: newContact, error } = await contactRepository.create(userId, data);
    if (error) throw new Error(error.message);
    return newContact;
};

const updateContact = async (userId, id, data) => {
    const { data: updatedContact, error } = await contactRepository.update(userId, id, data);
    if (error) throw new Error(error.message);
    return updatedContact;
};

const deleteContact = async (userId, id) => {
    const { error } = await contactRepository.remove(userId, id);
    if (error) throw new Error(error.message);
    return { success: true };
};

const bulkCreateContacts = async (userId, contacts) => {
    const { data, error } = await contactRepository.bulkInsert(userId, contacts);
    if (error) {
        console.error("Bulk Insert Error (Contacts):", error);
        throw error;
    }
    return { success: true, count: data ? data.length : 0 };
};

module.exports = {
    getAllContacts,
    createContact,
    updateContact,
    deleteContact,
    bulkCreateContacts
};