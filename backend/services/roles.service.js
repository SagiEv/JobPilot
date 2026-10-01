const rolesRepository = require('../repositories/roles.repository');
const AppError = require('../utils/AppError');

const getRolesBank = async (supabaseClient) => {
    const { data, error } = await rolesRepository.findAll(supabaseClient);
    if (error) throw new AppError(error.message, error.status || 400, error.code);
    return data;
};

module.exports = { getRolesBank };
