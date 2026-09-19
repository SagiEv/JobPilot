require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const { adminSupabase } = require('../supabaseClient');

async function syncApplications() {
    console.log("Starting resync of applications table with application_history...");

    const { data: applications, error: appsError } = await adminSupabase
        .from('applications')
        .select('*');

    if (appsError) {
        console.error("Error fetching applications:", appsError);
        process.exit(1);
    }

    if (!applications || applications.length === 0) {
        console.log("No applications found.");
        process.exit(0);
    }

    console.log(`Found ${applications.length} applications. Fetching history...`);

    const { data: history, error: histError } = await adminSupabase
        .from('application_history')
        .select('*');

    if (histError) {
        console.error("Error fetching application history:", histError);
        process.exit(1);
    }

    let updatedCount = 0;

    for (const app of applications) {
        // Find history for this app, sorted by event_date (or created_at) descending
        const appHistory = history
            .filter(h => h.application_id === app.id && h.new_status != null)
            .sort((a, b) => {
                const dateA = new Date(a.event_date || a.created_at || 0).toISOString().split('T')[0];
                const dateB = new Date(b.event_date || b.created_at || 0).toISOString().split('T')[0];
                if (dateB !== dateA) {
                    return dateB.localeCompare(dateA);
                }
                return b.id - a.id;
            });

        if (appHistory.length > 0) {
            const latestEvent = appHistory[0];
            const trueStatus = latestEvent.new_status;
            const trueStage = latestEvent.new_stage !== undefined ? latestEvent.new_stage : app.stage;
            const trueDate = latestEvent.event_date || latestEvent.created_at;
            const trueDateOnly = new Date(trueDate).toISOString().split('T')[0];
            const appDateOnly = app.date ? new Date(app.date).toISOString().split('T')[0] : null;

            // Check if application is out of sync
            if (app.status !== trueStatus || app.stage !== trueStage || appDateOnly !== trueDateOnly) {
                console.log(`Syncing app ${app.id} (${app.company}):`);
                console.log(`  Current: Status=${app.status}, Stage=${app.stage}, Date=${appDateOnly}`);
                console.log(`  History: Status=${trueStatus}, Stage=${trueStage}, Date=${trueDateOnly}`);
                
                const { error: updateError } = await adminSupabase
                    .from('applications')
                    .update({
                        status: trueStatus,
                        stage: trueStage,
                        date: trueDateOnly
                    })
                    .eq('id', app.id);

                if (updateError) {
                    console.error(`  [!] Failed to update app ${app.id}:`, updateError);
                } else {
                    console.log(`  [*] Successfully resynced app ${app.id}.`);
                    updatedCount++;
                }
            }
        }
    }

    console.log(`\nResync complete. Fixed ${updatedCount} applications.`);
    process.exit(0);
}

syncApplications();
