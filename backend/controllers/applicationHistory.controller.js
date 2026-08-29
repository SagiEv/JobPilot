const applicationHistoryService = require('../services/applicationHistory.service');

const getHistory = async (req, res) => {
    try {
        const { id } = req.params;
        const data = await applicationHistoryService.getHistoryByApplicationId(id);
        res.json(data);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

const addNote = async (req, res) => {
    try {
        const { id } = req.params;
        const { notes, with_who } = req.body;
        
        const data = await applicationHistoryService.addHistory({
            application_id: id,
            event_type: 'Note',
            notes,
            with_who
        });
        
        res.json(data);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

module.exports = {
    getHistory,
    addNote
};
