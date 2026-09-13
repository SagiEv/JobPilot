const supabase = require('../supabaseClient');

const getRolesBank = async (req, res) => {
    try {
        const { data, error } = await req.supabase
            .from('roles_dictionary')
            .select('*')
            .order('name');
            
        if (error) throw new Error(error.message);
        
        res.json(data);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

module.exports = {
    getRolesBank
};
