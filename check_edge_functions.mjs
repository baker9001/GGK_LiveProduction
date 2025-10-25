import https from 'https';

const SUPABASE_URL = 'https://dodvqvkiuuuxymboldkw.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRvZHZxdmtpdXV1eHltYm9sZGt3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc4NDk0MjQsImV4cCI6MjA2MzQyNTQyNH0.A6qcX7N1SEs0t0yhhRhJFgv4-cqymAwEaIzQUDI7Veo';

console.log('=== PHASE 2: EDGE FUNCTIONS CHECK ===\n');

const edgeFunctions = [
  'create-admin-user-complete',
  'create-entity-users-invite',
  'create-teacher-student-user'
];

function checkFunction(functionName) {
  return new Promise((resolve) => {
    const url = SUPABASE_URL + '/functions/v1/' + functionName;
    
    https.get(url, {
      headers: {
        'apikey': ANON_KEY,
        'Authorization': 'Bearer ' + ANON_KEY
      }
    }, (res) => {
      console.log(functionName + ':', res.statusCode, res.statusMessage);
      resolve({ name: functionName, status: res.statusCode });
    }).on('error', (err) => {
      console.log(functionName + ': ERROR -', err.message);
      resolve({ name: functionName, status: 'ERROR', error: err.message });
    });
  });
}

for (const func of edgeFunctions) {
  await checkFunction(func);
}

console.log('\n✅ Edge Functions check complete');
process.exit(0);
