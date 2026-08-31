'use strict';

process.env.SUPABASE_URL = 'http://localhost:8000';
process.env.SUPABASE_ANON_KEY = 'dummy';

const applicationService = require('../services/applications.service');
const applicationRepository = require('../repositories/applications.repository');
const applicationHistoryService = require('../services/applicationHistory.service');

jest.mock('../repositories/applications.repository');
jest.mock('../services/applicationHistory.service');

describe('applications.service - updateApplication', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should correctly recalculate status when older event is inserted', async () => {
        // Mock application data
        applicationRepository.findById.mockResolvedValue({
            data: { id: 1, status: 'Interviewing', stage: 'Technical Interview' }
        });

        // Mock update - returns what it's given
        applicationRepository.update.mockImplementation((userId, id, data) => Promise.resolve({ data: { ...data, id } }));

        // Mock logging change
        applicationHistoryService.logChange.mockResolvedValue({});

        // Mock history to simulate an application that has an 'Interviewing' event 2 days ago,
        // and a newly inserted 'Assessment' event 30 days ago.
        applicationHistoryService.getHistoryByApplicationId.mockResolvedValue([
            { id: 2, event_date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), new_status: 'Interviewing', new_stage: 'Technical Interview' },
            { id: 3, event_date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(), new_status: 'Assessment', new_stage: 'Online Test' }, // The one we just added
            { id: 1, event_date: new Date(Date.now() - 40 * 24 * 60 * 60 * 1000).toISOString(), new_status: 'Applied', new_stage: null }
        ]);

        const result = await applicationService.updateApplication('user123', 1, {
            status: 'Assessment',
            stage: 'Online Test',
            event_date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
        });

        // Ensure we logged the change
        expect(applicationHistoryService.logChange).toHaveBeenCalledTimes(1);

        // Ensure the final updated status is 'Interviewing' (the newest event)
        expect(result.status).toBe('Interviewing');
        expect(result.stage).toBe('Technical Interview');
        
        // Ensure applicationRepository.update was called with Interviewing
        expect(applicationRepository.update).toHaveBeenCalledWith('user123', 1, expect.objectContaining({
            status: 'Interviewing',
            stage: 'Technical Interview'
        }));
    });

    it('should update status normally for a new forward event', async () => {
        applicationRepository.findById.mockResolvedValue({
            data: { id: 1, status: 'Interviewing', stage: 'Technical Interview' }
        });
        applicationRepository.update.mockImplementation((userId, id, data) => Promise.resolve({ data: { ...data, id } }));
        applicationHistoryService.logChange.mockResolvedValue({});

        applicationHistoryService.getHistoryByApplicationId.mockResolvedValue([
            { id: 3, event_date: new Date().toISOString(), new_status: 'Offer', new_stage: null }, // The one we just added
            { id: 2, event_date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), new_status: 'Interviewing', new_stage: 'Technical Interview' },
        ]);

        const result = await applicationService.updateApplication('user123', 1, {
            status: 'Offer',
            stage: null,
            event_date: new Date().toISOString()
        });

        expect(result.status).toBe('Offer');
        expect(result.stage).toBeNull();
    });

    it('should resolve ties using event id', async () => {
        applicationRepository.findById.mockResolvedValue({
            data: { id: 1, status: 'Assessment', stage: null }
        });
        applicationRepository.update.mockImplementation((userId, id, data) => Promise.resolve({ data: { ...data, id } }));
        applicationHistoryService.logChange.mockResolvedValue({});

        const sameDate = new Date().toISOString();
        applicationHistoryService.getHistoryByApplicationId.mockResolvedValue([
            { id: 5, event_date: sameDate, new_status: 'Interviewing', new_stage: null }, // highest id wins
            { id: 4, event_date: sameDate, new_status: 'Assessment', new_stage: null },
        ]);

        const result = await applicationService.updateApplication('user123', 1, {
            status: 'Interviewing'
        });

        expect(result.status).toBe('Interviewing');
    });

    it('should fallback to input status if history is empty', async () => {
        applicationRepository.findById.mockResolvedValue({
            data: { id: 1, status: 'Applied', stage: null }
        });
        applicationRepository.update.mockImplementation((userId, id, data) => Promise.resolve({ data: { ...data, id } }));
        applicationHistoryService.logChange.mockResolvedValue({});

        applicationHistoryService.getHistoryByApplicationId.mockResolvedValue([]);

        const result = await applicationService.updateApplication('user123', 1, {
            status: 'Interviewing'
        });

        expect(result.status).toBe('Interviewing');
    });

    it('should pass rejection fields when status is rejected', async () => {
        applicationRepository.findById.mockResolvedValue({
            data: { id: 1, status: 'Applied', stage: null }
        });
        applicationRepository.update.mockImplementation((userId, id, data) => Promise.resolve({ data: { ...data, id } }));
        applicationHistoryService.logChange.mockResolvedValue({});
        
        applicationHistoryService.getHistoryByApplicationId.mockResolvedValue([
            { id: 2, event_date: new Date().toISOString(), new_status: 'Rejected', new_stage: null }
        ]);

        const result = await applicationService.updateApplication('user123', 1, {
            status: 'Rejected',
            rejection_reason: 'Not a fit',
            automatic_rejection: true
        });

        expect(applicationRepository.update).toHaveBeenCalledWith('user123', 1, expect.objectContaining({
            status: 'Rejected',
            rejection_reason: 'Not a fit',
            automatic_rejection: true
        }));
    });

    it('should clear rejection fields when status moves away from rejected', async () => {
        applicationRepository.findById.mockResolvedValue({
            data: { id: 1, status: 'Rejected', stage: null, rejection_reason: 'Not a fit', automatic_rejection: true }
        });
        applicationRepository.update.mockImplementation((userId, id, data) => Promise.resolve({ data: { ...data, id } }));
        applicationHistoryService.logChange.mockResolvedValue({});
        
        applicationHistoryService.getHistoryByApplicationId.mockResolvedValue([
            { id: 3, event_date: new Date().toISOString(), new_status: 'Offer', new_stage: null },
            { id: 2, event_date: new Date(Date.now() - 1000).toISOString(), new_status: 'Rejected', new_stage: null }
        ]);

        const result = await applicationService.updateApplication('user123', 1, {
            status: 'Offer'
        });

        expect(applicationRepository.update).toHaveBeenCalledWith('user123', 1, expect.objectContaining({
            status: 'Offer',
            rejection_reason: null,
            automatic_rejection: false
        }));
    });

    it('should pass notes and with_who to logChange', async () => {
        applicationRepository.findById.mockResolvedValue({
            data: { id: 1, status: 'Applied', stage: null }
        });
        applicationRepository.update.mockImplementation((userId, id, data) => Promise.resolve({ data: { ...data, id } }));
        applicationHistoryService.logChange.mockResolvedValue({});
        
        applicationHistoryService.getHistoryByApplicationId.mockResolvedValue([
            { id: 2, event_date: new Date().toISOString(), new_status: 'Interviewing', new_stage: 'Recruiter / HR Screen' }
        ]);

        const result = await applicationService.updateApplication('user123', 1, {
            status: 'Interviewing',
            stage: 'Recruiter / HR Screen',
            notes: 'Discussed salary and next steps',
            with_who: 'John HR'
        });

        expect(applicationHistoryService.logChange).toHaveBeenCalledWith(
            1, // applicationId
            'Status & Stage Change', // eventType
            'Applied', // oldStatus
            'Interviewing', // inputStatus
            null, // oldStage
            'Recruiter / HR Screen', // inputStage
            'Discussed salary and next steps', // notes
            'John HR', // with_who
            null, // interviewId
            null // event_date
        );
    });
});
