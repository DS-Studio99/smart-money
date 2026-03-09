const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');

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
    let { data: expData, error: expErr } = await supabase
        .from('expenses')
        .update({ category: 'বাজার খরচ' })
        .eq('category', 'খাবার');

    if (expErr) console.error("Error updating expenses:", expErr);
    else console.log("Expenses updated.");

    console.log("Deleting old 'খাবার' budgets so they don't pop up anymore...");
    // Alternatively, could update them, but deleting is safer because there might be conflict on (user_id, category, month, year) unique constraints if the user already created 'বাজার খরচ' for that month.
    let { data: bData, error: bErr } = await supabase
        .from('budgets')
        .delete()
        .eq('category', 'খাবার');

    if (bErr) console.error("Error deleting budgets:", bErr);
    else console.log("Budgets deleted.");

    process.exit(0);
}

run();
