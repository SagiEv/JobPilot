require('dotenv').config({ path: '../.env' });
const { createClient } = require('@supabase/supabase-js');
const fitAnalysisService = require('../services/fitAnalysis.service');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment variables.");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function backfillFitScores() {
    console.log("Starting backfill of deterministic fit scores...");

    // Fetch all applications that have job info but no deterministic score
    const { data: applications, error: appsError } = await supabase
        .from('applications')
        .select('id, user_id, info')
        .not('info', 'is', null)
        .is('fit_score_deterministic', null);

    if (appsError) {
        console.error("Error fetching applications:", appsError.message);
        return;
    }

    if (!applications || applications.length === 0) {
        console.log("No applications need backfilling.");
        return;
    }

    console.log(`Found ${applications.length} applications to process.`);

    let successCount = 0;
    let errorCount = 0;

    for (const app of applications) {
        try {
            // Fetch candidate data
            const [profileRes, skillsRes, experiencesRes] = await Promise.all([
                supabase.from('profile').select('*').eq('user_id', app.user_id).single(),
                supabase.from('skills').select('*').eq('user_id', app.user_id),
                supabase.from('user_experiences').select('*').eq('user_id', app.user_id)
            ]);

            const candidateData = {
                profile: profileRes.data || null,
                skills: skillsRes.data || [],
                experiences: experiencesRes.data || []
            };

            const scoreData = fitAnalysisService.calculateDeterministicFit(candidateData, app.info);
            
            const { error: updateError } = await supabase
                .from('applications')
                .update({ fit_score_deterministic: scoreData.score })
                .eq('id', app.id);

            if (updateError) {
                console.error(`Failed to update application ${app.id}:`, updateError.message);
                errorCount++;
            } else {
                successCount++;
                console.log(`Successfully updated application ${app.id} (Score: ${scoreData.score})`);
            }
        } catch (err) {
            console.error(`Error processing application ${app.id}:`, err.message);
            errorCount++;
        }
    }

    console.log("Backfill completed.");
    console.log(`Successfully updated: ${successCount}`);
    console.log(`Failed: ${errorCount}`);
}

backfillFitScores().catch(console.error);
