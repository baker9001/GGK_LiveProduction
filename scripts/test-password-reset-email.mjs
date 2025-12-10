#!/usr/bin/env node

/**
 * Test Password Reset Email Script
 * Sends a test password reset email to verify configuration
 *
 * Usage: node scripts/test-password-reset-email.mjs <email>
 * Example: node scripts/test-password-reset-email.mjs admin@example.com
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '../.env') });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('❌ Missing Supabase credentials in .env file');
  process.exit(1);
}

const testEmail = process.argv[2];

if (!testEmail) {
  console.error('❌ Email address is required');
  console.log('Usage: node scripts/test-password-reset-email.mjs <email>');
  console.log('Example: node scripts/test-password-reset-email.mjs admin@example.com');
  process.exit(1);
}

// Validate email format
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
if (!emailRegex.test(testEmail)) {
  console.error('❌ Invalid email format');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

console.log('📧 Testing Password Reset Email');
console.log('='.repeat(60));
console.log(`Recipient: ${testEmail}`);
console.log();

async function testPasswordReset() {
  try {
    // Step 1: Check if user exists
    console.log('1️⃣  Checking if user exists...');
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, email, email_verified, is_active, user_type')
      .eq('email', testEmail)
      .single();

    if (userError || !user) {
      console.error('❌ User not found in database');
      console.log('   Create this user first or use an existing email address');
      process.exit(1);
    }

    console.log('✅ User found:');
    console.log(`   • Email: ${user.email}`);
    console.log(`   • Type: ${user.user_type}`);
    console.log(`   • Verified: ${user.email_verified}`);
    console.log(`   • Active: ${user.is_active}`);
    console.log();

    if (!user.is_active) {
      console.warn('⚠️  User is inactive - email may not be sent');
      console.log();
    }

    // Step 2: Call edge function
    console.log('2️⃣  Calling send-admin-invite edge function...');
    const startTime = Date.now();

    const response = await fetch(
      `${SUPABASE_URL}/functions/v1/send-admin-invite`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
          'apikey': SUPABASE_ANON_KEY
        },
        body: JSON.stringify({
          email: testEmail,
          redirect_to: 'http://localhost:5173/reset-password'
        })
      }
    );

    const duration = Date.now() - startTime;
    const responseData = await response.json();

    console.log(`   Response time: ${duration}ms`);
    console.log(`   HTTP Status: ${response.status}`);
    console.log();

    if (!response.ok) {
      console.error('❌ Edge function returned an error:');
      console.error(`   ${responseData.error || 'Unknown error'}`);
      console.log();
      console.log('🔍 Troubleshooting:');
      console.log('   1. Check edge function logs: supabase functions logs send-admin-invite --tail');
      console.log('   2. Verify Resend API key: supabase secrets list');
      console.log('   3. Check if domain is verified in Resend dashboard');
      process.exit(1);
    }

    console.log('✅ Edge function call successful');
    console.log(`   ${responseData.message}`);
    console.log();

    // Step 3: Next steps
    console.log('3️⃣  Next Steps:');
    console.log('   1. Check email inbox for: ' + testEmail);
    console.log('   2. Check spam folder (first time only)');
    console.log('   3. Expected subject: "Reset Your Admin Password"');
    console.log('   4. Expected from: Your configured EMAIL_FROM address');
    console.log();

    console.log('🔍 Verify Delivery:');
    console.log('   • Check edge function logs:');
    console.log('     supabase functions logs send-admin-invite --tail');
    console.log('   • Check Resend dashboard:');
    console.log('     https://resend.com/logs');
    console.log();

    console.log('📊 Expected Log Output:');
    console.log('   If using Resend (configured):');
    console.log('     ✅ "Email sent successfully via Resend"');
    console.log();
    console.log('   If using Supabase email (fallback):');
    console.log('     ⚠️  "Using Supabase managed email service"');
    console.log('     ⚠️  "recovery email sent successfully via Supabase"');
    console.log('     ⚠️  This means RESEND_API_KEY is NOT configured');
    console.log();

    console.log('✅ Test completed successfully!');
    console.log('   Wait 10-30 seconds for email delivery');

  } catch (error) {
    console.error('💥 Test failed with error:');
    console.error(`   ${error.message}`);
    console.log();
    console.log('🔍 Common issues:');
    console.log('   • Network connectivity problems');
    console.log('   • Edge function not deployed');
    console.log('   • Invalid Supabase credentials');
    console.log('   • CORS issues (check edge function CORS headers)');
    process.exit(1);
  }
}

// Run test
testPasswordReset();
