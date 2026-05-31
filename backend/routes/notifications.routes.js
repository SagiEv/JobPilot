const express = require('express');
const router = express.Router();
const notificationsRepo = require('../repositories/notifications.repository');
const { authenticate } = require('../middleware/auth');

router.get('/', authenticate, async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 20;
        const { data, error } = await notificationsRepo.findByUser(req.user.id, limit);
        if (error) throw new Error(error.message);
        res.json(data || []);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

router.get('/unread-count', authenticate, async (req, res) => {
    try {
        const { count, error } = await notificationsRepo.countUnread(req.user.id);
        if (error) throw new Error(error.message);
        res.json({ count });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

router.put('/:id/read', authenticate, async (req, res) => {
    try {
        const { error } = await notificationsRepo.markRead(req.user.id, req.params.id);
        if (error) throw new Error(error.message);
        res.json({ success: true });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

router.put('/read-all', authenticate, async (req, res) => {
    try {
        const { error } = await notificationsRepo.markAllRead(req.user.id);
        if (error) throw new Error(error.message);
        res.json({ success: true });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

module.exports = router;
