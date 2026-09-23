const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function test() {
    console.log("Fetching users from Supabase Auth...");
    const { data, error } = await supabase.auth.admin.listUsers();
    
    if (error) {
        console.error('Error fetching users:', error.message, error.status);
    } else {
        console.log(`Found ${data.users.length} users.`);
        data.users.forEach(user => {
            console.log(`User: ${user.email} | Confirmed At: ${user.email_confirmed_at ? user.email_confirmed_at : 'NOT CONFIRMED'} | Created At: ${user.created_at}`);
        });
    }
}

test();
