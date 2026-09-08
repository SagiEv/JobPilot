'use strict';

jest.mock('../../repositories/settings.repository');
jest.mock('../../utils/encryption');
jest.mock('../../utils/ai_validator');

const settingsRepository = require('../../repositories/settings.repository');
const { encrypt, decrypt } = require('../../utils/encryption');
const { validateAiToken } = require('../../utils/ai_validator');
const settingsService = require('../../services/settings.service');
const { buildSettings } = require('../helpers/factories');

describe('settings.service', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        encrypt.mockImplementation((text) => `encrypted:${text}`);
        decrypt.mockImplementation((text) => text.replace('encrypted:', ''));
    });

    describe('getSettings', () => {
        it('should return masked tokens (first 6 chars + mask)', async () => {
            // Arrange
            settingsRepository.findSettings.mockResolvedValue({
                data: buildSettings({ groq_token_encrypted: 'encrypted:gsk_abc123xyz' }),
                error: null,
            });

            // Act
            const result = await settingsService.getSettings('user-123', 'token');

            // Assert
            expect(result.groq_token_set).toBe(true);
            expect(result.groq_token_preview).toMatch(/^gsk_ab/);
            expect(result.groq_token_preview).toContain('••');
        });

        it('should return null previews when no token set', async () => {
            // Arrange
            settingsRepository.findSettings.mockResolvedValue({
                data: buildSettings(), error: null,
            });

            // Act
            const result = await settingsService.getSettings('user-123', 'token');

            // Assert
            expect(result.groq_token_set).toBe(false);
            expect(result.groq_token_preview).toBeNull();
            expect(result.openai_token_set).toBe(false);
        });

        it('should fall back to plain groq_token when no encrypted version', async () => {
            // Arrange
            settingsRepository.findSettings.mockResolvedValue({
                data: buildSettings({ groq_token: 'gsk_plain_key_12345678' }),
                error: null,
            });

            // Act
            const result = await settingsService.getSettings('user-123', 'token');

            // Assert
            expect(result.groq_token_set).toBe(true);
        });

        it('should return SMTP fields and defaults', async () => {
            // Arrange
            settingsRepository.findSettings.mockResolvedValue({
                data: buildSettings({ smtp_email: 'mail@me.com', smtp_enabled: true }),
                error: null,
            });

            // Act
            const result = await settingsService.getSettings('user-123', 'token');

            // Assert
            expect(result.smtp_email).toBe('mail@me.com');
            expect(result.smtp_enabled).toBe(true);
            expect(result.smtp_port).toBe(993);
        });

        it('should return empty object when no settings found (PGRST116)', async () => {
            // Arrange
            settingsRepository.findSettings.mockResolvedValue({
                data: null, error: { code: 'PGRST116', message: 'Not found' },
            });

            // Act
            const result = await settingsService.getSettings('user-123', 'token');

            // Assert
            expect(result.groq_token_set).toBe(false);
            expect(result.timezone).toBe('Asia/Jerusalem');
        });
    });

    describe('saveSettings', () => {
        it('should encrypt new AI tokens after validation', async () => {
            // Arrange
            validateAiToken.mockResolvedValue({ valid: true });
            settingsRepository.upsertSettings.mockResolvedValue({
                data: buildSettings({ groq_token_encrypted: 'encrypted:newkey' }),
                error: null,
            });

            // Act
            const result = await settingsService.saveSettings('user-123', {
                groq_token: 'gsk_newkey',
            }, 'token');

            // Assert
            expect(validateAiToken).toHaveBeenCalledWith('groq', 'gsk_newkey');
            expect(encrypt).toHaveBeenCalledWith('gsk_newkey');
            expect(result.groq_token_set).toBe(true);
        });

        it('should throw when AI token validation fails', async () => {
            // Arrange
            validateAiToken.mockResolvedValue({ valid: false, error: 'Bad token' });

            // Act & Assert
            await expect(
                settingsService.saveSettings('user-123', { groq_token: 'bad' }, 'token')
            ).rejects.toThrow('Bad token');
        });

        it('should clear token when empty string provided', async () => {
            // Arrange
            settingsRepository.upsertSettings.mockResolvedValue({
                data: buildSettings(), error: null,
            });

            // Act
            await settingsService.saveSettings('user-123', { groq_token: '' }, 'token');

            // Assert
            expect(settingsRepository.upsertSettings).toHaveBeenCalledWith(
                'user-123',
                expect.objectContaining({ groq_token_encrypted: null }),
                'token'
            );
        });

        it('should encrypt SMTP password', async () => {
            // Arrange
            settingsRepository.upsertSettings.mockResolvedValue({
                data: buildSettings({ smtp_password_encrypted: 'encrypted:secret' }),
                error: null,
            });

            // Act
            await settingsService.saveSettings('user-123', { smtp_password: 'secret' }, 'token');

            // Assert
            expect(encrypt).toHaveBeenCalledWith('secret');
        });

        it('should save ai_routing and timezone', async () => {
            // Arrange
            settingsRepository.upsertSettings.mockResolvedValue({
                data: buildSettings({ ai_routing: { cvTailoring: { provider: 'openai' } }, timezone: 'UTC' }),
                error: null,
            });

            // Act
            await settingsService.saveSettings('user-123', {
                ai_routing: { cvTailoring: { provider: 'openai' } },
                timezone: 'UTC',
            }, 'token');

            // Assert
            expect(settingsRepository.upsertSettings).toHaveBeenCalledWith(
                'user-123',
                expect.objectContaining({ ai_routing: expect.any(Object), timezone: 'UTC' }),
                'token'
            );
        });
    });

    describe('getAllAiConfigs', () => {
        it('should return decrypted tokens (internal use)', async () => {
            // Arrange
            settingsRepository.findSettings.mockResolvedValue({
                data: buildSettings({
                    groq_token_encrypted: 'encrypted:gsk_key',
                    openai_token_encrypted: 'encrypted:sk_key',
                }),
                error: null,
            });

            // Act
            const result = await settingsService.getAllAiConfigs('user-123', 'token');

            // Assert
            expect(result.groq_token).toBe('gsk_key');
            expect(result.openai_token).toBe('sk_key');
        });

        it('should return null on repo error', async () => {
            // Arrange
            settingsRepository.findSettings.mockResolvedValue({
                data: null, error: { message: 'DB error' },
            });

            // Act
            const result = await settingsService.getAllAiConfigs('user-123');

            // Assert
            expect(result).toBeNull();
        });
    });
});
