import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

// Read .env file
const envContent = readFileSync('.env', 'utf-8');
const env = {};
envContent.split('\n').forEach(line => {
  const [key, ...valueParts] = line.split('=');
  if (key && valueParts.length) {
    env[key.trim()] = valueParts.join('=').trim();
  }
});

const supabase = createClient(
  env.VITE_SUPABASE_URL,
  env.VITE_SUPABASE_ANON_KEY
);

async function auditTableSystems() {
  console.log('=== TABLE COMPLETION STORAGE AUDIT ===\n');

  // 1. Check question_correct_answers
  console.log('Checking question_correct_answers...');
  const { data: qca, error: qcaError } = await supabase
    .from('question_correct_answers')
    .select('answer_type, answer_text')
    .limit(1000);

  if (!qcaError && qca) {
    const tableTemplates = qca.filter(r => r.answer_type === 'table_template');
    const hasAnswerText = qca.filter(r => r.answer_text && r.answer_text.length > 10);
    console.log('question_correct_answers:');
    console.log(`  Total records: ${qca.length}`);
    console.log(`  Table templates: ${tableTemplates.length}`);
    console.log(`  Has answer_text: ${hasAnswerText.length}`);
  } else {
    console.log('ERROR:', qcaError?.message);
  }

  // 2. Check table_templates
  const { data: tt, error: ttError } = await supabase
    .from('table_templates')
    .select('id, question_id, sub_question_id')
    .limit(1000);

  if (!ttError && tt) {
    const uniqueQuestions = new Set(tt.filter(r => r.question_id).map(r => r.question_id)).size;
    const uniqueSubquestions = new Set(tt.filter(r => r.sub_question_id).map(r => r.sub_question_id)).size;
    console.log('\ntable_templates:');
    console.log(`  Total records: ${tt.length}`);
    console.log(`  Unique questions: ${uniqueQuestions}`);
    console.log(`  Unique subquestions: ${uniqueSubquestions}`);
  } else {
    console.log('\ntable_templates: ERROR or empty', ttError?.message);
  }

  // 3. Check table_template_cells
  const { data: ttc, error: ttcError } = await supabase
    .from('table_template_cells')
    .select('id, cell_type')
    .limit(10000);

  if (!ttcError && ttc) {
    const locked = ttc.filter(c => c.cell_type === 'locked').length;
    const editable = ttc.filter(c => c.cell_type === 'editable').length;
    console.log('\ntable_template_cells:');
    console.log(`  Total cells: ${ttc.length}`);
    console.log(`  Locked cells: ${locked}`);
    console.log(`  Editable cells: ${editable}`);
  } else {
    console.log('\ntable_template_cells: ERROR or empty', ttcError?.message);
  }

  // 4. Sample questions with table_template
  const { data: samples, error: samplesError } = await supabase
    .from('questions_master_admin')
    .select(`
      question_number,
      answer_format,
      correctAnswers:question_correct_answers(answer_type, answer_text)
    `)
    .eq('answer_format', 'table_completion')
    .limit(3);

  if (!samplesError && samples && samples.length > 0) {
    console.log('\n=== SAMPLE TABLE COMPLETION QUESTIONS ===');
    samples.forEach((q, idx) => {
      console.log(`\n${idx + 1}. Question ${q.question_number}:`);
      console.log(`   Answer format: ${q.answer_format}`);
      if (q.correctAnswers && q.correctAnswers.length > 0) {
        q.correctAnswers.forEach((ca, caIdx) => {
          console.log(`   Correct Answer ${caIdx + 1}:`);
          console.log(`     Type: ${ca.answer_type || 'NULL'}`);
          console.log(`     Has answer_text: ${ca.answer_text ? 'YES (' + ca.answer_text.length + ' chars)' : 'NO'}`);
          if (ca.answer_text && ca.answer_text.length < 200) {
            console.log(`     Preview: ${ca.answer_text.substring(0, 150)}...`);
          }
        });
      } else {
        console.log('   No correct answers found');
      }
    });
  } else {
    console.log('\nNo table_completion questions found or error:', samplesError?.message);
  }

  console.log('\n=== AUDIT COMPLETE ===');
}

auditTableSystems().catch(console.error);
