# Product Requirements Document
## College Application Management Platform (CAMP)

**Document Version:** 1.0  
**Last Updated:** October 28, 2025  
**Product Owner:** [Your Name]  
**Status:** Draft for Review

---

## Table of Contents
1. [Executive Summary](#executive-summary)
2. [Product Vision & Goals](#product-vision--goals)
3. [User Personas](#user-personas)
4. [Design System & Visual Identity](#design-system--visual-identity)
5. [Feature Specifications](#feature-specifications)
6. [Technical Architecture](#technical-architecture)
7. [Backend Architecture & Data Handling](#backend-architecture--data-handling)
8. [API Specifications](#api-specifications)
9. [Real-time Data & Polling Strategy](#real-time-data--polling-strategy)
10. [Security & Compliance](#security--compliance)
11. [Performance Requirements](#performance-requirements)
12. [Agile Deployment Strategy](#agile-deployment-strategy)
13. [Success Metrics](#success-metrics)
14. [Timeline & Milestones](#timeline--milestones)

---

## 1. Executive Summary

### 1.1 Product Overview
College Application Management Platform (CAMP) is a comprehensive web application designed for college counselors and advisors to manage student college applications, track progress, generate Letters of Recommendation (LORs), and coordinate tasks with intelligent AI assistance. The platform provides a modern, intuitive interface with real-time data synchronization and AI-powered insights.

### 1.2 Target Users
- **Primary:** High school college counselors, independent education consultants
- **Secondary:** School administrators, teaching staff involved in college advising
- **Tertiary:** Students (limited view access for transparency)

### 1.3 Core Value Propositions
- Centralized student application tracking with real-time progress monitoring
- AI-powered chatbot for quick information retrieval and LOR generation
- Intelligent task suggestions based on application deadlines
- Streamlined collaboration between counselors, students, and administrators

---

## 2. Product Vision & Goals

### 2.1 Vision Statement
To become the leading college application management platform that empowers counselors to provide personalized, efficient guidance to students through intelligent automation and intuitive design.

### 2.2 Product Goals
1. **Efficiency:** Reduce time spent on administrative tasks by 60%
2. **Accuracy:** Minimize missed deadlines and incomplete applications to <2%
3. **Scale:** Enable counselors to effectively manage 100+ students simultaneously
4. **Intelligence:** Provide AI-driven insights for 80% of routine queries
5. **Collaboration:** Facilitate seamless communication between all stakeholders

### 2.3 Success Criteria (6 months post-launch)
- 500+ active counselor users
- 10,000+ students managed through the platform
- 85%+ user satisfaction rating
- <3 second average page load time
- 99.5% uptime

---

## 3. User Personas

### 3.1 Primary Persona: Sarah - The Overworked Counselor
**Demographics:**
- Age: 35-45
- Role: College Counselor at public high school
- Students: 150+ juniors and seniors

**Pain Points:**
- Overwhelmed by volume of students
- Difficulty tracking application progress across multiple platforms
- Time-consuming LOR writing process
- Missing critical deadlines
- Inefficient communication channels

**Goals:**
- Quick access to student information
- Automated reminders for deadlines
- Streamlined LOR generation
- Real-time progress visibility

**Tech Proficiency:** Moderate (comfortable with web apps, prefers intuitive interfaces)

### 3.2 Secondary Persona: Marcus - The Independent Consultant
**Demographics:**
- Age: 45-55
- Role: Independent college consultant
- Students: 20-30 premium clients

**Pain Points:**
- Need for professional, polished client communications
- Tracking detailed notes across multiple students
- Managing personalized timelines for each student
- Demonstrating value to parents through progress reports

**Goals:**
- Comprehensive student profiles
- Detailed note-taking capabilities
- Custom task management
- Professional presentation of progress

**Tech Proficiency:** High (power user, expects advanced features)

---

## 4. Design System & Visual Identity

### 4.1 Color Palette

#### Primary Colors
```
Primary Blue (Brand):     #2563EB (rgb(37, 99, 235))
  - Primary Hover:        #1D4ED8 (rgb(29, 78, 216))
  - Primary Light:        #DBEAFE (rgb(219, 234, 254))
  - Primary Dark:         #1E40AF (rgb(30, 64, 175))

Secondary Blue:           #0EA5E9 (rgb(14, 165, 233))
  - Secondary Hover:      #0284C7 (rgb(2, 132, 199))
  - Secondary Light:      #E0F2FE (rgb(224, 242, 254))
```

#### Semantic Colors
```
Success Green:            #10B981 (rgb(16, 185, 129))
  - Success Light:        #D1FAE5 (rgb(209, 250, 229))
  
Warning Amber:            #F59E0B (rgb(245, 158, 11))
  - Warning Light:        #FEF3C7 (rgb(254, 243, 199))
  
Error Red:                #EF4444 (rgb(239, 68, 68))
  - Error Light:          #FEE2E2 (rgb(254, 226, 226))
  
Info Purple:              #8B5CF6 (rgb(139, 92, 246))
  - Info Light:           #EDE9FE (rgb(237, 233, 254))
```

#### Neutral Colors
```
Background:               #F8FAFC (rgb(248, 250, 252))
Surface:                  #FFFFFF (rgb(255, 255, 255))
Border:                   #E2E8F0 (rgb(226, 232, 240))

Text Primary:             #0F172A (rgb(15, 23, 42))
Text Secondary:           #475569 (rgb(71, 85, 105))
Text Tertiary:            #94A3B8 (rgb(148, 163, 184))
Text Disabled:            #CBD5E1 (rgb(203, 213, 225))
```

### 4.2 Typography

#### Font Family
```
Primary Font:    Inter (Google Fonts)
Monospace Font:  JetBrains Mono (for code/technical content)
```

#### Font Scale
```
Display Large:   48px / 3rem   | font-weight: 700 | line-height: 1.2
Display Medium:  36px / 2.25rem| font-weight: 700 | line-height: 1.2
Heading 1:       30px / 1.875rem| font-weight: 700 | line-height: 1.3
Heading 2:       24px / 1.5rem | font-weight: 600 | line-height: 1.35
Heading 3:       20px / 1.25rem| font-weight: 600 | line-height: 1.4
Heading 4:       18px / 1.125rem| font-weight: 600 | line-height: 1.45
Body Large:      16px / 1rem   | font-weight: 400 | line-height: 1.6
Body:            14px / 0.875rem| font-weight: 400 | line-height: 1.6
Body Small:      12px / 0.75rem| font-weight: 400 | line-height: 1.5
Caption:         11px / 0.6875rem| font-weight: 400 | line-height: 1.4
```

### 4.3 Spacing System (8px base)
```
xs:  4px   (0.25rem)
sm:  8px   (0.5rem)
md:  16px  (1rem)
lg:  24px  (1.5rem)
xl:  32px  (2rem)
2xl: 48px  (3rem)
3xl: 64px  (4rem)
4xl: 96px  (6rem)
```

### 4.4 Border Radius
```
Small:   4px  (buttons, inputs)
Medium:  8px  (cards, modals)
Large:   12px (major containers)
XLarge:  16px (prominent features)
Full:    9999px (pills, avatars)
```

### 4.5 Shadows
```
Shadow Small:
  box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);

Shadow Medium:
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1),
              0 2px 4px -1px rgba(0, 0, 0, 0.06);

Shadow Large:
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1),
              0 4px 6px -2px rgba(0, 0, 0, 0.05);

Shadow XLarge:
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1),
              0 10px 10px -5px rgba(0, 0, 0, 0.04);
```

### 4.6 Animation Specifications

#### Timing Functions
```
Ease Out:       cubic-bezier(0, 0, 0.2, 1)      [Default for most UI]
Ease In:        cubic-bezier(0.4, 0, 1, 1)      [Exit animations]
Ease In Out:    cubic-bezier(0.4, 0, 0.2, 1)    [Emphasis animations]
Spring:         cubic-bezier(0.34, 1.56, 0.64, 1) [Playful interactions]
```

#### Duration Scale
```
Instant:    100ms   (micro-interactions, hover states)
Fast:       200ms   (tooltips, dropdowns)
Normal:     300ms   (modals, panels)
Slow:       500ms   (page transitions)
Slower:     700ms   (dramatic reveals)
```

#### Animation Patterns

**Fade In:**
```css
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}
/* Usage: animation: fadeIn 300ms ease-out; */
```

**Slide Up:**
```css
@keyframes slideUp {
  from { 
    opacity: 0;
    transform: translateY(16px);
  }
  to { 
    opacity: 1;
    transform: translateY(0);
  }
}
/* Usage: animation: slideUp 300ms ease-out; */
```

**Scale In:**
```css
@keyframes scaleIn {
  from { 
    opacity: 0;
    transform: scale(0.95);
  }
  to { 
    opacity: 1;
    transform: scale(1);
  }
}
/* Usage: animation: scaleIn 200ms ease-out; */
```

**Skeleton Pulse (Loading):**
```css
@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}
/* Usage: animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite; */
```

**Bounce (Attention):**
```css
@keyframes bounce {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-10px); }
}
/* Usage: animation: bounce 500ms ease-in-out; */
```

### 4.7 Icon System

#### Icon Library
**Primary:** Lucide Icons (React Icons library)
- Modern, consistent design language
- 1000+ icons covering all use cases
- Optimized SVG format
- Customizable size and stroke width

#### Icon Sizing
```
xs:  12px  (inline text icons)
sm:  16px  (buttons, navigation)
md:  20px  (feature icons)
lg:  24px  (section headers)
xl:  32px  (prominent features)
2xl: 48px  (empty states, illustrations)
```

#### Icon Usage Guidelines
1. **Navigation Icons:** 20px, 2px stroke width
2. **Action Buttons:** 16px, 2px stroke width  
3. **Status Indicators:** 16px, 2px stroke width, colored
4. **Decorative:** 24px+, 1.5px stroke width

#### Core Icon Set
```
Navigation:
- Home (Home)
- MessageCircle (Chatbot)
- Users (Students)
- CheckSquare (Tasks)
- Settings (Settings)
- Bell (Notifications)

Actions:
- Plus (Add)
- Edit3 (Edit)
- Trash2 (Delete)
- Save (Save)
- X (Close)
- Check (Confirm)
- ChevronDown (Expand)
- ChevronRight (Collapse)
- Search (Search)
- Filter (Filter)
- Download (Export)
- Upload (Import)

Status:
- Circle (Default/Neutral)
- CheckCircle2 (Complete/Success)
- AlertCircle (Warning)
- XCircle (Error)
- Clock (Pending)
- Loader (Loading - animated)

Student Management:
- GraduationCap (Education)
- FileText (Essays)
- Building (Colleges)
- Award (Achievements)
- BookOpen (Transcript)
- Briefcase (Activities)
- User (Profile)
- MessageSquare (Notes)

Tasks & Calendar:
- Calendar (Calendar View)
- List (List View)
- Flag (Priority)
- Clock (Deadline)
- CheckCircle2 (Completed)
- Circle (Incomplete)

AI & Intelligence:
- Sparkles (AI Suggestions)
- Zap (Quick Actions)
- TrendingUp (Progress)
- Target (Goals)
```

### 4.8 Component Library (Design Patterns)

#### Buttons

**Primary Button:**
```css
background: #2563EB;
color: #FFFFFF;
padding: 10px 20px;
border-radius: 8px;
font-weight: 600;
transition: all 200ms ease-out;

hover: {
  background: #1D4ED8;
  transform: translateY(-1px);
  box-shadow: 0 4px 6px -1px rgba(37, 99, 235, 0.3);
}

active: {
  transform: translateY(0);
}
```

**Secondary Button:**
```css
background: transparent;
color: #2563EB;
border: 1px solid #2563EB;
padding: 10px 20px;
border-radius: 8px;
font-weight: 600;
transition: all 200ms ease-out;

hover: {
  background: #DBEAFE;
}
```

**Ghost Button:**
```css
background: transparent;
color: #475569;
padding: 10px 20px;
border-radius: 8px;
font-weight: 500;
transition: all 200ms ease-out;

hover: {
  background: #F1F5F9;
}
```

#### Input Fields
```css
background: #FFFFFF;
border: 1px solid #E2E8F0;
border-radius: 8px;
padding: 10px 14px;
font-size: 14px;
transition: all 200ms ease-out;

focus: {
  border-color: #2563EB;
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
  outline: none;
}

error: {
  border-color: #EF4444;
}
```

#### Cards
```css
background: #FFFFFF;
border: 1px solid #E2E8F0;
border-radius: 12px;
padding: 24px;
box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
transition: all 200ms ease-out;

hover: {
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  transform: translateY(-2px);
}
```

#### Progress Bars
```css
container: {
  background: #E2E8F0;
  height: 8px;
  border-radius: 9999px;
  overflow: hidden;
}

fill: {
  background: linear-gradient(90deg, #2563EB 0%, #0EA5E9 100%);
  height: 100%;
  border-radius: 9999px;
  transition: width 500ms ease-out;
}
```

#### Badges
```css
default: {
  background: #F1F5F9;
  color: #475569;
  padding: 4px 12px;
  border-radius: 9999px;
  font-size: 12px;
  font-weight: 600;
}

success: {
  background: #D1FAE5;
  color: #065F46;
}

warning: {
  background: #FEF3C7;
  color: #92400E;
}

error: {
  background: #FEE2E2;
  color: #991B1B;
}
```

---

## 5. Feature Specifications

### 5.1 Global Navigation Header

#### 5.1.1 Layout
```
┌─────────────────────────────────────────────────────────────┐
│ [Logo] [Chatbot] [Students] [Tasks]      [Search] [🔔] [👤] │
└─────────────────────────────────────────────────────────────┘
```

#### 5.1.2 Components

**Logo Area:**
- Position: Left-aligned, 16px margin
- Dimensions: 120px × 40px
- Logo file: SVG format
- Animation: None (static for performance)
- Click behavior: Navigate to default page (Chatbot)

**Navigation Items:**
- Spacing: 8px between items
- Active state: 
  - Background: rgba(37, 99, 235, 0.1)
  - Border-bottom: 3px solid #2563EB
  - Color: #2563EB
  - Font-weight: 600
- Inactive state:
  - Color: #475569
  - Font-weight: 500
  - Hover: Background: #F1F5F9, color: #2563EB
- Animation: Background transition 200ms ease-out

**Search Bar:**
- Width: 320px
- Placeholder: "Search students, tasks, colleges..."
- Icon: Search icon (left, 16px)
- Keyboard shortcut: Cmd/Ctrl + K
- Behavior:
  - Focus: Expand to 400px width (300ms ease-out)
  - Blur: Contract to 320px
  - Results: Dropdown with max 5 results, click outside to close

**Notification Bell:**
- Icon: Bell (20px)
- Badge: Red dot when unread notifications
- Click: Open dropdown panel (300 × 400px)
- Animation: Gentle shake when new notification arrives

**User Avatar:**
- Size: 32px circle
- Image: User profile photo or initials
- Click: Open dropdown menu
  - Profile
  - Settings
  - Help
  - Logout

---

### 5.2 Page 1: Chatbot

#### 5.2.1 Page Layout
```
┌─────────────────────────────────────────────────────────┐
│ Header Navigation                                        │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  [Chat History Sidebar - 280px]  │ [Chat Area - Flex]   │
│  ┌───────────────────┐           │                      │
│  │ 🔍 Search         │           │  [Message Thread]    │
│  │ ─────────────────│           │                      │
│  │ Today            │           │  ┌────────────────┐  │
│  │ • New conversa...│           │  │ AI: Hi! How... │  │
│  │ • Student John...│           │  └────────────────┘  │
│  │                  │           │                      │
│  │ Yesterday        │           │  ┌────────────────┐  │
│  │ • Generate LOR...│           │  │ You: Tell me...│  │
│  │ • College list...│           │  └────────────────┘  │
│  │                  │           │                      │
│  │ Last 7 Days      │           │  [Suggestion Chips]  │
│  │ • Essay review...│           │                      │
│  └───────────────────┘           │  [Input Box]         │
│                                   │                      │
└───────────────────────────────────────────────────────────┘
```

#### 5.2.2 Comet-Style Chatbot Interface

**Visual Design:**
- Modern gradient background in chat area:
  ```css
  background: radial-gradient(
    circle at top right,
    rgba(37, 99, 235, 0.05) 0%,
    transparent 50%
  );
  ```
- Glassmorphism effect on chat bubbles:
  ```css
  backdrop-filter: blur(10px);
  background: rgba(255, 255, 255, 0.9);
  ```

**Message Bubbles:**

*AI Messages (Left-aligned):*
```css
background: #FFFFFF;
border: 1px solid #E2E8F0;
border-radius: 16px 16px 16px 4px;
padding: 12px 16px;
max-width: 75%;
box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);

animation: slideUp 300ms ease-out;
```

*User Messages (Right-aligned):*
```css
background: linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%);
color: #FFFFFF;
border-radius: 16px 16px 4px 16px;
padding: 12px 16px;
max-width: 75%;
box-shadow: 0 2px 4px rgba(37, 99, 235, 0.2);

animation: slideUp 300ms ease-out;
```

#### 5.2.3 Suggestion Chips

**Display Logic:**
- Show suggestions in 3 scenarios:
  1. On initial load (welcome state)
  2. After AI completes a response
  3. When user hovers over message (contextual suggestions)

**Visual Design:**
```css
container: {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  padding: 16px 0;
}

chip: {
  background: #FFFFFF;
  border: 1px solid #2563EB;
  border-radius: 9999px;
  padding: 8px 16px;
  color: #2563EB;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 200ms ease-out;
}

chip:hover: {
  background: #2563EB;
  color: #FFFFFF;
  transform: translateY(-2px);
  box-shadow: 0 4px 6px rgba(37, 99, 235, 0.3);
}
```

**Default Suggestions (Welcome State):**
```javascript
const welcomeSuggestions = [
  {
    icon: "GraduationCap",
    text: "Show me students applying Early Decision",
    action: "QUERY_STUDENTS",
    params: { filter: "early_decision" }
  },
  {
    icon: "FileText",
    text: "Generate a Letter of Recommendation",
    action: "GENERATE_LOR",
    params: {}
  },
  {
    icon: "Clock",
    text: "What deadlines are coming up this week?",
    action: "QUERY_DEADLINES",
    params: { range: "this_week" }
  },
  {
    icon: "TrendingUp",
    text: "Show application progress summary",
    action: "SHOW_PROGRESS",
    params: {}
  },
  {
    icon: "Building",
    text: "Most popular colleges this year",
    action: "QUERY_COLLEGES",
    params: { sort: "popularity" }
  }
]
```

**Contextual Suggestions (After Response):**
- AI determines relevant follow-up questions based on context
- Maximum 4 suggestions displayed
- Suggestions fade in with stagger animation (100ms delay each)

**Animation Behavior:**
```css
@keyframes chipAppear {
  from {
    opacity: 0;
    transform: scale(0.8) translateY(10px);
  }
  to {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}

/* Apply with stagger */
.chip:nth-child(1) { animation: chipAppear 300ms ease-out 0ms; }
.chip:nth-child(2) { animation: chipAppear 300ms ease-out 100ms; }
.chip:nth-child(3) { animation: chipAppear 300ms ease-out 200ms; }
.chip:nth-child(4) { animation: chipAppear 300ms ease-out 300ms; }
```

#### 5.2.4 Small Icons (At-a-Glance View)

**Inline Icon System:**
Within AI responses, display contextual icons for quick scanning:

```javascript
const inlineIcons = {
  student: {
    icon: "User",
    color: "#2563EB",
    size: "16px",
    tooltip: "Student mention"
  },
  college: {
    icon: "Building",
    color: "#8B5CF6",
    size: "16px",
    tooltip: "College mention"
  },
  deadline: {
    icon: "Clock",
    color: "#F59E0B",
    size: "16px",
    tooltip: "Deadline"
  },
  essay: {
    icon: "FileText",
    color: "#10B981",
    size: "16px",
    tooltip: "Essay"
  },
  completed: {
    icon: "CheckCircle2",
    color: "#10B981",
    size: "16px",
    tooltip: "Completed"
  },
  pending: {
    icon: "Circle",
    color: "#94A3B8",
    size: "16px",
    tooltip: "Pending"
  }
}
```

**Usage Example:**
```
AI: "John Smith has completed 4 of 8 essays for Stanford University. 
     The Common App essay is due in 3 days."

Rendered with icons:
👤 John Smith has completed ✓ 4 of 8 📄 essays for 🏛️ Stanford University.
The Common App essay is due 🕐 in 3 days.
```

**Icon Hover Behavior:**
- Show tooltip on hover (100ms delay)
- Tooltip: White background, small shadow, 12px font
- Click: Navigate to relevant section (student profile, college page, etc.)

#### 5.2.5 Chat History Sidebar

**Structure:**
```
┌────────────────────┐
│ 🔍 Search chats   │
├────────────────────┤
│ + New Chat         │
├────────────────────┤
│ Today              │
│ • Active chat...   │
│ • Student app...   │
├────────────────────┤
│ Yesterday          │
│ • LOR for John...  │
│ • Essay review...  │
├────────────────────┤
│ Last 7 Days        │
│ • College list...  │
│ • Deadline check...│
├────────────────────┤
│ Last 30 Days       │
│ • Monthly report...│
└────────────────────┘
```

**Chat History Item:**
```css
container: {
  padding: 10px 12px;
  border-radius: 8px;
  cursor: pointer;
  transition: background 200ms ease-out;
  display: flex;
  align-items: start;
  gap: 8px;
}

container:hover: {
  background: #F1F5F9;
}

container.active: {
  background: #DBEAFE;
  border-left: 3px solid #2563EB;
}

title: {
  font-size: 14px;
  font-weight: 500;
  color: #0F172A;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

preview: {
  font-size: 12px;
  color: #94A3B8;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

timestamp: {
  font-size: 11px;
  color: #CBD5E1;
}
```

**Search Functionality:**
- Real-time search as user types (debounced 300ms)
- Search across: Chat titles, message content, student names
- Highlight matching text in results
- Clear button appears when text entered

**New Chat Button:**
- Prominent position at top
- Primary blue color
- Icon: Plus
- Click: Create new chat session, clear current conversation
- Keyboard shortcut: Cmd/Ctrl + N

#### 5.2.6 Chat Input Box

**Design:**
```css
container: {
  position: fixed;
  bottom: 0;
  width: calc(100% - 280px); /* Minus sidebar width */
  background: linear-gradient(
    to top,
    rgba(248, 250, 252, 1) 0%,
    rgba(248, 250, 252, 0) 100%
  );
  padding: 24px;
  backdrop-filter: blur(10px);
}

inputWrapper: {
  max-width: 800px;
  margin: 0 auto;
  background: #FFFFFF;
  border: 2px solid #E2E8F0;
  border-radius: 12px;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  transition: all 200ms ease-out;
}

inputWrapper:focus-within: {
  border-color: #2563EB;
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1),
              0 4px 6px -1px rgba(0, 0, 0, 0.1);
}

textarea: {
  width: 100%;
  border: none;
  outline: none;
  padding: 14px;
  font-size: 14px;
  resize: none;
  min-height: 52px;
  max-height: 200px;
  line-height: 1.5;
}

actionBar: {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 14px;
  border-top: 1px solid #E2E8F0;
}
```

**Features:**
1. **Auto-resize:** Textarea expands as user types (max 200px height)
2. **Attachment button:** Left side, allows file uploads
3. **Send button:** Right side, primary blue, disabled until text entered
4. **Character count:** Show when approaching limit (optional)
5. **Keyboard shortcuts:**
   - Enter: Send message
   - Shift + Enter: New line
   - Escape: Clear input

**Loading State:**
While AI is responding:
```css
loadingIndicator: {
  display: flex;
  gap: 4px;
  align-items: center;
  color: #94A3B8;
  font-size: 14px;
}

dot: {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #94A3B8;
  animation: bounce 1.4s infinite ease-in-out;
}

@keyframes bounce {
  0%, 80%, 100% { transform: scale(0); }
  40% { transform: scale(1); }
}

/* Stagger animation for 3 dots */
.dot:nth-child(1) { animation-delay: -0.32s; }
.dot:nth-child(2) { animation-delay: -0.16s; }
```

---

### 5.3 Page 2: Students

#### 5.3.1 Page Layout
```
┌──────────────────────────────────────────────────────────────┐
│ Header Navigation                                             │
├──────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌────────────────────────────────────────────────────────┐  │
│  │ 🔍 Search students...        [Filter ▼] [+ Add Student]│  │
│  └────────────────────────────────────────────────────────┘  │
│                                                               │
│  ┌───────────────────────────────────────────────────────┐   │
│  │ Active Filters:  [EA/ED ×] [Progress: 50%+ ×]        │   │
│  └───────────────────────────────────────────────────────┘   │
│                                                               │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │ [Student Card 1] [Student Card 2] [Student Card 3]      │ │
│  │ [Student Card 4] [Student Card 5] [Student Card 6]      │ │
│  │ [Student Card 7] [Student Card 8] [Student Card 9]      │ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                               │
│  [Load More]                                                  │
│                                                               │
└───────────────────────────────────────────────────────────────┘
```

#### 5.3.2 Student Card Component

**Visual Design:**
```css
card: {
  background: #FFFFFF;
  border: 1px solid #E2E8F0;
  border-radius: 12px;
  padding: 20px;
  transition: all 200ms ease-out;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-height: 240px;
}

card:hover: {
  border-color: #2563EB;
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
  transform: translateY(-4px);
}
```

**Card Structure:**
```
┌──────────────────────────────────┐
│ [Avatar] John Smith              │
│          john.smith@email.com    │
│                                  │
│ Progress: [████████░░] 80%       │
│                                  │
│ 🎯 Applied: 8 colleges           │
│ 📝 Essays: 6/8 complete          │
│ 📋 LOR: 2 requested              │
│                                  │
│ Colleges:                        │
│ [🏛️ MIT] [🏛️ Stanford] [🏛️ Harvard]│
│                                  │
│ Next: Submit Common App (3 days) │
└──────────────────────────────────┘
```

**Detailed Specifications:**

*Header Section:*
```javascript
{
  avatar: {
    size: "48px",
    borderRadius: "50%",
    border: "2px solid #2563EB",
    fallback: "Initials on gradient background"
  },
  name: {
    fontSize: "18px",
    fontWeight: 600,
    color: "#0F172A"
  },
  email: {
    fontSize: "13px",
    color: "#94A3B8"
  }
}
```

*Progress Bar:*
```javascript
{
  container: {
    width: "100%",
    height: "8px",
    background: "#E2E8F0",
    borderRadius: "9999px",
    overflow: "hidden"
  },
  fill: {
    height: "100%",
    background: "linear-gradient(90deg, #2563EB 0%, #0EA5E9 100%)",
    borderRadius: "9999px",
    transition: "width 500ms ease-out"
  },
  label: {
    fontSize: "14px",
    fontWeight: 600,
    color: "#2563EB",
    marginTop: "4px"
  }
}
```

*Stats Section:*
```javascript
{
  stat: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    fontSize: "14px",
    color: "#475569"
  },
  icon: {
    size: "16px",
    color: "#2563EB"
  }
}
```

*College Badges:*
```javascript
{
  container: {
    display: "flex",
    gap: "4px",
    flexWrap: "wrap"
  },
  badge: {
    background: "#DBEAFE",
    color: "#1E40AF",
    padding: "4px 10px",
    borderRadius: "9999px",
    fontSize: "12px",
    fontWeight: 600,
    display: "flex",
    alignItems: "center",
    gap: "4px"
  },
  icon: {
    size: "14px"
  },
  // Show max 3 colleges, then "+N more"
  overflow: {
    background: "#F1F5F9",
    color: "#64748B"
  }
}
```

*Next Deadline:*
```javascript
{
  container: {
    background: "#FEF3C7",
    border: "1px solid #F59E0B",
    borderRadius: "6px",
    padding: "8px 12px",
    fontSize: "13px",
    color: "#92400E",
    fontWeight: 500,
    display: "flex",
    alignItems: "center",
    gap: "6px"
  },
  icon: {
    size: "14px",
    color: "#F59E0B"
  }
}
```

#### 5.3.3 Filter System

**Filter Dropdown Panel:**
```
┌────────────────────────────────┐
│ Filters                    [×] │
├────────────────────────────────┤
│                                │
│ Application Type               │
│ [ ] Early Action               │
│ [ ] Early Decision             │
│ [ ] Regular Decision           │
│ [ ] Rolling                    │
│                                │
│ Progress                       │
│ ( ) All                        │
│ ( ) 0-25%                      │
│ ( ) 26-50%                     │
│ ( ) 51-75%                     │
│ ( ) 76-100%                    │
│                                │
│ College Match                  │
│ [ ] Safety                     │
│ [ ] Target                     │
│ [ ] Reach                      │
│                                │
│ LOR Status                     │
│ [ ] Not Requested              │
│ [ ] Requested                  │
│ [ ] In Progress                │
│ [ ] Completed                  │
│                                │
│ Essay Status                   │
│ [ ] Not Started                │
│ [ ] In Progress                │
│ [ ] Completed                  │
│                                │
│ ┌──────────┐  ┌──────────────┐ │
│ │  Clear   │  │ Apply Filters│ │
│ └──────────┘  └──────────────┘ │
└────────────────────────────────┘
```

**Filter UI Specs:**
```css
panel: {
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  width: 320px;
  background: #FFFFFF;
  border: 1px solid #E2E8F0;
  border-radius: 12px;
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
  padding: 20px;
  z-index: 50;
  animation: slideDown 200ms ease-out;
}

@keyframes slideDown {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

section: {
  margin-bottom: 20px;
}

sectionTitle: {
  fontSize: 14px;
  fontWeight: 600;
  color: #0F172A;
  marginBottom: 8px;
}

checkbox: {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 0;
  cursor: pointer;
}

checkboxInput: {
  width: 18px;
  height: 18px;
  borderRadius: 4px;
  border: 2px solid #2563EB;
  appearance: none;
  cursor: pointer;
  transition: all 200ms ease-out;
}

checkboxInput:checked: {
  background: #2563EB;
  background-image: url("data:image/svg+xml,..."); /* Checkmark SVG */
}
```

**Active Filters Bar:**
Display selected filters as removable chips:
```css
filterChip: {
  background: #DBEAFE;
  color: #1E40AF;
  padding: 6px 12px;
  borderRadius: 9999px;
  fontSize: 13px;
  fontWeight: 500;
  display: inline-flex;
  alignItems: center;
  gap: 6px;
  animation: scaleIn 200ms ease-out;
}

filterChip button {
  background: transparent;
  border: none;
  color: #1E40AF;
  cursor: pointer;
  padding: 0;
  display: flex;
  alignItems: center;
}

filterChip button:hover {
  color: #1E3A8A;
}
```

#### 5.3.4 Search Functionality

**Real-time Search:**
- Debounce: 300ms after last keystroke
- Search fields:
  - Student name (weighted 3x)
  - Email address (weighted 2x)
  - College names (weighted 1x)
  - Notes content (weighted 0.5x)

**Search Behavior:**
```javascript
const searchConfig = {
  debounceMs: 300,
  minChars: 2,
  maxResults: 50,
  highlightMatches: true,
  fuzzyMatch: true, // Allow minor typos
  fuzzyThreshold: 0.7
}

// Example search algorithm
function searchStudents(query) {
  const tokens = query.toLowerCase().split(' ');
  
  return students.filter(student => {
    const searchableText = `
      ${student.name} 
      ${student.email} 
      ${student.colleges.join(' ')}
    `.toLowerCase();
    
    return tokens.every(token => 
      searchableText.includes(token)
    );
  }).sort((a, b) => {
    // Sort by relevance score
    return calculateRelevance(b, query) - calculateRelevance(a, query);
  });
}
```

**Empty State:**
When no results found:
```
┌────────────────────────────────┐
│                                │
│          [🔍 Icon]             │
│                                │
│     No students found          │
│                                │
│  Try adjusting your search     │
│  or filters                    │
│                                │
│  [Clear Filters]               │
│                                │
└────────────────────────────────┘
```

#### 5.3.5 Add Student Flow

**Add Student Button:**
- Position: Top right of page
- Style: Primary button with Plus icon
- Click: Open modal

**Add Student Modal:**
```
┌──────────────────────────────────────┐
│ Add New Student              [×]     │
├──────────────────────────────────────┤
│                                      │
│ First Name *                         │
│ [________________]                   │
│                                      │
│ Last Name *                          │
│ [________________]                   │
│                                      │
│ Email Address *                      │
│ [________________]                   │
│                                      │
│ Graduation Year *                    │
│ [2025 ▼]                            │
│                                      │
│ GPA (Optional)                       │
│ [________________]                   │
│                                      │
│ Notes (Optional)                     │
│ [______________________________]     │
│ [______________________________]     │
│ [______________________________]     │
│                                      │
│        [Cancel]  [Add Student]       │
└──────────────────────────────────────┘
```

**Validation Rules:**
```javascript
const validationRules = {
  firstName: {
    required: true,
    minLength: 2,
    maxLength: 50,
    pattern: /^[a-zA-Z\s'-]+$/
  },
  lastName: {
    required: true,
    minLength: 2,
    maxLength: 50,
    pattern: /^[a-zA-Z\s'-]+$/
  },
  email: {
    required: true,
    pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    unique: true // Check against existing students
  },
  graduationYear: {
    required: true,
    min: new Date().getFullYear(),
    max: new Date().getFullYear() + 5
  },
  gpa: {
    required: false,
    min: 0.0,
    max: 5.0,
    decimals: 2
  }
}
```

---

### 5.4 Subpage: Student View

#### 5.4.1 Layout Structure
```
┌─────────────────────────────────────────────────────────────┐
│ Header Navigation                                            │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  [← Back to Students]                                        │
│                                                              │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ [Avatar] John Smith                    [Edit] [...]│    │
│  │          Senior • Class of 2025                     │    │
│  │          john.smith@email.com                       │    │
│  │                                                     │    │
│  │  Overall Progress: [████████░░] 80%                │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                              │
│  ┌───────────────────────────────────────────────────────┐  │
│  │ [Chatbot] [Colleges] [Essays] [Profile] [Notes]     │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                              │
│  [Tab Content Area]                                          │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

#### 5.4.2 Student Header Component

**Design Specifications:**
```css
container: {
  background: linear-gradient(135deg, #2563EB 0%, #1E40AF 100%);
  borderRadius: 16px;
  padding: 32px;
  color: #FFFFFF;
  marginBottom: 24px;
  position: relative;
  overflow: hidden;
}

/* Background decoration */
container::before: {
  content: "";
  position: absolute;
  top: -50%;
  right: -10%;
  width: 400px;
  height: 400px;
  background: radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%);
  borderRadius: 50%;
}

avatar: {
  width: 80px;
  height: 80px;
  borderRadius: 50%;
  border: 4px solid rgba(255, 255, 255, 0.3);
  marginBottom: 16px;
}

name: {
  fontSize: 28px;
  fontWeight: 700;
  marginBottom: 4px;
}

subtitle: {
  fontSize: 16px;
  opacity: 0.9;
  marginBottom: 2px;
}

progressBar: {
  marginTop: 24px;
  background: rgba(255, 255, 255, 0.2);
  height: 12px;
  borderRadius: 9999px;
  overflow: hidden;
}

progressFill: {
  background: #FFFFFF;
  height: 100%;
  borderRadius: 9999px;
  transition: width 500ms ease-out;
}
```

**Action Buttons:**
```javascript
{
  editButton: {
    position: "absolute",
    top: 32px,
    right: 80px,
    background: "rgba(255, 255, 255, 0.2)",
    backdropFilter: "blur(10px)",
    border: "1px solid rgba(255, 255, 255, 0.3)",
    color: "#FFFFFF",
    padding: "10px 20px",
    borderRadius: 8px,
    transition: "all 200ms ease-out"
  },
  
  moreButton: {
    position: "absolute",
    top: 32px,
    right: 32px,
    // Same styling as editButton
  }
}
```

#### 5.4.3 Tab Navigation

**Tab Bar Design:**
```css
tabBar: {
  display: flex;
  gap: 4px;
  background: #F8FAFC;
  padding: 4px;
  borderRadius: 12px;
  marginBottom: 24px;
}

tab: {
  flex: 1;
  padding: 12px 20px;
  borderRadius: 8px;
  border: none;
  background: transparent;
  color: #64748B;
  fontSize: 14px;
  fontWeight: 600;
  cursor: pointer;
  transition: all 200ms ease-out;
  display: flex;
  alignItems: center;
  justifyContent: center;
  gap: 8px;
}

tab:hover: {
  background: rgba(37, 99, 235, 0.1);
  color: #2563EB;
}

tab.active: {
  background: #FFFFFF;
  color: #2563EB;
  boxShadow: 0 2px 4px rgba(0, 0, 0, 0.05);
}

tabIcon: {
  width: 18px;
  height: 18px;
}
```

**Tab Configuration:**
```javascript
const tabs = [
  {
    id: "chatbot",
    label: "Chatbot",
    icon: "MessageCircle",
    color: "#2563EB"
  },
  {
    id: "colleges",
    label: "Colleges",
    icon: "Building",
    color: "#8B5CF6"
  },
  {
    id: "essays",
    label: "Essays",
    icon: "FileText",
    color: "#10B981"
  },
  {
    id: "profile",
    label: "Profile",
    icon: "User",
    color: "#F59E0B"
  },
  {
    id: "notes",
    label: "Notes",
    icon: "MessageSquare",
    color: "#EF4444"
  }
]
```

#### 5.4.4 Tab 1: Chatbot (LOR Generator)

**Layout:**
```
┌──────────────────────────────────────────────────────┐
│ Chatbot - Letter of Recommendation Generator        │
├──────────────────────────────────────────────────────┤
│                                                      │
│  [Quick Actions]                                     │
│  ┌────────────┐ ┌────────────┐ ┌────────────┐      │
│  │ Generate   │ │ Previous   │ │ LOR        │      │
│  │ New LOR    │ │ LORs       │ │ Templates  │      │
│  └────────────┘ └────────────┘ └────────────┘      │
│                                                      │
│  [Chat Interface]                                    │
│  ┌────────────────────────────────────────────────┐ │
│  │ AI: I can help you generate a Letter of       │ │
│  │     Recommendation for John. What type of      │ │
│  │     program is this for?                       │ │
│  │                                                │ │
│  │     [Computer Science] [Engineering]           │ │
│  │     [Liberal Arts] [Business]                  │ │
│  └────────────────────────────────────────────────┘ │
│                                                      │
│  [Type your message...]                              │
│                                                      │
└──────────────────────────────────────────────────────┘
```

**LOR Generation Flow:**

*Step 1: Initial Prompt*
```javascript
const lorInitialPrompt = {
  message: "I can help you generate a Letter of Recommendation for [Student Name]. Let's gather some information:",
  questions: [
    {
      id: "program_type",
      text: "What type of program is this for?",
      type: "single_choice",
      options: [
        "Computer Science / Engineering",
        "Liberal Arts / Humanities", 
        "Business / Economics",
        "Sciences (Biology, Chemistry, Physics)",
        "Arts / Design",
        "Other"
      ]
    }
  ]
}
```

*Step 2: Relationship Details*
```javascript
{
  question: "How do you know this student?",
  type: "single_choice",
  options: [
    "Teacher (specify subject)",
    "College Counselor",
    "Club/Activity Advisor",
    "Research Supervisor",
    "Coach",
    "Other"
  ]
}
```

*Step 3: Duration & Context*
```javascript
{
  questions: [
    {
      text: "How long have you known this student?",
      type: "text_input",
      placeholder: "e.g., 2 years"
    },
    {
      text: "In what capacity?",
      type: "text_input",
      placeholder: "e.g., AP Chemistry class, Robotics Club advisor"
    }
  ]
}
```

*Step 4: Specific Examples*
```javascript
{
  question: "Can you provide 2-3 specific examples that showcase this student's strengths?",
  type: "multi_line_text",
  placeholder: "Example: Led a team project that resulted in...",
  minExamples: 2
}
```

*Step 5: Generate & Review*
- AI generates complete LOR based on inputs
- Display in formatted document view
- Options: Edit, Regenerate sections, Export (PDF/DOCX)

**Generated LOR Display:**
```css
lorDocument: {
  background: #FFFFFF;
  border: 1px solid #E2E8F0;
  borderRadius: 12px;
  padding: 48px;
  maxWidth: 800px;
  margin: 24px auto;
  boxShadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  fontFamily: "Georgia, serif"; /* Traditional letter font */
}

lorHeader: {
  marginBottom: 32px;
  fontSize: 14px;
  lineHeight: 1.8;
}

lorBody: {
  fontSize: 14px;
  lineHeight: 1.8;
  color: #1E293B;
}

lorParagraph: {
  marginBottom: 16px;
  textAlign: justify;
}
```

**Export Options:**
```javascript
const exportOptions = [
  {
    format: "PDF",
    icon: "FileText",
    action: "exportToPDF"
  },
  {
    format: "DOCX",
    icon: "FileText",
    action: "exportToDOCX"
  },
  {
    format: "Copy to Clipboard",
    icon: "Copy",
    action: "copyToClipboard"
  },
  {
    format: "Email Draft",
    icon: "Mail",
    action: "createEmailDraft"
  }
]
```

#### 5.4.5 Tab 2: Colleges

**Layout:**
```
┌──────────────────────────────────────────────────────┐
│ Colleges                               [+ Add College]│
├──────────────────────────────────────────────────────┤
│                                                      │
│  [Summary Cards]                                     │
│  ┌───────┐ ┌───────┐ ┌───────┐ ┌───────┐          │
│  │ Total │ │ Safety│ │ Target│ │ Reach │          │
│  │   8   │ │   2   │ │   4   │ │   2   │          │
│  └───────┘ └───────┘ └───────┘ └───────┘          │
│                                                      │
│  [View: Grid | List]  [Sort: Deadline ▼] [Filter]   │
│                                                      │
│  ┌────────────────────────────────────────────────┐ │
│  │ 🏛️ Massachusetts Institute of Technology      │ │
│  │                                                │ │
│  │ Type: Reach                                    │ │
│  │ Application: Early Action                      │ │
│  │ Deadline: November 1, 2025 (4 days)          │ │
│  │                                                │ │
│  │ Progress: [████████░░] 75%                    │ │
│  │ ✓ Essays (3/3)  ⚠️ Transcripts  ✓ Test Scores│ │
│  │                                                │ │
│  │ Required Items:                                │ │
│  │ • Common Application Essay                     │ │
│  │ • 2 Supplemental Essays                        │ │
│  │ • Letters of Recommendation (2)                │ │
│  │ • Transcript                                   │
│  │ • SAT/ACT Scores                              │ │
│  │                                                │ │
│  │ [View Details] [Edit] [Remove]                │ │
│  └────────────────────────────────────────────────┘ │
│                                                      │
└──────────────────────────────────────────────────────┘
```

**College Card (Expanded) Specifications:**
```css
collegeCard: {
  background: #FFFFFF;
  border: 1px solid #E2E8F0;
  borderRadius: 12px;
  padding: 24px;
  marginBottom: 16px;
  transition: all 200ms ease-out;
}

collegeCard:hover: {
  boxShadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  transform: translateY(-2px);
}

collegeHeader: {
  display: flex;
  alignItems: center;
  gap: 12px;
  marginBottom: 16px;
}

collegeLogo: {
  width: 48px;
  height: 48px;
  borderRadius: 8px;
  objectFit: cover;
}

collegeName: {
  fontSize: 18px;
  fontWeight: 600;
  color: #0F172A;
}

collegeType: {
  padding: 4px 12px;
  borderRadius: 9999px;
  fontSize: 12px;
  fontWeight: 600;
}

/* Type-specific styling */
.safety: {
  background: #D1FAE5;
  color: #065F46;
}

.target: {
  background: #DBEAFE;
  color: #1E40AF;
}

.reach: {
  background: #FEE2E2;
  color: #991B1B;
}
```

**Add College Modal:**
```
┌──────────────────────────────────────────┐
│ Add College                      [×]     │
├──────────────────────────────────────────┤
│                                          │
│ Search for College                       │
│ [🔍 Search colleges...]                  │
│                                          │
│ Or enter manually:                       │
│                                          │
│ College Name *                           │
│ [_______________________________]        │
│                                          │
│ Application Type *                       │
│ [Early Action ▼]                        │
│ Options: EA, ED, ED II, RD, Rolling      │
│                                          │
│ Deadline Date *                          │
│ [📅 Select date]                         │
│                                          │
│ College Type *                           │
│ ( ) Safety  ( ) Target  ( ) Reach       │
│                                          │
│ Application Portal                       │
│ ( ) Common App                          │
│ ( ) Coalition App                        │
│ ( ) UC Application                       │
│ ( ) Institution-specific                 │
│                                          │
│ Required Materials (check all that apply)│
│ [ ] Common/Coalition Essay               │
│ [ ] Supplemental Essays                  │
│ [ ] Letters of Recommendation            │
│ [ ] Transcript                           │
│ [ ] Test Scores (SAT/ACT)               │
│ [ ] Portfolio                            │
│                                          │
│       [Cancel]  [Add College]            │
└──────────────────────────────────────────┘
```

**College Search API Integration:**
```javascript
// Autocomplete college search
const searchColleges = async (query) => {
  // Call to college database API
  return {
    results: [
      {
        id: "mit_1",
        name: "Massachusetts Institute of Technology",
        location: "Cambridge, MA",
        type: "Private",
        logo_url: "...",
        acceptance_rate: 3.2,
        deadlines: {
          early_action: "2025-11-01",
          regular_decision: "2026-01-01"
        }
      }
      // ... more results
    ]
  }
}
```

#### 5.4.6 Tab 3: Essays

**Layout:**
```
┌──────────────────────────────────────────────────────┐
│ Essays                                 [+ Add Essay]  │
├──────────────────────────────────────────────────────┤
│                                                      │
│  [Filter: All | In Progress | Completed | Overdue]   │
│  [Sort: Deadline | College | Status]                 │
│                                                      │
│  ┌────────────────────────────────────────────────┐ │
│  │ Common Application Essay                 [Edit]│ │
│  │                                                │ │
│  │ Status: ✓ Completed                           │ │
│  │ Word Count: 648/650                           │ │
│  │ Last Edited: Oct 25, 2025                     │ │
│  │                                                │ │
│  │ Prompt: Discuss an accomplishment, event...   │ │
│  │                                                │ │
│  │ [View Essay] [Download] [AI Review]           │ │
│  └────────────────────────────────────────────────┘ │
│                                                      │
│  ┌────────────────────────────────────────────────┐ │
│  │ MIT Supplemental Essay #1           [Edit]     │ │
│  │                                                │ │
│  │ Status: ⚠️ In Progress                        │ │
│  │ Deadline: Nov 1, 2025 (4 days)               │ │
│  │ Word Count: 142/250                           │ │
│  │ Last Edited: Oct 27, 2025                     │ │
│  │                                                │ │
│  │ Prompt: Why MIT?                              │ │
│  │                                                │ │
│  │ [Continue Writing] [AI Feedback]              │ │
│  └────────────────────────────────────────────────┘ │
│                                                      │
└──────────────────────────────────────────────────────┘
```

**Essay Card Specifications:**
```css
essayCard: {
  background: #FFFFFF;
  border: 1px solid #E2E8F0;
  borderRadius: 12px;
  padding: 20px;
  marginBottom: 16px;
}

essayTitle: {
  fontSize: 16px;
  fontWeight: 600;
  color: #0F172A;
  marginBottom: 12px;
}

essayMeta: {
  display: flex;
  flexWrap: wrap;
  gap: 16px;
  marginBottom: 12px;
  fontSize: 14px;
  color: #64748B;
}

essayStatus: {
  display: flex;
  alignItems: center;
  gap: 6px;
  fontWeight: 500;
}

wordCount: {
  fontSize: 14px;
  fontWeight: 600;
}

/* Status-specific colors */
.completed: { color: #10B981; }
.in-progress: { color: #F59E0B; }
.not-started: { color: #94A3B8; }
.overdue: { color: #EF4444; }
```

**Essay Editor Modal:**
Full-screen modal with rich text editor
```
┌──────────────────────────────────────────────────────┐
│ [× Close]    MIT Supplemental Essay #1    [💾 Save] │
├──────────────────────────────────────────────────────┤
│                                                      │
│ Prompt: Why MIT? (250 words)                         │
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━      │
│                                                      │
│ [B] [I] [U] [Align] [Bullets]     142/250 words     │
│                                                      │
│ ┌────────────────────────────────────────────────┐  │
│ │                                                │  │
│ │ [Essay content here with rich text formatting]│  │
│ │                                                │  │
│ │                                                │  │
│ └────────────────────────────────────────────────┘  │
│                                                      │
│ [✨ AI Suggestions Panel]                           │
│ • Consider adding specific examples                  │
│ • This sentence could be more concise               │
│ • Strong opening paragraph                          │
│                                                      │
│ [Request AI Review] [Grammar Check] [Export]         │
│                                                      │
└──────────────────────────────────────────────────────┘
```

**Rich Text Editor Features:**
- Auto-save every 30 seconds
- Version history
- Word/character counter (live update)
- Basic formatting: Bold, italic, underline
- Grammar and spelling checker (integration with LanguageTool API)
- AI-powered suggestions sidebar
- Export to PDF/DOCX

#### 5.4.7 Tab 4: Profile

**Layout with Sub-sections:**
```
┌──────────────────────────────────────────────────────┐
│ Profile                                              │
├──────────────────────────────────────────────────────┤
│                                                      │
│  [Basic Info] [Resume] [Activities] [Transcript]     │
│                                                      │
│  ─── Basic Information ─────────────────────────     │
│  Name: John Smith                          [Edit]    │
│  Email: john.smith@email.com                         │
│  Phone: (555) 123-4567                               │
│  Date of Birth: Jan 15, 2007                         │
│  Graduation Year: 2025                               │
│                                                      │
│  Academic Information                                │
│  GPA: 3.95 (Unweighted) / 4.42 (Weighted)           │
│  Class Rank: 12/450 (Top 3%)                        │
│  SAT: 1520 (EBRW: 760, Math: 760)                   │
│  ACT: Not taken                                      │
│                                                      │
│  ─── Resume ────────────────────────────────────     │
│  Status: ✓ Uploaded                                  │
│  File: John_Smith_Resume_2025.pdf                    │
│  Uploaded: Oct 20, 2025                              │
│  [View] [Download] [Replace]                         │
│                                                      │
│  ─── Activities ────────────────────────────────     │
│  ┌────────────────────────────────────────────────┐ │
│  │ Robotics Team - Team Captain                   │ │
│  │ 9th-12th Grade • 15 hrs/week • Year-round      │ │
│  │                                                │ │
│  │ Led team of 12 students to state championship │ │
│  │ [Edit] [Remove]                                │ │
│  └────────────────────────────────────────────────┘ │
│  [+ Add Activity]                                    │
│                                                      │
│  ─── Transcript ────────────────────────────────     │
│  Status: ⚠️ Requested from school                   │
│  Requested Date: Oct 15, 2025                        │
│  Expected: Oct 30, 2025                              │
│  [Upload Unofficial] [Mark as Received]              │
│                                                      │
└──────────────────────────────────────────────────────┘
```

**Sub-section: Activities**

Activity Card:
```css
activityCard: {
  background: #F8FAFC;
  border: 1px solid #E2E8F0;
  borderRadius: 8px;
  padding: 16px;
  marginBottom: 12px;
}

activityTitle: {
  fontSize: 16px;
  fontWeight: 600;
  color: #0F172A;
  marginBottom: 4px;
}

activityDetails: {
  fontSize: 13px;
  color: #64748B;
  marginBottom: 8px;
}

activityDescription: {
  fontSize: 14px;
  color: #475569;
  lineHeight: 1.6;
}
```

Add Activity Form:
```javascript
const activityFields = [
  {
    name: "activity_name",
    label: "Activity Name",
    type: "text",
    required: true,
    placeholder: "e.g., Robotics Team, Student Government"
  },
  {
    name: "position",
    label: "Position/Leadership",
    type: "text",
    placeholder: "e.g., Team Captain, President"
  },
  {
    name: "participation_grade",
    label: "Participation Grade Levels",
    type: "multi_select",
    options: ["9th", "10th", "11th", "12th", "Post-Graduate"]
  },
  {
    name: "timing",
    label: "Timing",
    type: "select",
    options: [
      "School year",
      "Summer only",
      "Year-round",
      "Fall only",
      "Spring only"
    ]
  },
  {
    name: "hours_per_week",
    label: "Hours per Week",
    type: "number",
    min: 0,
    max: 168
  },
  {
    name: "weeks_per_year",
    label: "Weeks per Year",
    type: "number",
    min: 0,
    max: 52
  },
  {
    name: "description",
    label: "Description & Achievements",
    type: "textarea",
    maxLength: 150,
    placeholder: "Describe your involvement and any notable achievements"
  }
]
```

#### 5.4.8 Tab 5: Notes

**Layout:**
```
┌──────────────────────────────────────────────────────┐
│ Notes                                  [+ Add Note]  │
├──────────────────────────────────────────────────────┤
│                                                      │
│  [Filter: All | Meeting Notes | Reminders | General] │
│  [Sort: Newest | Oldest | Priority]                  │
│                                                      │
│  ┌────────────────────────────────────────────────┐ │
│  │ 📌 Priority                           Oct 28    │ │
│  │                                                │ │
│  │ Meeting with parents - discussed timeline      │ │
│  │                                                │ │
│  │ Key points:                                    │ │
│  │ • Parents prefer ED to MIT                     │ │
│  │ • Need to accelerate essay timeline            │ │
│  │ • Schedule follow-up for Nov 5                 │ │
│  │                                                │ │
│  │ [Edit] [Delete] [Add Reminder]                │ │
│  └────────────────────────────────────────────────┘ │
│                                                      │
│  ┌────────────────────────────────────────────────┐ │
│  │ 📝 General                            Oct 25    │ │
│  │                                                │ │
│  │ Strong candidate for competitive programs      │ │
│  │                                                │ │
│  │ [Edit] [Delete]                                │ │
│  └────────────────────────────────────────────────┘ │
│                                                      │
└──────────────────────────────────────────────────────┘
```

**Note Card:**
```css
noteCard: {
  background: #FFFEF0; /* Subtle yellow tint like sticky notes */
  border: 1px solid #FDE68A;
  borderRadius: 8px;
  padding: 16px;
  marginBottom: 12px;
  position: relative;
}

noteCard::before: {
  /* Corner fold effect */
  content: "";
  position: absolute;
  top: 0;
  right: 0;
  width: 0;
  height: 0;
  borderStyle: solid;
  borderWidth: 0 16px 16px 0;
  borderColor: transparent #F59E0B transparent transparent;
}

noteHeader: {
  display: flex;
  justifyContent: space-between;
  alignItems: center;
  marginBottom: 12px;
}

noteType: {
  display: flex;
  alignItems: center;
  gap: 6px;
  fontSize: 13px;
  fontWeight: 600;
  color: #92400E;
}

noteDate: {
  fontSize: 12px;
  color: #78716C;
}

noteContent: {
  fontSize: 14px;
  color: #1C1917;
  lineHeight: 1.6;
}
```

**Add Note Modal:**
```
┌──────────────────────────────────────────┐
│ Add Note                         [×]     │
├──────────────────────────────────────────┤
│                                          │
│ Note Type                                │
│ ( ) General                             │
│ ( ) Meeting Notes                        │
│ ( ) Reminder                             │
│ ( ) Priority                             │
│                                          │
│ Note Content                             │
│ [_________________________________]      │
│ [_________________________________]      │
│ [_________________________________]      │
│ [_________________________________]      │
│                                          │
│ [ ] Set reminder for this note          │
│     Reminder Date: [📅 Select]          │
│                                          │
│       [Cancel]  [Save Note]              │
└──────────────────────────────────────────┘
```

---

### 5.5 Page 3: Tasks

#### 5.5.1 Page Layout
```
┌──────────────────────────────────────────────────────────┐
│ Header Navigation                                         │
├──────────────────────────────────────────────────────────┤
│                                                           │
│  Tasks                                    [+ Add Task]    │
│                                                           │
│  ┌─────────────────────────────────────────────────────┐ │
│  │ [Calendar View] [List View]     [This Week ▼]      │ │
│  └─────────────────────────────────────────────────────┘ │
│                                                           │
│  ─── Upcoming Deadlines ────────────────────────────     │
│  ┌─────────────┬─────────────┬─────────────┐            │
│  │ Nov 1       │ Nov 5       │ Nov 15      │            │
│  │ 3 deadlines │ 1 deadline  │ 2 deadlines │            │
│  └─────────────┴─────────────┴─────────────┘            │
│                                                           │
│  [AI Suggested Tasks] ✨                                 │
│  • Request transcript for John Smith (MIT deadline in 4d)│
│  • Follow up on LOR from Ms. Johnson                     │
│  • Review Sarah's Common App essay                       │
│                                                           │
│  ─── Calendar View ─────────────────────────────────     │
│                                                           │
│  [October 2025 Calendar]                                 │
│                                                           │
└───────────────────────────────────────────────────────────┘
```

#### 5.5.2 View Switcher

**Toggle Design:**
```css
viewSwitcher: {
  display: flex;
  gap: 8px;
  background: #F1F5F9;
  padding: 4px;
  borderRadius: 8px;
}

viewButton: {
  padding: 8px 16px;
  borderRadius: 6px;
  border: none;
  background: transparent;
  color: #64748B;
  fontSize: 14px;
  fontWeight: 600;
  cursor: pointer;
  transition: all 200ms ease-out;
  display: flex;
  alignItems: center;
  gap: 6px;
}

viewButton.active: {
  background: #FFFFFF;
  color: #2563EB;
  boxShadow: 0 1px 2px rgba(0, 0, 0, 0.05);
}
```

#### 5.5.3 Upcoming Deadlines Bar

**Design:**
Prominent visual section showing imminent deadlines
```css
deadlinesBar: {
  display: flex;
  gap: 16px;
  marginBottom: 32px;
  overflowX: auto;
  padding: 4px;
}

deadlineCard: {
  minWidth: 200px;
  background: linear-gradient(135deg, #2563EB 0%, #1E40AF 100%);
  color: #FFFFFF;
  borderRadius: 12px;
  padding: 20px;
  cursor: pointer;
  transition: all 200ms ease-out;
}

deadlineCard:hover: {
  transform: translateY(-4px);
  boxShadow: 0 10px 15px -3px rgba(37, 99, 235, 0.4);
}

deadlineDate: {
  fontSize: 24px;
  fontWeight: 700;
  marginBottom: 8px;
}

deadlineCount: {
  fontSize: 14px;
  opacity: 0.9;
}

deadlineItems: {
  marginTop: 12px;
  fontSize: 13px;
  display: flex;
  flexDirection: column;
  gap: 4px;
}
```

**Click Behavior:**
Clicking a deadline card:
1. Scrolls to that date in calendar view (if in calendar mode)
2. Filters tasks to show only that date (if in list mode)
3. Highlights relevant tasks with animation

#### 5.5.4 AI Suggested Tasks

**Panel Design:**
```css
aiSuggestionsPanel: {
  background: linear-gradient(
    135deg,
    rgba(139, 92, 246, 0.1) 0%,
    rgba(37, 99, 235, 0.1) 100%
  );
  border: 1px solid #C7D2FE;
  borderRadius: 12px;
  padding: 20px;
  marginBottom: 32px;
}

aiTitle: {
  display: flex;
  alignItems: center;
  gap: 8px;
  fontSize: 16px;
  fontWeight: 600;
  color: #1E40AF;
  marginBottom: 16px;
}

aiIcon: {
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}
```

**Suggested Task Item:**
```css
suggestedTask: {
  background: #FFFFFF;
  border: 1px solid #E0E7FF;
  borderRadius: 8px;
  padding: 12px 16px;
  marginBottom: 8px;
  display: flex;
  justifyContent: space-between;
  alignItems: center;
  transition: all 200ms ease-out;
}

suggestedTask:hover: {
  borderColor: #2563EB;
  boxShadow: 0 2px 4px rgba(37, 99, 235, 0.1);
}

taskText: {
  fontSize: 14px;
  color: #1E293B;
  flex: 1;
}

taskActions: {
  display: flex;
  gap: 8px;
}

acceptButton: {
  background: #2563EB;
  color: #FFFFFF;
  border: none;
  borderRadius: 6px;
  padding: 6px 12px;
  fontSize: 13px;
  fontWeight: 600;
  cursor: pointer;
}

dismissButton: {
  background: transparent;
  color: #64748B;
  border: none;
  padding: 6px;
  cursor: pointer;
}
```

**AI Task Generation Logic:**
```javascript
const generateAISuggestions = (students, tasks, currentDate) => {
  const suggestions = [];
  
  // Rule 1: Upcoming deadlines without associated tasks
  students.forEach(student => {
    student.colleges.forEach(college => {
      const daysUntilDeadline = dateDiff(currentDate, college.deadline);
      
      if (daysUntilDeadline <= 7 && daysUntilDeadline > 0) {
        // Check if transcript requested
        if (!college.transcriptRequested) {
          suggestions.push({
            type: "deadline_alert",
            priority: "high",
            text: `Request transcript for ${student.name} (${college.name} deadline in ${daysUntilDeadline}d)`,
            action: "create_task",
            metadata: {
              studentId: student.id,
              collegeId: college.id,
              taskType: "transcript_request"
            }
          });
        }
      }
    });
  });
  
  // Rule 2: Incomplete LOR requests
  // Rule 3: Essay review reminders
  // Rule 4: Follow-up on pending items
  
  return suggestions.slice(0, 5); // Max 5 suggestions
}
```

#### 5.5.5 Calendar View

**Full Month Calendar:**
```
┌───────────────────────────────────────────────────┐
│  [< October 2025 >]                               │
├───────────────────────────────────────────────────┤
│ Sun   Mon   Tue   Wed   Thu   Fri   Sat         │
├───────────────────────────────────────────────────┤
│       1     2     3     4     5     6            │
│       •           •                              │
│                                                   │
│ 7     8     9     10    11    12    13           │
│       ••                •                        │
│                                                   │
│ 14    15    16    17    18    19    20           │
│                         •     •••                │
│                                                   │
│ 21    22    23    24    25    26    27           │
│             •                 ••                 │
│                                                   │
│ 28    29    30    31                             │
│ •     •••   •                                    │
└───────────────────────────────────────────────────┘
```

**Calendar Cell Design:**
```css
calendarGrid: {
  display: grid;
  gridTemplateColumns: repeat(7, 1fr);
  gap: 8px;
}

calendarCell: {
  minHeight: 120px;
  background: #FFFFFF;
  border: 1px solid #E2E8F0;
  borderRadius: 8px;
  padding: 8px;
  cursor: pointer;
  transition: all 200ms ease-out;
}

calendarCell:hover: {
  borderColor: #2563EB;
  boxShadow: 0 2px 4px rgba(37, 99, 235, 0.1);
}

calendarCell.today: {
  background: linear-gradient(
    135deg,
    rgba(37, 99, 235, 0.1) 0%,
    rgba(14, 165, 233, 0.1) 100%
  );
  borderColor: #2563EB;
  borderWidth: 2px;
}

dateNumber: {
  fontSize: 14px;
  fontWeight: 600;
  color: #1E293B;
  marginBottom: 8px;
}

taskIndicators: {
  display: flex;
  flexDirection: column;
  gap: 4px;
}

taskDot: {
  width: 6px;
  height: 6px;
  borderRadius: 50%;
  background: #2563EB;
}

/* Different colors for task types */
.deadline: { background: #EF4444; }
.task: { background: #2563EB; }
.meeting: { background: #10B981; }
.reminder: { background: #F59E0B; }

taskPreview: {
  fontSize: 11px;
  color: #64748B;
  overflow: hidden;
  textOverflow: ellipsis;
  whiteSpace: nowrap;
}
```

**Date Click Behavior:**
Opens day detail modal:
```
┌──────────────────────────────────────────┐
│ October 28, 2025                 [×]     │
├──────────────────────────────────────────┤
│                                          │
│ Tasks for this day:                      │
│                                          │
│ ┌────────────────────────────────────┐  │
│ │ ⚠️ High Priority                   │  │
│ │ Request MIT transcript for John    │  │
│ │ Due: 5:00 PM                       │  │
│ │ [Edit] [Complete]                  │  │
│ └────────────────────────────────────┘  │
│                                          │
│ ┌────────────────────────────────────┐  │
│ │ Review Sarah's Common App essay    │  │
│ │ Due: End of day                    │  │
│ │ [Edit] [Complete]                  │  │
│ └────────────────────────────────────┘  │
│                                          │
│ [+ Add Task for this day]                │
│                                          │
└──────────────────────────────────────────┘
```

#### 5.5.6 List View

**Task List Design:**
```
┌──────────────────────────────────────────────────────┐
│ [All] [Today] [This Week] [Overdue] [Completed]      │
├──────────────────────────────────────────────────────┤
│                                                      │
│ Today - October 28                                   │
│ ┌────────────────────────────────────────────────┐  │
│ │ [✓] Request MIT transcript for John Smith      │  │
│ │     Due: 5:00 PM • Priority: High              │  │
│ │     Assigned to: Me                            │  │
│ │     [View Details] [Edit] [Delete]             │  │
│ └────────────────────────────────────────────────┘  │
│                                                      │
│ ┌────────────────────────────────────────────────┐  │
│ │ [ ] Review Sarah's Common App essay            │  │
│ │     Due: 11:59 PM • Priority: Medium           │  │
│ │     [View Details] [Edit] [Delete]             │  │
│ └────────────────────────────────────────────────┘  │
│                                                      │
│ Tomorrow - October 29                                │
│ ┌────────────────────────────────────────────────┐  │
│ │ [ ] Follow up with Ms. Johnson on LOR          │  │
│ │     Due: 3:00 PM • Priority: High              │  │
│ │     [View Details] [Edit] [Delete]             │  │
│ └────────────────────────────────────────────────┘  │
│                                                      │
└──────────────────────────────────────────────────────┘
```

**Task Item Design:**
```css
taskItem: {
  background: #FFFFFF;
  border: 1px solid #E2E8F0;
  borderLeft: 4px solid #2563EB;  /* Priority indicator */
  borderRadius: 8px;
  padding: 16px;
  marginBottom: 12px;
  display: flex;
  alignItems: start;
  gap: 12px;
  transition: all 200ms ease-out;
}

taskItem:hover: {
  boxShadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  transform: translateX(4px);
}

/* Priority colors for left border */
.priority-high: { borderLeftColor: #EF4444; }
.priority-medium: { borderLeftColor: #F59E0B; }
.priority-low: { borderLeftColor: #10B981; }

checkbox: {
  width: 20px;
  height: 20px;
  borderRadius: 4px;
  border: 2px solid #2563EB;
  cursor: pointer;
  flexShrink: 0;
}

checkbox:checked: {
  background: #2563EB;
  backgroundImage: url("data:image/svg+xml,...");
}

taskContent: {
  flex: 1;
}

taskTitle: {
  fontSize: 15px;
  fontWeight: 600;
  color: #0F172A;
  marginBottom: 6px;
}

taskMeta: {
  display: flex;
  gap: 16px;
  fontSize: 13px;
  color: #64748B;
}
```

**Completed Tasks:**
```css
taskItem.completed: {
  opacity: 0.6;
}

taskItem.completed .taskTitle: {
  textDecoration: line-through;
  color: #94A3B8;
}
```

#### 5.5.7 Add/Edit Task Modal

**Modal Layout:**
```
┌──────────────────────────────────────────────────┐
│ Add Task                                 [×]     │
├──────────────────────────────────────────────────┤
│                                                  │
│ Task Title *                                     │
│ [_________________________________________]      │
│                                                  │
│ Description                                      │
│ [_________________________________________]      │
│ [_________________________________________]      │
│ [_________________________________________]      │
│                                                  │
│ Related Student (Optional)                       │
│ [Select student ▼]                              │
│                                                  │
│ Due Date *                      Time             │
│ [📅 Oct 28, 2025]              [🕐 5:00 PM ▼]   │
│                                                  │
│ Priority                                         │
│ ( ) Low  (•) Medium  ( ) High                   │
│                                                  │
│ Comments/Notes                                   │
│ [_________________________________________]      │
│ [_________________________________________]      │
│                                                  │
│ Reminders                                        │
│ [ ] Email reminder 1 day before                 │
│ [ ] Email reminder 1 hour before                │
│ [ ] Push notification 15 minutes before         │
│                                                  │
│       [Cancel]  [Save Task]                      │
└──────────────────────────────────────────────────┘
```

**Field Specifications:**
```javascript
const taskFormFields = {
  title: {
    type: "text",
    required: true,
    maxLength: 200,
    placeholder: "e.g., Request transcript for John Smith"
  },
  description: {
    type: "textarea",
    required: false,
    maxLength: 1000,
    rows: 3
  },
  studentId: {
    type: "select",
    required: false,
    options: "dynamic", // Load from students list
    placeholder: "Select a student (optional)"
  },
  dueDate: {
    type: "date",
    required: true,
    min: "today"
  },
  dueTime: {
    type: "time",
    required: false,
    default: "23:59"
  },
  priority: {
    type: "radio",
    options: ["low", "medium", "high"],
    default: "medium"
  },
  comments: {
    type: "textarea",
    required: false,
    maxLength: 500,
    rows: 2
  },
  reminders: {
    type: "multi_checkbox",
    options: [
      { value: "1day", label: "Email reminder 1 day before" },
      { value: "1hour", label: "Email reminder 1 hour before" },
      { value: "15min", label: "Push notification 15 minutes before" }
    ]
  }
}
```

---

## 6. Technical Architecture

### 6.1 System Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                    CLIENT LAYER                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │   Web App    │  │  Mobile App  │  │ Desktop App  │  │
│  │  (React)     │  │ (React Native)│  │  (Electron)  │  │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘  │
└─────────┼──────────────────┼──────────────────┼─────────┘
          │                  │                  │
          └──────────────────┼──────────────────┘
                             │ HTTPS/WSS
                             │
┌────────────────────────────┼──────────────────────────────┐
│                    API GATEWAY LAYER                      │
│  ┌────────────────────────┴────────────────────────────┐ │
│  │          NGINX / API Gateway                        │ │
│  │  - Load Balancing                                   │ │
│  │  - SSL Termination                                  │ │
│  │  - Rate Limiting                                    │ │
│  │  - Request Routing                                  │ │
│  └────────────┬─────────────────────┬──────────────────┘ │
└───────────────┼─────────────────────┼────────────────────┘
                │                     │
       REST API │                     │ WebSocket
                │                     │
┌───────────────┼─────────────────────┼────────────────────┐
│           APPLICATION LAYER                              │
│  ┌────────────┴──────────┐  ┌──────┴─────────────────┐  │
│  │   API Server          │  │  WebSocket Server      │  │
│  │   (Node.js/Express)   │  │  (Socket.io)           │  │
│  │                       │  │                        │  │
│  │  - Authentication     │  │  - Real-time updates   │  │
│  │  - Business Logic     │  │  - Notifications       │  │
│  │  - Data Validation    │  │  - Live polling        │  │
│  └───────────┬───────────┘  └────────┬───────────────┘  │
└──────────────┼──────────────────────┼───────────────────┘
               │                      │
               └──────────┬───────────┘
                          │
┌─────────────────────────┼──────────────────────────────┐
│                  SERVICE LAYER                         │
│  ┌──────────┐  ┌──────────┐  ┌─────────┐  ┌─────────┐ │
│  │   AI     │  │  Email   │  │  File   │  │  Cron   │ │
│  │ Service  │  │ Service  │  │ Storage │  │ Jobs    │ │
│  │          │  │          │  │ Service │  │         │ │
│  └──────────┘  └──────────┘  └─────────┘  └─────────┘ │
└────────────────────────┬──────────────────────────────┘
                         │
┌────────────────────────┼──────────────────────────────┐
│                    DATA LAYER                          │
│  ┌──────────────┐  ┌──────────────┐  ┌─────────────┐ │
│  │  PostgreSQL  │  │    Redis     │  │   S3/Blob   │ │
│  │  (Primary DB)│  │  (Cache)     │  │  (Files)    │ │
│  └──────────────┘  └──────────────┘  └─────────────┘ │
└───────────────────────────────────────────────────────┘
```

### 6.2 Technology Stack

#### 6.2.1 Frontend
```javascript
const frontendStack = {
  framework: "React 18.2+",
  language: "TypeScript 5.0+",
  stateManagement: "Redux Toolkit + RTK Query",
  routing: "React Router v6",
  uiComponents: "Custom components + Headless UI",
  styling: "Tailwind CSS 3.3+",
  forms: "React Hook Form + Zod validation",
  dateTime: "date-fns",
  charts: "Recharts",
  icons: "Lucide React",
  richTextEditor: "Tiptap",
  websockets: "Socket.io-client",
  http: "Axios with interceptors",
  build: "Vite",
  testing: "Vitest + React Testing Library",
  e2e: "Playwright"
}
```

#### 6.2.2 Backend
```javascript
const backendStack = {
  runtime: "Node.js 20 LTS",
  framework: "Express.js 4.18+",
  language: "TypeScript 5.0+",
  database: "PostgreSQL 15+",
  orm: "Prisma 5+",
  cache: "Redis 7+",
  websockets: "Socket.io 4+",
  authentication: "JWT (jsonwebtoken)",
  validation: "Zod",
  fileStorage: "AWS S3 / Azure Blob Storage",
  emailService: "SendGrid / AWS SES",
  aiIntegration: "Anthropic Claude API",
  scheduling: "node-cron",
  logging: "Winston + Morgan",
  monitoring: "Prometheus + Grafana",
  errorTracking: "Sentry",
  testing: "Jest + Supertest"
}
```

#### 6.2.3 Infrastructure
```javascript
const infrastructure = {
  hosting: "AWS / Azure / Google Cloud",
  containerization: "Docker",
  orchestration: "Kubernetes (optional for scale)",
  cicd: "GitHub Actions / GitLab CI",
  cdn: "CloudFront / Cloudflare",
  dns: "Route 53 / Cloudflare",
  ssl: "Let's Encrypt / AWS Certificate Manager",
  loadBalancer: "NGINX / AWS ALB",
  monitoring: "DataDog / New Relic"
}
```

### 6.3 Frontend Architecture

#### 6.3.1 Project Structure
```
src/
├── assets/              # Static assets (images, fonts)
├── components/          # Reusable UI components
│   ├── common/         # Buttons, inputs, cards, etc.
│   ├── layout/         # Header, sidebar, footer
│   ├── chatbot/        # Chatbot-specific components
│   ├── students/       # Student management components
│   └── tasks/          # Task management components
├── features/           # Feature-based modules (Redux slices)
│   ├── auth/
│   ├── chatbot/
│   ├── students/
│   ├── colleges/
│   ├── essays/
│   └── tasks/
├── hooks/              # Custom React hooks
├── lib/                # Utility libraries
├── pages/              # Page components
├── services/           # API service layer
├── store/              # Redux store configuration
├── types/              # TypeScript type definitions
├── utils/              # Utility functions
└── App.tsx             # Main app component
```

#### 6.3.2 State Management Architecture

**Redux Store Structure:**
```typescript
interface RootState {
  auth: {
    user: User | null;
    token: string | null;
    isAuthenticated: boolean;
    isLoading: boolean;
  };
  
  chatbot: {
    conversations: Conversation[];
    activeConversation: string | null;
    messages: Message[];
    isTyping: boolean;
    suggestions: Suggestion[];
  };
  
  students: {
    list: Student[];
    selectedStudent: Student | null;
    filters: StudentFilters;
    isLoading: boolean;
    pagination: {
      page: number;
      pageSize: number;
      total: number;
    };
  };
  
  colleges: {
    studentColleges: Record<string, College[]>;
    searchResults: College[];
    isLoading: boolean;
  };
  
  essays: {
    studentEssays: Record<string, Essay[]>;
    activeEssay: Essay | null;
    isLoading: boolean;
  };
  
  tasks: {
    list: Task[];
    filters: TaskFilters;
    view: 'calendar' | 'list';
    aiSuggestions: TaskSuggestion[];
    isLoading: boolean;
  };
  
  ui: {
    theme: 'light' | 'dark';
    sidebarCollapsed: boolean;
    notifications: Notification[];
  };
}
```

**RTK Query API Service:**
```typescript
// src/services/api.ts
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

export const api = createApi({
  baseQuery: fetchBaseQuery({
    baseUrl: process.env.VITE_API_URL,
    prepareHeaders: (headers, { getState }) => {
      const token = (getState() as RootState).auth.token;
      if (token) {
        headers.set('authorization', `Bearer ${token}`);
      }
      return headers;
    },
  }),
  tagTypes: ['Students', 'Tasks', 'Essays', 'Colleges', 'Conversations'],
  endpoints: (builder) => ({
    // Students
    getStudents: builder.query<Student[], StudentFilters>({
      query: (filters) => ({
        url: '/students',
        params: filters,
      }),
      providesTags: ['Students'],
    }),
    
    getStudent: builder.query<Student, string>({
      query: (id) => `/students/${id}`,
      providesTags: (result, error, id) => [{ type: 'Students', id }],
    }),
    
    updateStudent: builder.mutation<Student, Partial<Student>>({
      query: ({ id, ...patch }) => ({
        url: `/students/${id}`,
        method: 'PATCH',
        body: patch,
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: 'Students', id },
        'Students',
      ],
    }),
    
    // Tasks
    getTasks: builder.query<Task[], TaskFilters>({
      query: (filters) => ({
        url: '/tasks',
        params: filters,
      }),
      providesTags: ['Tasks'],
    }),
    
    createTask: builder.mutation<Task, Partial<Task>>({
      query: (body) => ({
        url: '/tasks',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Tasks'],
    }),
    
    // Chatbot
    sendChatMessage: builder.mutation<Message, { conversationId: string; content: string }>({
      query: ({ conversationId, content }) => ({
        url: `/conversations/${conversationId}/messages`,
        method: 'POST',
        body: { content },
      }),
      invalidatesTags: ['Conversations'],
    }),
    
    // Add more endpoints...
  }),
});

export const {
  useGetStudentsQuery,
  useGetStudentQuery,
  useUpdateStudentMutation,
  useGetTasksQuery,
  useCreateTaskMutation,
  useSendChatMessageMutation,
} = api;
```

#### 6.3.3 WebSocket Integration

**Real-time Connection Manager:**
```typescript
// src/lib/websocket.ts
import { io, Socket } from 'socket.io-client';
import { store } from '@/store';

class WebSocketManager {
  private socket: Socket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  
  connect(token: string) {
    this.socket = io(process.env.VITE_WS_URL!, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });
    
    this.setupEventListeners();
  }
  
  private setupEventListeners() {
    if (!this.socket) return;
    
    this.socket.on('connect', () => {
      console.log('WebSocket connected');
      this.reconnectAttempts = 0;
    });
    
    this.socket.on('disconnect', (reason) => {
      console.log('WebSocket disconnected:', reason);
      if (reason === 'io server disconnect') {
        // Server initiated disconnect, reconnect manually
        this.socket?.connect();
      }
    });
    
    this.socket.on('error', (error) => {
      console.error('WebSocket error:', error);
    });
    
    // Data update events
    this.socket.on('student:updated', (data) => {
      store.dispatch(api.util.invalidateTags([{ type: 'Students', id: data.id }]));
    });
    
    this.socket.on('task:created', (data) => {
      store.dispatch(api.util.invalidateTags(['Tasks']));
    });
    
    this.socket.on('task:updated', (data) => {
      store.dispatch(api.util.invalidateTags(['Tasks']));
    });
    
    this.socket.on('notification:new', (notification) => {
      store.dispatch(addNotification(notification));
    });
    
    this.socket.on('chatbot:typing', (data) => {
      store.dispatch(setChatbotTyping(data));
    });
    
    this.socket.on('chatbot:message', (message) => {
      store.dispatch(addChatMessage(message));
    });
  }
  
  emit(event: string, data: any) {
    this.socket?.emit(event, data);
  }
  
  disconnect() {
    this.socket?.disconnect();
    this.socket = null;
  }
}

export const wsManager = new WebSocketManager();
```

---

## 7. Backend Architecture & Data Handling

### 7.1 Database Schema

**PostgreSQL Schema Design:**

```sql
-- Users (Counselors/Advisors)
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  role VARCHAR(50) NOT NULL DEFAULT 'counselor',
  organization_id UUID,
  profile_picture_url TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_login TIMESTAMP,
  is_active BOOLEAN DEFAULT true
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_organization ON users(organization_id);

-- Students
CREATE TABLE students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  counselor_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  phone VARCHAR(20),
  date_of_birth DATE,
  graduation_year INTEGER NOT NULL,
  
  -- Academic info
  gpa_unweighted DECIMAL(3,2),
  gpa_weighted DECIMAL(3,2),
  class_rank INTEGER,
  class_size INTEGER,
  sat_score INTEGER,
  sat_ebrw INTEGER,
  sat_math INTEGER,
  act_score INTEGER,
  
  -- Progress tracking
  application_progress INTEGER DEFAULT 0, -- 0-100
  
  -- Metadata
  profile_picture_url TEXT,
  resume_url TEXT,
  transcript_url TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_students_counselor ON students(counselor_id);
CREATE INDEX idx_students_grad_year ON students(graduation_year);
CREATE INDEX idx_students_name ON students(last_name, first_name);

-- Colleges
CREATE TABLE colleges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  location_city VARCHAR(100),
  location_state VARCHAR(50),
  location_country VARCHAR(100),
  type VARCHAR(50), -- public, private, etc.
  acceptance_rate DECIMAL(5,2),
  logo_url TEXT,
  website_url TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_colleges_name ON colleges(name);

-- Student Colleges (Many-to-Many)
CREATE TABLE student_colleges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  college_id UUID NOT NULL REFERENCES colleges(id) ON DELETE CASCADE,
  
  -- Application details
  application_type VARCHAR(50) NOT NULL, -- EA, ED, RD, Rolling
  deadline DATE NOT NULL,
  college_type VARCHAR(50) NOT NULL, -- Safety, Target, Reach
  application_portal VARCHAR(50), -- Common App, Coalition, etc.
  
  -- Progress tracking
  application_status VARCHAR(50) DEFAULT 'not_started', -- not_started, in_progress, submitted, accepted, rejected, waitlisted
  application_progress INTEGER DEFAULT 0, -- 0-100
  
  -- Requirements tracking
  essays_required INTEGER DEFAULT 0,
  essays_completed INTEGER DEFAULT 0,
  lors_required INTEGER DEFAULT 0,
  lors_completed INTEGER DEFAULT 0,
  transcript_requested BOOLEAN DEFAULT false,
  transcript_received BOOLEAN DEFAULT false,
  test_scores_sent BOOLEAN DEFAULT false,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  UNIQUE(student_id, college_id)
);

CREATE INDEX idx_student_colleges_student ON student_colleges(student_id);
CREATE INDEX idx_student_colleges_deadline ON student_colleges(deadline);

-- Essays
CREATE TABLE essays (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  student_college_id UUID REFERENCES student_colleges(id) ON DELETE SET NULL,
  
  title VARCHAR(255) NOT NULL,
  prompt TEXT NOT NULL,
  content TEXT,
  word_count INTEGER DEFAULT 0,
  word_limit INTEGER,
  
  status VARCHAR(50) DEFAULT 'not_started', -- not_started, in_progress, completed
  
  version INTEGER DEFAULT 1,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_essays_student ON essays(student_id);
CREATE INDEX idx_essays_status ON essays(status);

-- Activities
CREATE TABLE activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  
  activity_name VARCHAR(255) NOT NULL,
  position VARCHAR(100),
  description TEXT,
  
  participation_grades TEXT[], -- ['9th', '10th', '11th', '12th']
  timing VARCHAR(50), -- school_year, summer, year_round
  hours_per_week INTEGER,
  weeks_per_year INTEGER,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_activities_student ON activities(student_id);

-- Notes
CREATE TABLE notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  counselor_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  note_type VARCHAR(50) NOT NULL, -- general, meeting, reminder, priority
  content TEXT NOT NULL,
  
  reminder_date TIMESTAMP,
  is_priority BOOLEAN DEFAULT false,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_notes_student ON notes(student_id);
CREATE INDEX idx_notes_reminder ON notes(reminder_date) WHERE reminder_date IS NOT NULL;

-- Tasks
CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  counselor_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  student_id UUID REFERENCES students(id) ON DELETE CASCADE,
  
  title VARCHAR(255) NOT NULL,
  description TEXT,
  due_date DATE NOT NULL,
  due_time TIME,
  priority VARCHAR(20) DEFAULT 'medium', -- low, medium, high
  
  status VARCHAR(50) DEFAULT 'pending', -- pending, in_progress, completed, cancelled
  completed_at TIMESTAMP,
  
  comments TEXT,
  
  -- Reminders
  reminder_1day BOOLEAN DEFAULT false,
  reminder_1hour BOOLEAN DEFAULT false,
  reminder_15min BOOLEAN DEFAULT false,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_tasks_counselor ON tasks(counselor_id);
CREATE INDEX idx_tasks_student ON tasks(student_id);
CREATE INDEX idx_tasks_due_date ON tasks(due_date);
CREATE INDEX idx_tasks_status ON tasks(status);

-- Conversations (Chatbot)
CREATE TABLE conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  counselor_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  title VARCHAR(255),
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_conversations_counselor ON conversations(counselor_id);
CREATE INDEX idx_conversations_updated ON conversations(updated_at DESC);

-- Messages (Chatbot)
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  
  role VARCHAR(20) NOT NULL, -- user, assistant
  content TEXT NOT NULL,
  
  -- Metadata for suggestions/actions
  metadata JSONB,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_messages_conversation ON messages(conversation_id);
CREATE INDEX idx_messages_created ON messages(created_at);

-- LORs (Letters of Recommendation)
CREATE TABLE letters_of_recommendation (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  counselor_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  student_college_id UUID REFERENCES student_colleges(id) ON DELETE SET NULL,
  
  program_type VARCHAR(100),
  relationship_type VARCHAR(100),
  relationship_duration VARCHAR(100),
  relationship_context TEXT,
  
  specific_examples TEXT,
  
  generated_content TEXT,
  
  status VARCHAR(50) DEFAULT 'draft', -- draft, reviewed, finalized
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_lors_student ON letters_of_recommendation(student_id);

-- AI Suggestions (Task suggestions)
CREATE TABLE ai_task_suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  counselor_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  student_id UUID REFERENCES students(id) ON DELETE CASCADE,
  
  suggestion_type VARCHAR(50) NOT NULL,
  suggestion_text TEXT NOT NULL,
  priority VARCHAR(20) DEFAULT 'medium',
  
  metadata JSONB,
  
  status VARCHAR(50) DEFAULT 'active', -- active, accepted, dismissed
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP
);

CREATE INDEX idx_suggestions_counselor ON ai_task_suggestions(counselor_id);
CREATE INDEX idx_suggestions_status ON ai_task_suggestions(status);

-- Notifications
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  type VARCHAR(50) NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  
  link_url TEXT,
  
  is_read BOOLEAN DEFAULT false,
  read_at TIMESTAMP,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_unread ON notifications(user_id, is_read) WHERE is_read = false;
```

### 7.2 Data Access Layer (Prisma ORM)

**Prisma Schema (prisma/schema.prisma):**
```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id                String    @id @default(uuid())
  email             String    @unique
  passwordHash      String
  firstName         String
  lastName          String
  role              String    @default("counselor")
  organizationId    String?
  profilePictureUrl String?
  createdAt         DateTime  @default(now())
  updatedAt         DateTime  @updatedAt
  lastLogin         DateTime?
  isActive          Boolean   @default(true)
  
  students          Student[]
  tasks             Task[]
  conversations     Conversation[]
  notes             Note[]
  lors              LetterOfRecommendation[]
  aiSuggestions     AiTaskSuggestion[]
  notifications     Notification[]
  
  @@index([email])
  @@map("users")
}

model Student {
  id                 String    @id @default(uuid())
  counselorId        String
  firstName          String
  lastName           String
  email              String    @unique
  phone              String?
  dateOfBirth        DateTime?
  graduationYear     Int
  
  gpaUnweighted      Decimal?  @db.Decimal(3, 2)
  gpaWeighted        Decimal?  @db.Decimal(3, 2)
  classRank          Int?
  classSize          Int?
  satScore           Int?
  satEbrw            Int?
  satMath            Int?
  actScore           Int?
  
  applicationProgress Int      @default(0)
  
  profilePictureUrl  String?
  resumeUrl          String?
  transcriptUrl      String?
  
  createdAt          DateTime  @default(now())
  updatedAt          DateTime  @updatedAt
  
  counselor          User      @relation(fields: [counselorId], references: [id], onDelete: Cascade)
  
  colleges           StudentCollege[]
  essays             Essay[]
  activities         Activity[]
  notes              Note[]
  tasks              Task[]
  lors               LetterOfRecommendation[]
  aiSuggestions      AiTaskSuggestion[]
  
  @@index([counselorId])
  @@index([graduationYear])
  @@index([lastName, firstName])
  @@map("students")
}

// Add more models following the schema...
```

**Repository Pattern Implementation:**
```typescript
// src/repositories/StudentRepository.ts
import { PrismaClient, Student, Prisma } from '@prisma/client';

export class StudentRepository {
  constructor(private prisma: PrismaClient) {}
  
  async findById(id: string): Promise<Student | null> {
    return this.prisma.student.findUnique({
      where: { id },
      include: {
        colleges: {
          include: {
            college: true,
          },
        },
        essays: true,
        activities: true,
      },
    });
  }
  
  async findByCounselor(
    counselorId: string,
    filters?: StudentFilters
  ): Promise<Student[]> {
    const where: Prisma.StudentWhereInput = {
      counselorId,
    };
    
    if (filters?.search) {
      where.OR = [
        { firstName: { contains: filters.search, mode: 'insensitive' } },
        { lastName: { contains: filters.search, mode: 'insensitive' } },
        { email: { contains: filters.search, mode: 'insensitive' } },
      ];
    }
    
    if (filters?.graduationYear) {
      where.graduationYear = filters.graduationYear;
    }
    
    if (filters?.progressMin !== undefined) {
      where.applicationProgress = {
        gte: filters.progressMin,
      };
    }
    
    return this.prisma.student.findMany({
      where,
      include: {
        colleges: {
          include: {
            college: true,
          },
        },
      },
      orderBy: {
        lastName: 'asc',
      },
    });
  }
  
  async create(data: Prisma.StudentCreateInput): Promise<Student> {
    return this.prisma.student.create({
      data,
    });
  }
  
  async update(
    id: string,
    data: Prisma.StudentUpdateInput
  ): Promise<Student> {
    return this.prisma.student.update({
      where: { id },
      data: {
        ...data,
        updatedAt: new Date(),
      },
    });
  }
  
  async delete(id: string): Promise<void> {
    await this.prisma.student.delete({
      where: { id },
    });
  }
  
  async calculateProgress(studentId: string): Promise<number> {
    const student = await this.prisma.student.findUnique({
      where: { id: studentId },
      include: {
        colleges: {
          select: {
            essaysRequired: true,
            essaysCompleted: true,
            lorsRequired: true,
            lorsCompleted: true,
            transcriptRequested: true,
            transcriptReceived: true,
            testScoresSent: true,
          },
        },
        essays: {
          select: {
            status: true,
          },
        },
      },
    });
    
    if (!student) return 0;
    
    let totalRequirements = 0;
    let completedRequirements = 0;
    
    // Calculate based on college requirements
    student.colleges.forEach((college) => {
      totalRequirements += college.essaysRequired;
      completedRequirements += college.essaysCompleted;
      
      totalRequirements += college.lorsRequired;
      completedRequirements += college.lorsCompleted;
      
      if (college.transcriptRequested) {
        totalRequirements += 1;
        if (college.transcriptReceived) completedRequirements += 1;
      }
      
      totalRequirements += 1; // Test scores
      if (college.testScoresSent) completedRequirements += 1;
    });
    
    const progress =
      totalRequirements > 0
        ? Math.round((completedRequirements / totalRequirements) * 100)
        : 0;
    
    // Update student progress
    await this.update(studentId, { applicationProgress: progress });
    
    return progress;
  }
}
```

### 7.3 API Endpoints

**API Route Structure:**
```
/api/v1
├── /auth
│   ├── POST   /login
│   ├── POST   /register
│   ├── POST   /logout
│   ├── POST   /refresh
│   └── GET    /me
│
├── /students
│   ├── GET    /
│   ├── GET    /:id
│   ├── POST   /
│   ├── PATCH  /:id
│   ├── DELETE /:id
│   └── GET    /:id/progress
│
├── /colleges
│   ├── GET    /search
│   ├── GET    /:id
│   ├── POST   /students/:studentId/colleges
│   ├── GET    /students/:studentId/colleges
│   ├── PATCH  /students/:studentId/colleges/:collegeId
│   └── DELETE /students/:studentId/colleges/:collegeId
│
├── /essays
│   ├── GET    /students/:studentId/essays
│   ├── GET    /:id
│   ├── POST   /students/:studentId/essays
│   ├── PATCH  /:id
│   ├── DELETE /:id
│   └── POST   /:id/ai-review
│
├── /activities
│   ├── GET    /students/:studentId/activities
│   ├── POST   /students/:studentId/activities
│   ├── PATCH  /:id
│   └── DELETE /:id
│
├── /notes
│   ├── GET    /students/:studentId/notes
│   ├── POST   /students/:studentId/notes
│   ├── PATCH  /:id
│   └── DELETE /:id
│
├── /tasks
│   ├── GET    /
│   ├── GET    /:id
│   ├── POST   /
│   ├── PATCH  /:id
│   ├── DELETE /:id
│   └── GET    /ai-suggestions
│
├── /conversations
│   ├── GET    /
│   ├── GET    /:id
│   ├── POST   /
│   ├── DELETE /:id
│   ├── POST   /:id/messages
│   └── GET    /:id/messages
│
├── /lors
│   ├── GET    /students/:studentId/lors
│   ├── POST   /students/:studentId/lors/generate
│   ├── GET    /:id
│   ├── PATCH  /:id
│   └── GET    /:id/export
│
└── /notifications
    ├── GET    /
    ├── PATCH  /:id/read
    └── PATCH  /read-all
```

**Example API Implementation:**
```typescript
// src/routes/students.ts
import { Router } from 'express';
import { StudentService } from '../services/StudentService';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validation';
import { studentSchemas } from '../schemas/student';

const router = Router();
const studentService = new StudentService();

// GET /api/v1/students
router.get(
  '/',
  authenticate,
  async (req, res, next) => {
    try {
      const filters = {
        search: req.query.search as string,
        graduationYear: req.query.graduationYear
          ? parseInt(req.query.graduationYear as string)
          : undefined,
        progressMin: req.query.progressMin
          ? parseInt(req.query.progressMin as string)
          : undefined,
        progressMax: req.query.progressMax
          ? parseInt(req.query.progressMax as string)
          : undefined,
      };
      
      const students = await studentService.getStudents(
        req.user!.id,
        filters
      );
      
      res.json({
        success: true,
        data: students,
      });
    } catch (error) {
      next(error);
    }
  }
);

// GET /api/v1/students/:id
router.get(
  '/:id',
  authenticate,
  async (req, res, next) => {
    try {
      const student = await studentService.getStudent(
        req.params.id,
        req.user!.id
      );
      
      if (!student) {
        return res.status(404).json({
          success: false,
          error: 'Student not found',
        });
      }
      
      res.json({
        success: true,
        data: student,
      });
    } catch (error) {
      next(error);
    }
  }
);

// POST /api/v1/students
router.post(
  '/',
  authenticate,
  validate(studentSchemas.create),
  async (req, res, next) => {
    try {
      const student = await studentService.createStudent(
        req.user!.id,
        req.body
      );
      
      res.status(201).json({
        success: true,
        data: student,
      });
    } catch (error) {
      next(error);
    }
  }
);

// PATCH /api/v1/students/:id
router.patch(
  '/:id',
  authenticate,
  validate(studentSchemas.update),
  async (req, res, next) => {
    try {
      const student = await studentService.updateStudent(
        req.params.id,
        req.user!.id,
        req.body
      );
      
      res.json({
        success: true,
        data: student,
      });
    } catch (error) {
      next(error);
    }
  }
);

// GET /api/v1/students/:id/progress
router.get(
  '/:id/progress',
  authenticate,
  async (req, res, next) => {
    try {
      const progress = await studentService.calculateProgress(
        req.params.id,
        req.user!.id
      );
      
      res.json({
        success: true,
        data: { progress },
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
```

---

## 8. Real-time Data & Polling Strategy

### 8.1 Polling Architecture Overview

The application uses a hybrid approach combining:
1. **WebSocket connections** for real-time, bidirectional communication
2. **Polling mechanisms** as fallback and for specific use cases
3. **Event-driven updates** to minimize unnecessary data fetches

### 8.2 WebSocket Implementation

**Server-side WebSocket Handler:**
```typescript
// src/websocket/server.ts
import { Server, Socket } from 'socket.io';
import { Server as HTTPServer } from 'http';
import { verifyToken } from '../utils/auth';
import { redis } from '../lib/redis';

export class WebSocketServer {
  private io: Server;
  
  constructor(httpServer: HTTPServer) {
    this.io = new Server(httpServer, {
      cors: {
        origin: process.env.CLIENT_URL,
        credentials: true,
      },
      transports: ['websocket', 'polling'],
    });
    
    this.setupMiddleware();
    this.setupEventHandlers();
  }
  
  private setupMiddleware() {
    // Authentication middleware
    this.io.use(async (socket, next) => {
      try {
        const token = socket.handshake.auth.token;
        const user = await verifyToken(token);
        socket.data.user = user;
        next();
      } catch (error) {
        next(new Error('Authentication error'));
      }
    });
  }
  
  private setupEventHandlers() {
    this.io.on('connection', (socket: Socket) => {
      const userId = socket.data.user.id;
      console.log(`User ${userId} connected`);
      
      // Join user-specific room
      socket.join(`user:${userId}`);
      
      // Subscribe to relevant channels
      this.subscribeToChannels(socket, userId);
      
      // Handle disconnection
      socket.on('disconnect', () => {
        console.log(`User ${userId} disconnected`);
      });
      
      // Chatbot events
      socket.on('chatbot:send_message', async (data) => {
        await this.handleChatbotMessage(socket, data);
      });
      
      // Student update subscription
      socket.on('subscribe:student', (studentId: string) => {
        socket.join(`student:${studentId}`);
      });
      
      socket.on('unsubscribe:student', (studentId: string) => {
        socket.leave(`student:${studentId}`);
      });
      
      // Task update subscription
      socket.on('subscribe:tasks', () => {
        socket.join(`tasks:${userId}`);
      });
      
      // Heartbeat for connection health
      socket.on('ping', () => {
        socket.emit('pong');
      });
    });
  }
  
  private async subscribeToChannels(socket: Socket, userId: string) {
    // Subscribe to Redis pub/sub channels for this user
    const subscriber = redis.duplicate();
    await subscriber.connect();
    
    await subscriber.subscribe(
      `user:${userId}:notifications`,
      (message) => {
        socket.emit('notification:new', JSON.parse(message));
      }
    );
    
    await subscriber.subscribe(
      `user:${userId}:tasks`,
      (message) => {
        socket.emit('task:updated', JSON.parse(message));
      }
    );
    
    // Store subscriber for cleanup
    socket.data.subscriber = subscriber;
    
    socket.on('disconnect', async () => {
      await subscriber.quit();
    });
  }
  
  private async handleChatbotMessage(socket: Socket, data: any) {
    const userId = socket.data.user.id;
    const { conversationId, message } = data;
    
    // Emit typing indicator
    socket.emit('chatbot:typing', { conversationId, isTyping: true });
    
    try {
      // Process message (call AI service)
      const response = await this.processAIMessage(
        userId,
        conversationId,
        message
      );
      
      // Stop typing indicator
      socket.emit('chatbot:typing', { conversationId, isTyping: false });
      
      // Send response
      socket.emit('chatbot:message', response);
      
      // If response includes suggestions
      if (response.suggestions) {
        socket.emit('chatbot:suggestions', response.suggestions);
      }
    } catch (error) {
      socket.emit('chatbot:error', { error: 'Failed to process message' });
      socket.emit('chatbot:typing', { conversationId, isTyping: false });
    }
  }
  
  // Broadcast methods for other parts of the application
  broadcastToUser(userId: string, event: string, data: any) {
    this.io.to(`user:${userId}`).emit(event, data);
  }
  
  broadcastStudentUpdate(studentId: string, data: any) {
    this.io.to(`student:${studentId}`).emit('student:updated', data);
  }
  
  broadcastTaskUpdate(userId: string, data: any) {
    this.io.to(`tasks:${userId}`).emit('task:updated', data);
  }
}
```

### 8.3 Intelligent Polling Strategy

**Polling Manager (Client-side):**
```typescript
// src/lib/polling.ts
import { useEffect, useRef, useCallback } from 'react';
import { useAppDispatch } from '@/hooks/redux';
import { api } from '@/services/api';

interface PollingConfig {
  interval: number;
  maxRetries?: number;
  backoffMultiplier?: number;
  enabled?: boolean;
}

export const usePolling = (
  endpoint: string,
  config: PollingConfig = { interval: 30000 }
) => {
  const dispatch = useAppDispatch();
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const retriesRef = useRef(0);
  const currentIntervalRef = useRef(config.interval);
  
  const poll = useCallback(async () => {
    try {
      // Invalidate RTK Query cache to trigger refetch
      dispatch(api.util.invalidateTags([endpoint]));
      
      // Reset retry count on success
      retriesRef.current = 0;
      currentIntervalRef.current = config.interval;
    } catch (error) {
      console.error(`Polling error for ${endpoint}:`, error);
      
      // Implement exponential backoff
      if (config.maxRetries && retriesRef.current < config.maxRetries) {
        retriesRef.current += 1;
        const backoff = config.backoffMultiplier || 1.5;
        currentIntervalRef.current *= backoff;
      } else {
        // Max retries reached, stop polling
        stopPolling();
      }
    }
  }, [dispatch, endpoint, config]);
  
  const startPolling = useCallback(() => {
    if (intervalRef.current) return; // Already polling
    
    // Initial poll
    poll();
    
    // Set up interval
    intervalRef.current = setInterval(() => {
      poll();
    }, currentIntervalRef.current);
  }, [poll]);
  
  const stopPolling = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);
  
  useEffect(() => {
    if (config.enabled !== false) {
      startPolling();
    }
    
    return () => {
      stopPolling();
    };
  }, [startPolling, stopPolling, config.enabled]);
  
  return { startPolling, stopPolling };
};
```

**Adaptive Polling Based on User Activity:**
```typescript
// src/lib/adaptivePolling.ts
import { useEffect, useState } from 'react';
import { usePageVisibility } from '@/hooks/usePageVisibility';
import { useIdleTimer } from '@/hooks/useIdleTimer';

interface AdaptivePollingOptions {
  activeInterval: number;    // Poll every 10s when active
  inactiveInterval: number;  // Poll every 60s when inactive
  hiddenInterval: number;    // Poll every 120s when tab hidden
}

export const useAdaptivePolling = (
  pollFn: () => void,
  options: AdaptivePollingOptions = {
    activeInterval: 10000,
    inactiveInterval: 60000,
    hiddenInterval: 120000,
  }
) => {
  const isVisible = usePageVisibility();
  const isIdle = useIdleTimer(300000); // 5 minutes
  const [currentInterval, setCurrentInterval] = useState(options.activeInterval);
  
  useEffect(() => {
    // Determine polling interval based on activity
    let interval: number;
    
    if (!isVisible) {
      interval = options.hiddenInterval;
    } else if (isIdle) {
      interval = options.inactiveInterval;
    } else {
      interval = options.activeInterval;
    }
    
    setCurrentInterval(interval);
  }, [isVisible, isIdle, options]);
  
  useEffect(() => {
    const intervalId = setInterval(pollFn, currentInterval);
    
    return () => {
      clearInterval(intervalId);
    };
  }, [pollFn, currentInterval]);
};
```

### 8.4 Data Change Detection & Optimistic Updates

**Optimistic Update Pattern:**
```typescript
// src/features/students/studentsSlice.ts
import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { api } from '@/services/api';

const studentsSlice = createSlice({
  name: 'students',
  initialState: {
    list: [] as Student[],
    optimisticUpdates: {} as Record<string, Partial<Student>>,
  },
  reducers: {
    // Optimistic update - immediately update UI
    studentUpdatedOptimistic: (
      state,
      action: PayloadAction<{ id: string; changes: Partial<Student> }>
    ) => {
      const { id, changes } = action.payload;
      
      // Store optimistic update
      state.optimisticUpdates[id] = changes;
      
      // Update in list immediately
      const student = state.list.find((s) => s.id === id);
      if (student) {
        Object.assign(student, changes);
      }
    },
    
    // Revert optimistic update on error
    studentUpdateReverted: (state, action: PayloadAction<string>) => {
      const id = action.payload;
      delete state.optimisticUpdates[id];
      // Trigger refetch from server
    },
    
    // Confirm optimistic update on success
    studentUpdateConfirmed: (state, action: PayloadAction<string>) => {
      const id = action.payload;
      delete state.optimisticUpdates[id];
    },
  },
  extraReducers: (builder) => {
    // Handle RTK Query mutations
    builder.addMatcher(
      api.endpoints.updateStudent.matchFulfilled,
      (state, action) => {
        const updatedStudent = action.payload;
        state.studentUpdateConfirmed(updatedStudent.id);
      }
    );
    
    builder.addMatcher(
      api.endpoints.updateStudent.matchRejected,
      (state, action) => {
        const id = action.meta.arg.originalArgs.id;
        state.studentUpdateReverted(id);
      }
    );
  },
});

export const {
  studentUpdatedOptimistic,
  studentUpdateReverted,
  studentUpdateConfirmed,
} = studentsSlice.actions;
```

### 8.5 Caching Strategy with Redis

**Redis Cache Layer:**
```typescript
// src/lib/redis.ts
import Redis from 'ioredis';

export const redis = new Redis(process.env.REDIS_URL!);

// Cache wrapper utility
export class CacheManager {
  constructor(private redis: Redis) {}
  
  async get<T>(key: string): Promise<T | null> {
    const cached = await this.redis.get(key);
    return cached ? JSON.parse(cached) : null;
  }
  
  async set(
    key: string,
    value: any,
    ttlSeconds: number = 300
  ): Promise<void> {
    await this.redis.setex(key, ttlSeconds, JSON.stringify(value));
  }
  
  async delete(key: string): Promise<void> {
    await this.redis.del(key);
  }
  
  async invalidatePattern(pattern: string): Promise<void> {
    const keys = await this.redis.keys(pattern);
    if (keys.length > 0) {
      await this.redis.del(...keys);
    }
  }
  
  // Pub/Sub for real-time updates
  async publish(channel: string, message: any): Promise<void> {
    await this.redis.publish(channel, JSON.stringify(message));
  }
}

export const cacheManager = new CacheManager(redis);
```

**Service Layer with Caching:**
```typescript
// src/services/StudentService.ts
import { StudentRepository } from '../repositories/StudentRepository';
import { cacheManager } from '../lib/redis';
import { wsServer } from '../websocket/server';

export class StudentService {
  constructor(private studentRepo: StudentRepository) {}
  
  async getStudent(id: string, counselorId: string): Promise<Student | null> {
    const cacheKey = `student:${id}`;
    
    // Try cache first
    let student = await cacheManager.get<Student>(cacheKey);
    
    if (!student) {
      // Cache miss - fetch from database
      student = await this.studentRepo.findById(id);
      
      if (student && student.counselorId === counselorId) {
        // Cache for 5 minutes
        await cacheManager.set(cacheKey, student, 300);
      }
    }
    
    // Authorization check
    if (student && student.counselorId !== counselorId) {
      throw new Error('Unauthorized');
    }
    
    return student;
  }
  
  async updateStudent(
    id: string,
    counselorId: string,
    updates: Partial<Student>
  ): Promise<Student> {
    // Verify authorization
    const existing = await this.getStudent(id, counselorId);
    if (!existing) {
      throw new Error('Student not found');
    }
    
    // Update in database
    const updated = await this.studentRepo.update(id, updates);
    
    // Invalidate cache
    await cacheManager.delete(`student:${id}`);
    await cacheManager.invalidatePattern(`students:${counselorId}:*`);
    
    // Recalculate progress if relevant fields changed
    if (
      updates.colleges ||
      updates.essays ||
      updates.transcriptUrl
    ) {
      await this.studentRepo.calculateProgress(id);
    }
    
    // Broadcast update via WebSocket
    wsServer.broadcastStudentUpdate(id, updated);
    
    // Publish to Redis for other server instances
    await cacheManager.publish(`student:${id}:updated`, updated);
    
    return updated;
  }
}
```

### 8.6 Polling Schedules by Feature

**Recommended Polling Intervals:**
```typescript
const pollingSchedules = {
  // Real-time features (use WebSocket primarily, polling as fallback)
  chatbot: {
    websocket: true,
    fallbackPolling: 5000, // 5 seconds
  },
  
  // Frequently updated data
  tasks: {
    websocket: true,
    activePolling: 15000,   // 15 seconds when active
    inactivePolling: 60000, // 1 minute when inactive
  },
  
  // Moderately updated data
  students: {
    websocket: true,
    activePolling: 30000,    // 30 seconds when viewing student list
    inactivePolling: 120000, // 2 minutes in background
  },
  
  deadlines: {
    websocket: false,
    polling: 300000, // 5 minutes (doesn't change frequently)
  },
  
  // Infrequently updated data
  colleges: {
    websocket: false,
    polling: 3600000, // 1 hour (static data mostly)
  },
  
  // On-demand only (no automatic polling)
  essays: {
    websocket: false,
    polling: false, // Fetch only when essay tab is active
  },
  
  profile: {
    websocket: false,
    polling: false, // Fetch only when profile tab is active
  },
  
  // System data
  notifications: {
    websocket: true,
    fallbackPolling: 30000, // 30 seconds
  },
  
  aiSuggestions: {
    websocket: true,
    polling: 300000, // 5 minutes (AI generates suggestions periodically)
  },
};
```

### 8.7 Efficient Data Fetching Patterns

**Lazy Loading & Pagination:**
```typescript
// src/hooks/usePaginatedQuery.ts
import { useState } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';

export const usePaginatedStudents = (filters: StudentFilters) => {
  const [pageSize] = useState(20);
  
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
  } = useInfiniteQuery({
    queryKey: ['students', filters],
    queryFn: async ({ pageParam = 0 }) => {
      const response = await fetch(
        `/api/v1/students?` +
          new URLSearchParams({
            ...filters,
            page: String(pageParam),
            pageSize: String(pageSize),
          })
      );
      return response.json();
    },
    getNextPageParam: (lastPage, pages) => {
      return lastPage.hasMore ? pages.length : undefined;
    },
    staleTime: 30000, // Consider data fresh for 30 seconds
    cacheTime: 300000, // Keep in cache for 5 minutes
  });
  
  return {
    students: data?.pages.flatMap((page) => page.data) ?? [],
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
  };
};
```

**Incremental Data Loading:**
```typescript
// Only fetch what's needed for current view
const StudentList = () => {
  // Initial lightweight query - just basic info
  const { data: studentList } = useGetStudentsQuery({
    fields: ['id', 'name', 'email', 'progress'],
  });
  
  // Detailed data loaded on demand
  const [selectedStudent, setSelectedStudent] = useState<string | null>(null);
  const { data: studentDetails } = useGetStudentQuery(
    selectedStudent!,
    {
      skip: !selectedStudent, // Don't fetch until student selected
    }
  );
  
  return (
    <div>
      {studentList?.map((student) => (
        <StudentCard
          key={student.id}
          student={student}
          onClick={() => setSelectedStudent(student.id)}
        />
      ))}
    </div>
  );
};
```

---

## 9. Security & Compliance

### 9.1 Authentication & Authorization

**JWT-based Authentication:**
```typescript
// src/middleware/auth.ts
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'No token provided',
      });
    }
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as {
      userId: string;
      role: string;
    };
    
    req.user = {
      id: decoded.userId,
      role: decoded.role,
    };
    
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      error: 'Invalid token',
    });
  }
};
```

**Role-based Access Control:**
```typescript
// src/middleware/authorization.ts
export const authorize = (...allowedRoles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
      });
    }
    
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: 'Forbidden',
      });
    }
    
    next();
  };
};

// Usage
router.get('/admin/users', authenticate, authorize('admin'), getUsersHandler);
```

### 9.2 Data Privacy (FERPA Compliance)

**Sensitive Data Encryption:**
```typescript
// src/utils/encryption.ts
import crypto from 'crypto';

const algorithm = 'aes-256-gcm';
const key = Buffer.from(process.env.ENCRYPTION_KEY!, 'hex');

export const encrypt = (text: string): string => {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(algorithm, key, iv);
  
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const authTag = cipher.getAuthTag();
  
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
};

export const decrypt = (encryptedData: string): string => {
  const [ivHex, authTagHex, encrypted] = encryptedData.split(':');
  
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');
  
  const decipher = crypto.createDecipheriv(algorithm, key, iv);
  decipher.setAuthTag(authTag);
  
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
};
```

### 9.3 API Rate Limiting

```typescript
// src/middleware/rateLimiting.ts
import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import { redis } from '../lib/redis';

export const apiLimiter = rateLimit({
  store: new RedisStore({
    client: redis,
    prefix: 'rl:',
  }),
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Max 100 requests per window
  message: 'Too many requests, please try again later',
});

export const authLimiter = rateLimit({
  store: new RedisStore({
    client: redis,
    prefix: 'rl:auth:',
  }),
  windowMs: 15 * 60 * 1000,
  max: 5, // Max 5 login attempts per window
  message: 'Too many authentication attempts',
  skipSuccessfulRequests: true,
});
```

---

## 10. Performance Requirements

### 10.1 Performance Targets

```javascript
const performanceTargets = {
  pageLoad: {
    firstContentfulPaint: '< 1.5s',
    largestContentfulPaint: '< 2.5s',
    timeToInteractive: '< 3.5s',
    cumulativeLayoutShift: '< 0.1',
  },
  
  apiResponse: {
    p50: '< 200ms',
    p95: '< 500ms',
    p99: '< 1000ms',
  },
  
  databaseQueries: {
    simple: '< 50ms',
    complex: '< 200ms',
    reports: '< 1000ms',
  },
  
  cacheHitRate: '> 80%',
  
  websocketLatency: '< 100ms',
  
  concurrentUsers: '1000+',
  
  uptime: '99.9%',
};
```

### 10.2 Optimization Strategies

**Code Splitting:**
```typescript
// Lazy load routes
const StudentView = lazy(() => import('./pages/StudentView'));
const Tasks = lazy(() => import('./pages/Tasks'));

// In router
<Route
  path="/students/:id"
  element={
    <Suspense fallback={<LoadingSpinner />}>
      <StudentView />
    </Suspense>
  }
/>
```

**Image Optimization:**
- Use WebP format with fallbacks
- Implement responsive images with `srcset`
- Lazy load images below the fold
- Use CDN for static assets

**Bundle Optimization:**
```javascript
// vite.config.ts
export default {
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          redux: ['@reduxjs/toolkit', 'react-redux'],
          ui: ['lucide-react', '@headlessui/react'],
        },
      },
    },
  },
};
```

---

## 11. Agile Deployment Strategy

### 11.1 Sprint Structure

**2-Week Sprint Cycle:**
```
Sprint Planning (4 hours)
├── Review product backlog
├── Select user stories for sprint
├── Break down into tasks
├── Estimate story points
└── Set sprint goals

Daily Standups (15 minutes)
├── What did you do yesterday?
├── What will you do today?
└── Any blockers?

Sprint Review (2 hours)
├── Demo completed features
├── Gather stakeholder feedback
└── Update product backlog

Sprint Retrospective (1.5 hours)
├── What went well?
├── What could be improved?
└── Action items for next sprint
```

### 11.2 Development Workflow

**Git Branching Strategy (GitFlow):**
```
main (production)
  └── develop (staging)
        ├── feature/chatbot-suggestions
        ├── feature/student-filters
        ├── feature/task-calendar
        └── bugfix/progress-calculation
```

**Branch Naming Convention:**
- `feature/descriptive-name`
- `bugfix/issue-description`
- `hotfix/critical-fix`
- `release/v1.2.0`

### 11.3 CI/CD Pipeline

**GitHub Actions Workflow:**
```yaml
# .github/workflows/ci-cd.yml
name: CI/CD Pipeline

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'
          
      - name: Install dependencies
        run: npm ci
        
      - name: Run linter
        run: npm run lint
        
      - name: Run tests
        run: npm run test:coverage
        
      - name: Upload coverage
        uses: codecov/codecov-action@v3
  
  build:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Build Docker image
        run: docker build -t camp-app:${{ github.sha }} .
        
      - name: Push to registry
        run: |
          echo ${{ secrets.DOCKER_PASSWORD }} | docker login -u ${{ secrets.DOCKER_USERNAME }} --password-stdin
          docker push camp-app:${{ github.sha }}
  
  deploy-staging:
    needs: build
    if: github.ref == 'refs/heads/develop'
    runs-on: ubuntu-latest
    steps:
      - name: Deploy to staging
        run: |
          # Deploy commands here
          
  deploy-production:
    needs: build
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    environment: production
    steps:
      - name: Deploy to production
        run: |
          # Deploy commands here
```

### 11.4 Deployment Phases

**Phase 1: MVP (Weeks 1-4)**
- Core authentication
- Student management (CRUD)
- Basic chatbot
- Task list view
- Essential UI components

**Phase 2: Enhanced Features (Weeks 5-8)**
- College management
- Essay tracking
- Progress calculation
- Calendar view for tasks
- WebSocket integration

**Phase 3: AI & Intelligence (Weeks 9-12)**
- LOR generation
- AI task suggestions
- Advanced chatbot features
- Real-time notifications
- Analytics dashboard

**Phase 4: Polish & Scale (Weeks 13-16)**
- Performance optimization
- Mobile responsiveness
- Comprehensive testing
- Documentation
- Beta user onboarding

---

## 12. Success Metrics

### 12.1 Key Performance Indicators (KPIs)

**User Adoption:**
- Monthly Active Users (MAU)
- Daily Active Users (DAU)
- User retention rate (30/60/90 days)
- New user signups per week

**Engagement:**
- Average session duration
- Pages per session
- Feature adoption rates
- Chatbot interaction frequency
- Tasks created per user

**Efficiency Metrics:**
- Time saved per counselor (compared to baseline)
- Application completion rate
- Deadline adherence rate
- LOR generation time

**Technical Metrics:**
- Average page load time
- API response times (p50, p95, p99)
- Error rate (< 0.1%)
- Uptime (> 99.9%)
- Cache hit rate

**Business Metrics:**
- Customer satisfaction (CSAT) score
- Net Promoter Score (NPS)
- Support ticket volume
- Feature request frequency

### 12.2 Analytics Implementation

```typescript
// Analytics event tracking
const trackEvent = (eventName: string, properties?: Record<string, any>) => {
  // Send to analytics service (e.g., Mixpanel, Amplitude)
  analytics.track(eventName, {
    userId: currentUser.id,
    timestamp: new Date().toISOString(),
    ...properties,
  });
};

// Example usage
trackEvent('student_added', {
  source: 'manual_entry',
  graduation_year: 2025,
});

trackEvent('lor_generated', {
  student_id: studentId,
  generation_time_ms: 3500,
  program_type: 'computer_science',
});
```

---

## 13. Timeline & Milestones

### 13.1 16-Week Development Schedule

**Weeks 1-4: Foundation & Core Features**
- Week 1: Project setup, architecture, database design
- Week 2: Authentication, user management, basic UI components
- Week 3: Student CRUD operations, student list view
- Week 4: Basic chatbot interface, task CRUD operations

**Milestone 1:** Core authentication and student management working

**Weeks 5-8: Feature Expansion**
- Week 5: College management, student-college relationships
- Week 6: Essay tracking, rich text editor integration
- Week 7: Progress calculation, dashboard views
- Week 8: Calendar view for tasks, filter systems

**Milestone 2:** Complete student management workflow

**Weeks 9-12: Intelligence & Real-time Features**
- Week 9: LOR generation with AI
- Week 10: AI task suggestions engine
- Week 11: WebSocket implementation, real-time updates
- Week 12: Advanced chatbot features, suggestion chips

**Milestone 3:** AI features and real-time capabilities live

**Weeks 13-16: Polish, Testing & Launch**
- Week 13: Performance optimization, caching strategy
- Week 14: Comprehensive testing (unit, integration, E2E)
- Week 15: Bug fixes, documentation, deployment setup
- Week 16: Beta launch, user onboarding, monitoring

**Milestone 4:** Production-ready application

---

## 14. Appendices

### 14.1 Technical Glossary

**API:** Application Programming Interface
**CRUD:** Create, Read, Update, Delete
**JWT:** JSON Web Token
**LOR:** Letter of Recommendation
**ORM:** Object-Relational Mapping
**REST:** Representational State Transfer
**RTK:** Redux Toolkit
**SPA:** Single Page Application
**SSR:** Server-Side Rendering
**WebSocket:** Full-duplex communication protocol

### 14.2 References

- React Documentation: https://react.dev
- Redux Toolkit: https://redux-toolkit.js.org
- Prisma ORM: https://www.prisma.io
- Socket.io: https://socket.io
- Tailwind CSS: https://tailwindcss.com
- FERPA Compliance: https://www2.ed.gov/policy/gen/guid/fpco/ferpa/

---

**Document Control:**
- Next Review Date: 2 weeks after project kickoff
- Change Log: Track all major revisions
- Approval Required: Product Owner, Tech Lead, Stakeholders
