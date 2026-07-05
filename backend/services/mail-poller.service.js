const { ImapFlow } = require('imapflow');
const { simpleParser } = require('mailparser');
const supabase = require('../supabaseClient');
const { decrypt } = require('../utils/encryption');
const { classifyEmail } = require('./email-classifier.service');
const emailLogsRepo = require('../repositories/email-logs.repository');
const applicationRepo = require('../repositories/applications.repository');
const notificationsRepo = require('../repositories/notifications.repository');

const AUTO_UPDATE_THRESHOLD = 0.7;
const MAX_BODY_SNIPPET = 3000;

/**
 * Poll all users that have SMTP enabled and are due for polling.
 */
async function pollAllUsers() {
    const { data: users, error } = await supabase
        .from('app_settings')
        .select('user_id, smtp_email, smtp_host, smtp_port, smtp_password_encrypted, smtp_last_uid, smtp_poll_interval_min')
        .eq('smtp_enabled', true)
        .not('smtp_email', 'is', null)
        .not('smtp_password_encrypted', 'is', null);

    if (error) {
        console.error('[MAIL POLLER] Failed to fetch users:', error.message);
        return;
    }

    if (!users || users.length === 0) return;

    for (const userSettings of users) {
        // Check if user is due for polling
        const { data: current } = await supabase
            .from('app_settings')
            .select('smtp_last_polled_at, smtp_poll_interval_min')
            .eq('user_id', userSettings.user_id)
            .single();

        if (current?.smtp_last_polled_at) {
            const lastPolled = new Date(current.smtp_last_polled_at);
            const intervalMs = (current.smtp_poll_interval_min || 15) * 60 * 1000;
            if (Date.now() - lastPolled.getTime() < intervalMs) {
                continue; // Not due yet
            }
        }

        try {
            await pollUserInbox(userSettings);
        } catch (err) {
            console.error(`[MAIL POLLER] Error polling user ${userSettings.user_id}:`, err.message);
        }
    }
}

/**
 * Poll a single user's IMAP inbox.
 */
