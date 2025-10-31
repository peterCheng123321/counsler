# AI Insights Guide

## What Insights Will The AI Generate?

The AI agent analyzes student data, tasks, and deadlines to generate actionable insights for college counselors. Here's what insights you can expect:

## Insight Categories

### 1. Deadline Insights ⏰
**What triggers them:**
- Tasks approaching due dates (within 7-14 days)
- Clustered deadlines (multiple tasks due on same date)
- Early Decision/Early Action deadlines
- Missing deadlines or overdue tasks

**Example insights:**
```
Finding: "5 application deadlines approaching within the next 7 days"
Recommendation: "Schedule urgent meetings with students to review application
status and ensure all materials are ready for submission."

Finding: "Early Decision I deadlines for several reach schools are in 2 weeks"
Recommendation: "Priority check-in with students applying ED - verify essays
are finalized, recommendations are submitted, and application fees are paid."

Finding: "Deadline cluster detected: 8 tasks due on November 1st"
Recommendation: "Proactively reach out to affected students to help prioritize
and manage workload. Consider extending office hours for that week."
```

**Smart Actions:**
- **View Tasks** → Navigate to tasks page
- **View Calendar** → Open calendar view with deadlines highlighted
- **Set Reminder** → Create reminder for follow-up

---

### 2. Student Insights 👥
**What triggers them:**
- Academic performance patterns (GPA, test scores)
- Application progress anomalies
- Student profile analysis (high-achievers, at-risk)
- Incomplete requirements (essays, test scores, recommendations)

**Example insights:**
```
Finding: "3 high-achieving students (GPA > 3.8) have not started college applications"
Recommendation: "Reach out to these students immediately to begin application
process. They have strong profiles but are at risk of missing Early Decision deadlines."

Finding: "7 students have incomplete test score submissions"
Recommendation: "Send reminder emails about SAT/ACT score reporting deadlines.
Provide guidance on self-reporting vs. official score sends."

Finding: "5 students with strong academics applying only to reach schools"
Recommendation: "Review college lists with these students. Recommend adding
target and safety schools for balanced application strategy."
```

**Smart Actions:**
- **View Students** → Navigate to students page
- **Filter High Achievers** → Pre-filter students by GPA/progress
- **Email Students** → Draft email to affected students
- **Schedule Meeting** → Create meeting tasks

---

### 3. Progress Insights 📊
**What triggers them:**
- Overall application progress below target
- Progress distribution analysis
- Comparison to previous years/benchmarks
- Stagnant progress (no updates in X days)

**Example insights:**
```
Finding: "Average application progress is 42% - below target of 60% for this time of year"
Recommendation: "Consider hosting group workshops to help students make progress
on common application tasks like essays and activity lists."

Finding: "15 students have made no progress in the last 14 days"
Recommendation: "Send automated check-in emails to gauge status. Identify
barriers preventing progress and offer targeted support."

Finding: "Progress for Class of 2025 is 20% ahead of last year's timeline"
Recommendation: "Excellent pace! Share this positive trend with students and
parents. Use momentum to tackle more challenging essay revisions."
```

**Smart Actions:**
- **View Progress** → Navigate to students with progress charts
- **Generate Report** → Export progress summary
- **Send Reminders** → Automated progress check-ins

---

### 4. Risk Insights ⚠️
**What triggers them:**
- Students with 0% or very low progress
- Missing critical deadlines
- GPA drops or concerning grade trends
- Students who stopped responding

**Example insights:**
```
Finding: "2 students have 0% application progress despite being seniors"
Recommendation: "URGENT: Schedule immediate one-on-one meetings to understand
barriers and create personalized action plans. May need to involve parents."

Finding: "4 students missed multiple check-in appointments in the last month"
Recommendation: "Critical engagement issue. Escalate to parents/guardians.
Consider alternative communication channels (text, email, parent meetings)."

Finding: "3 seniors have incomplete college lists 2 weeks before ED deadline"
Recommendation: "Emergency college list sessions required. Block calendar time
this week. Focus on realistic timelines given late start."
```

**Smart Actions:**
- **View At-Risk Students** → Filter students by low progress
- **Schedule Meetings** → Create urgent meeting tasks
- **Contact Parents** → Draft parent communication
- **Create Action Plan** → Generate personalized task list

