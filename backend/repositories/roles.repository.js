const TABLE = 'roles_dictionary';

const findAll = async (client) => {
    return await client
        .from(TABLE)
        .select('*')
        .order('name');
};

module.exports = { findAll };
