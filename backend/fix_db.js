require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY);

async function fix() {
    const userId = '195908c1-f7c6-4964-9921-2c168f60d580';
    const appId = 237;

    console.log("1. Restoring Align application...");
    const { error: updateError } = await supabase
        .from('applications')
        .update({ status: 'Applied', date: '2026-05-27', rejection_reason: null, automatic_rejection: false })
        .eq('id', appId);
    if (updateError) console.error("Error updating application:", updateError);
    else console.log("Successfully restored Align application.");

    console.log("2. Restoring application history for Align...");
    const { error: insertError } = await supabase
        .from('application_history')
        .insert({
            application_id: appId,
            event_type: 'Application Added',
            old_status: null,
            new_status: 'Applied',
            old_stage: null,
            new_stage: null,
            notes: 'Application created (Restored manually)',
            with_who: '',
            event_date: '2026-05-27'
        });
    if (insertError) console.error("Error inserting history:", insertError);
    else console.log("Successfully restored Align application history.");

    console.log("3. Deleting false notification...");
    const { data: notifications, error: notifQueryError } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .eq('application_id', appId);
    
    if (notifQueryError) {
        console.error("Error querying notifications:", notifQueryError);
    } else if (notifications && notifications.length > 0) {
        const falseNotifs = notifications.filter(n => n.title.includes('Application Rejected'));
        console.log(`Found ${falseNotifs.length} false notifications. Deleting...`);
        for (const notif of falseNotifs) {
            const { error: delError } = await supabase
                .from('notifications')
                .delete()
                .eq('id', notif.id);
            if (delError) console.error(`Error deleting notification ${notif.id}:`, delError);
            else console.log(`Deleted notification ${notif.id}`);
        }
    } else {
        console.log("No false notifications found to delete.");
    }
}

fix();
