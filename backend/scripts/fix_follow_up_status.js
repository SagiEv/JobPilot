require('dotenv').config();
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const { adminSupabase } = require('../supabaseClient');

async function migrate() {
    console.log("Starting migration to remove 'follow_up' status...");

    // Update applications table
    const { data: apps, error: appError } = await adminSupabase
        .from('applications')
        .update({ status: 'Applied' })
        .ilike('status', 'follow_up')
        .select();

    if (appError) {
        console.error("Error updating applications:", appError);
    } else {
        console.log(`Updated ${apps ? apps.length : 0} applications from 'follow_up' to 'Applied'.`);
    }

    // Update application_history table new_status
    const { data: hist, error: histError } = await adminSupabase
        .from('application_history')
        .update({ new_status: 'Applied' })
        .ilike('new_status', 'follow_up')
        .select();

    if (histError) {
        console.error("Error updating application history:", histError);
    } else {
        console.log(`Updated ${hist ? hist.length : 0} history records from 'follow_up' to 'Applied'.`);
    }
    
    // Update application_history table old_status
    const { data: histOld, error: histOldError } = await adminSupabase
        .from('application_history')
        .update({ old_status: 'Applied' })
        .ilike('old_status', 'follow_up')
        .select();

    if (histOldError) {
        console.error("Error updating application history old_status:", histOldError);
    } else {
        console.log(`Updated ${histOld ? histOld.length : 0} history records (old_status) from 'follow_up' to 'Applied'.`);
    }

    console.log("Migration complete.");
    process.exit(0);
}

migrate();
