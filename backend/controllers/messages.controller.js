const messagesService = require('../services/messages.service');

exports.generateMessage = async (req, res) => {
    const result = await messagesService.generateMessage(
        req.user.id,
        req.body,
        req.file,
        req.supabase
    );
    res.json(result);
};
