'use strict';

jest.mock('../../services/settings.service');
jest.mock('../../services/mail-poller.service');
jest.mock('../../utils/encryption');
jest.mock('../../utils/ai_validator');
jest.mock('../../repositories/settings.repository');
jest.mock('../../repositories/email-logs.repository');

const settingsService = require('../../services/settings.service');
const { testImapConnection } = require('../../services/mail-poller.service');
const { decrypt } = require('../../utils/encryption');
const { validateAiToken } = require('../../utils/ai_validator');
const settingsRepository = require('../../repositories/settings.repository');
const emailLogsRepo = require('../../repositories/email-logs.repository');
const controller = require('../../controllers/settings.controller');
const { buildReqRes } = require('../helpers/factories');

describe('settings.controller', () => {
    beforeEach(() => jest.clearAllMocks());

    describe('getSettings', () => {
        it('should return data', async () => {
            const { req, res } = buildReqRes();
            settingsService.getSettings.mockResolvedValue({ timezone: 'UTC' });
            await controller.getSettings(req, res);
            expect(res.json).toHaveBeenCalledWith({ timezone: 'UTC' });
        });

        it('should return 400 on error', async () => {
            const { req, res } = buildReqRes();
            settingsService.getSettings.mockRejectedValue(new Error('fail'));
            await controller.getSettings(req, res);
            expect(res.status).toHaveBeenCalledWith(400);
        });
    });

    describe('putSettings', () => {
        it('should return data', async () => {
            const { req, res } = buildReqRes({ body: { timezone: 'UTC' } });
            settingsService.saveSettings.mockResolvedValue({ timezone: 'UTC' });
            await controller.putSettings(req, res);
            expect(res.json).toHaveBeenCalledWith({ timezone: 'UTC' });
        });
    });

    describe('testSmtpConnection', () => {
        it('should return 400 when no password provided and none saved', async () => {
            const { req, res } = buildReqRes({ body: { smtp_email: 'a@b.com', smtp_host: 'imap.gmail.com' } });
            settingsRepository.findSettings.mockResolvedValue({ data: {} });
            await controller.testSmtpConnection(req, res);
            expect(res.status).toHaveBeenCalledWith(400);
        });

        it('should return 400 when missing required fields', async () => {
            const { req, res } = buildReqRes({ body: {} });
            settingsRepository.findSettings.mockResolvedValue({
                data: { smtp_password_encrypted: 'enc' },
            });
            decrypt.mockReturnValue('secret');
            await controller.testSmtpConnection(req, res);
            expect(res.status).toHaveBeenCalledWith(400);
        });

        it('should return success on valid IMAP connection', async () => {
            const { req, res } = buildReqRes({
                body: { smtp_email: 'a@b.com', smtp_host: 'imap.gmail.com', smtp_port: 993, smtp_password: 'pass' },
            });
            testImapConnection.mockResolvedValue({ success: true });
            await controller.testSmtpConnection(req, res);
            expect(res.json).toHaveBeenCalledWith({ success: true });
        });
    });

    describe('getEmailLogs', () => {
        it('should return data', async () => {
            const { req, res } = buildReqRes({ query: { limit: '10' } });
            emailLogsRepo.findByUser.mockResolvedValue({ data: [{ id: 1 }], error: null });
            await controller.getEmailLogs(req, res);
            expect(res.json).toHaveBeenCalledWith([{ id: 1 }]);
        });
    });

    describe('testAiToken', () => {
        it('should return 400 when no provider', async () => {
            const { req, res } = buildReqRes({ body: {} });
            await controller.testAiToken(req, res);
            expect(res.status).toHaveBeenCalledWith(400);
        });

        it('should return success when token is valid', async () => {
            const { req, res } = buildReqRes({ body: { provider: 'groq' } });
            settingsRepository.findSettings.mockResolvedValue({
                data: { groq_token_encrypted: 'enc' },
            });
            decrypt.mockReturnValue('gsk_test');
            validateAiToken.mockResolvedValue({ valid: true });
            await controller.testAiToken(req, res);
            expect(res.json).toHaveBeenCalledWith({ success: true });
        });

        it('should return failure when token is invalid', async () => {
            const { req, res } = buildReqRes({ body: { provider: 'groq' } });
            settingsRepository.findSettings.mockResolvedValue({
                data: { groq_token_encrypted: 'enc' },
            });
            decrypt.mockReturnValue('bad');
            validateAiToken.mockResolvedValue({ valid: false, error: 'Rejected' });
            await controller.testAiToken(req, res);
            expect(res.json).toHaveBeenCalledWith({ success: false, error: 'Rejected' });
        });
    });
});
