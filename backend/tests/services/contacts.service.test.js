'use strict';

jest.mock('../../repositories/contacts.repository');
const contactRepository = require('../../repositories/contacts.repository');
const contactService = require('../../services/contacts.service');
const { buildContact } = require('../helpers/factories');

describe('contacts.service', () => {
    beforeEach(() => jest.clearAllMocks());

    describe('getAllContacts', () => {
        it('should return data on success', async () => {
            // Arrange
            const contacts = [buildContact()];
            contactRepository.findAll.mockResolvedValue({ data: contacts, error: null });

            // Act
            const result = await contactService.getAllContacts('user-123');

            // Assert
            expect(result).toEqual(contacts);
        });

        it('should throw on error', async () => {
            // Arrange
            contactRepository.findAll.mockResolvedValue({ data: null, error: { message: 'fail' } });

            // Act & Assert
            await expect(contactService.getAllContacts('u')).rejects.toThrow('fail');
        });
    });

    describe('createContact', () => {
        it('should return new contact', async () => {
            // Arrange
            const contact = buildContact({ id: 5 });
            contactRepository.create.mockResolvedValue({ data: contact, error: null });

            // Act
            const result = await contactService.createContact('user-123', { name: 'Jane' });

            // Assert
            expect(result).toEqual(contact);
        });

        it('should throw on error', async () => {
            contactRepository.create.mockResolvedValue({ data: null, error: { message: 'create fail' } });
            await expect(contactService.createContact('u', {})).rejects.toThrow('create fail');
        });
    });

    describe('updateContact', () => {
        it('should return updated contact', async () => {
            // Arrange
            const updated = buildContact({ name: 'Updated' });
            contactRepository.update.mockResolvedValue({ data: updated, error: null });

            // Act
            const result = await contactService.updateContact('user-123', 1, { name: 'Updated' });

            // Assert
            expect(result.name).toBe('Updated');
        });

        it('should throw on error', async () => {
            contactRepository.update.mockResolvedValue({ data: null, error: { message: 'update fail' } });
            await expect(contactService.updateContact('u', 1, {})).rejects.toThrow('update fail');
        });
    });

    describe('deleteContact', () => {
        it('should return { success: true }', async () => {
            // Arrange
            contactRepository.remove.mockResolvedValue({ error: null });

            // Act
            const result = await contactService.deleteContact('user-123', 1);

            // Assert
            expect(result).toEqual({ success: true });
        });

        it('should throw on error', async () => {
            contactRepository.remove.mockResolvedValue({ error: { message: 'delete fail' } });
            await expect(contactService.deleteContact('u', 1)).rejects.toThrow('delete fail');
        });
    });

    describe('bulkCreateContacts', () => {
        it('should return success count', async () => {
            // Arrange
            const contacts = [buildContact(), buildContact({ id: 2 })];
            contactRepository.bulkInsert.mockResolvedValue({ data: contacts, error: null });

            // Act
            const result = await contactService.bulkCreateContacts('user-123', contacts);

            // Assert
            expect(result).toEqual({ success: true, count: 2 });
        });

        it('should throw on error', async () => {
            const err = new Error('bulk fail');
            contactRepository.bulkInsert.mockResolvedValue({ data: null, error: err });
            await expect(contactService.bulkCreateContacts('u', [])).rejects.toThrow();
        });
    });
});
