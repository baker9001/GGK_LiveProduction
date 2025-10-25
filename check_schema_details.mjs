import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://dodvqvkiuuuxymboldkw.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRvZHZxdmtpdXV1eHltYm9sZGt3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc4NDk0MjQsImV4cCI6MjA2MzQyNTQyNH0.A6qcX7N1SEs0t0yhhRhJFgv4-cqymAwEaIzQUDI7Veo';

const supabase = createClient(supabaseUrl, supabaseKey);

console.log('=== DETAILED SCHEMA CHECK ===\n');

// Check users table
console.log('1. USERS TABLE:');
const usersResult = await supabase.from('users').select('*').limit(1);
if (usersResult.data && usersResult.data.length > 0) {
  console.log('   Columns:', Object.keys(usersResult.data[0]).join(', '));
  console.log('   Sample user_type:', usersResult.data[0].user_type);
} else {
  console.log('   No data or RLS blocked');
}

// Check admin_users table
console.log('\n2. ADMIN_USERS TABLE:');
const adminResult = await supabase.from('admin_users').select('*').limit(1);
if (adminResult.data && adminResult.data.length > 0) {
  console.log('   Columns:', Object.keys(adminResult.data[0]).join(', '));
} else {
  console.log('   No data or RLS blocked');
}

// Check entity_users table
console.log('\n3. ENTITY_USERS TABLE:');
const entityResult = await supabase.from('entity_users').select('*').limit(1);
if (entityResult.data && entityResult.data.length > 0) {
  console.log('   Columns:', Object.keys(entityResult.data[0]).join(', '));
} else {
  console.log('   No data or RLS blocked');
}

// Check teachers table
console.log('\n4. TEACHERS TABLE:');
const teachersResult = await supabase.from('teachers').select('*').limit(1);
if (teachersResult.data && teachersResult.data.length > 0) {
  console.log('   Columns:', Object.keys(teachersResult.data[0]).join(', '));
} else {
  console.log('   No data or RLS blocked');
}

// Check students table
console.log('\n5. STUDENTS TABLE:');
const studentsResult = await supabase.from('students').select('*').limit(1);
if (studentsResult.data && studentsResult.data.length > 0) {
  console.log('   Columns:', Object.keys(studentsResult.data[0]).join(', '));
} else {
  console.log('   No data or RLS blocked');
}

// Check supporting tables
console.log('\n6. SUPPORTING TABLES:');
const supportTables = ['roles', 'companies', 'schools', 'branches', 'audit_logs'];
for (const table of supportTables) {
  const result = await supabase.from(table).select('*').limit(0);
  if (result.error && result.error.code === '42P01') {
    console.log('   ❌', table, '- MISSING');
  } else {
    console.log('   ✅', table, '- EXISTS');
  }
}

console.log('\n=== USER TYPE CHECK ===');
const userTypes = await supabase.from('users').select('user_type').limit(10);
if (userTypes.data) {
  const types = [...new Set(userTypes.data.map(u => u.user_type))];
  console.log('Found user_type values:', types.join(', '));
}

process.exit(0);
