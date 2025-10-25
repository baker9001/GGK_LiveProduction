import https from 'https';

const SUPABASE_URL = 'https://dodvqvkiuuuxymboldkw.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRvZHZxdmtpdXV1eHltYm9sZGt3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc4NDk0MjQsImV4cCI6MjA2MzQyNTQyNH0.A6qcX7N1SEs0t0yhhRhJFgv4-cqymAwEaIzQUDI7Veo';

const payload = JSON.stringify({
  email: 'admin@ggknowledge.com',
  user_id: '6e9d816b-0b37-45da-a22a-b733b3516dce',
  reason: 'User requested deletion for testing',
  deleted_by: 'system',
  deleted_by_name: 'System Admin'
});

const options = {
  hostname: 'dodvqvkiuuuxymboldkw.supabase.co',
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
