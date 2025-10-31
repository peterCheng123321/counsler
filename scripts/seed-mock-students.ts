/**
 * Seed script to add mock students with varied progress, applications, and essays
 *
 * This script will:
 * 1. Create colleges in the colleges table (or use existing ones)
 * 2. Create students with varied academic profiles and progress levels
 * 3. Link students to colleges via student_colleges with proper foreign keys
 * 4. Generate essays with realistic content based on progress
 * 5. Create tasks for students who need help
 *
 * Run with: npx tsx scripts/seed-mock-students.ts
 *
 * Note: If you want to reset data, manually delete students from your Supabase dashboard first,
 * or the script may create duplicates.
 */

import { createClient } from '@supabase/supabase-js';

const DEMO_USER_ID = '00000000-0000-0000-0000-000000000001';

// Create Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Mock student data with varied metrics
const mockStudents = [
  {
    first_name: 'Emily',
    last_name: 'Rodriguez',
    email: 'emily.rodriguez@example.com',
    phone: '(555) 123-4567',
    graduation_year: 2025,
    gpa_unweighted: 3.92,
    gpa_weighted: 4.45,
    sat_score: 1520,
    act_score: 34,
    application_progress: 85,
    date_of_birth: '2006-03-15',
    // Will add 8 applications, 3 essays
  },
  {
    first_name: 'Marcus',
    last_name: 'Thompson',
    email: 'marcus.thompson@example.com',
    phone: '(555) 234-5678',
    graduation_year: 2025,
    gpa_unweighted: 3.65,
    gpa_weighted: 3.98,
    sat_score: 1380,
    act_score: 30,
    application_progress: 45,
    date_of_birth: '2006-07-22',
    // Will add 4 applications, 2 essays
  },
  {
    first_name: 'Sophia',
    last_name: 'Chen',
    email: 'sophia.chen@example.com',
    phone: '(555) 345-6789',
    graduation_year: 2025,
    gpa_unweighted: 4.0,
    gpa_weighted: 4.65,
    sat_score: 1560,
    act_score: 35,
    application_progress: 92,
    date_of_birth: '2006-01-10',
    // Will add 12 applications, 5 essays
  },
  {
    first_name: 'Jamal',
    last_name: 'Williams',
    email: 'jamal.williams@example.com',
    phone: '(555) 456-7890',
    graduation_year: 2025,
    gpa_unweighted: 3.45,
    gpa_weighted: 3.72,
    sat_score: 1280,
    act_score: 28,
    application_progress: 25,
    date_of_birth: '2006-09-05',
    // Will add 2 applications, 1 essay
  },
  {
    first_name: 'Isabella',
    last_name: 'Garcia',
    email: 'isabella.garcia@example.com',
    phone: '(555) 567-8901',
    graduation_year: 2025,
    gpa_unweighted: 3.78,
    gpa_weighted: 4.12,
    sat_score: 1450,
    act_score: 32,
    application_progress: 68,
    date_of_birth: '2006-05-18',
    // Will add 6 applications, 3 essays
  },
  {
    first_name: 'Liam',
    last_name: 'Anderson',
    email: 'liam.anderson@example.com',
    phone: '(555) 678-9012',
    graduation_year: 2026,
    gpa_unweighted: 3.58,
    gpa_weighted: 3.85,
    sat_score: 1340,
    act_score: null,
    application_progress: 15,
    date_of_birth: '2007-11-30',
    // Will add 1 application, 0 essays
  },
  {
    first_name: 'Ava',
    last_name: 'Martinez',
    email: 'ava.martinez@example.com',
    phone: '(555) 789-0123',
    graduation_year: 2026,
    gpa_unweighted: 3.88,
    gpa_weighted: 4.25,
    sat_score: null,
    act_score: 33,
    application_progress: 55,
    date_of_birth: '2007-02-14',
    // Will add 5 applications, 2 essays
  },
  {
    first_name: 'Noah',
    last_name: 'Taylor',
    email: 'noah.taylor@example.com',
    phone: '(555) 890-1234',
    graduation_year: 2026,
    gpa_unweighted: 3.25,
    gpa_weighted: 3.48,
    sat_score: 1180,
    act_score: 26,
    application_progress: 10,
    date_of_birth: '2007-08-20',
    // Will add 0 applications, 0 essays
  },
];

