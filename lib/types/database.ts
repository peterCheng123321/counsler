/**
 * Database TypeScript Types
 *
 * Type-safe interfaces for all database tables and common response shapes.
 * These replace the widespread use of `any` types throughout the application.
 */

// ============================================================================
// ENUMS
// ============================================================================

export type EssayStatus = "draft" | "in_review" | "completed";
export type TaskStatus = "pending" | "in_progress" | "completed";
export type TaskPriority = "low" | "medium" | "high";
export type ApplicationType = "ED" | "EA" | "RD" | "Rolling";
export type MessageRole = "user" | "assistant" | "system";
export type InsightCategory = "student" | "deadline" | "progress" | "recommendation";

// ============================================================================
// CORE ENTITIES
// ============================================================================

export interface Student {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  graduation_year: number;
  gpa: number | null;
  sat_score: number | null;
  act_score: number | null;
  application_progress: number;
  counselor_id: string;
  created_at: string;
  updated_at: string;
}

export interface College {
  id: string;
  name: string;
  location: string | null;
  acceptance_rate: number | null;
  average_gpa: number | null;
  average_sat: number | null;
  average_act: number | null;
  created_at: string;
}

export interface StudentCollege {
  id: string;
  student_id: string;
  college_id: string;
  application_type: ApplicationType;
  deadline: string;
  status: TaskStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Essay {
  id: string;
  student_id: string;
  user_id: string | null;
  counselor_id: string;
  title: string;
  prompt: string | null;
  content: string | null;
  word_count: number | null;
  status: EssayStatus;
  feedback: string | null;
  created_at: string;
  updated_at: string;
}

export interface Task {
  id: string;
  counselor_id: string;
  student_id: string | null;
  title: string;
  description: string | null;
  due_date: string;
  priority: TaskPriority;
  status: TaskStatus;
  category: string | null;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
}

export interface Letter {
  id: string;
  student_id: string;
  teacher_name: string;
  teacher_email: string;
  subject: string | null;
  status: TaskStatus;
  requested_date: string;
  submitted_date: string | null;
  notes: string | null;
  created_at: string;
}

// ============================================================================
// CHAT & AI
// ============================================================================

export interface Conversation {
  id: string;
  counselor_id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  role: MessageRole;
  content: string;
  metadata: MessageMetadata | null;
  created_at: string;
}

export interface MessageMetadata {
  model?: string;
  toolsUsed?: boolean;
  toolResults?: number;
  insights?: number;
  insightsData?: Insight[];
  intermediateSteps?: number;
  cached?: boolean;
}

export interface Insight {
  id: string;
  counselor_id: string;
  category: InsightCategory;
  title: string;
  description: string;
  priority: TaskPriority;
  actionable: boolean;
  related_student_id: string | null;
  created_at: string;
  dismissed_at: string | null;
}

export interface AgentCheckpoint {
  thread_id: string;
  checkpoint_ns: string;
  checkpoint_id: string;
  parent_checkpoint_id: string | null;
  type: string | null;
  checkpoint: any; // Complex JSON structure
  metadata: any; // Complex JSON structure
  created_at: string;
  updated_at: string;
}

// ============================================================================
// API RESPONSE TYPES
// ============================================================================

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  details?: string | any;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: {
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  };
}

// ============================================================================
// JOINED / ENRICHED TYPES
// ============================================================================

/**
 * Student with related college information
 */
export interface StudentWithColleges extends Student {
  student_colleges: (StudentCollege & {
    college: College;
  })[];
}

/**
 * Task with related student information
 */
export interface TaskWithStudent extends Task {
  student: Student | null;
}

/**
 * Essay with student information
 */
export interface EssayWithStudent extends Essay {
  student: Student;
}

/**
 * Student stats aggregation (from /api/v1/students/[id]/stats)
 */
export interface StudentStats {
  collegesApplied: number;
  essaysComplete: number;
  lorsRequested: number;
  nextDeadline: string | null;
}

// ============================================================================
// FILTERS & QUERY PARAMS
// ============================================================================

export interface StudentFilters {
  search?: string;
  graduationYear?: number;
  progressMin?: number;
  progressMax?: number;
  counselorId?: string;
}

export interface TaskFilters {
  status?: TaskStatus;
  priority?: TaskPriority;
  studentId?: string;
  category?: string;
  dueBefore?: string;
  dueAfter?: string;
}

export interface EssayFilters {
  status?: EssayStatus;
  studentId?: string;
}

// ============================================================================
// FORM INPUTS
// ============================================================================

export interface CreateStudentInput {
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  graduation_year: number;
  gpa?: number;
  sat_score?: number;
  act_score?: number;
}

export interface UpdateStudentInput extends Partial<CreateStudentInput> {
  application_progress?: number;
}

export interface CreateTaskInput {
  student_id?: string;
  title: string;
  description?: string;
  due_date: string;
  priority: TaskPriority;
  category?: string;
}

export interface UpdateTaskInput extends Partial<CreateTaskInput> {
  status?: TaskStatus;
  completed_at?: string;
}

export interface CreateEssayInput {
  student_id: string;
  title: string;
  prompt?: string;
  content?: string;
}

export interface UpdateEssayInput extends Partial<CreateEssayInput> {
  status?: EssayStatus;
  feedback?: string;
  word_count?: number;
}

// ============================================================================
// CHAT TYPES
// ============================================================================

export interface ChatMessage {
  role: MessageRole;
  content: string;
}

export interface ChatMessageInput {
  conversationId?: string;
  message: string;
  stream?: boolean;
  agentMode?: "langchain" | "langgraph";
}

export interface ChatResponse {
  conversationId: string;
  message: string;
  insights?: Insight[];
  model: string;
  cached?: boolean;
}

// ============================================================================
// TOOL TYPES (for AI agents)
// ============================================================================

export interface ToolCall {
  id: string;
  name: string;
  args: Record<string, any>;
}

export interface ToolResult {
  toolName: string;
  result: string;
  success: boolean;
  error?: string;
}

// ============================================================================
// UTILITY TYPES
// ============================================================================

/**
 * Make all properties of T optional and nullable
 */
export type Nullable<T> = {
  [P in keyof T]: T[P] | null;
};

/**
 * Pick properties from T that are of type U
 */
export type PickByType<T, U> = {
  [P in keyof T as T[P] extends U ? P : never]: T[P];
};

/**
 * Database timestamp fields
 */
export interface Timestamps {
  created_at: string;
  updated_at: string;
}
