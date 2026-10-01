const notificationsService = require('../services/notifications.service');

const getAll = async (req, res) => {
    const data = await notificationsService.getNotifications(req.user.id, req.supabase);
    res.json(data);
};

const getUnreadCount = async (req, res) => {
    const count = await notificationsService.getUnreadCount(req.user.id, req.supabase);
    res.json({ count });
};

const markRead = async (req, res) => {
    const result = await notificationsService.markAsRead(req.user.id, req.params.id, req.supabase);
    res.json(result);
};

const markAllRead = async (req, res) => {
    const result = await notificationsService.markAllAsRead(req.user.id, req.supabase);
    res.json(result);
};

module.exports = { getAll, getUnreadCount, markRead, markAllRead };
