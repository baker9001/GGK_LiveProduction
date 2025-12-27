import https from 'https';
import { config } from 'dotenv';

config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;

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
