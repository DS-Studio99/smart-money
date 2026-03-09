import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing supabase credentials");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
    console.log("Updating expenses from 'খাবার' to 'বাজার খরচ'...");
    const { data: expData, error: expErr } = await supabase
        .from('expenses')
        .update({ category: 'বাজার খরচ' })
        .eq('category', 'খাবার');

    if (expErr) console.error("Error updating expenses:", expErr);
    else console.log("Expenses updated.");

    console.log("Updating budgets from 'খাবার' to 'বাজার খরচ'...");
    // Note: if a user already has 'বাজার খরচ' budget for the SAME month+year, updating 'খাবার' might conflict if there's a unique constraint on user_id, category, month, year.
    // Using a simpler approach: just update it.
    const { data: bData, error: bErr } = await supabase
        .from('budgets')
        .update({ category: 'বাজার খরচ' })
        .eq('category', 'খাবার');

    if (bErr) console.error("Error updating budgets:", bErr);
    else console.log("Budgets updated.");
}

run();
