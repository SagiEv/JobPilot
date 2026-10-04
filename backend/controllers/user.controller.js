const userService = require('../services/user.service.js');

exports.signup = async (req, res) => {
    const { email, password } = req.body;
    const result = await userService.registerUser(email, password);
    res.status(201).json(result);
};

exports.login = async (req, res) => {
    const { email, password } = req.body;
    const result = await userService.loginUser(email, password);
    res.status(200).json(result);
};

exports.refreshToken = async (req, res) => {
    const { refresh_token } = req.body;
    const session = await userService.refreshUserSession(refresh_token);
    res.status(200).json(session);
};