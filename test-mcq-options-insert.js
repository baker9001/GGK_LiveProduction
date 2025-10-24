/**
 * Test Script: MCQ Options RLS and Insert
 *
 * This script tests:
 * 1. RLS policies on question_options table
 * 2. Direct insertion of options from JSON
 * 3. Verification of data types and constraints
 * 4. Retrieval of inserted options
 */

import { createClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';

// Supabase configuration from .env
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials in .env file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Sample questions from the JSON file
const sampleQuestions = [
  {
    "question_number": "1",
    "type": "mcq",
    "question_text": "Some yeast, sugar and water are mixed in a test-tube. Which process causes this change?",
    "options": [
      { "label": "A", "text": "growth" },
      { "label": "B", "text": "reproduction" },
      { "label": "C", "text": "respiration" },
      { "label": "D", "text": "sensitivity" }
    ],
    "correct_answer": "C",
    "explanation": "Respiration is the process that causes this change. Yeast undergoes anaerobic respiration (fermentation) when sugar is present, producing carbon dioxide gas (the bubbles) and ethanol."
  },
  {
    "question_number": "2",
    "type": "mcq",
    "question_text": "Which name is given to a group of individuals that can reproduce to produce fertile offspring?",
    "options": [
      { "label": "A", "text": "a genus" },
      { "label": "B", "text": "a kingdom" },
      { "label": "C", "text": "a species" },
      { "label": "D", "text": "an organ system" }
    ],
    "correct_answer": "C",
    "explanation": "A species is defined as a group of organisms that can reproduce together to produce fertile offspring."
  }
];

async function testRLSAndInsert() {
  console.log('🔍 Testing MCQ Options RLS and Insert');
  console.log('=====================================\n');

  // Step 1: Check if user is authenticated
  console.log('Step 1: Checking authentication...');
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    console.error('❌ Not authenticated. Please sign in first.');
    console.log('Current user:', user);
    console.log('Auth error:', authError);
    return;
  }

  console.log('✅ Authenticated as:', user.email);
  console.log('User ID:', user.id);
  console.log('');

  // Step 2: Check if question_options table is accessible
  console.log('Step 2: Testing SELECT access to question_options table...');
  const { data: existingOptions, error: selectError } = await supabase
    .from('question_options')
    .select('id, label, option_text, is_correct')
    .limit(5);

  if (selectError) {
    console.error('❌ SELECT query failed:', selectError.message);
    console.log('Error details:', JSON.stringify(selectError, null, 2));
    console.log('\n⚠️ This indicates RLS policies are blocking SELECT!');
  } else {
    console.log(`✅ SELECT access granted. Found ${existingOptions?.length || 0} existing options.`);
    if (existingOptions && existingOptions.length > 0) {
      console.log('Sample option:', existingOptions[0]);
    }
  }
  console.log('');

  // Step 3: Create test question in questions_master_admin
  console.log('Step 3: Creating test question...');
  const testQuestionId = uuidv4();

  const { data: insertedQuestion, error: questionError } = await supabase
    .from('questions_master_admin')
    .insert({
      id: testQuestionId,
      question_number: 'TEST-' + Date.now(),
      type: 'mcq',
      question_text: 'Test question for RLS verification',
      answer_format: 'selection',
      marks: 1,
      status: 'draft',
      created_by: user.id
    })
    .select()
    .single();

  if (questionError) {
    console.error('❌ Failed to create test question:', questionError.message);
    console.log('Error details:', JSON.stringify(questionError, null, 2));
    return;
  }

  console.log('✅ Test question created with ID:', insertedQuestion.id);
  console.log('');

  // Step 4: Insert MCQ options from JSON
  console.log('Step 4: Inserting MCQ options from JSON...');

  const question = sampleQuestions[0]; // Use first question
  const optionsToInsert = question.options.map((option, index) => ({
    question_id: insertedQuestion.id,
    label: option.label,
    option_text: option.text,
    is_correct: option.label === question.correct_answer,
    order: index,
    explanation: option.label === question.correct_answer ? question.explanation : null
  }));

  console.log(`Preparing to insert ${optionsToInsert.length} options:`);
  optionsToInsert.forEach(opt => {
    console.log(`  - Option ${opt.label}: "${opt.option_text}" (correct: ${opt.is_correct})`);
  });
  console.log('');

  const { data: insertedOptions, error: optionsError } = await supabase
    .from('question_options')
    .insert(optionsToInsert)
    .select();

  if (optionsError) {
    console.error('❌ Failed to insert options:', optionsError.message);
    console.log('Error details:', JSON.stringify(optionsError, null, 2));
    console.log('\n⚠️ This indicates RLS policies are blocking INSERT!');
  } else {
    console.log(`✅ Successfully inserted ${insertedOptions?.length || 0} options`);
    console.log('Inserted options:');
    insertedOptions?.forEach(opt => {
      console.log(`  - ${opt.label}: "${opt.option_text}" (correct: ${opt.is_correct})`);
    });
  }
  console.log('');

  // Step 5: Retrieve and verify inserted options
  console.log('Step 5: Retrieving inserted options...');
  const { data: retrievedOptions, error: retrieveError } = await supabase
    .from('question_options')
    .select('*')
    .eq('question_id', insertedQuestion.id)
    .order('order');

  if (retrieveError) {
    console.error('❌ Failed to retrieve options:', retrieveError.message);
    console.log('Error details:', JSON.stringify(retrieveError, null, 2));
  } else {
    console.log(`✅ Retrieved ${retrievedOptions?.length || 0} options`);
    console.log('Options data:');
    retrievedOptions?.forEach(opt => {
      console.log(`  - ${opt.label}: "${opt.option_text}"`);
      console.log(`    Correct: ${opt.is_correct}, Order: ${opt.order}`);
      console.log(`    Created: ${opt.created_at}`);
    });
  }
  console.log('');

  // Step 6: Check RLS policies
  console.log('Step 6: Checking RLS policies on question_options...');
  const { data: policies, error: policyError } = await supabase
    .rpc('exec_sql', {
      sql: `
        SELECT policyname, cmd, qual
        FROM pg_policies
        WHERE tablename = 'question_options'
        ORDER BY cmd, policyname;
      `
    });

  if (policyError) {
    console.log('⚠️ Cannot check policies directly (may require admin access)');
    console.log('Error:', policyError.message);
  } else {
    console.log('Current RLS policies:');
    if (policies && policies.length > 0) {
      policies.forEach(policy => {
        console.log(`  - ${policy.policyname} [${policy.cmd}]`);
      });
    } else {
      console.log('  ⚠️ No policies found or cannot access policy information');
    }
  }
  console.log('');

  // Step 7: Cleanup
  console.log('Step 7: Cleanup...');
  const { error: deleteError } = await supabase
    .from('questions_master_admin')
    .delete()
    .eq('id', insertedQuestion.id);

  if (deleteError) {
    console.log('⚠️ Failed to cleanup test question:', deleteError.message);
  } else {
    console.log('✅ Test question and options cleaned up');
  }
  console.log('');

  // Summary
  console.log('=====================================');
  console.log('📊 Test Summary:');
  console.log('=====================================');
  console.log(`Authentication: ${user ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`SELECT Access: ${!selectError ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`INSERT Access: ${!optionsError ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Data Retrieval: ${!retrieveError ? '✅ PASS' : '❌ FAIL'}`);
  console.log('');

  if (selectError || optionsError || retrieveError) {
    console.log('⚠️ RLS POLICY ISSUE DETECTED!');
    console.log('');
    console.log('Next Steps:');
    console.log('1. Apply migration: 20251019190000_fix_question_options_missing_rls_policies.sql');
    console.log('2. Verify policies are created with this SQL:');
    console.log('   SELECT COUNT(*) FROM pg_policies WHERE tablename = \'question_options\';');
    console.log('3. Re-run this test script');
  } else {
    console.log('✅ All RLS tests passed! Options can be inserted and retrieved.');
  }
}

// Run the test
testRLSAndInsert().catch(error => {
  console.error('💥 Unexpected error:', error);
  process.exit(1);
});
