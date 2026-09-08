'use strict';

jest.mock('../../services/user.service.js');
const userService = require('../../services/user.service.js');
const controller = require('../../controllers/user.controller');
const { buildReqRes } = require('../helpers/factories');

describe('user.controller', () => {
    beforeEach(() => jest.clearAllMocks());

    describe('signup', () => {
        it('should return 201 on success', async () => {
            const { req, res } = buildReqRes({ body: { email: 'a@b.com', password: 'pass' } });
            userService.registerUser.mockResolvedValue({ user: { id: '1' } });
            await controller.signup(req, res);
            expect(res.status).toHaveBeenCalledWith(201);
            expect(res.json).toHaveBeenCalledWith({ user: { id: '1' } });
        });

        it('should return 400 on error', async () => {
            const { req, res } = buildReqRes({ body: {} });
            userService.registerUser.mockRejectedValue(new Error('Email taken'));
            await controller.signup(req, res);
            expect(res.status).toHaveBeenCalledWith(400);
        });
    });

    describe('login', () => {
        it('should return 200 on success', async () => {
            const { req, res } = buildReqRes({ body: { email: 'a@b.com', password: 'pass' } });
            userService.loginUser.mockResolvedValue({ access_token: 'at' });
            await controller.login(req, res);
            expect(res.status).toHaveBeenCalledWith(200);
        });

        it('should return 401 on error', async () => {
            const { req, res } = buildReqRes({ body: {} });
            userService.loginUser.mockRejectedValue(new Error('Bad creds'));
            await controller.login(req, res);
            expect(res.status).toHaveBeenCalledWith(401);
        });
    });

    describe('refreshToken', () => {
        it('should return 200 on success', async () => {
            const { req, res } = buildReqRes({ body: { refresh_token: 'rt' } });
            userService.refreshUserSession.mockResolvedValue({ access_token: 'new' });
            await controller.refreshToken(req, res);
            expect(res.status).toHaveBeenCalledWith(200);
        });

        it('should return 401 on error', async () => {
            const { req, res } = buildReqRes({ body: {} });
            userService.refreshUserSession.mockRejectedValue(new Error('Expired'));
            await controller.refreshToken(req, res);
            expect(res.status).toHaveBeenCalledWith(401);
        });
    });
});
