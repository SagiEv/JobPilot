'use strict';

jest.mock('../../repositories/applicationHistory.repository');
const applicationHistoryRepo = require('../../repositories/applicationHistory.repository');
const applicationHistoryService = require('../../services/applicationHistory.service');

describe('applicationHistory.service', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('getHistoryByApplicationId', () => {
        it('should return data on success', async () => {
            // Arrange
            const mockHistory = [{ id: 1, event_type: 'Status Change' }];
            applicationHistoryRepo.findAllByApplicationId.mockResolvedValue({
                data: mockHistory, error: null,
            });

            // Act
            const result = await applicationHistoryService.getHistoryByApplicationId(1);

            // Assert
            expect(result).toEqual(mockHistory);
            expect(applicationHistoryRepo.findAllByApplicationId).toHaveBeenCalledWith(1);
        });

        it('should throw on repo error', async () => {
            // Arrange
            applicationHistoryRepo.findAllByApplicationId.mockResolvedValue({
                data: null, error: { message: 'DB error' },
            });

            // Act & Assert
            await expect(applicationHistoryService.getHistoryByApplicationId(1))
                .rejects.toThrow('DB error');
        });
    });

    describe('addHistory', () => {
        it('should create a history record', async () => {
            // Arrange
            const historyData = { application_id: 1, event_type: 'Note', notes: 'Test' };
            applicationHistoryRepo.create.mockResolvedValue({
                data: { id: 5, ...historyData }, error: null,
            });

            // Act
            const result = await applicationHistoryService.addHistory(historyData);

            // Assert
            expect(result).toEqual(expect.objectContaining({ id: 5 }));
            expect(applicationHistoryRepo.create).toHaveBeenCalledWith(historyData);
        });

        it('should throw on repo error', async () => {
            // Arrange
            applicationHistoryRepo.create.mockResolvedValue({
                data: null, error: { message: 'Insert failed' },
            });

            // Act & Assert
            await expect(applicationHistoryService.addHistory({}))
                .rejects.toThrow('Insert failed');
        });
    });

    describe('updateHistory', () => {
        it('should update history by id', async () => {
            // Arrange
            const updateData = { notes: 'Updated notes' };
            applicationHistoryRepo.update.mockResolvedValue({
                data: { id: 1, ...updateData }, error: null,
            });

            // Act
            const result = await applicationHistoryService.updateHistory(1, updateData);

            // Assert
            expect(result).toEqual(expect.objectContaining({ notes: 'Updated notes' }));
            expect(applicationHistoryRepo.update).toHaveBeenCalledWith(1, updateData);
        });

        it('should throw on repo error', async () => {
            // Arrange
            applicationHistoryRepo.update.mockResolvedValue({
                data: null, error: { message: 'Update failed' },
            });

            // Act & Assert
            await expect(applicationHistoryService.updateHistory(1, {}))
                .rejects.toThrow('Update failed');
        });
    });

    describe('logChange', () => {
        it('should skip logging when nothing changed and eventType is not Note/Interview', async () => {
            // Arrange
            applicationHistoryRepo.create.mockResolvedValue({ data: {}, error: null });

            // Act
            const result = await applicationHistoryService.logChange(
                1, 'Status Change', 'Applied', 'Applied', null, null
            );

            // Assert
            expect(result).toBeNull();
            expect(applicationHistoryRepo.create).not.toHaveBeenCalled();
        });

        it('should log when eventType is "Note" even if status unchanged', async () => {
            // Arrange
            applicationHistoryRepo.create.mockResolvedValue({
                data: { id: 10 }, error: null,
            });

            // Act
            const result = await applicationHistoryService.logChange(
                1, 'Note', 'Applied', 'Applied', null, null, 'My note'
            );

            // Assert
            expect(applicationHistoryRepo.create).toHaveBeenCalledWith(
                expect.objectContaining({ event_type: 'Note', notes: 'My note' })
            );
        });

        it('should log when eventType is "Interview" even if status unchanged', async () => {
            // Arrange
            applicationHistoryRepo.create.mockResolvedValue({
                data: { id: 11 }, error: null,
            });

            // Act
            const result = await applicationHistoryService.logChange(
                1, 'Interview', 'Interviewing', 'Interviewing', null, null, '', '', 42
            );

            // Assert
            expect(applicationHistoryRepo.create).toHaveBeenCalledWith(
                expect.objectContaining({ event_type: 'Interview', interview_id: 42 })
            );
        });

        it('should include event_date when provided', async () => {
            // Arrange
            applicationHistoryRepo.create.mockResolvedValue({
                data: { id: 12 }, error: null,
            });
            const eventDate = '2025-03-15';

            // Act
            await applicationHistoryService.logChange(
                1, 'Status Change', 'Applied', 'Interviewing', null, null, '', '', null, eventDate
            );

            // Assert
            expect(applicationHistoryRepo.create).toHaveBeenCalledWith(
                expect.objectContaining({ event_date: eventDate })
            );
        });

        it('should omit event_date when null', async () => {
            // Arrange
            applicationHistoryRepo.create.mockResolvedValue({
                data: { id: 13 }, error: null,
            });

            // Act
            await applicationHistoryService.logChange(
                1, 'Status Change', 'Applied', 'Interviewing', null, null, '', '', null, null
            );

            // Assert
            const createArg = applicationHistoryRepo.create.mock.calls[0][0];
            expect(createArg).not.toHaveProperty('event_date');
        });
    });
});
