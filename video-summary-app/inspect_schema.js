const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// 1. Load Environment Variables manually
function loadEnv() {
    const envPaths = ['.env.local', '.env'];
    for (const p of envPaths) {
        if (fs.existsSync(p)) {
            console.log(`📄 Loading env from ${p}`);
            const content = fs.readFileSync(p, 'utf-8');
            content.split('\n').forEach(line => {
                const match = line.match(/^\s*([\w_]+)\s*=\s*(.*)?\s*$/); // Better regex
                if (match) {
                    const key = match[1];
                    let value = match[2] || '';
                    if (value.length > 0 && value.charAt(0) === '"' && value.charAt(value.length - 1) === '"') {
                        value = value.replace(/^"|"$/g, '');
                    }
                    if (value.length > 0 && value.charAt(0) === "'" && value.charAt(value.length - 1) === "'") {
                        value = value.replace(/^'|'$/g, '');
                    }

                    if (!process.env[key]) {
                        process.env[key] = value;
                        console.log(`   🔑 Found key: ${key}`);
                    }
                }
            });
        }
    }
}

loadEnv();

console.log("Environment Keys Check:");
console.log("URL:", process.env.NEXT_PUBLIC_SUPABASE_URL ? "Set" : "Missing");
console.log("KEY:", (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY) ? "Set" : "Missing");

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("❌ Missing Supabase Credentials in .env files");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function inspectTable(tableName) {
    console.log(`\n🔍 Inspecting table: ${tableName}...`);
    const { data, error } = await supabase.from(tableName).select('*').limit(1);

    if (error) {
        console.error(`❌ Error accessing ${tableName}:`, error.message);
        return null;
    }

    if (!data || data.length === 0) {
        console.log(`⚠️ Table ${tableName} exists but is empty. (Cannot infer columns easily without rows in JS client)`);
        // Try to insert a dummy row? No, risky.
        return 'empty';
    }

    const columns = Object.keys(data[0]);
    console.log(`✅ Columns in ${tableName}:`, columns.join(', '));
    console.log(`   Sample Data:`, JSON.stringify(data[0], null, 2));
    return columns;
}

async function run() {
    console.log("🚀 Starting Schema Inspection...");

    await inspectTable('terms');
    await inspectTable('students');
    await inspectTable('tutors');
    await inspectTable('subjects');
    await inspectTable('course_requests');

    console.log("\n🏁 Inspection Complete.");
}

run();
