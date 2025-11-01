/**
 * Debug script specifically for essay issues
 * Run with: npx tsx scripts/debug-essays.ts
 */

import { createClient } from '@supabase/supabase-js';

const DEMO_USER_ID = '00000000-0000-0000-0000-000000000001';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function debugEssays() {
  console.log('🔍 Debugging Essays...\n');

  // Get all students
  const { data: students, error: studentsError } = await supabase
    .from('students')
    .select('id, first_name, last_name, application_progress')
    .eq('counselor_id', DEMO_USER_ID);

  if (studentsError) {
    console.error('❌ Error fetching students:', studentsError.message);
    return;
  }

  if (!students || students.length === 0) {
    console.log('❌ No students found. Run seed script first.');
    return;
  }

  console.log(`✅ Found ${students.length} students\n`);

  // Check essays for each student
  for (const student of students) {
    const { data: essays, error: essaysError } = await supabase
      .from('essays')
      .select('*')
      .eq('student_id', student.id)
      .order('created_at', { ascending: false });

    if (essaysError) {
      console.error(`❌ Error fetching essays for ${student.first_name}:`, essaysError.message);
      continue;
    }

    console.log(`\n📝 ${student.first_name} ${student.last_name} (${student.application_progress}% progress)`);
    console.log(`   Essays: ${essays?.length || 0}`);

    if (essays && essays.length > 0) {
      essays.forEach((essay, idx) => {
        console.log(`\n   Essay ${idx + 1}:`);
        console.log(`      ID: ${essay.id}`);
        console.log(`      Title: ${essay.title}`);
        console.log(`      Status: ${essay.status || 'no status'}`);
        console.log(`      Word Count: ${essay.word_count || 0}`);
        console.log(`      Content Length: ${essay.content?.length || 0} chars`);
        console.log(`      Has Counselor ID: ${essay.counselor_id ? '✅' : '❌'}`);
        console.log(`      Created: ${new Date(essay.created_at).toLocaleString()}`);

        // Show first 100 chars of content
        if (essay.content) {
          const preview = essay.content.substring(0, 100).replace(/\n/g, ' ');
          console.log(`      Preview: "${preview}..."`);
        }
      });
    } else {
      console.log(`   ⚠️  No essays found for this student`);
    }
  }

  // Check for essays without student relationship
  const { data: orphanEssays, error: orphanError } = await supabase
    .from('essays')
    .select('id, title, student_id')
    .is('student_id', null);

  if (!orphanError && orphanEssays && orphanEssays.length > 0) {
    console.log(`\n\n⚠️  Found ${orphanEssays.length} orphan essays (no student_id):`);
    orphanEssays.forEach(e => {
      console.log(`   - ${e.title} (ID: ${e.id})`);
    });
  }

  // Test API endpoint simulation
  console.log('\n\n🧪 Testing API Logic...');

  if (students.length > 0) {
    const testStudent = students[0];
    console.log(`\nSimulating GET /api/v1/students/${testStudent.id}/essays`);

    const { data: apiTestEssays, error: apiTestError } = await supabase
      .from('essays')
      .select('*')
      .eq('student_id', testStudent.id)
      .order('created_at', { ascending: false });

    if (apiTestError) {
      console.error('❌ API query failed:', apiTestError.message);
    } else {
      console.log(`✅ Would return ${apiTestEssays?.length || 0} essays`);
      if (apiTestEssays && apiTestEssays.length > 0) {
        console.log(`   First essay: "${apiTestEssays[0].title}"`);
      }
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('💡 DIAGNOSIS:');
  console.log('='.repeat(60));

  const totalEssays = students.reduce((acc, student) => {
    return acc; // We'd need to re-fetch, just show message
  }, 0);

  if (students.every(s => s.application_progress === 0)) {
    console.log('⚠️  All students have 0% progress - might be old data');
    console.log('   → Delete all students and re-run seed script');
  }

  console.log('\n💡 Common Issues:');
  console.log('   1. Missing counselor_id - Essays won\'t be associated properly');
  console.log('   2. RLS policies - Check Supabase table permissions');
  console.log('   3. Old seed data - Delete students and reseed');
  console.log('   4. API not deployed - Check Vercel deployment status');
  console.log('\n');
}

debugEssays().catch(console.error);
