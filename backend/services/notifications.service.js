const notificationsRepo = require('../repositories/notifications.repository');
const applicationRepo = require('../repositories/applications.repository');
const applicationHistoryRepo = require('../repositories/applicationHistory.repository');
const applicationHistoryService = require('./applicationHistory.service');
const applicationsService = require('./applications.service');
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

const revertNotification = async (userId, notificationId, supabaseClient) => {
    const { data: notif, error: notifErr } = await notificationsRepo.findById(userId, notificationId, supabaseClient);
    if (notifErr || !notif) throw new AppError('Notification not found', 404);

    const isReverted = notif.reverted || notif.metadata?.reverted || notif.title?.startsWith('[Reverted]');
    if (isReverted) {
        throw new AppError('Notification has already been reverted', 400);
    }
    if (!notif.application_id) {
        throw new AppError('Notification is not associated with an application', 400);
    }

    const appId = notif.application_id;
    const { data: app, error: appErr } = await applicationRepo.findById(userId, appId, supabaseClient);
    if (appErr || !app) throw new AppError('Application not found', 404);

    // Fetch history for this application
    const history = await applicationHistoryService.getHistoryByApplicationId(appId, supabaseClient);

    // Determine target previous status
    let previousStatus = notif.metadata?.previous_status;
    let autoEvent = null;

    if (history && history.length > 0) {
        autoEvent = history.find(h =>
            h.notes?.includes('Status auto-updated based on email') ||
            (h.new_status && notif.body?.includes(`"${h.new_status}"`))
        );
        if (!previousStatus && autoEvent) {
            previousStatus = autoEvent.old_status;
        }
    }

    if (!previousStatus) {
        previousStatus = 'Applied';
    }

    // Determine target previous date
    let previousDate = notif.metadata?.previous_date;
    if (!previousDate && history && history.length > 0) {
        const remaining = history.filter(h => h.id !== autoEvent?.id);
        if (remaining.length > 0) {
            const sortedRemaining = [...remaining].sort((a, b) => {
                const dateA = new Date(a.event_date || a.created_at || 0).toISOString().split('T')[0];
                const dateB = new Date(b.event_date || b.created_at || 0).toISOString().split('T')[0];
                if (dateB !== dateA) return dateB.localeCompare(dateA);
                return b.id - a.id;
            });
            if (sortedRemaining[0]?.event_date) {
                previousDate = new Date(sortedRemaining[0].event_date).toISOString().split('T')[0];
            }
        }
    }
    if (!previousDate) {
        previousDate = app.date ? new Date(app.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
    }

    const currentStatus = app.status;

    // Remove the auto-updated history event so it does not appear in the Activity Log
    if (autoEvent) {
        await applicationHistoryRepo.remove(autoEvent.id, supabaseClient);
    }

    // Update application record back to previous status and previous date
    const updatePayload = {
        status: previousStatus,
        date: previousDate
    };
    if (previousStatus.toLowerCase() !== 'rejected') {
        updatePayload.rejection_reason = null;
        updatePayload.automatic_rejection = false;
    }
    await applicationRepo.update(userId, appId, updatePayload, supabaseClient);

    // Mark notification as reverted
    const newMetadata = {
        ...(notif.metadata || {}),
        previous_status: previousStatus,
        previous_date: previousDate,
        original_status_before_revert: currentStatus,
        reverted: true,
        reverted_at: new Date().toISOString()
    };

    let updatedNotifRes = await notificationsRepo.update(userId, notificationId, {
        reverted: true,
        metadata: newMetadata,
        read: true
    }, supabaseClient);

    if (updatedNotifRes.error && (updatedNotifRes.error.message?.includes('column') || updatedNotifRes.error.code === '42703')) {
        await notificationsRepo.update(userId, notificationId, {
            read: true,
            title: notif.title.startsWith('[Reverted]') ? notif.title : `[Reverted] ${notif.title}`
        }, supabaseClient);
    }

    return {
        success: true,
        previousStatus,
        originalStatus: currentStatus,
        applicationId: appId,
        notificationId
    };
};

const unrevertNotification = async (userId, notificationId, supabaseClient) => {
    const { data: notif, error: notifErr } = await notificationsRepo.findById(userId, notificationId, supabaseClient);
    if (notifErr || !notif) throw new AppError('Notification not found', 404);

    const isReverted = notif.reverted || notif.metadata?.reverted || notif.title?.startsWith('[Reverted]');
    if (!isReverted) {
        throw new AppError('Notification is not in a reverted state', 400);
    }
    if (!notif.application_id) {
        throw new AppError('Notification is not associated with an application', 400);
    }

    const appId = notif.application_id;
    const { data: app, error: appErr } = await applicationRepo.findById(userId, appId, supabaseClient);
    if (appErr || !app) throw new AppError('Application not found', 404);

    const restoreStatus = notif.metadata?.original_status_before_revert ||
        notif.metadata?.new_status ||
        (notif.body?.match(/Status updated to "([^"]+)"/)?.[1]) ||
        'Rejected';

    const restoreDate = notif.metadata?.event_date || new Date().toISOString().split('T')[0];

    await applicationsService.updateApplication(userId, appId, {
        status: restoreStatus,
        event_date: restoreDate,
        notes: `Restored auto-detected status "${restoreStatus}" after undoing False Alarm.`
    }, supabaseClient);

    const newMetadata = {
        ...(notif.metadata || {}),
        reverted: false,
        unreverted_at: new Date().toISOString()
    };

    let updateRes = await notificationsRepo.update(userId, notificationId, {
        reverted: false,
        metadata: newMetadata
    }, supabaseClient);

    if (updateRes.error && (updateRes.error.message?.includes('column') || updateRes.error.code === '42703')) {
        const cleanTitle = notif.title.replace(/^\[Reverted\]\s*/, '');
        await notificationsRepo.update(userId, notificationId, {
            title: cleanTitle
        }, supabaseClient);
    }

    return {
        success: true,
        restoredStatus: restoreStatus,
        applicationId: appId,
        notificationId
    };
};

module.exports = {
    getNotifications,
    getUnreadCount,
    markAsRead,
    markAllAsRead,
    revertNotification,
    unrevertNotification
};
