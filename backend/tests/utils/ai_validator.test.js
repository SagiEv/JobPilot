'use strict';

jest.mock('axios');
const axios = require('axios');
const { validateAiToken, STRUCTURAL_RULES } = require('../../utils/ai_validator');

describe('ai_validator', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('STRUCTURAL_RULES', () => {
        it('should have regex rules for groq, openai, claude, gemini', () => {
            // Assert
            expect(STRUCTURAL_RULES.groq).toBeInstanceOf(RegExp);
            expect(STRUCTURAL_RULES.openai).toBeInstanceOf(RegExp);
            expect(STRUCTURAL_RULES.claude).toBeInstanceOf(RegExp);
            expect(STRUCTURAL_RULES.gemini).toBeInstanceOf(RegExp);
        });
    });

    describe('validateAiToken', () => {
        it('should return invalid for empty token', async () => {
            // Arrange / Act
            const result = await validateAiToken('groq', '');

            // Assert
            expect(result.valid).toBe(false);
            expect(result.error).toBe('Token is empty');
        });

        it('should return invalid for null token', async () => {
            // Arrange / Act
            const result = await validateAiToken('groq', null);

            // Assert
            expect(result.valid).toBe(false);
        });

        it('should return invalid when groq token fails structural regex', async () => {
            // Arrange
            const badToken = 'not-a-groq-token';

            // Act
            const result = await validateAiToken('groq', badToken);

            // Assert
            expect(result.valid).toBe(false);
            expect(result.error).toContain('groq');
        });

        it('should return invalid when openai token fails structural regex', async () => {
            // Arrange / Act
            const result = await validateAiToken('openai', 'bad-token');

            // Assert
            expect(result.valid).toBe(false);
            expect(result.error).toContain('openai');
        });

        it('should return valid when groq API call succeeds', async () => {
            // Arrange
            const token = 'gsk_' + 'a'.repeat(50);
            axios.get.mockResolvedValue({ data: { models: [] } });

            // Act
            const result = await validateAiToken('groq', token);

            // Assert
            expect(result.valid).toBe(true);
            expect(axios.get).toHaveBeenCalledWith(
                'https://api.groq.com/openai/v1/models',
                expect.objectContaining({
                    headers: { Authorization: `Bearer ${token}` },
                })
            );
        });

        it('should return valid when openai API call succeeds', async () => {
            // Arrange
            const token = 'sk-' + 'b'.repeat(50);
            axios.get.mockResolvedValue({ data: {} });

            // Act
            const result = await validateAiToken('openai', token);

            // Assert
            expect(result.valid).toBe(true);
        });

        it('should return valid when gemini API call succeeds', async () => {
            // Arrange
            const token = 'AIza' + 'c'.repeat(50);
            axios.get.mockResolvedValue({ data: {} });

            // Act
            const result = await validateAiToken('gemini', token);

            // Assert
            expect(result.valid).toBe(true);
        });

        it('should return invalid on 401 response', async () => {
            // Arrange
            const token = 'gsk_' + 'a'.repeat(50);
            axios.get.mockRejectedValue({ response: { status: 401 } });

            // Act
            const result = await validateAiToken('groq', token);

            // Assert
            expect(result.valid).toBe(false);
            expect(result.error).toContain('rejected');
        });

        it('should return invalid on 403 response', async () => {
            // Arrange
            const token = 'gsk_' + 'a'.repeat(50);
            axios.get.mockRejectedValue({ response: { status: 403 } });

            // Act
            const result = await validateAiToken('groq', token);

            // Assert
            expect(result.valid).toBe(false);
        });

        it('should return invalid with message on network timeout', async () => {
            // Arrange
            const token = 'gsk_' + 'a'.repeat(50);
            axios.get.mockRejectedValue(new Error('timeout of 5000ms exceeded'));

            // Act
            const result = await validateAiToken('groq', token);

            // Assert
            expect(result.valid).toBe(false);
            expect(result.error).toContain('timeout');
        });

        it('should return invalid for unknown provider', async () => {
            // Arrange / Act
            const result = await validateAiToken('unknown-provider', 'some-token');

            // Assert
            expect(result.valid).toBe(false);
            expect(result.error).toBe('Unknown provider');
        });

        it('should handle claude 401 as invalid', async () => {
            // Arrange
            const token = 'sk-ant-' + 'd'.repeat(50);
            const err = new Error('Unauthorized');
            err.response = { status: 401 };
            axios.get.mockRejectedValue(err);

            // Act
            const result = await validateAiToken('claude', token);

            // Assert
            expect(result.valid).toBe(false);
        });

        it('should treat claude non-401 error as valid (API quirk)', async () => {
            // Arrange
            const token = 'sk-ant-' + 'd'.repeat(50);
            const err = new Error('Bad Request');
            err.response = { status: 400 };
            // The claude catch block only throws on 401
            axios.get.mockImplementation(() => Promise.reject(err));

            // Act
            const result = await validateAiToken('claude', token);

            // Assert
            expect(result.valid).toBe(true);
        });
    });
});
