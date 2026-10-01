require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY);

async function check() {
    const { data: apps, error: appError } = await supabase
        .from('applications')
        .select('*')
        .ilike('company', '%ergo%');
        
    console.log("Align Applications:", apps);
    if (appError) console.error(appError);
    
    if (apps && apps.length > 0) {
        for (const app of apps) {
            const { data: history, error: historyError } = await supabase
                .from('application_history')
                .select('*')
                .eq('application_id', app.id)
                .order('event_date', { ascending: true });
            console.log(`History for app ${app.id}:`, history);
            if (historyError) console.error("History Error:", historyError);
        }
    }
}

check();
