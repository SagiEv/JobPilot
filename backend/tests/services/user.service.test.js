'use strict';

jest.mock('../../repositories/user.repository.js');
const userRepository = require('../../repositories/user.repository.js');
const userService = require('../../services/user.service');

describe('user.service', () => {
    beforeEach(() => jest.clearAllMocks());

    describe('registerUser', () => {
        it('should return data on success', async () => {
            // Arrange
            const data = { user: { id: '1' }, session: {} };
            userRepository.signUp.mockResolvedValue({ data, error: null });

            // Act
            const result = await userService.registerUser('a@b.com', 'password');

            // Assert
            expect(result).toEqual(data);
            expect(userRepository.signUp).toHaveBeenCalledWith('a@b.com', 'password');
        });

        it('should throw on error', async () => {
            userRepository.signUp.mockResolvedValue({ data: null, error: { message: 'Email taken' } });
            await expect(userService.registerUser('a@b.com', 'p')).rejects.toThrow('Email taken');
        });
    });

    describe('loginUser', () => {
        it('should return { access_token, refresh_token, user }', async () => {
            // Arrange
            const data = {
                user: { id: '1', email: 'a@b.com' },
                session: { access_token: 'at', refresh_token: 'rt' },
            };
            userRepository.signIn.mockResolvedValue({ data, error: null });

            // Act
            const result = await userService.loginUser('a@b.com', 'password');

            // Assert
            expect(result).toEqual({
                access_token: 'at',
                refresh_token: 'rt',
                user: data.user,
            });
        });

        it('should throw on error', async () => {
            userRepository.signIn.mockResolvedValue({ data: null, error: { message: 'Bad creds' } });
            await expect(userService.loginUser('a@b.com', 'wrong')).rejects.toThrow('Bad creds');
        });
    });

    describe('refreshUserSession', () => {
        it('should return session', async () => {
            // Arrange
            const session = { access_token: 'new-at', refresh_token: 'new-rt' };
            userRepository.refresh.mockResolvedValue({ data: { session }, error: null });

            // Act
            const result = await userService.refreshUserSession('rt-old');

            // Assert
            expect(result).toEqual(session);
        });

        it('should throw on error', async () => {
            userRepository.refresh.mockResolvedValue({ data: null, error: { message: 'Expired' } });
            await expect(userService.refreshUserSession('rt')).rejects.toThrow('Expired');
        });
    });
});
