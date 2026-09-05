'use strict';

jest.mock('../../repositories/events.repository');
const eventsRepository = require('../../repositories/events.repository');
const eventsService = require('../../services/events.service');
const { buildEvent } = require('../helpers/factories');

describe('events.service', () => {
    beforeEach(() => jest.clearAllMocks());

    describe('getAllEvents', () => {
        it('should return data on success', async () => {
            const events = [buildEvent()];
            eventsRepository.findAll.mockResolvedValue({ data: events, error: null });
            const result = await eventsService.getAllEvents('user-123');
            expect(result).toEqual(events);
        });

        it('should throw on error', async () => {
            eventsRepository.findAll.mockResolvedValue({ data: null, error: { message: 'fail' } });
            await expect(eventsService.getAllEvents('u')).rejects.toThrow('fail');
        });
    });

    describe('createEvent', () => {
        it('should return new event', async () => {
            const event = buildEvent({ id: 5 });
            eventsRepository.create.mockResolvedValue({ data: event, error: null });
            const result = await eventsService.createEvent('user-123', { title: 'Call' });
            expect(result).toEqual(event);
        });

        it('should throw on error', async () => {
            eventsRepository.create.mockResolvedValue({ data: null, error: { message: 'create fail' } });
            await expect(eventsService.createEvent('u', {})).rejects.toThrow('create fail');
        });
    });

    describe('updateEvent', () => {
        it('should return updated event', async () => {
            const updated = buildEvent({ title: 'Updated' });
            eventsRepository.update.mockResolvedValue({ data: updated, error: null });
            const result = await eventsService.updateEvent('user-123', 1, { title: 'Updated' });
            expect(result.title).toBe('Updated');
        });

        it('should throw on error', async () => {
            eventsRepository.update.mockResolvedValue({ data: null, error: { message: 'update fail' } });
            await expect(eventsService.updateEvent('u', 1, {})).rejects.toThrow('update fail');
        });
    });

    describe('deleteEvent', () => {
        it('should return { success: true }', async () => {
            eventsRepository.remove.mockResolvedValue({ error: null });
            const result = await eventsService.deleteEvent('user-123', 1);
            expect(result).toEqual({ success: true });
        });

        it('should throw on error', async () => {
            eventsRepository.remove.mockResolvedValue({ error: { message: 'delete fail' } });
            await expect(eventsService.deleteEvent('u', 1)).rejects.toThrow('delete fail');
        });
    });
});
