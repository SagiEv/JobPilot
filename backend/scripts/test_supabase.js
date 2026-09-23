const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function test() {
    console.log("Trying to sign in with fake user to see the exact error...");
    const { data, error } = await supabase.auth.signInWithPassword({
        email: 'test_fake_user@example.com',
        password: 'password123'
    });
    
    if (error) {
        console.error('Login error:', error.message, error.status, error.name);
    } else {
        console.log('Login success');
    }
}

test();
