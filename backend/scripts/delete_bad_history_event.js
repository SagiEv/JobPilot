require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const { adminSupabase } = require('../supabaseClient');

async function fix() {
    console.log("Looking for bad NICE application history event from 2026...");

    // 1. Find the application ID for NICE
    const { data: apps, error: appError } = await adminSupabase
        .from('applications')
        .select('id, company')
        .eq('id', 21);

    if (appError || !apps || apps.length === 0) {
        console.error("Could not find NICE application:", appError);
        process.exit(1);
    }

    const niceApp = apps[0];
    console.log(`Found NICE application with ID: ${niceApp.id}`);

    // 2. Find the bad history event
    const { data: history, error: histError } = await adminSupabase
        .from('application_history')
        .select('*')
        .eq('application_id', niceApp.id);

    if (histError || !history) {
        console.error("Could not fetch history:", histError);
        process.exit(1);
    }

    // Find the event from 2026
    const badEvent = history.find(h => {
        const dateStr = h.event_date || h.created_at;
        return dateStr && dateStr.includes('2026-12-10'); // 10-12-2026 usually implies Dec 10
    });

    if (!badEvent) {
        console.log("Could not find a history event with date 2026-12-10. Here are the existing dates:");
        history.forEach(h => console.log(`- ID: ${h.id}, Date: ${h.event_date}, Status: ${h.new_status}`));
        process.exit(0);
    }

    console.log(`Found bad event ID: ${badEvent.id} (Status: ${badEvent.new_status}, Date: ${badEvent.event_date})`);

    // 3. Delete the bad history event
    console.log("Deleting bad event...");
    const { error: deleteError } = await adminSupabase
        .from('application_history')
        .delete()
        .eq('id', badEvent.id);

    if (deleteError) {
        console.error("Failed to delete bad event:", deleteError);
        process.exit(1);
    }
    console.log("Bad event deleted successfully!");

    // 4. Resync the application
    console.log("Resyncing NICE application status...");
    
    // Get the updated history
    const { data: updatedHistory } = await adminSupabase
        .from('application_history')
        .select('*')
        .eq('application_id', niceApp.id);

    const sortedHistory = updatedHistory
        .filter(h => h.new_status != null)
        .sort((a, b) => {
            const dateA = new Date(a.event_date || a.created_at || 0).toISOString().split('T')[0];
            const dateB = new Date(b.event_date || b.created_at || 0).toISOString().split('T')[0];
            if (dateB !== dateA) return dateB.localeCompare(dateA);
            return b.id - a.id;
        });

    if (sortedHistory.length > 0) {
        const latestEvent = sortedHistory[0];
        const trueDate = new Date(latestEvent.event_date || latestEvent.created_at).toISOString().split('T')[0];
        
        const { error: updateError } = await adminSupabase
            .from('applications')
            .update({
                status: latestEvent.new_status,
                stage: latestEvent.new_stage !== undefined ? latestEvent.new_stage : niceApp.stage,
                date: trueDate
            })
            .eq('id', niceApp.id);

        if (updateError) {
            console.error("Failed to resync application:", updateError);
        } else {
            console.log(`Successfully resynced NICE application back to Status: ${latestEvent.new_status}, Date: ${trueDate}`);
        }
    }

    console.log("Fix complete.");
    process.exit(0);
}

fix();
