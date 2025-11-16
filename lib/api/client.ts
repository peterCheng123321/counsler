import { createClient } from "@/lib/supabase/client";

const API_BASE_URL = "/api/v1";

export class ApiClient {
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const supabase = createClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();

    const headers: HeadersInit = {
      "Content-Type": "application/json",
      ...options.headers,
    };

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
      credentials: "include",
    });

    console.log("Response status:", response.status, response.statusText);
    console.log("Response headers:", Object.fromEntries(response.headers.entries()));

    if (!response.ok) {
      let error: any = { error: `HTTP error! status: ${response.status}` };
      let responseText = "";
      
      try {
        // Clone response before reading to avoid consuming the body
        const clonedResponse = response.clone();
        responseText = await clonedResponse.text();
        console.log("Raw response text length:", responseText.length);
        console.log("Raw response text:", responseText.substring(0, 500));
        
        if (responseText && responseText.trim()) {
          try {
            error = JSON.parse(responseText);
            console.log("Parsed error:", error);
          } catch (parseError) {
            console.error("JSON parse error:", parseError);
            error = { 
              error: "Failed to parse error response", 
              raw: responseText.substring(0, 500),
              parseError: parseError instanceof Error ? parseError.message : String(parseError)
            };
          }
        } else {
          console.error("Empty response body!");
          error = { 
            error: `HTTP error! status: ${response.status} (empty response body)`,
            status: response.status,
            statusText: response.statusText
          };
        }
      } catch (textError) {
        console.error("Error reading response text:", textError);
        error = { 
          error: "Failed to read error response",
          status: response.status,
          statusText: response.statusText,
          readError: textError instanceof Error ? textError.message : String(textError)
        };
      }
      
      // Log full error details in development
      if (process.env.NODE_ENV === "development") {
        console.error("API Error:", {
          endpoint,
          status: response.status,
          statusText: response.statusText,
          responseTextLength: responseText.length,
          responseTextPreview: responseText.substring(0, 200),
          error: error.error,
          details: error.details,
          code: error.code,
          hint: error.hint,
          stack: error.stack,
          fullError: error,
        });
      }
      
      throw new Error(error.error || error.details || `HTTP error! status: ${response.status}`);
    }

    return response.json();
  }

  // Students
  async getStudents(params?: {
    search?: string;
    graduationYear?: number;
    progressMin?: number;
    progressMax?: number;
  }) {
    const searchParams = new URLSearchParams();
    if (params?.search) searchParams.append("search", params.search);
    if (params?.graduationYear)
      searchParams.append("graduationYear", params.graduationYear.toString());
    if (params?.progressMin)
      searchParams.append("progressMin", params.progressMin.toString());
    if (params?.progressMax)
      searchParams.append("progressMax", params.progressMax.toString());

    const query = searchParams.toString();
    return this.request<{ data: Student[]; success: boolean }>(
      `/students${query ? `?${query}` : ""}`
    );
  }

  async getStudent(id: string) {
    return this.request<{ data: Student; success: boolean }>(`/students/${id}`);
  }

  async createStudent(data: CreateStudentInput) {
    return this.request<{ data: Student; success: boolean }>("/students", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async updateStudent(id: string, data: UpdateStudentInput) {
    return this.request<{ data: Student; success: boolean }>(
      `/students/${id}`,
      {
        method: "PATCH",
        body: JSON.stringify(data),
      }
    );
  }

  async deleteStudent(id: string) {
    return this.request<{ success: boolean }>(`/students/${id}`, {
      method: "DELETE",
    });
  }

  // Tasks
  async getTasks(params?: {
    status?: string;
    priority?: string;
    studentId?: string;
    dueDateFrom?: string;
    dueDateTo?: string;
  }) {
    const searchParams = new URLSearchParams();
    if (params?.status) searchParams.append("status", params.status);
    if (params?.priority) searchParams.append("priority", params.priority);
    if (params?.studentId) searchParams.append("studentId", params.studentId);
    if (params?.dueDateFrom)
      searchParams.append("dueDateFrom", params.dueDateFrom);
    if (params?.dueDateTo)
      searchParams.append("dueDateTo", params.dueDateTo);

    const query = searchParams.toString();
    return this.request<{ data: Task[]; success: boolean }>(
      `/tasks${query ? `?${query}` : ""}`
    );
  }

  async getTask(id: string) {
    return this.request<{ data: Task; success: boolean }>(`/tasks/${id}`);
  }

  async createTask(data: CreateTaskInput) {
    return this.request<{ data: Task; success: boolean }>("/tasks", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async updateTask(id: string, data: UpdateTaskInput) {
    return this.request<{ data: Task; success: boolean }>(`/tasks/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  }

  async deleteTask(id: string) {
    return this.request<{ success: boolean }>(`/tasks/${id}`, {
      method: "DELETE",
    });
  }

  // Chatbot
  async getConversations() {
    return this.request<{ data: Conversation[]; success: boolean }>(
      "/chatbot/conversations"
    );
  }

  async getConversation(id: string) {
    return this.request<{
      data: { conversation: Conversation; messages: Message[] };
      success: boolean;
    }>(`/chatbot/conversations/${id}`);
  }

  async sendChatMessage(data: {
    conversationId?: string;
    message: string;
    stream?: boolean;
    agentMode?: "langchain" | "langgraph";
    role?: string;
    mode?: string;
  }) {
    if (data.stream !== false) {
      // Streaming response
      const response = await fetch(`${API_BASE_URL}/chatbot/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          conversationId: data.conversationId,
          message: data.message,
          stream: true,
          agentMode: data.agentMode || "langgraph", // Default to LangGraph agent
          role: data.role,
          mode: data.mode,
        }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({
          error: "An error occurred",
        }));
        throw new Error(error.error || `HTTP error! status: ${response.status}`);
      }

      return {
        stream: response.body,
        success: true,
      };
    } else {
      // Non-streaming response
      const response = await fetch(`${API_BASE_URL}/chatbot/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          conversationId: data.conversationId,
          message: data.message,
          stream: false,
          agentMode: data.agentMode || "langgraph", // Default to LangGraph agent
          role: data.role,
          mode: data.mode,
        }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({
          error: "An error occurred",
        }));
        throw new Error(error.error || `HTTP error! status: ${response.status}`);
      }

      return response.json();
    }
  }
}

// Types
export interface Student {
  id: string;
  counselor_id: string;
  school_id?: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  date_of_birth?: string;
  graduation_year: number;
  gpa_unweighted?: number;
  gpa_weighted?: number;
  class_rank?: number;
  class_size?: number;
  sat_score?: number;
  sat_ebrw?: number;
  sat_math?: number;
  act_score?: number;
  application_progress: number;
  profile_picture_url?: string;
  resume_url?: string;
  transcript_url?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateStudentInput {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  dateOfBirth?: string;
  graduationYear: number;
  gpaUnweighted?: number;
  gpaWeighted?: number;
  satScore?: number;
  actScore?: number;
  applicationProgress?: number;
  resumeUrl?: string;
  transcriptUrl?: string;
  profilePictureUrl?: string;
}

export interface UpdateStudentInput {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  graduationYear?: number;
  gpaUnweighted?: number;
  gpaWeighted?: number;
  applicationProgress?: number;
}

export interface Task {
  id: string;
  counselor_id: string;
  student_id?: string;
  title: string;
  description?: string;
  due_date: string;
  due_time?: string;
  priority: "low" | "medium" | "high";
  status: "pending" | "in_progress" | "completed" | "cancelled";
  completed_at?: string;
  comments?: string;
  reminder_1day: boolean;
  reminder_1hour: boolean;
  reminder_15min: boolean;
  created_at: string;
  updated_at: string;
  students?: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
  };
}

export interface CreateTaskInput {
  title: string;
  description?: string;
  dueDate: string;
  dueTime?: string;
  priority?: "low" | "medium" | "high";
  studentId?: string;
  reminder1day?: boolean;
  reminder1hour?: boolean;
  reminder15min?: boolean;
}

export interface UpdateTaskInput {
  title?: string;
  description?: string;
  dueDate?: string;
  dueTime?: string;
  priority?: "low" | "medium" | "high";
  status?: "pending" | "in_progress" | "completed" | "cancelled";
  studentId?: string;
  reminder1day?: boolean;
  reminder1hour?: boolean;
  reminder15min?: boolean;
}

export interface Conversation {
  id: string;
  title: string | null;
  updated_at: string;
}

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
}

export const apiClient = new ApiClient();

