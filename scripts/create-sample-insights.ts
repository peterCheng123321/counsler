/**
 * Create sample insights for testing
 */

import { createAdminClient } from "../lib/supabase/admin";
import { DEMO_USER_ID } from "../lib/constants";

async function createSampleInsights() {
  const supabase = createAdminClient();

  // First, create an agent run
  const { data: agentRun, error: runError } = await supabase
    .from("agent_runs")
    .insert({
      counselor_id: DEMO_USER_ID,
      run_type: "manual",
      status: "completed",
      started_at: new Date().toISOString(),
      completed_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (runError) {
    console.error("Error creating agent run:", runError);
    return;
  }

  console.log("Created agent run:", agentRun.id);

  // Sample insights for different categories
  const sampleInsights = [
    {
      run_id: agentRun.id,
      counselor_id: DEMO_USER_ID,
      category: "deadline",
      priority: "high",
      finding: "5 application deadlines approaching within the next 7 days",
      recommendation: "Schedule urgent meetings with students to review application status and ensure all materials are ready for submission.",
      status: "active",
    },
    {
      run_id: agentRun.id,
      counselor_id: DEMO_USER_ID,
      category: "student",
      priority: "high",
      finding: "3 high-achieving students (GPA > 3.8) have not started college applications",
      recommendation: "Reach out to these students immediately to begin application process. They have strong profiles but are at risk of missing Early Decision deadlines.",
      status: "active",
    },
    {
      run_id: agentRun.id,
      counselor_id: DEMO_USER_ID,
      category: "progress",
      priority: "medium",
      finding: "Average application progress is 42% - below target of 60% for this time of year",
      recommendation: "Consider hosting group workshops to help students make progress on common application tasks like essays and activity lists.",
      status: "active",
    },
    {
      run_id: agentRun.id,
      counselor_id: DEMO_USER_ID,
      category: "student",
      priority: "medium",
      finding: "7 students have incomplete test score submissions",
      recommendation: "Send reminder emails about SAT/ACT score reporting deadlines. Provide guidance on self-reporting vs. official score sends.",
      status: "active",
    },
    {
      run_id: agentRun.id,
      counselor_id: DEMO_USER_ID,
      category: "recommendation",
      priority: "low",
      finding: "Students applying to UC schools need California-specific essay review",
      recommendation: "Schedule dedicated UC essay workshop focusing on the Personal Insight Questions format and content requirements.",
      status: "active",
    },
    {
      run_id: agentRun.id,
      counselor_id: DEMO_USER_ID,
      category: "deadline",
      priority: "high",
      finding: "Early Decision I deadlines for several reach schools are in 2 weeks",
      recommendation: "Priority check-in with students applying ED - verify essays are finalized, recommendations are submitted, and application fees are paid.",
      status: "active",
    },
    {
      run_id: agentRun.id,
      counselor_id: DEMO_USER_ID,
      category: "risk",
      priority: "high",
      finding: "2 students have 0% application progress despite being seniors",
      recommendation: "URGENT: Schedule immediate one-on-one meetings to understand barriers and create personalized action plans. May need to involve parents.",
      status: "active",
    },
    {
      run_id: agentRun.id,
      counselor_id: DEMO_USER_ID,
      category: "success",
      priority: "low",
      finding: "12 students have completed all Common App schools (100% progress)",
      recommendation: "Celebrate their achievement! Consider having them mentor peers who are struggling with application completion.",
      status: "active",
    },
  ];

  // Insert insights
  const { data: insights, error: insightsError } = await supabase
    .from("agent_insights")
    .insert(sampleInsights)
    .select();

  if (insightsError) {
    console.error("Error creating insights:", insightsError);
    return;
  }

  console.log(`✅ Created ${insights.length} sample insights`);
  console.log("\nInsights by category:");
  const byCategory = insights.reduce((acc: any, insight: any) => {
    acc[insight.category] = (acc[insight.category] || 0) + 1;
    return acc;
  }, {});
  console.log(byCategory);

  console.log("\nInsights by priority:");
  const byPriority = insights.reduce((acc: any, insight: any) => {
    acc[insight.priority] = (acc[insight.priority] || 0) + 1;
    return acc;
  }, {});
  console.log(byPriority);
}

createSampleInsights()
  .then(() => {
    console.log("\n✨ Sample insights created successfully!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Error:", error);
    process.exit(1);
  });
