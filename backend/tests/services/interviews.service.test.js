'use strict';

jest.mock('../../repositories/interviews.repository');
jest.mock('../../services/applicationHistory.service');
jest.mock('../../services/settings.service');
jest.mock('axios');

const interviewRepository = require('../../repositories/interviews.repository');
const applicationHistoryService = require('../../services/applicationHistory.service');
const settingsService = require('../../services/settings.service');
const axios = require('axios');
const interviewService = require('../../services/interviews.service');
const { buildInterview } = require('../helpers/factories');

describe('interviews.service', () => {
    beforeEach(() => jest.clearAllMocks());

    describe('getAllInterviews', () => {
        it('should return data', async () => {
            const interviews = [buildInterview()];
            interviewRepository.findAll.mockResolvedValue({ data: interviews, error: null });
            const result = await interviewService.getAllInterviews('user-123');
            expect(result).toEqual(interviews);
        });

        it('should throw on error', async () => {
            interviewRepository.findAll.mockResolvedValue({ data: null, error: { message: 'fail' } });
            await expect(interviewService.getAllInterviews('u')).rejects.toThrow('fail');
        });
    });

    describe('createInterview', () => {
        it('should log history when application_id is present', async () => {
            // Arrange
            const interview = buildInterview({ id: 10, application_id: 5, stage: 'Technical' });
            interviewRepository.create.mockResolvedValue({ data: interview, error: null });
            applicationHistoryService.logChange.mockResolvedValue({});

            // Act
            const result = await interviewService.createInterview('user-123', {});

            // Assert
            expect(result).toEqual(interview);
            expect(applicationHistoryService.logChange).toHaveBeenCalledWith(
                5, 'Interview', null, null, null, null,
                expect.stringContaining('Technical'),
                expect.any(String), 10
            );
        });

        it('should skip history logging when no application_id', async () => {
            // Arrange
            const interview = buildInterview({ id: 11, application_id: null });
            interviewRepository.create.mockResolvedValue({ data: interview, error: null });

            // Act
            await interviewService.createInterview('user-123', {});

            // Assert
            expect(applicationHistoryService.logChange).not.toHaveBeenCalled();
        });

        it('should throw on error', async () => {
            interviewRepository.create.mockResolvedValue({ data: null, error: { message: 'fail' } });
            await expect(interviewService.createInterview('u', {})).rejects.toThrow('fail');
        });
    });

    describe('updateInterview', () => {
        it('should return updated record', async () => {
            const updated = buildInterview({ stage: 'Final' });
            interviewRepository.update.mockResolvedValue({ data: updated, error: null });
            const result = await interviewService.updateInterview('user-123', 1, {});
            expect(result.stage).toBe('Final');
        });

        it('should throw on error', async () => {
            interviewRepository.update.mockResolvedValue({ data: null, error: { message: 'fail' } });
            await expect(interviewService.updateInterview('u', 1, {})).rejects.toThrow('fail');
        });
    });

    describe('deleteInterview', () => {
        it('should return success', async () => {
            interviewRepository.remove.mockResolvedValue({ error: null });
            const result = await interviewService.deleteInterview('user-123', 1);
            expect(result).toEqual({ success: true });
        });

        it('should throw on error', async () => {
            interviewRepository.remove.mockResolvedValue({ error: { message: 'fail' } });
            await expect(interviewService.deleteInterview('u', 1)).rejects.toThrow('fail');
        });
    });

    describe('getAiReports', () => {
        it('should return reports', async () => {
            const reports = [{ id: 1, keep_report: 'good' }];
            interviewRepository.getAnalysisReports.mockResolvedValue({ data: reports, error: null });
            const result = await interviewService.getAiReports('user-123');
            expect(result).toEqual(reports);
        });

        it('should throw on error', async () => {
            interviewRepository.getAnalysisReports.mockResolvedValue({ data: null, error: { message: 'fail' } });
            await expect(interviewService.getAiReports('u')).rejects.toThrow('fail');
        });
    });

    describe('generateAiReport', () => {
        it('should throw on no interview data', async () => {
            // Arrange
            interviewRepository.findAll.mockResolvedValue({ data: [], error: null });

            // Act & Assert
            await expect(interviewService.generateAiReport('user-123'))
                .rejects.toThrow('No interview data available');
        });

        it('should throw on missing AI config', async () => {
            // Arrange
            interviewRepository.findAll.mockResolvedValue({
                data: [buildInterview()], error: null,
            });
            settingsService.getAllAiConfigs.mockResolvedValue({
                ai_routing: { interviewInsights: { provider: 'groq' } },
                // groq_token is missing
            });

            // Act & Assert
            await expect(interviewService.generateAiReport('user-123'))
                .rejects.toThrow('API key');
        });

        it('should call AI service and save result', async () => {
            // Arrange
            interviewRepository.findAll.mockResolvedValue({
                data: [buildInterview()], error: null,
            });
            settingsService.getAllAiConfigs.mockResolvedValue({
                groq_token: 'gsk_test',
                ai_routing: { interviewInsights: { provider: 'groq' } },
            });
            axios.post.mockResolvedValue({
                data: {
                    report: {
                        keep_report: 'Keep doing X',
                        improve_report: 'Improve Y',
                        overall_trends: 'Trending up',
                    },
                },
            });
            interviewRepository.saveAnalysisReport.mockResolvedValue({
                data: { id: 1 }, error: null,
            });

            // Act
            const result = await interviewService.generateAiReport('user-123');

            // Assert
            expect(result).toEqual({ id: 1 });
            expect(axios.post).toHaveBeenCalled();
            expect(interviewRepository.saveAnalysisReport).toHaveBeenCalled();
        });

        it('should wrap AI service errors', async () => {
            // Arrange
            interviewRepository.findAll.mockResolvedValue({
                data: [buildInterview()], error: null,
            });
            settingsService.getAllAiConfigs.mockResolvedValue({
                groq_token: 'gsk_test',
                ai_routing: { interviewInsights: { provider: 'groq' } },
            });
            axios.post.mockRejectedValue({
                response: { data: { detail: 'Model overloaded' } },
            });

            // Act & Assert
            await expect(interviewService.generateAiReport('user-123'))
                .rejects.toThrow('AI Service error');
        });
    });
});