// College list for applications
const colleges = [
  { name: 'Stanford University', type: 'Reach', location_city: 'Stanford', location_state: 'CA', acceptance_rate: 3.9 },
  { name: 'Harvard University', type: 'Reach', location_city: 'Cambridge', location_state: 'MA', acceptance_rate: 3.4 },
  { name: 'MIT', type: 'Reach', location_city: 'Cambridge', location_state: 'MA', acceptance_rate: 3.96 },
  { name: 'UC Berkeley', type: 'Target', location_city: 'Berkeley', location_state: 'CA', acceptance_rate: 14.5 },
  { name: 'UCLA', type: 'Target', location_city: 'Los Angeles', location_state: 'CA', acceptance_rate: 10.8 },
  { name: 'USC', type: 'Target', location_city: 'Los Angeles', location_state: 'CA', acceptance_rate: 12.4 },
  { name: 'UC San Diego', type: 'Safety', location_city: 'San Diego', location_state: 'CA', acceptance_rate: 31.5 },
  { name: 'UC Irvine', type: 'Safety', location_city: 'Irvine', location_state: 'CA', acceptance_rate: 28.9 },
  { name: 'Yale University', type: 'Reach', location_city: 'New Haven', location_state: 'CT', acceptance_rate: 4.5 },
  { name: 'Princeton University', type: 'Reach', location_city: 'Princeton', location_state: 'NJ', acceptance_rate: 4.4 },
  { name: 'Columbia University', type: 'Reach', location_city: 'New York', location_state: 'NY', acceptance_rate: 3.7 },
  { name: 'University of Michigan', type: 'Target', location_city: 'Ann Arbor', location_state: 'MI', acceptance_rate: 20.2 },
];

// Essay prompts
const essayPrompts = [
  'Tell us about a personal quality, talent, accomplishment, contribution or experience that is important to you. What about this quality or accomplishment makes you proud and how does it relate to the person you are?',
  'Describe the world you come from and how you, as a product of it, might add to the diversity of the university.',
  'What would you say is your greatest talent or skill? How have you developed and demonstrated that talent over time?',
  'Think about an academic subject that inspires you. Describe how you have furthered this interest inside and/or outside of the classroom.',
  'What have you done to make your school or your community a better place?',
];

