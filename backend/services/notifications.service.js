const notificationsRepo = require('../repositories/notifications.repository');
const AppError = require('../utils/AppError');

const getNotifications = async (userId, supabaseClient) => {
    const { data, error } = await notificationsRepo.findByUser(userId, supabaseClient);
    if (error) throw new AppError(error.message, error.status || 400, error.code);
    return data || [];
};

const getUnreadCount = async (userId, supabaseClient) => {
    const { count, error } = await notificationsRepo.countUnread(userId, supabaseClient);
    if (error) throw new AppError(error.message, error.status || 400, error.code);
    return count;
};

const markAsRead = async (userId, notificationId, supabaseClient) => {
    const { error } = await notificationsRepo.markRead(userId, notificationId, supabaseClient);
    if (error) throw new AppError(error.message, error.status || 400, error.code);
    return { success: true };
};

const markAllAsRead = async (userId, supabaseClient) => {
    const { error } = await notificationsRepo.markAllRead(userId, supabaseClient);
    if (error) throw new AppError(error.message, error.status || 400, error.code);
    return { success: true };
};

module.exports = { getNotifications, getUnreadCount, markAsRead, markAllAsRead };
