import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://dodvqvkiuuuxymboldkw.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRvZHZxdmtpdXV1eHltYm9sZGt3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc4NDk0MjQsImV4cCI6MjA2MzQyNTQyNH0.A6qcX7N1SEs0t0yhhRhJFgv4-cqymAwEaIzQUDI7Veo';

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
