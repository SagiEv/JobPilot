const userRepository = require('../repositories/user.repository.js');
const AppError = require('../utils/AppError');

const registerUser = async (email, password) => {
    const { data, error } = await userRepository.signUp(email, password);
    if (error) throw new AppError(error.message, error.status || 400, error.code);
    return data;
};

const loginUser = async (email, password) => {
    const { data, error } = await userRepository.signIn(email, password);
    if (error) throw new AppError(error.message, error.status || 401, error.code);
    return {
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
        user: data.user,
    };
};

const refreshUserSession = async (refresh_token) => {
    const { data, error } = await userRepository.refresh(refresh_token);
    if (error) throw new AppError(error.message, error.status || 401, error.code);
    return data.session;
};

module.exports = { registerUser, loginUser, refreshUserSession };