---

### 5. Success Insights ✅
**What triggers them:**
- Students completing applications ahead of schedule
- 100% progress achievements
- Positive trends and milestones
- College acceptances

**Example insights:**
```
Finding: "12 students have completed all Common App schools (100% progress)"
Recommendation: "Celebrate their achievement! Consider having them mentor peers
who are struggling with application completion."

Finding: "Class of 2025 submitted 40% more Early Action applications than last year"
Recommendation: "Great strategic positioning! Track results and use data to
inform next year's EA/ED guidance."

Finding: "8 students accepted to schools with 95%+ match ratings"
Recommendation: "Validation of personalized college matching system. Share
success stories (with permission) to build trust with current juniors."
```

**Smart Actions:**
- **View Top Performers** → Filter by 90%+ progress
- **Share Success** → Post anonymized success stories
- **Mentor Program** → Pair with struggling students

---

### 6. Recommendation Insights 💡
**What triggers them:**
- Patterns in student profiles suggesting specific actions
- Best practices based on historical data
- Strategic timing for interventions
- Resource optimization

**Example insights:**
```
Finding: "Students applying to UC schools need California-specific essay review"
Recommendation: "Schedule dedicated UC essay workshop focusing on the Personal
Insight Questions format and content requirements."

Finding: "Test-optional strategy being used by 60% of students this year"
Recommendation: "Create updated guidance on test-optional decisions. Host info
session explaining when submitting scores helps vs. hurts applications."

Finding: "Financial aid applications lagging behind admissions progress"
Recommendation: "FAFSA/CSS Profile workshop needed ASAP. Many families unaware
of priority deadlines that differ from admissions deadlines."
```

**Smart Actions:**
- **View Details** → Expand for full context
- **Create Workshop** → Schedule group session
- **Update Resources** → Create/update guidance docs

---

## How Insights Are Generated

### Analytics Tools Used

The AI agent uses these tools to analyze data and generate insights:

1. **get_students / get_tasks** → Query current data
2. **get_upcoming_deadlines** → Deadline monitoring
3. **calculate_statistics** → Compute averages, distributions, trends
4. **trend_analysis** → Identify patterns over time
5. **deadline_monitor** → Proactive deadline checking
6. **generate_insights** → Extract actionable recommendations

### Insight Generation Flow

```
Scheduled Agent Run (daily at 8am)
  ↓
Query all students, tasks, deadlines
  ↓
Calculate statistics:
  - Average progress by graduation year
  - Deadline distribution next 30 days
  - GPA/test score distributions
  - Task completion rates
  ↓
Run analytics tools:
  - Trend analysis (compare to targets)
  - Risk assessment (identify outliers)
  - Pattern detection (common issues)
  ↓
Generate insights with:
  - Category classification
  - Priority assignment (high/medium/low)
  - Specific findings
  - Actionable recommendations
  ↓
Store in database → Display in UI
```

### Insight Priority Levels

**High Priority (Red)** - Immediate action required
- Approaching deadlines within 7 days
- Students at serious risk
- Critical missing requirements
- Urgent escalations needed

**Medium Priority (Amber)** - Action needed soon
- Deadlines 7-14 days out
- Below-target progress
- Incomplete requirements
- Process improvements

**Low Priority (Blue)** - Informational or opportunistic
- Success celebrations
- Best practice recommendations
- Long-term strategic insights
- Optional workshops/resources

---

## Insight Metadata

Each insight can include optional metadata:

```typescript
{
  id: string;
  category: "deadline" | "student" | "progress" | "risk" | "success" | "recommendation";
  priority: "high" | "medium" | "low";
  finding: string;              // What was detected
  recommendation: string;       // What to do about it
  created_at: string;          // When generated

  // Optional metadata:
  affected_count?: number;     // How many students/tasks affected
  related_data?: {
    student_ids?: string[];    // Specific students involved
    task_ids?: string[];       // Specific tasks involved
    deadline_date?: string;    // Relevant deadline
  }
}
```

This metadata enables:
- **Context-aware actions** (e.g., "View 5 affected students")
- **Deep linking** (jump directly to filtered views)
- **Impact assessment** (prioritize by number affected)
- **Tracking** (mark specific students as addressed)

---

