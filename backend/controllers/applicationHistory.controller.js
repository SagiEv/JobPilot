const applicationHistoryService = require('../services/applicationHistory.service');

const getHistory = async (req, res) => {
    const { id } = req.params;
    const data = await applicationHistoryService.getHistoryByApplicationId(id, req.supabase);
    res.json(data);
};

const addNote = async (req, res) => {
    const { id } = req.params;
    const { notes, with_who } = req.body;
    
    const data = await applicationHistoryService.addHistory({
        application_id: id,
        event_type: 'Note',
        notes,
        with_who
    }, req.supabase);
    
    res.json(data);
};

module.exports = { getHistory, addNote };
