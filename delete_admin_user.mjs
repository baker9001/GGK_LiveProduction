import https from 'https';
import { config } from 'dotenv';

config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;

const payload = JSON.stringify({
  email: 'admin@ggknowledge.com',
  user_id: '6e9d816b-0b37-45da-a22a-b733b3516dce',
  reason: 'User requested deletion for testing',
  deleted_by: 'system',
  deleted_by_name: 'System Admin'
});

const options = {
  hostname: new URL(SUPABASE_URL).hostname,
  path: '/functions/v1/delete-admin-user',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer ' + ANON_KEY,
    'apikey': ANON_KEY,
    'Content-Length': Buffer.byteLength(payload)
  }
};

console.log('Calling delete-admin-user Edge Function...');

const req = https.request(options, (res) => {
  let data = '';

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    console.log('Status Code:', res.statusCode);
    console.log('Response:', data);
    
    if (res.statusCode === 200) {
      console.log('\n✅ User admin@ggknowledge.com deleted successfully from auth.users!');
    } else {
      console.log('\n⚠️  Deletion may have failed. Check response above.');
    }
  });
});

req.on('error', (error) => {
  console.error('Error:', error);
});

req.write(payload);
req.end();
