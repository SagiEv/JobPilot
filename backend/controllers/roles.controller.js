const rolesService = require('../services/roles.service');

const getRolesBank = async (req, res) => {
    const data = await rolesService.getRolesBank(req.supabase);
    res.json(data);
};

module.exports = { getRolesBank };
