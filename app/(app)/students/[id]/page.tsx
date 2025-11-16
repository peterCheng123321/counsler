"use client";

import { use, useState, useRef, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Edit, MoreVertical, Send, GraduationCap, Mail, Calendar, TrendingUp, Phone, FileText, Image, Award, Sparkles } from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChatMessage } from "@/components/chatbot/chat-message";
import { InlineEssayEditor } from "@/components/essays/inline-essay-editor";
import { UploadModal } from "@/components/upload/upload-modal";
import { StudentEditDialog } from "@/components/students/student-edit-dialog";
import { CollegeManagement } from "@/components/students/college-management";
import { LORList } from "@/components/letters/lor-list";
import { LORGeneratorDialog } from "@/components/letters/lor-generator-dialog";
import { CollegeRecommendations } from "@/components/students/college-recommendations";
import { AIGuidance } from "@/components/students/ai-guidance";
import { apiClient } from "@/lib/api/client";
import { toast } from "sonner";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

type TabId = "profile" | "colleges" | "essays" | "letters" | "chatbot";

export default function StudentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<TabId>("profile");
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadFileType, setUploadFileType] = useState<"profile" | "resume" | "transcript">("profile");
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showLORGenerator, setShowLORGenerator] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Fetch essay data from database
  const [essay, setEssay] = useState<any>(null);
  const [essayLoading, setEssayLoading] = useState(true);

  const fetchEssay = async () => {
    try {
      setEssayLoading(true);
      const res = await fetch(`/api/v1/students/${id}/essays`);
      const data = await res.json();
      // Get first essay or null
      if (data.data && data.data.length > 0) {
        setEssay(data.data[0]);
      } else {
        setEssay(null);
      }
    } catch (error) {
      console.error("Failed to fetch essay:", error);
      setEssay(null);
    } finally {
      setEssayLoading(false);
    }
  };

  useEffect(() => {
    if (id) {
      fetchEssay();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const { data, isLoading, error } = useQuery({
    queryKey: ["student", id],
    queryFn: () => apiClient.getStudent(id),
  });

  const student = data?.data;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "52px";
      if (input) {
        textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
      }
    }
  }, [input]);

  const handleSendMessage = async () => {
    if (!input.trim() || isTyping) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsTyping(true);

    try {
      // Send message with student context as structured data
      const response = await fetch("/api/v1/chatbot/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: input.trim(),
          stream: false,  // Simplified: no streaming for now
          studentContext: {
            id: id,
            name: `${student?.first_name} ${student?.last_name}`,
            firstName: student?.first_name,
            lastName: student?.last_name,
            email: student?.email,
            graduationYear: student?.graduation_year,
            gpa: student?.gpa_unweighted,
            sat: student?.sat_score,
            act: student?.act_score,
            progress: student?.application_progress,
          }
        }),
      });

      const result = await response.json();

      if (result.success && result.data?.message) {
        // Ensure response mentions student name
        let responseContent = result.data.message;

        // Replace generic "the student" with actual name
        if (student) {
          responseContent = responseContent.replace(
            /the student/gi,
            `${student.first_name} ${student.last_name}`
          );
        }

        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: responseContent,
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, assistantMessage]);
      } else {
        throw new Error(result.error || "Failed to get response");
      }
    } catch (error) {
      console.error("Chat error:", error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: "I'm having trouble accessing the information. Please try again or refresh the page.",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleSaveEssay = async (title: string, content: string) => {
    if (!essay?.id) {
      throw new Error("No essay ID available");
    }

    try {
      // Calculate word count
      const wordCount = content.trim().split(/\s+/).filter(Boolean).length;

      const response = await fetch(`/api/v1/essays/${essay.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          content,
          word_count: wordCount,
        }),
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || "Failed to save essay");
      }

      // Update local state with saved essay
      setEssay(result.data);
    } catch (error) {
      console.error("Error saving essay:", error);
      throw error; // Re-throw to let the editor handle it
    }
  };

  const handleCreateNewEssay = async () => {
    try {
      const response = await fetch(`/api/v1/students/${id}/essays`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: "Untitled Essay",
          content: "",
        }),
      });

      const result = await response.json();

      if (result.success && result.data) {
        setEssay(result.data);
        toast.success("New essay created!");
        // Refetch essays to ensure we have the latest data
        await fetchEssay();
      } else {
        throw new Error(result.error || "Failed to create essay");
      }
    } catch (error) {
      console.error("Failed to create essay:", error);
      toast.error("Failed to create new essay");
    }
  };

  const handleOpenUploadModal = (fileType: "profile" | "resume" | "transcript") => {
    setUploadFileType(fileType);
    setShowUploadModal(true);
  };

  const handleUploadComplete = (url: string) => {
    // Invalidate student query to refresh data
    queryClient.invalidateQueries({ queryKey: ["student", id] });
  };

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="h-48 rounded-lg bg-surface" />
        <div className="h-64 rounded-lg bg-surface" />
      </div>
    );
  }

  if (error || !student) {
    return (
      <div className="rounded-lg border border-error bg-error-light p-4 text-error">
        Student not found or failed to load.
      </div>
    );
  }

  const initials = `${student.first_name[0]}${student.last_name[0]}`.toUpperCase();
  const fullName = `${student.first_name} ${student.last_name}`;

  const tabs = [
    { id: "profile" as TabId, label: "Profile" },
    { id: "colleges" as TabId, label: "Colleges" },
    { id: "essays" as TabId, label: "Essays" },
    { id: "letters" as TabId, label: "Letters" },
    { id: "chatbot" as TabId, label: "AI Chat" },
  ];

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <Link href="/students">
        <Button variant="ghost" className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Back to Students
        </Button>
      </Link>

      {/* Student Header - Simplified */}
      <div className="bg-white dark:bg-surface rounded-lg border border-border p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Avatar className="h-14 w-14 border-2 border-border">
              <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div>
              <h1 className="text-2xl font-bold text-text-primary">{fullName}</h1>
              <div className="flex items-center gap-3 text-sm text-text-secondary mt-1">
                <span>Class of {student.graduation_year}</span>
                <span>•</span>
                <span>{student.email}</span>
                {student.gpa_unweighted && (
                  <>
                    <span>•</span>
                    <span>GPA {student.gpa_unweighted.toFixed(2)}</span>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Progress indicator */}
            <div className="text-right">
              <div className="text-sm text-text-secondary">Progress</div>
              <div className="text-xl font-bold text-primary">{student.application_progress}%</div>
            </div>

            {/* Action buttons */}
            <div className="flex gap-2">
              <Button
                onClick={() => setShowLORGenerator(true)}
                variant="outline"
                size="sm"
                className="gap-1"
              >
                <FileText className="h-4 w-4" />
                Letter
              </Button>
              <Button
                onClick={() => setShowEditDialog(true)}
                variant="ghost"
                size="icon"
              >
                <Edit className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Tab Navigation - Simplified */}
      <div className="flex gap-1 p-1 bg-gray-100 rounded-lg mb-4">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className="flex-1 px-4 py-2 text-sm font-medium rounded-md transition-all data-[active=true]:bg-white data-[active=true]:shadow-sm data-[active=true]:text-primary text-text-secondary hover:text-text-primary"
            data-active={tab.id === activeTab}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content - Clean Card */}
      <Card>
        {/* Chatbot Tab */}
        {activeTab === "chatbot" && (
          <div className="flex flex-col h-[calc(100vh-20rem)]">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">AI Assistant</CardTitle>
                  <p className="text-sm text-text-secondary mt-1">Get help with {student.first_name}&apos;s application</p>
                </div>
              </div>
            </CardHeader>

            <CardContent className="flex-1 overflow-y-auto space-y-4">
              {messages.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full text-center py-8">
                  <Sparkles className="h-8 w-8 text-primary mb-4" />
                  <h3 className="text-lg font-medium text-text-primary mb-2">
                    Ask me about {student.first_name}
                  </h3>
                  <p className="text-sm text-text-secondary max-w-sm mb-6">
                    I can help with deadlines, essays, college recommendations, and application strategy.
                  </p>

                  {/* Simplified Quick Actions */}
                  <div className="flex flex-wrap gap-2 justify-center">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setInput("What are the upcoming deadlines?");
                        handleSendMessage();
                      }}
                    >
                      Deadlines
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setInput("Show application progress");
                        handleSendMessage();
                      }}
                    >
                      Progress
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setInput("What's the essay status?");
                        handleSendMessage();
                      }}
                    >
                      Essays
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setInput("Recommend colleges for this student");
                        handleSendMessage();
                      }}
                    >
                      College Recs
                    </Button>
                  </div>
                </div>
              )}

              {messages.map((message) => (
                <ChatMessage key={message.id} message={message} />
              ))}

              {isTyping && (
                <div className="flex items-center gap-2 text-sm text-text-secondary bg-surface/50 rounded-lg px-4 py-2">
                  <div className="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full" />
                  <span>AI is thinking about {student.first_name}...</span>
                </div>
              )}

              <div ref={messagesEndRef} />
            </CardContent>

            <div className="p-4 border-t border-border">

              <div className="flex gap-2">
                <textarea
                  ref={textareaRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  placeholder="Ask about this student..."
                  className="flex-1 resize-none rounded-lg border border-border/60 bg-background/95 px-4 py-3 text-sm text-text-primary placeholder-text-tertiary focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all duration-200"
                  rows={1}
                />
                <Button
                  onClick={handleSendMessage}
                  disabled={!input.trim() || isTyping}
                  className="h-auto px-4 bg-primary hover:bg-primary-hover text-white transition-all duration-200"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Profile Tab */}
        {activeTab === "profile" && (
          <CardContent className="p-6">
            <div className="space-y-6">
              {/* Contact Info Section */}
              <div>
                <h3 className="text-sm font-medium text-text-secondary mb-3">Contact</h3>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="h-4 w-4 text-text-tertiary" />
                    <span>{student.email}</span>
                  </div>
                  {student.phone && (
                    <div className="flex items-center gap-2 text-sm">
                      <Phone className="h-4 w-4 text-text-tertiary" />
                      <span>{student.phone}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Academic Stats - Simple Grid */}
              <div>
                <h3 className="text-sm font-medium text-text-secondary mb-3">Academics</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="bg-gray-50 rounded-lg p-3">
                    <div className="text-xs text-text-secondary mb-1">GPA</div>
                    <div className="text-lg font-semibold">
                      {student.gpa_unweighted?.toFixed(2) || "—"}
                    </div>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <div className="text-xs text-text-secondary mb-1">SAT</div>
                    <div className="text-lg font-semibold">
                      {student.sat_score || "—"}
                    </div>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <div className="text-xs text-text-secondary mb-1">ACT</div>
                    <div className="text-lg font-semibold">
                      {student.act_score || "—"}
                    </div>
                  </div>
                  {student.class_rank && (
                    <div className="bg-gray-50 rounded-lg p-3">
                      <div className="text-xs text-text-secondary mb-1">Rank</div>
                      <div className="text-lg font-semibold">
                        {student.class_rank}
                        {student.class_size && (
                          <span className="text-xs font-normal text-text-secondary">/{student.class_size}</span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* AI Features */}
              <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-4">
                <CollegeRecommendations student={student} />
                <AIGuidance student={student} />
              </div>
            </div>
          </CardContent>
        )}

        {/* Colleges Tab */}
        {activeTab === "colleges" && (
          <CardContent className="p-6">
            <CollegeManagement studentId={id} />
          </CardContent>
        )}

        {/* Essays Tab */}
        {activeTab === "essays" && (
          <CardContent className="p-6">

            {essayLoading ? (
              <div className="flex items-center justify-center p-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : essay ? (
              <InlineEssayEditor
                essayId={essay.id}
                initialTitle={essay.title}
                initialContent={essay.content}
                onSave={handleSaveEssay}
              />
            ) : (
              <div className="flex flex-col items-center justify-center p-12 text-center">
                <FileText className="h-16 w-16 text-text-tertiary mb-4" />
                <h3 className="text-lg font-semibold text-text-primary mb-2">
                  No Essays Yet
                </h3>
                <p className="text-text-secondary mb-4">
                  This student hasn&apos;t started any essays yet.
                </p>
                <Button onClick={handleCreateNewEssay}>Create New Essay</Button>
              </div>
            )}
          </CardContent>
        )}

        {/* Letters Tab */}
        {activeTab === "letters" && (
          <CardContent className="p-6">
            <LORList studentId={id} studentName={fullName} />
          </CardContent>
        )}
      </Card>

      {/* Upload Modal */}
      {student && (
        <UploadModal
          open={showUploadModal}
          onOpenChange={setShowUploadModal}
          studentId={id}
          fileType={uploadFileType}
          currentFileUrl={
            uploadFileType === "profile"
              ? student.profile_picture_url
              : uploadFileType === "resume"
              ? student.resume_url
              : student.transcript_url
          }
          onUploadComplete={handleUploadComplete}
        />
      )}

      {/* Edit Student Dialog */}
      {student && (
        <StudentEditDialog
          open={showEditDialog}
          onOpenChange={setShowEditDialog}
          student={student}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ["student", id] });
          }}
        />
      )}

      {/* LOR Generator Dialog */}
      {student && (
        <LORGeneratorDialog
          open={showLORGenerator}
          onOpenChange={setShowLORGenerator}
          studentId={id}
          studentName={fullName}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ["letters", id] });
            setActiveTab("letters"); // Switch to letters tab after generation
          }}
        />
      )}
    </div>
  );
}
