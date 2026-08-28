require('dotenv').config({ path: '../.env' });
const { createClient } = require('@supabase/supabase-js');
const { getEmbedding } = require('../services/embedding.service');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY);

async function backfill() {
    console.log('Starting embedding backfill...');

    // 1. Backfill Projects
    const { data: projects, error: pErr } = await supabase.from('projects').select('*').is('embedding', null);
    if (pErr) {
        console.error('Error fetching projects:', pErr);
    } else {
        console.log(`Found ${projects.length} projects needing embeddings.`);
        for (const p of projects) {
            const textToEmbed = `${p.title || ''} ${p.description || ''} ${p.tech_stack || ''}`;
            const embedding = await getEmbedding(textToEmbed);
            if (embedding) {
                await supabase.from('projects').update({ embedding }).eq('id', p.id);
                console.log(`Updated project: ${p.title}`);
            }
        }
    }

    // 2. Backfill Skills
    const { data: skills, error: sErr } = await supabase.from('skills').select('*').is('embedding', null);
    if (sErr) {
        console.error('Error fetching skills:', sErr);
    } else {
        console.log(`Found ${skills.length} skills needing embeddings.`);
        for (const s of skills) {
            const textToEmbed = `${s.name || ''} ${s.category || ''} ${s.level || ''}`;
            const embedding = await getEmbedding(textToEmbed);
            if (embedding) {
                await supabase.from('skills').update({ embedding }).eq('id', s.id);
                console.log(`Updated skill: ${s.name}`);
            }
        }
    }

    console.log('Backfill complete!');
}

backfill();
