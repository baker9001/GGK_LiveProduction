#!/usr/bin/env node

/**
 * Email Diagnostics Script
 * Checks the current email configuration and identifies issues
 *
 * Usage: node scripts/diagnose-email-issue.mjs
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

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

console.log('🔍 Email Configuration Diagnostics');
console.log('='.repeat(60));
console.log();

// Function to make tests clearer
const test = (name, result, recommendation = null) => {
  const icon = result.passed ? '✅' : '❌';
  console.log(`${icon} ${name}`);
  console.log(`   ${result.message}`);
  if (recommendation) {
    console.log(`   💡 Recommendation: ${recommendation}`);
  }
  console.log();
  return result.passed;
};

async function runDiagnostics() {
  let allPassed = true;

  // Test 1: Check Supabase Connection
  console.log('📡 Testing Supabase Connection...');
  try {
    const { data, error } = await supabase.from('users').select('count', { count: 'exact', head: true });
    const passed = !error;
    allPassed &= test(
      'Supabase Connection',
      {
        passed,
        message: passed ? 'Successfully connected to Supabase' : `Connection failed: ${error.message}`
      },
      !passed ? 'Check your VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env' : null
    );
  } catch (err) {
    allPassed &= test(
      'Supabase Connection',
      {
        passed: false,
        message: `Connection error: ${err.message}`
      },
      'Verify Supabase credentials and network connection'
    );
  }

  // Test 2: Check Edge Function Exists
  console.log('🔧 Checking Edge Function...');
  try {
    const response = await fetch(
      `${SUPABASE_URL}/functions/v1/send-admin-invite`,
      {
        method: 'OPTIONS',
        headers: {
          'apikey': SUPABASE_ANON_KEY
        }
      }
    );

    const passed = response.status === 200;
    allPassed &= test(
      'Edge Function Deployment',
      {
        passed,
        message: passed
          ? 'send-admin-invite edge function is deployed'
          : `Edge function not accessible (HTTP ${response.status})`
      },
      !passed ? 'Deploy the edge function: supabase functions deploy send-admin-invite' : null
    );
  } catch (err) {
    allPassed &= test(
      'Edge Function Deployment',
      {
        passed: false,
        message: `Cannot reach edge function: ${err.message}`
      },
      'Ensure edge function is deployed'
    );
  }

  // Test 3: Check for Resend Configuration (can't access secrets, but can check docs)
  console.log('📧 Checking Email Configuration...');
  console.log('⚠️  Note: Cannot check RESEND_API_KEY directly (it\'s a secret)');
  console.log('   To verify, check edge function logs after sending a test email');
  console.log();

  test(
    'Resend API Configuration',
    {
      passed: false,
      message: 'Cannot verify secrets - check manually'
    },
    'Run: supabase secrets list | grep RESEND_API_KEY'
  );

  // Test 4: Check sample user for testing
  console.log('👤 Checking Test Users...');
  try {
    const { data: users, error } = await supabase
      .from('users')
      .select('email, email_verified, is_active')
      .eq('is_active', true)
      .limit(5);

    if (error) throw error;

    const passed = users && users.length > 0;
    allPassed &= test(
      'Test Users Available',
      {
        passed,
        message: passed
          ? `Found ${users.length} active user(s) for testing`
          : 'No active users found'
      },
      !passed ? 'Create at least one test user to verify email functionality' : null
    );

    if (passed && users.length > 0) {
      console.log('   Available test emails:');
      users.forEach(user => {
        console.log(`   • ${user.email} (verified: ${user.email_verified})`);
      });
      console.log();
    }
  } catch (err) {
    allPassed &= test(
      'Test Users Available',
      {
        passed: false,
        message: `Error checking users: ${err.message}`
      }
    );
  }

  // Test 5: Check Auth configuration (redirect URLs)
  console.log('🔐 Auth Configuration Guidance...');
  console.log('   Cannot check redirect URLs via API - manual verification needed:');
  console.log('   1. Go to Supabase Dashboard → Authentication → URL Configuration');
  console.log('   2. Ensure these URLs are in the Redirect URLs list:');
  console.log('      • http://localhost:5173/reset-password');
  console.log('      • https://ggknowledge.com/reset-password');
  console.log();

  // Summary
  console.log('='.repeat(60));
  console.log('📋 Diagnostic Summary');
  console.log('='.repeat(60));
  console.log();

  if (allPassed) {
    console.log('✅ All automatic checks passed!');
    console.log();
    console.log('Next steps:');
    console.log('1. Verify Resend API key: supabase secrets list');
    console.log('2. Check redirect URLs in Supabase Dashboard');
    console.log('3. Send a test password reset email');
    console.log('4. Monitor logs: supabase functions logs send-admin-invite --tail');
  } else {
    console.log('❌ Some checks failed - review recommendations above');
    console.log();
    console.log('Priority fixes:');
    console.log('1. Fix any connection issues');
    console.log('2. Deploy edge function if missing');
    console.log('3. Configure Resend API key');
    console.log('4. Add redirect URLs in Supabase Dashboard');
  }

  console.log();
  console.log('📖 For detailed setup instructions, see:');
  console.log('   PASSWORD_RESET_EMAIL_FIX_IMPLEMENTATION.md');
  console.log();
}

// Run diagnostics
runDiagnostics().catch(err => {
  console.error('💥 Diagnostic script failed:', err);
  process.exit(1);
});
