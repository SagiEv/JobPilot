const userService = require('../services/user.service.js');

exports.signup = async (req, res) => {
    try {
        const { email, password } = req.body;
        const result = await userService.registerUser(email, password);
        res.status(201).json(result);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};

exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;
        const result = await userService.loginUser(email, password);
        res.status(200).json(result);
    } catch (err) {
        res.status(401).json({ error: err.message });
    }
};

exports.refreshToken = async (req, res) => {
    try {
        const { refresh_token } = req.body;
        const session = await userService.refreshUserSession(refresh_token);
        res.status(200).json(session);
    } catch (err) {
        res.status(401).json({ error: err.message });
    }
};