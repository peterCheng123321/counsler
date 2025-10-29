/**
 * Demo Data Seeding Script
 * Generates realistic mock data for demonstration purposes
 * Run with: npx tsx scripts/seed_demo.ts
 * 
 * Note: Requires dotenv package for standalone execution: npm install -D dotenv
 * This file is excluded from TypeScript compilation (see tsconfig.json)
 */

// @ts-nocheck
import { createClient } from "@supabase/supabase-js";

// dotenv is optional - Next.js env vars are available at runtime
// For standalone script execution, install dotenv: npm install -D dotenv
// Uncomment the following lines if running as a standalone script:
// import { config } from "dotenv";
// config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error("Missing Supabase environment variables");
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Demo workspace/user ID (we'll use a fixed demo user)
const DEMO_USER_ID = "00000000-0000-0000-0000-000000000001";
const DEMO_WORKSPACE_ID = process.env.DEMO_WORKSPACE_ID || DEMO_USER_ID;

// Student names pool
const FIRST_NAMES = [
  "Emma", "Liam", "Olivia", "Noah", "Ava", "Ethan", "Sophia", "Mason",
  "Isabella", "James", "Mia", "Benjamin", "Charlotte", "Lucas", "Amelia",
  "Henry", "Harper", "Alexander", "Evelyn", "Michael", "Abigail", "Daniel",
  "Emily", "Matthew", "Elizabeth", "Aiden", "Sofia", "Joseph", "Madison",
  "David", "Avery", "Samuel", "Ella", "John", "Scarlett", "Logan"
];

const LAST_NAMES = [
  "Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller",
  "Davis", "Rodriguez", "Martinez", "Hernandez", "Lopez", "Wilson", "Anderson",
  "Thomas", "Taylor", "Moore", "Jackson", "Martin", "Lee", "Thompson", "White",
  "Harris", "Sanchez", "Clark", "Ramirez", "Lewis", "Robinson", "Walker", "Young"
];

const COLLEGES = [
  { name: "Harvard University", city: "Cambridge", state: "MA", acceptanceRate: 3.2 },
  { name: "Stanford University", city: "Stanford", state: "CA", acceptanceRate: 3.95 },
  { name: "MIT", city: "Cambridge", state: "MA", acceptanceRate: 6.7 },
  { name: "Yale University", city: "New Haven", state: "CT", acceptanceRate: 4.6 },
  { name: "Princeton University", city: "Princeton", state: "NJ", acceptanceRate: 3.98 },
  { name: "Columbia University", city: "New York", state: "NY", acceptanceRate: 3.73 },
  { name: "University of Chicago", city: "Chicago", state: "IL", acceptanceRate: 5.9 },
  { name: "University of Pennsylvania", city: "Philadelphia", state: "PA", acceptanceRate: 5.9 },
  { name: "Duke University", city: "Durham", state: "NC", acceptanceRate: 5.1 },
  { name: "Northwestern University", city: "Evanston", state: "IL", acceptanceRate: 7.0 },
  { name: "Cornell University", city: "Ithaca", state: "NY", acceptanceRate: 8.7 },
  { name: "UC Berkeley", city: "Berkeley", state: "CA", acceptanceRate: 11.4 },
  { name: "UCLA", city: "Los Angeles", state: "CA", acceptanceRate: 8.6 },
  { name: "USC", city: "Los Angeles", state: "CA", acceptanceRate: 12.5 },
  { name: "NYU", city: "New York", state: "NY", acceptanceRate: 12.8 },
];

const ACTIVITIES = [
  "Student Council", "Debate Team", "Model UN", "Robotics Club", "Science Olympiad",
  "Math Team", "Band", "Orchestra", "Choir", "Theater", "Drama Club", "Yearbook",
  "Newspaper", "Volunteer Tutoring", "Food Bank Volunteer", "Animal Shelter Volunteer",
  "Varsity Soccer", "Varsity Basketball", "Varsity Tennis", "Varsity Track",
  "Swimming Team", "Chess Club", "Environmental Club", "Key Club", "National Honor Society"
];

function randomChoice<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomFloat(min: number, max: number, decimals: number = 2): number {
  return parseFloat((Math.random() * (max - min) + min).toFixed(decimals));
}

function randomDate(start: Date, end: Date): string {
  const date = new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
  return date.toISOString().split("T")[0];
}

async function ensureDemoUser() {
  // Check if demo user exists
  const { data: existing } = await supabase
    .from("users")
    .select("id")
    .eq("id", DEMO_USER_ID)
    .single();

  if (!existing) {
    // Create demo user (this would normally be done via auth, but for seeding we'll insert directly)
    const { error } = await supabase
      .from("users")
      .insert({
        id: DEMO_USER_ID,
        email: "demo@camp.example.com",
        first_name: "Demo",
        last_name: "Counselor",
        role: "counselor",
      });

    if (error && error.code !== "23505") {
      console.error("Failed to create demo user:", error);
      throw error;
    }
  }
}

async function seedColleges() {
  console.log("Seeding colleges...");
  const collegeIds: Record<string, string> = {};

  for (const college of COLLEGES) {
    const { data, error } = await supabase
      .from("colleges")
      .upsert({
        name: college.name,
        location_city: college.city,
        location_state: college.state,
        location_country: "USA",
        acceptance_rate: college.acceptanceRate,
      }, {
        onConflict: "name,location_city,location_state",
      })
      .select("id")
      .single();

    if (error && error.code !== "23505") {
      console.error(`Failed to seed college ${college.name}:`, error);
    } else if (data) {
      collegeIds[college.name] = data.id;
    }
  }

  return collegeIds;
}

async function seedStudents(count: number = 50) {
  console.log(`Seeding ${count} students...`);
  const students = [];
  const currentYear = new Date().getFullYear();
  const graduationYears = [currentYear + 1, currentYear + 2, currentYear + 3];

  for (let i = 0; i < count; i++) {
    const firstName = randomChoice(FIRST_NAMES);
    const lastName = randomChoice(LAST_NAMES);
    const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}${i}@example.com`;
    const graduationYear = randomChoice(graduationYears);
    const gpaUnweighted = randomFloat(2.5, 4.0);
    const gpaWeighted = gpaUnweighted + randomFloat(0, 0.8);

    const { data, error } = await supabase
      .from("students")
      .insert({
        counselor_id: DEMO_USER_ID,
        first_name: firstName,
        last_name: lastName,
        email,
        phone: `555-${randomInt(100, 999)}-${randomInt(1000, 9999)}`,
        graduation_year: graduationYear,
        gpa_unweighted: parseFloat(gpaUnweighted.toFixed(2)),
        gpa_weighted: parseFloat(gpaWeighted.toFixed(2)),
        application_progress: randomInt(0, 100),
        sat_score: randomInt(1200, 1600),
        act_score: randomInt(25, 36),
      })
      .select("id")
      .single();

    if (error) {
      console.error(`Failed to seed student ${firstName} ${lastName}:`, error);
    } else if (data) {
      students.push({ id: data.id, firstName, lastName, graduationYear });
    }
  }

  return students;
}

async function seedStudentColleges(students: any[], collegeIds: Record<string, string>) {
  console.log("Seeding student-college applications...");
  const applicationTypes = ["ED", "EA", "RD", "Rolling"];
  const collegeTypes = ["Safety", "Target", "Reach"];
  const statuses = ["not_started", "in_progress", "submitted", "accepted", "rejected", "waitlisted"];

  for (const student of students) {
    // Each student applies to 3-8 colleges
    const numColleges = randomInt(3, 8);
    const selectedColleges = Object.entries(collegeIds)
      .sort(() => Math.random() - 0.5)
      .slice(0, numColleges);

    for (const [collegeName, collegeId] of selectedColleges) {
      const deadline = randomDate(
        new Date(),
        new Date(new Date().getFullYear() + 1, 11, 31)
      );

      await supabase.from("student_colleges").insert({
        student_id: student.id,
        college_id: collegeId,
        application_type: randomChoice(applicationTypes),
        deadline,
        college_type: randomChoice(collegeTypes),
        application_status: randomChoice(statuses),
        application_progress: randomInt(0, 100),
        essays_required: randomInt(1, 5),
        essays_completed: randomInt(0, 3),
        lors_required: randomInt(2, 4),
        lors_completed: randomInt(0, 3),
      });
    }
  }
}

async function seedActivities(students: any[]) {
  console.log("Seeding activities...");
  for (const student of students) {
    // Each student has 3-7 activities
    const numActivities = randomInt(3, 7);
    const selectedActivities = ACTIVITIES.sort(() => Math.random() - 0.5).slice(0, numActivities);

    for (const activityName of selectedActivities) {
      await supabase.from("activities").insert({
        student_id: student.id,
        activity_name: activityName,
        position: randomChoice(["Member", "Secretary", "Treasurer", "Vice President", "President"]),
        description: `Active participation in ${activityName}`,
        participation_grades: ["9th", "10th", "11th", "12th"].slice(0, randomInt(1, 4)),
        timing: randomChoice(["school_year", "summer", "year_round"]),
        hours_per_week: randomInt(2, 15),
        weeks_per_year: randomInt(20, 52),
      });
    }
  }
}

async function seedTasks(students: any[]) {
  console.log("Seeding tasks...");
  const taskTemplates = [
    { title: "Review application essay", baseDays: 7 },
    { title: "Submit recommendation request", baseDays: 14 },
    { title: "Complete application form", baseDays: 10 },
    { title: "Follow up on transcript", baseDays: 5 },
    { title: "Schedule interview prep", baseDays: 21 },
    { title: "Review financial aid forms", baseDays: 30 },
    { title: "Submit test scores", baseDays: 14 },
    { title: "Update resume", baseDays: 7 },
  ];

  // Create tasks for students
  for (const student of students) {
    const numTasks = randomInt(5, 15);
    for (let i = 0; i < numTasks; i++) {
      const template = randomChoice(taskTemplates);
      const dueDate = randomDate(
        new Date(),
        new Date(Date.now() + template.baseDays * 24 * 60 * 60 * 1000)
      );
      const status = randomChoice(["pending", "in_progress", "completed"]);
      const priority = randomChoice(["low", "medium", "high"]);

      await supabase.from("tasks").insert({
        counselor_id: DEMO_USER_ID,
        student_id: student.id,
        title: `${template.title} - ${student.firstName} ${student.lastName}`,
        description: `Task for ${student.firstName} ${student.lastName}`,
        due_date: dueDate,
        priority,
        status,
        completed_at: status === "completed" ? new Date().toISOString() : null,
      });
    }
  }

  // Create some general tasks
  for (let i = 0; i < 20; i++) {
    const template = randomChoice(taskTemplates);
    const dueDate = randomDate(
      new Date(),
      new Date(Date.now() + template.baseDays * 24 * 60 * 60 * 1000)
    );

    await supabase.from("tasks").insert({
      counselor_id: DEMO_USER_ID,
      student_id: null,
      title: template.title,
      description: "General task",
      due_date: dueDate,
      priority: randomChoice(["low", "medium", "high"]),
      status: randomChoice(["pending", "in_progress"]),
    });
  }
}

async function seedNotes(students: any[]) {
  console.log("Seeding notes...");
  const noteTypes = ["general", "meeting", "reminder", "priority"];

  for (const student of students) {
    const numNotes = randomInt(2, 8);
    for (let i = 0; i < numNotes; i++) {
      await supabase.from("notes").insert({
        student_id: student.id,
        counselor_id: DEMO_USER_ID,
        note_type: randomChoice(noteTypes),
        content: `Note about ${student.firstName} ${student.lastName}: ${randomChoice([
          "Had a productive meeting about college applications",
          "Discussing application strategy",
          "Reviewing essay drafts",
          "Planning for upcoming deadlines",
          "Following up on recommendations",
        ])}`,
        is_priority: Math.random() > 0.8,
      });
    }
  }
}

async function seedConversations() {
  console.log("Seeding conversations...");
  const conversationTitles = [
    "Application Strategy Discussion",
    "Essay Review Session",
    "College Selection Help",
    "Deadline Planning",
    "General Questions",
  ];

  for (let i = 0; i < 5; i++) {
    const { data, error } = await supabase
      .from("conversations")
      .insert({
        counselor_id: DEMO_USER_ID,
        title: randomChoice(conversationTitles),
      })
      .select("id")
      .single();

    if (data && !error) {
      // Add some messages
      const messages = [
        { role: "user", content: "Hello, I need help with my student applications." },
        {
          role: "assistant",
          content: "I'd be happy to help! What would you like to know about?",
        },
        {
          role: "user",
          content: "Can you show me students with upcoming deadlines?",
        },
      ];

      for (const msg of messages) {
        await supabase.from("messages").insert({
          conversation_id: data.id,
          role: msg.role,
          content: msg.content,
        });
      }
    }
  }
}

async function main() {
  console.log("Starting demo data seeding...");

  try {
    await ensureDemoUser();
    const collegeIds = await seedColleges();
    const students = await seedStudents(50);
    await seedStudentColleges(students, collegeIds);
    await seedActivities(students);
    await seedTasks(students);
    await seedNotes(students);
    await seedConversations();

    console.log("Demo data seeding completed successfully!");
    console.log(`- Seeded ${students.length} students`);
    console.log(`- Seeded ${Object.keys(collegeIds).length} colleges`);
    console.log(`- Demo user ID: ${DEMO_USER_ID}`);
  } catch (error) {
    console.error("Error seeding demo data:", error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

export { main as seedDemo };

