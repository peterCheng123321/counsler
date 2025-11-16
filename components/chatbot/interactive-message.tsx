"use client";

import React from "react";
import ReactMarkdown from "react-markdown";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  User,
  FileText,
  GraduationCap,
  Calendar,
  ExternalLink,
  Eye,
  Edit,
  TrendingUp,
} from "lucide-react";
import { toast } from "sonner";

interface Student {
  id: string;
  name: string;
  progress?: number;
  gpa?: number;
}

interface Essay {
  id: string;
  title: string;
  student_id: string;
  student_name?: string;
  status?: string;
  word_count?: number;
}

interface Task {
  id: string;
  title: string;
  priority?: string;
  due_date?: string;
  status?: string;
}

interface InteractiveMessageProps {
  content: string;
  role: "user" | "assistant";
  onOpenEssay?: (essayId: string, studentId?: string) => void;
  onOpenStudent?: (studentId: string) => void;
  onCreateTask?: (task: Partial<Task>) => void;
}

/**
 * Enhanced message renderer with interactive elements
 * Detects structured data in markdown and renders clickable cards
 */
export function InteractiveMessage({
  content,
  role,
  onOpenEssay,
  onOpenStudent,
  onCreateTask,
}: InteractiveMessageProps) {
  // Parse content for structured data patterns
  const parseStructuredData = (text: string) => {
    const students: Student[] = [];
    const essays: Essay[] = [];
    const tasks: Task[] = [];

    // Try to extract JSON blocks for structured data
    const jsonBlockRegex = /```json\s*(\{[\s\S]*?\}|\[[\s\S]*?\])\s*```/g;
    let match;

    while ((match = jsonBlockRegex.exec(text)) !== null) {
      try {
        const data = JSON.parse(match[1]);
        if (Array.isArray(data)) {
          data.forEach((item) => {
            if (item.type === "student" || item.first_name) {
              students.push({
                id: item.id || item.student_id,
                name: item.name || `${item.first_name} ${item.last_name}`,
                progress: item.progress || item.application_progress,
                gpa: item.gpa,
              });
            } else if (item.type === "essay" || item.essay_id) {
              essays.push({
                id: item.id || item.essay_id,
                title: item.title,
                student_id: item.student_id,
                student_name: item.student_name,
                status: item.status,
                word_count: item.word_count,
              });
            } else if (item.type === "task") {
              tasks.push(item);
            }
          });
        }
      } catch (e) {
        // Not valid JSON, skip
      }
    }

    return { students, essays, tasks };
  };

  const { students, essays, tasks } = parseStructuredData(content);

  // Custom markdown components with interactive elements
  const components = {
    // Make links open in new tab
    a: ({ href, children }: any) => (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="text-primary hover:underline inline-flex items-center gap-1"
      >
        {children}
        <ExternalLink className="h-3 w-3" />
      </a>
    ),

    // Enhanced tables with better styling
    table: ({ children }: any) => (
      <div className="overflow-x-auto my-4">
        <table className="min-w-full divide-y divide-border border border-border rounded-lg">
          {children}
        </table>
      </div>
    ),
    thead: ({ children }: any) => (
      <thead className="bg-surface">{children}</thead>
    ),
    th: ({ children }: any) => (
      <th className="px-4 py-3 text-left text-xs font-semibold text-text-primary uppercase tracking-wider">
        {children}
      </th>
    ),
    td: ({ children }: any) => (
      <td className="px-4 py-3 text-sm text-text-secondary whitespace-nowrap">
        {children}
      </td>
    ),

    // Code blocks with better styling
    code: ({ inline, children, className }: any) => {
      if (inline) {
        return (
          <code className="px-1.5 py-0.5 bg-surface text-primary rounded text-sm font-mono">
            {children}
          </code>
        );
      }
      return (
        <pre className="bg-surface p-4 rounded-lg overflow-x-auto my-3">
          <code className={className}>{children}</code>
        </pre>
      );
    },

    // Enhanced lists
    ul: ({ children }: any) => (
      <ul className="list-disc list-inside space-y-2 my-3 text-text-secondary">
        {children}
      </ul>
    ),
    ol: ({ children }: any) => (
      <ol className="list-decimal list-inside space-y-2 my-3 text-text-secondary">
        {children}
      </ol>
    ),
  };

  return (
    <div className="space-y-4">
      {/* Main markdown content */}
      <div className="prose prose-sm max-w-none dark:prose-invert">
        <ReactMarkdown components={components}>{content}</ReactMarkdown>
      </div>

      {/* Interactive Student Cards */}
      {students.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-text-tertiary">
            Students Found ({students.length})
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {students.map((student) => (
              <Card
                key={student.id}
                className="p-3 hover:border-primary/50 transition-all cursor-pointer group"
                onClick={() => onOpenStudent?.(student.id)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2 flex-1">
                    <div className="p-2 rounded-full bg-primary/10 group-hover:bg-primary/20 transition-colors">
                      <User className="h-4 w-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm text-text-primary truncate">
                        {student.name}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        {student.gpa && (
                          <span className="text-xs text-text-tertiary">
                            GPA: {student.gpa}
                          </span>
                        )}
                        {student.progress !== undefined && (
                          <span className="text-xs text-primary font-medium">
                            {student.progress}% Complete
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Interactive Essay Cards */}
      {essays.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-text-tertiary">
            Essays Found ({essays.length})
          </p>
          <div className="grid grid-cols-1 gap-2">
            {essays.map((essay) => (
              <Card
                key={essay.id}
                className="p-3 hover:border-primary/50 transition-all cursor-pointer group"
                onClick={() => onOpenEssay?.(essay.id, essay.student_id)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2 flex-1">
                    <div className="p-2 rounded-full bg-blue-50 group-hover:bg-blue-100 transition-colors">
                      <FileText className="h-4 w-4 text-blue-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm text-text-primary truncate">
                        {essay.title}
                      </p>
                      {essay.student_name && (
                        <p className="text-xs text-text-tertiary">
                          {essay.student_name}
                        </p>
                      )}
                      <div className="flex items-center gap-2 mt-1">
                        {essay.status && (
                          <Badge
                            variant="outline"
                            className="text-xs capitalize"
                          >
                            {essay.status.replace("_", " ")}
                          </Badge>
                        )}
                        {essay.word_count && (
                          <span className="text-xs text-text-tertiary">
                            {essay.word_count} words
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Interactive Task Cards */}
      {tasks.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-text-tertiary">
            Suggested Tasks ({tasks.length})
          </p>
          <div className="grid grid-cols-1 gap-2">
            {tasks.map((task, idx) => (
              <Card
                key={idx}
                className="p-3 hover:border-primary/50 transition-all"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2 flex-1">
                    <Calendar className="h-4 w-4 text-amber-600" />
                    <div className="flex-1">
                      <p className="font-medium text-sm text-text-primary">
                        {task.title}
                      </p>
                      {task.due_date && (
                        <p className="text-xs text-text-tertiary mt-1">
                          Due: {new Date(task.due_date).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      onCreateTask?.(task);
                      toast.success("Task created!");
                    }}
                  >
                    Create
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
