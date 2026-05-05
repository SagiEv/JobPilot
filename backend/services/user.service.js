const userRepository = require('../repositories/user.repository.js');

const registerUser = async (email, password) => {
    const { data, error } = await userRepository.signUp(email, password);
    if (error) throw new Error(error.message);
    return data;
};

const loginUser = async (email, password) => {
    const { data, error } = await userRepository.signIn(email, password);
    if (error) throw new Error(error.message);
    return {
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
        user: data.user,
    };
};

const refreshUserSession = async (token) => {
    const { data, error } = await userRepository.refresh(token);
    if (error) throw new Error(error.message);
    return data.session;
};

module.exports = { registerUser, loginUser, refreshUserSession };
