/**
 * API endpoint to seed mock student data
 * Call with: POST /api/admin/seed-mock-data
 */

import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { DEMO_USER_ID } from '@/lib/constants';

const mockStudents = [
  {
    first_name: 'Emily',
    last_name: 'Rodriguez',
    email: 'emily.rodriguez@demo.com',
    phone: '(555) 123-4567',
    graduation_year: 2025,
    gpa_unweighted: 3.92,
    gpa_weighted: 4.45,
    sat_score: 1520,
    act_score: 34,
    application_progress: 85,
    date_of_birth: '2006-03-15',
    applications: 8,
    essays: 4,
  },
  {
    first_name: 'Marcus',
    last_name: 'Thompson',
    email: 'marcus.thompson@demo.com',
    phone: '(555) 234-5678',
    graduation_year: 2025,
    gpa_unweighted: 3.65,
    gpa_weighted: 3.98,
    sat_score: 1380,
    act_score: 30,
    application_progress: 45,
    date_of_birth: '2006-07-22',
    applications: 4,
    essays: 2,
  },
  {
    first_name: 'Sophia',
    last_name: 'Chen',
    email: 'sophia.chen@demo.com',
    phone: '(555) 345-6789',
    graduation_year: 2025,
    gpa_unweighted: 4.0,
    gpa_weighted: 4.65,
    sat_score: 1560,
    act_score: 35,
    application_progress: 92,
    date_of_birth: '2006-01-10',
    applications: 12,
    essays: 5,
  },
  {
    first_name: 'Jamal',
    last_name: 'Williams',
    email: 'jamal.williams@demo.com',
    phone: '(555) 456-7890',
    graduation_year: 2025,
    gpa_unweighted: 3.45,
    gpa_weighted: 3.72,
    sat_score: 1280,
    act_score: 28,
    application_progress: 25,
    date_of_birth: '2006-09-05',
    applications: 2,
    essays: 1,
  },
  {
    first_name: 'Isabella',
    last_name: 'Garcia',
    email: 'isabella.garcia@demo.com',
    phone: '(555) 567-8901',
    graduation_year: 2025,
    gpa_unweighted: 3.78,
    gpa_weighted: 4.12,
    sat_score: 1450,
    act_score: 32,
    application_progress: 68,
    date_of_birth: '2006-05-18',
    applications: 6,
    essays: 3,
  },
  {
    first_name: 'Liam',
    last_name: 'Anderson',
    email: 'liam.anderson@demo.com',
    phone: '(555) 678-9012',
    graduation_year: 2026,
    gpa_unweighted: 3.58,
    gpa_weighted: 3.85,
    sat_score: 1340,
    act_score: null,
    application_progress: 15,
    date_of_birth: '2007-11-30',
    applications: 1,
    essays: 0,
  },
  {
    first_name: 'Ava',
    last_name: 'Martinez',
    email: 'ava.martinez@demo.com',
    phone: '(555) 789-0123',
    graduation_year: 2026,
    gpa_unweighted: 3.88,
    gpa_weighted: 4.25,
    sat_score: null,
    act_score: 33,
    application_progress: 55,
    date_of_birth: '2007-02-14',
    applications: 5,
    essays: 2,
  },
  {
    first_name: 'Noah',
    last_name: 'Taylor',
    email: 'noah.taylor@demo.com',
    phone: '(555) 890-1234',
    graduation_year: 2026,
    gpa_unweighted: 3.25,
    gpa_weighted: 3.48,
    sat_score: 1180,
    act_score: 26,
    application_progress: 10,
    date_of_birth: '2007-08-20',
    applications: 0,
    essays: 0,
  },
];

const colleges = [
  { name: 'Stanford University', type: 'reach' },
  { name: 'Harvard University', type: 'reach' },
  { name: 'MIT', type: 'reach' },
  { name: 'UC Berkeley', type: 'target' },
  { name: 'UCLA', type: 'target' },
  { name: 'USC', type: 'target' },
  { name: 'UC San Diego', type: 'safety' },
  { name: 'UC Irvine', type: 'safety' },
  { name: 'Yale University', type: 'reach' },
  { name: 'Princeton University', type: 'reach' },
  { name: 'Columbia University', type: 'reach' },
  { name: 'University of Michigan', type: 'target' },
];

const essayPrompts = [
  'Tell us about a personal quality, talent, accomplishment, contribution or experience that is important to you.',
  'Describe the world you come from and how you, as a product of it, might add to the diversity of the university.',
  'What would you say is your greatest talent or skill? How have you developed and demonstrated that talent over time?',
  'Think about an academic subject that inspires you.',
  'What have you done to make your school or your community a better place?',
];

export async function POST() {
  try {
    const supabase = createAdminClient();
    const results: any[] = [];

    for (const mockStudent of mockStudents) {
      const { applications, essays, ...studentData } = mockStudent;

      // Create student
      const { data: student, error: studentError } = await supabase
        .from('students')
        .insert({
          ...studentData,
          counselor_id: DEMO_USER_ID,
        })
        .select()
        .single();

      if (studentError) {
        results.push({ student: `${mockStudent.first_name} ${mockStudent.last_name}`, error: studentError.message });
        continue;
      }

      const studentResult: any = {
        student: `${student.first_name} ${student.last_name}`,
        id: student.id,
        progress: student.application_progress,
        applications: 0,
        essays: 0,
      };

      // Add applications (colleges)
      if (applications > 0) {
        const selectedColleges = colleges.slice(0, applications);
        for (const college of selectedColleges) {
          await supabase.from('student_colleges').insert({
            student_id: student.id,
            counselor_id: DEMO_USER_ID,
            college_name: college.name,
            application_status: student.application_progress > 70 ? 'submitted' : 'in_progress',
            application_type: college.type,
          });
          studentResult.applications++;
        }
      }

      // Add essays
      if (essays > 0) {
        for (let i = 0; i < essays; i++) {
          const prompt = essayPrompts[i % essayPrompts.length];
          const wordCount = 400 + Math.floor(Math.random() * 250);
          await supabase.from('essays').insert({
            student_id: student.id,
            title: `College Essay #${i + 1}`,
            content: `This is a mock essay for ${student.first_name}. Prompt: "${prompt}"\n\n[Essay content - ~${wordCount} words]`,
            prompt,
            word_count: wordCount,
          });
          studentResult.essays++;
        }
      }

      // Add tasks for students with low progress
      if (student.application_progress < 50) {
        await supabase.from('tasks').insert([
          {
            title: `Complete college list for ${student.first_name}`,
            description: 'Research and finalize college application list',
            due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            priority: 'high',
            counselor_id: DEMO_USER_ID,
            student_id: student.id,
            status: 'pending',
          },
        ]);
      }

      results.push(studentResult);
    }

    return NextResponse.json({
      success: true,
      message: 'Mock data seeded successfully',
      results,
    });
  } catch (error) {
    console.error('Error seeding mock data:', error);
    return NextResponse.json(
      { error: 'Failed to seed mock data', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
