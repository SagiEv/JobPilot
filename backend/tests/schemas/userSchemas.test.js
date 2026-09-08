'use strict';

const { signupSchema, loginSchema } = require('../../schemas/userSchemas');

describe('userSchemas', () => {
    describe('signupSchema', () => {
        it('should accept valid email, password >= 8 chars, and optional username', () => {
            // Arrange
            const input = { email: 'user@example.com', password: 'securePass1', username: 'johndoe' };

            // Act
            const result = signupSchema.parse(input);

            // Assert
            expect(result).toEqual(input);
        });

        it('should accept signup without optional username', () => {
            // Arrange
            const input = { email: 'user@example.com', password: 'securePass1' };

            // Act
            const result = signupSchema.parse(input);

            // Assert
            expect(result.email).toBe('user@example.com');
        });

        it('should reject invalid email', () => {
            // Arrange
            const input = { email: 'not-an-email', password: 'securePass1' };

            // Act & Assert
            expect(() => signupSchema.parse(input)).toThrow();
        });

        it('should reject password shorter than 8 characters', () => {
            // Arrange
            const input = { email: 'user@example.com', password: 'short' };

            // Act & Assert
            expect(() => signupSchema.parse(input)).toThrow();
        });

        it('should reject username shorter than 3 characters', () => {
            // Arrange
            const input = { email: 'user@example.com', password: 'securePass1', username: 'ab' };

            // Act & Assert
            expect(() => signupSchema.parse(input)).toThrow();
        });

        it('should reject username longer than 15 characters', () => {
            // Arrange
            const input = { email: 'user@example.com', password: 'securePass1', username: 'a'.repeat(16) };

            // Act & Assert
            expect(() => signupSchema.parse(input)).toThrow();
        });
    });

    describe('loginSchema', () => {
        it('should accept valid email and password', () => {
            // Arrange
            const input = { email: 'user@example.com', password: 'mypassword' };

            // Act
            const result = loginSchema.parse(input);

            // Assert
            expect(result).toEqual(input);
        });

        it('should reject empty password', () => {
            // Arrange
            const input = { email: 'user@example.com', password: '' };

            // Act & Assert
            expect(() => loginSchema.parse(input)).toThrow();
        });

        it('should reject invalid email', () => {
            // Arrange
            const input = { email: 'bad', password: 'password123' };

            // Act & Assert
            expect(() => loginSchema.parse(input)).toThrow();
        });
    });
});
