import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

console.log('=== PHASE 1: DATABASE SCHEMA VERIFICATION ===');

const tables = [
  'users', 
  'admin_users', 
  'entity_users', 
  'teachers', 
  'students'
];

for (const table of tables) {
  try {
    const result = await supabase
      .from(table)
      .select('*')
      .limit(1);
    
    if (result.error) {
      if (result.error.code === '42P01') {
        console.log('MISSING:', table);
      } else {
        console.log('EXISTS:', table, '-', result.error.message);
      }
    } else {
      console.log('EXISTS:', table);
    }
  } catch (err) {
    console.log('ERROR:', table, '-', err.message);
  }
}

process.exit(0);