async function pollUserInbox(settings) {
    const userId = settings.user_id;
    const password = decrypt(settings.smtp_password_encrypted);

    if (!password) {
        console.error(`[MAIL POLLER] Failed to decrypt password for user ${userId}`);
        return;
    }

    const client = new ImapFlow({
        host: settings.smtp_host,
        port: settings.smtp_port || 993,
        secure: true,
        auth: {
            user: settings.smtp_email,
            pass: password,
        },
        logger: false,
    });

    let newLastUid = settings.smtp_last_uid;

    try {
        await client.connect();
        const lock = await client.getMailboxLock('INBOX');

        try {
            // Determine fetch range
            let searchCriteria;
            if (settings.smtp_last_uid) {
                const startUid = parseInt(settings.smtp_last_uid) + 1;
                searchCriteria = `${startUid}:*`;
            } else {
                // First run: fetch last 30 days
                const since = new Date();
                since.setDate(since.getDate() - 30);
                searchCriteria = { since };
            }

            // Fetch user's applications for classification
            const { data: applications } = await applicationRepo.findAll(userId);
            if (!applications || applications.length === 0) {
                console.log(`[MAIL POLLER] User ${userId} has no applications, skipping classification`);
                // Still update polled timestamp
                await updatePolledTimestamp(userId, newLastUid);
                return;
            }

            // Fetch messages
            const messages = [];
            
            if (typeof searchCriteria === 'object') {
                // Date-based search for first run
                for await (const msg of client.fetch(
                    { since: searchCriteria.since },
                    { uid: true, envelope: true, source: true },
                    { uid: true }
                )) {
                    messages.push(msg);
                }
            } else {
                // UID-based search for subsequent runs
                try {
                    for await (const msg of client.fetch(searchCriteria, { uid: true, envelope: true, source: true })) {
                        if (settings.smtp_last_uid && msg.uid <= parseInt(settings.smtp_last_uid)) {
                            continue;
                        }
                        messages.push(msg);
                    }
                } catch (fetchErr) {
                    // If UID range is invalid (no new messages), that's fine
                    if (!fetchErr.message?.includes('Nothing to fetch')) {
                        throw fetchErr;
                    }
                }
            }

            console.log(`[MAIL POLLER] User ${userId}: fetched ${messages.length} new messages`);

            const logsToInsert = [];

            for (const msg of messages) {
                try {
                    const parsed = await simpleParser(msg.source);
                    const messageId = parsed.messageId || `uid-${msg.uid}`;

                    // Check if we already processed this message
                    const { data: existingEmail } = await emailLogsRepo.findByMessageId(userId, messageId);
                    if (existingEmail) {
                        console.log(`[MAIL POLLER] Skipping already processed message ${messageId}`);
                        if (msg.uid && (!newLastUid || msg.uid > parseInt(newLastUid))) {
                            newLastUid = String(msg.uid);
                        }
                        continue;
                    }

                    const fromAddress = parsed.from?.value?.[0]?.address || '';
                    const fromName = parsed.from?.value?.[0]?.name || '';
                    const from = fromName ? `${fromName} <${fromAddress}>` : fromAddress;
                    const subject = parsed.subject || '';
                    const bodyText = (parsed.text || '').substring(0, MAX_BODY_SNIPPET);
                    const receivedAt = parsed.date || new Date();

                    // Classify against user's applications
                    const result = classifyEmail(
                        { from, subject, bodySnippet: bodyText },
                        applications
                    );

                    logsToInsert.push({
                        user_id: userId,
                        application_id: result.applicationId,
                        from_address: from,
                        subject: subject.substring(0, 500),
                        body_snippet: bodyText.substring(0, 500),
                        received_at: receivedAt.toISOString(),
                        matched_company: result.matchedCompany,
                        matched_role: result.matchedRole,
                        classified_status: result.classifiedStatus,
                        confidence_score: result.confidence,
                        message_id: messageId,
                    });

                    // Auto-update application status if confidence is high enough
                    if (result.applicationId && result.confidence >= AUTO_UPDATE_THRESHOLD && result.classifiedStatus !== 'unknown') {
                        await applicationRepo.update(userId, result.applicationId, {
                            status: result.classifiedStatus,
                        });
                        console.log(`[MAIL POLLER] Auto-updated application ${result.applicationId} → ${result.classifiedStatus} (confidence: ${result.confidence.toFixed(2)})`);

                        // Create in-app notification
                        const statusLabels = {
                            interview: 'Interview Scheduled',
                            rejected: 'Application Rejected',
                            offer: 'Offer Received',
                            assessment: 'Assessment Requested',
                            follow_up: 'Follow-up Received',
                        };
                        const label = statusLabels[result.classifiedStatus] || result.classifiedStatus;
                        const company = result.matchedCompany || 'Unknown Company';
                        const role = result.matchedRole ? ` — ${result.matchedRole}` : '';

                        await notificationsRepo.insert({
                            user_id: userId,
                            type: 'email_sync',
                            title: `${label}: ${company}${role}`,
                            body: `Status updated to "${result.classifiedStatus}" based on email from ${from}. Subject: "${subject.substring(0, 100)}"`,
                            read: false,
                            application_id: result.applicationId,
                        });
                    }

                    // Track highest UID
                    if (msg.uid && (!newLastUid || msg.uid > parseInt(newLastUid))) {
                        newLastUid = String(msg.uid);
                    }
                } catch (parseErr) {
                    console.error(`[MAIL POLLER] Failed to parse message UID ${msg.uid}:`, parseErr.message);
                }
            }

            // Bulk insert logs
            if (logsToInsert.length > 0) {
                const { error: insertError } = await emailLogsRepo.bulkInsert(logsToInsert);
                if (insertError) {
                    console.error(`[MAIL POLLER] Failed to insert email logs:`, insertError.message);
                }
            }
        } finally {
            lock.release();
        }

        await client.logout();
    } catch (err) {
        console.error(`[MAIL POLLER] IMAP connection failed for user ${userId}:`, err.message);
        throw err;
    }

    // Update polling timestamp and last UID
    await updatePolledTimestamp(userId, newLastUid);
}

/**
 * Update the user's last polled timestamp and UID cursor.
 */
async function updatePolledTimestamp(userId, lastUid) {
    const updateData = { smtp_last_polled_at: new Date().toISOString() };
    if (lastUid) updateData.smtp_last_uid = lastUid;

    await supabase
        .from('app_settings')
        .update(updateData)
        .eq('user_id', userId);
}

/**
 * Test an IMAP connection with given credentials. Returns { success, error }.
 */
async function testImapConnection({ host, port, email, password }) {
    const client = new ImapFlow({
        host,
        port: port || 993,
        secure: true,
        auth: { user: email, pass: password },
        logger: false,
    });

    try {
        await client.connect();
        await client.logout();
        return { success: true };
    } catch (err) {
        return { success: false, error: err.message };
    }
}

module.exports = { pollAllUsers, pollUserInbox, testImapConnection };
