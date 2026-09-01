'use strict';

const { encrypt, decrypt } = require('../../utils/encryption');

describe('encryption utility', () => {
    it('should round-trip encrypt and decrypt correctly', () => {
        // Arrange
        const plaintext = 'gsk_super_secret_api_key_12345';

        // Act
        const ciphertext = encrypt(plaintext);
        const decrypted = decrypt(ciphertext);

        // Assert
        expect(decrypted).toBe(plaintext);
    });

    it('should return null when encrypting null', () => {
        // Arrange / Act
        const result = encrypt(null);

        // Assert
        expect(result).toBeNull();
    });

    it('should return null when encrypting empty string (falsy)', () => {
        // Arrange / Act
        const result = encrypt('');

        // Assert
        expect(result).toBeNull();
    });

    it('should return null when decrypting null', () => {
        // Arrange / Act
        const result = decrypt(null);

        // Assert
        expect(result).toBeNull();
    });

    it('should produce ciphertext containing IV and encrypted data separated by ":"', () => {
        // Arrange
        const plaintext = 'test-value';

        // Act
        const ciphertext = encrypt(plaintext);

        // Assert
        const parts = ciphertext.split(':');
        expect(parts.length).toBe(2);
        expect(parts[0]).toHaveLength(32); // 16 bytes hex = 32 chars
        expect(parts[1].length).toBeGreaterThan(0);
    });

    it('should produce different ciphertexts for same plaintext (random IV)', () => {
        // Arrange
        const plaintext = 'same-text-different-result';

        // Act
        const ciphertext1 = encrypt(plaintext);
        const ciphertext2 = encrypt(plaintext);

        // Assert
        expect(ciphertext1).not.toBe(ciphertext2);
        // Both should still decrypt to the same value
        expect(decrypt(ciphertext1)).toBe(plaintext);
        expect(decrypt(ciphertext2)).toBe(plaintext);
    });
});
