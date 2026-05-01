const contactRepository = require('../repositories/contacts.repository');

const getAllContacts = async () => {
    const { data, error } = await contactRepository.findAll();
    if (error) throw new Error(error.message);
    return data;
};

const createContact = async (data) => {
    const { data: newContact, error } = await contactRepository.create(data);
    if (error) throw new Error(error.message);
    return newContact;
};

const updateContact = async (id, data) => {
    const { data: updatedContact, error } = await contactRepository.update(id, data);
    if (error) throw new Error(error.message);
    return updatedContact;
};

const deleteContact = async (id) => {
    const { error } = await contactRepository.remove(id);
    if (error) throw new Error(error.message);
    return { success: true };
};

const bulkCreateContacts = async (contacts) => {
    const { data, error } = await contactRepository.bulkInsert(contacts);
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