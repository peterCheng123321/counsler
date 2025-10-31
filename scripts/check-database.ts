/**
 * Database diagnostic script
 * Checks the current state of your database to diagnose issues
 * Run with: npx tsx scripts/check-database.ts
 */

import { createClient } from '@supabase/supabase-js';

const DEMO_USER_ID = '00000000-0000-0000-0000-000000000001';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials');
  console.error('Make sure .env.local has:');
  console.error('  - NEXT_PUBLIC_SUPABASE_URL');
  console.error('  - SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkDatabase() {
  console.log('🔍 Checking database state...\n');

  // Check students
  const { data: students, error: studentsError } = await supabase
    .from('students')
    .select('id, first_name, last_name, application_progress')
    .eq('counselor_id', DEMO_USER_ID);

  if (studentsError) {
    console.error('❌ Error fetching students:', studentsError.message);
  } else {
    console.log(`✅ Students found: ${students?.length || 0}`);
    if (students && students.length > 0) {
      students.forEach(s => {
        console.log(`   - ${s.first_name} ${s.last_name} (${s.application_progress}% progress)`);
      });
    }
  }

  // Check colleges table
  const { data: colleges, error: collegesError } = await supabase
    .from('colleges')
    .select('id, name');

  if (collegesError) {
    console.error('❌ Error fetching colleges:', collegesError.message);
  } else {
    console.log(`\n✅ Colleges in database: ${colleges?.length || 0}`);
    if (colleges && colleges.length > 0) {
      colleges.slice(0, 5).forEach(c => {
        console.log(`   - ${c.name}`);
      });
      if (colleges.length > 5) {
        console.log(`   ... and ${colleges.length - 5} more`);
      }
    }
  }

  // Check student_colleges with proper structure
  if (students && students.length > 0) {
    console.log('\n🔗 Checking student-college relationships...');

    for (const student of students.slice(0, 3)) {
      const { data: studentColleges, error } = await supabase
        .from('student_colleges')
        .select('id, college_id, deadline, application_type')
        .eq('student_id', student.id);

      if (error) {
        console.error(`   ❌ Error for ${student.first_name}:`, error.message);
      } else {
        console.log(`   ${student.first_name} ${student.last_name}: ${studentColleges?.length || 0} applications`);

        // Check if college_id exists
        if (studentColleges && studentColleges.length > 0) {
          const hasCollegeId = studentColleges.every(sc => sc.college_id);
          if (hasCollegeId) {
            console.log(`      ✅ Using proper college_id foreign keys`);
          } else {
            console.log(`      ❌ Missing college_id - needs migration!`);
          }
        }
      }
    }
  }

  // Check essays
  if (students && students.length > 0) {
    console.log('\n📝 Checking essays...');

    for (const student of students.slice(0, 3)) {
      const { data: essays, error } = await supabase
        .from('essays')
        .select('id, title, status')
        .eq('student_id', student.id);

      if (error) {
        console.error(`   ❌ Error for ${student.first_name}:`, error.message);
      } else {
        console.log(`   ${student.first_name} ${student.last_name}: ${essays?.length || 0} essays`);
        if (essays && essays.length > 0) {
          essays.forEach(e => {
            console.log(`      - ${e.title} (${e.status || 'no status'})`);
          });
        }
      }
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('📋 DIAGNOSIS:');
  console.log('='.repeat(60));

  if (!students || students.length === 0) {
    console.log('❌ NO STUDENTS FOUND');
    console.log('   → Run: npx tsx scripts/seed-mock-students.ts');
  } else if (!colleges || colleges.length === 0) {
    console.log('❌ NO COLLEGES FOUND');
    console.log('   → Run: npx tsx scripts/seed-mock-students.ts');
    console.log('   → The script will create colleges first, then link students');
  } else {
    console.log('✅ Database has data');
    console.log('   If students still show "0 applications", the issue might be:');
    console.log('   1. Old data with broken foreign keys (college_name instead of college_id)');
    console.log('   2. Frontend not deployed yet');
    console.log('   \n   Solution: Delete old students and re-run seed script');
  }

  console.log('\n💡 To start fresh:');
  console.log('   1. Go to Supabase Dashboard');
  console.log('   2. Delete all rows from "students" table');
  console.log('   3. Run: npx tsx scripts/seed-mock-students.ts');
  console.log('');
}

checkDatabase().catch(console.error);
