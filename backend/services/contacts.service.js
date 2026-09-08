const contactRepository = require('../repositories/contacts.repository');

const getAllContacts = async (userId, supabaseClient) => {
    const { data, error } = await contactRepository.findAll(userId, supabaseClient);
    if (error) throw new Error(error.message);
    return data;
};

const createContact = async (userId, data, supabaseClient) => {
    const { data: newContact, error } = await contactRepository.create(userId, data, supabaseClient);
    if (error) throw new Error(error.message);
    return newContact;
};

const updateContact = async (userId, id, data, supabaseClient) => {
    const { data: updatedContact, error } = await contactRepository.update(userId, id, data, supabaseClient);
    if (error) throw new Error(error.message);
    return updatedContact;
};

const deleteContact = async (userId, id, supabaseClient) => {
    const { error } = await contactRepository.remove(userId, id, supabaseClient);
    if (error) throw new Error(error.message);
    return { success: true };
};

const bulkCreateContacts = async (userId, contacts, supabaseClient) => {
    const { data, error } = await contactRepository.bulkInsert(userId, contacts, supabaseClient);
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