## Customizing Insight Generation

### Configuring Agent Runs

The agent can be configured for different run types:

```typescript
// Daily digest - comprehensive analysis
POST /api/cron/agent-run
{
  "runType": "daily_digest"
}

// Deadline monitoring - focused on upcoming deadlines
POST /api/cron/agent-run
{
  "runType": "deadline_monitor"
}

// Risk assessment - identify at-risk students
POST /api/cron/agent-run
{
  "runType": "risk_assessment"
}

// Manual - on-demand analysis
POST /api/cron/agent-run
{
  "runType": "manual"
}
```

### Vercel Cron Schedule (Recommended)

```json
{
  "crons": [
    {
      "path": "/api/cron/agent-run",
      "schedule": "0 8 * * *"  // Daily at 8am - comprehensive
    },
    {
      "path": "/api/cron/agent-run?type=deadline",
      "schedule": "0 */6 * * *"  // Every 6 hours - deadlines
    }
  ]
}
```

---

## Future Insight Types (Roadmap)

### Coming Soon:
- **Essay Quality Insights** - AI analysis of essay strength
- **College Match Insights** - Fit analysis based on profiles
- **Financial Aid Insights** - Scholarship opportunities
- **Peer Comparison Insights** - Anonymous benchmarking
- **Parent Engagement Insights** - Communication patterns
- **Recommendation Letter Insights** - Teacher feedback analysis

### Under Consideration:
- **Predictive Insights** - ML-based outcome predictions
- **Sentiment Analysis** - Detect student stress/burnout
- **Resource Utilization** - Workshop attendance, office hours
- **College Preference Trends** - Popular schools by profile

---

## Best Practices

### For Counselors:
1. **Review insights daily** - Check each morning for new alerts
2. **Expand high-priority first** - Click "Show More" on red badges
3. **Take smart actions** - Use quick action buttons to navigate
4. **Mark done when addressed** - Keep insight list actionable
5. **Dismiss irrelevant** - Clean up to focus on what matters

### For Administrators:
1. **Monitor insight frequency** - Too many = alert fatigue
2. **Tune priority thresholds** - Adjust what triggers high vs. medium
3. **Track action rates** - Which insights get acted upon?
4. **Collect feedback** - Ask counselors what's helpful
5. **Iterate prompts** - Refine agent queries for better insights

---

## Troubleshooting

**No insights showing up?**
- Check agent run history in `/agent-dashboard`
- Verify cron jobs are running
- Ensure database has student/task data
- Test manual run: `POST /api/cron/agent-run`

**Too many insights?**
- Increase insight expiration time
- Raise priority thresholds
- Configure max_insights_per_run limit
- Focus on specific categories

**Insights not relevant?**
- Review agent prompts in `/lib/ai/langgraph-agent.ts`
- Check if tools have correct data access
- Verify analytics calculations
- Consider custom run types

---

## Example Full Insight Flow

```
8:00 AM - Agent runs daily digest
  ↓
Queries: 150 students, 500 tasks
  ↓
Analyzes:
  - 5 deadlines in next 7 days
  - 3 students with GPA > 3.8, progress = 0%
  - Average progress = 42% (target: 60%)
  - 2 students with 0% progress
  ↓
Generates 4 insights:
  1. [HIGH] Deadline alert (5 tasks)
  2. [HIGH] High-achiever risk (3 students)
  3. [MEDIUM] Progress below target (cohort-wide)
  4. [HIGH] At-risk students (2 students)
  ↓
8:02 AM - Insights appear in UI
  ↓
9:00 AM - Counselor logs in
  ↓
Sees "4 new insights" badge
  ↓
Expands high-priority deadline insight
  ↓
Clicks "View Tasks" → Navigates to filtered task list
  ↓
Addresses tasks, marks insight as "Done"
  ↓
Insight moves to history, badge updates to "3 new"
```

---

## Summary

The AI insight system transforms raw data into actionable intelligence by:
- **Automating analysis** - No manual data review needed
- **Prioritizing** - Focus on high-impact actions first
- **Contextualizing** - Smart actions based on insight type
- **Tracking** - Know what's been addressed
- **Scaling** - Works with 10 students or 1,000

This enables counselors to be **proactive instead of reactive**, catching issues before they become crises.