async function seedMockStudents() {
  console.log('Starting mock data seeding...\n');

  // First, create/upsert all colleges in the colleges table
  console.log('Setting up colleges...');
  const collegeIds = new Map<string, string>();

  for (const college of colleges) {
    // Try to find existing college
    const { data: existing } = await supabase
      .from('colleges')
      .select('id')
      .eq('name', college.name)
      .maybeSingle();

    if (existing) {
      collegeIds.set(college.name, existing.id);
      console.log(`  ✓ Found existing: ${college.name}`);
    } else {
      // Create new college
      const { data: newCollege, error } = await supabase
        .from('colleges')
        .insert({
          name: college.name,
          location_city: college.location_city,
          location_state: college.location_state,
          location_country: 'United States',
          acceptance_rate: college.acceptance_rate,
          type: college.type,
        })
        .select('id')
        .single();

      if (!error && newCollege) {
        collegeIds.set(college.name, newCollege.id);
        console.log(`  ✓ Created: ${college.name}`);
      } else {
        console.error(`  ✗ Error creating ${college.name}:`, error);
      }
    }
  }
  console.log('');

  for (const mockStudent of mockStudents) {
    console.log(`Creating student: ${mockStudent.first_name} ${mockStudent.last_name}`);

    // Create student
    const { data: student, error: studentError } = await supabase
      .from('students')
      .insert({
        ...mockStudent,
        counselor_id: DEMO_USER_ID,
      })
      .select()
      .single();

    if (studentError) {
      console.error(`Error creating student:`, studentError);
      continue;
    }

    console.log(`  ✓ Student created with ID: ${student.id}`);

    // Determine number of applications and essays based on progress
    const applicationCount = Math.floor(mockStudent.application_progress / 10);
    const essayCount = Math.floor(mockStudent.application_progress / 20);

    // Add applications (colleges) using proper foreign key relationship
    if (applicationCount > 0) {
      const selectedColleges = colleges.slice(0, applicationCount);
      for (let i = 0; i < selectedColleges.length; i++) {
        const college = selectedColleges[i];
        const collegeId = collegeIds.get(college.name);

        if (!collegeId) {
          console.error(`    ✗ College ID not found for: ${college.name}`);
          continue;
        }

        // Generate deadline (between 1-6 months from now)
        const daysAhead = 30 + Math.floor(Math.random() * 150);
        const deadline = new Date(Date.now() + daysAhead * 24 * 60 * 60 * 1000);

        const { error: collegeError } = await supabase
          .from('student_colleges')
          .insert({
            student_id: student.id,
            college_id: collegeId,
            application_type: i === 0 ? 'ED' : i === 1 ? 'EA' : 'RD',
            deadline: deadline.toISOString().split('T')[0],
            college_type: college.type,
            application_status: mockStudent.application_progress > 70 ? 'submitted' : 'in_progress',
            application_progress: mockStudent.application_progress,
            application_portal: 'Common App',
          });

        if (!collegeError) {
          console.log(`    ✓ Added college: ${college.name} (deadline: ${deadline.toISOString().split('T')[0]})`);
        } else {
          console.error(`    ✗ Error adding college:`, collegeError);
        }
      }
    }

    // Add essays
    if (essayCount > 0) {
      const selectedPrompts = essayPrompts.slice(0, essayCount);
      for (let i = 0; i < selectedPrompts.length; i++) {
        const wordCount = 400 + Math.floor(Math.random() * 250);
        const isCompleted = mockStudent.application_progress > 60 && i < essayCount - 1;

        const { error: essayError } = await supabase
          .from('essays')
          .insert({
            student_id: student.id,
            counselor_id: DEMO_USER_ID,
            title: `College Essay #${i + 1}`,
            content: isCompleted
              ? `As I reflect on my journey through high school, I realize that ${mockStudent.first_name}'s experiences have shaped who I am today. This essay addresses the following prompt:\n\n"${selectedPrompts[i]}"\n\nThrough various challenges and triumphs, I've learned the value of perseverance and dedication. My academic pursuits have been complemented by meaningful extracurricular activities that have allowed me to grow both personally and intellectually.\n\n[This is a complete mock essay with approximately ${wordCount} words demonstrating strong writing and personal reflection.]`
              : `[Draft in progress for ${mockStudent.first_name}]\n\nPrompt: "${selectedPrompts[i]}"\n\nOutline:\n- Introduction\n- Main body paragraph 1\n- Main body paragraph 2\n- Conclusion\n\n[Working draft - approximately ${wordCount} words when complete]`,
            prompt: selectedPrompts[i],
            word_count: wordCount,
            status: isCompleted ? 'completed' : 'in_progress',
          });

        if (!essayError) {
          console.log(`    ✓ Added essay: College Essay #${i + 1} (${isCompleted ? 'completed' : 'in progress'})`);
        } else {
          console.error(`    ✗ Error adding essay:`, essayError);
        }
      }
    }

    // Add tasks for students with low progress
    if (mockStudent.application_progress < 50) {
      const tasks = [
        {
          title: `Complete college list for ${mockStudent.first_name}`,
          description: 'Research and finalize college application list',
          due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          priority: 'high',
        },
        {
          title: `Review essay drafts with ${mockStudent.first_name}`,
          description: 'Schedule meeting to review and revise essay drafts',
          due_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          priority: 'medium',
        },
      ];

      for (const task of tasks) {
        const { error: taskError } = await supabase
          .from('tasks')
          .insert({
            ...task,
            counselor_id: DEMO_USER_ID,
            student_id: student.id,
            status: 'pending',
          });

        if (!taskError) {
          console.log(`    ✓ Added task: ${task.title}`);
        }
      }
    }

    console.log(`  Summary: ${applicationCount} applications, ${essayCount} essays\n`);
  }

  console.log('Mock data seeding complete!');
}

// Run the seed
seedMockStudents().catch(console.error);
