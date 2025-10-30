"use client";

import { use, useState, useRef, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Edit, MoreVertical, Send, GraduationCap, Mail, Calendar, TrendingUp } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChatMessage } from "@/components/chatbot/chat-message";
import { apiClient } from "@/lib/api/client";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

type TabId = "chatbot" | "colleges" | "essays" | "profile" | "notes";

export default function StudentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<TabId>("chatbot");
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

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
      // Call chat API with student context
      const contextMessage = `I'm asking about student ${student?.first_name} ${student?.last_name} (ID: ${id}). ${input.trim()}`;

      const response = await fetch("/api/v1/chatbot/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: contextMessage,
          stream: false,
        }),
      });

      const result = await response.json();

      if (result.success) {
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: result.data.message || "I received your message.",
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, assistantMessage]);
      } else {
        throw new Error(result.error || "Failed to get response");
      }
    } catch (error) {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: "Sorry, I encountered an error. Please try again.",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsTyping(false);
    }
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
    { id: "chatbot" as TabId, label: "AI Assistant", icon: "💬" },
    { id: "profile" as TabId, label: "Profile", icon: "👤" },
    { id: "colleges" as TabId, label: "Colleges", icon: "🏛️" },
    { id: "essays" as TabId, label: "Essays", icon: "📝" },
    { id: "notes" as TabId, label: "Notes", icon: "📋" },
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

      {/* Student Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary to-primary-dark p-8 text-white">
        <div className="relative z-10 flex items-start justify-between">
          <div className="flex items-center gap-4">
            <Avatar className="h-20 w-20 border-4 border-white/30">
              <AvatarFallback className="bg-white/20 text-white text-xl font-bold">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div>
              <h1 className="text-heading-1 font-bold">{fullName}</h1>
              <p className="text-lg opacity-90">
                Senior • Class of {student.graduation_year}
              </p>
              <p className="text-sm opacity-75">{student.email}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              className="bg-white/20 backdrop-blur-sm border-white/30 text-white hover:bg-white/30"
            >
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </Button>
            <Button
              variant="secondary"
              className="bg-white/20 backdrop-blur-sm border-white/30 text-white hover:bg-white/30"
            >
              <MoreVertical className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="relative z-10 mt-6">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm font-semibold">Overall Progress</span>
            <span className="text-sm font-semibold">
              {student.application_progress}%
            </span>
          </div>
          <div className="h-3 overflow-hidden rounded-full bg-white/20">
            <div
              className="h-full bg-white transition-all duration-500"
              style={{ width: `${student.application_progress}%` }}
            />
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-1 rounded-xl bg-background p-1">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className="flex-1 rounded-lg px-4 py-3 text-sm font-semibold text-text-secondary transition-all hover:bg-surface hover:text-primary data-[active=true]:bg-surface data-[active=true]:text-primary data-[active=true]:shadow-sm"
            data-active={tab.id === activeTab}
          >
            <span className="mr-2">{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="rounded-lg border border-border bg-surface">
        {/* Chatbot Tab */}
        {activeTab === "chatbot" && (
          <div className="flex flex-col h-[600px]">
            <div className="p-4 border-b border-border">
              <h2 className="text-lg font-semibold text-text-primary">AI Assistant for {student.first_name}</h2>
              <p className="text-sm text-text-secondary">Ask questions about this student&apos;s application, deadlines, or recommendations</p>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <div className="text-6xl mb-4">💬</div>
                  <h3 className="text-xl font-semibold text-text-primary mb-2">
                    Start a conversation
                  </h3>
                  <p className="text-text-secondary max-w-md">
                    Ask me anything about {student.first_name}&apos;s college applications, deadlines, essays, or get recommendations.
                  </p>
                </div>
              )}

              {messages.map((message) => (
                <ChatMessage key={message.id} message={message} />
              ))}

              {isTyping && (
                <div className="flex gap-2 items-center text-text-secondary">
                  <div className="w-2 h-2 bg-primary rounded-full animate-bounce" />
                  <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: "0.1s" }} />
                  <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: "0.2s" }} />
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

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
                  className="flex-1 resize-none rounded-lg border border-border bg-background px-4 py-3 text-sm text-text-primary placeholder-text-tertiary focus:outline-none focus:ring-2 focus:ring-primary"
                  rows={1}
                />
                <Button
                  onClick={handleSendMessage}
                  disabled={!input.trim() || isTyping}
                  className="h-auto"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Profile Tab */}
        {activeTab === "profile" && (
          <div className="p-6 space-y-6">
            <div>
              <h2 className="text-xl font-semibold text-text-primary mb-4">Academic Profile</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-text-secondary">GPA (Unweighted)</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-text-primary">
                      {student.gpa_unweighted?.toFixed(2) || "N/A"}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-text-secondary">GPA (Weighted)</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-text-primary">
                      {student.gpa_weighted?.toFixed(2) || "N/A"}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-text-secondary">Graduation Year</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-2">
                      <GraduationCap className="h-5 w-5 text-primary" />
                      <span className="text-2xl font-bold text-text-primary">{student.graduation_year}</span>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-text-secondary">Application Progress</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-2">
                      <TrendingUp className="h-5 w-5 text-primary" />
                      <span className="text-2xl font-bold text-text-primary">{student.application_progress}%</span>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>

            <div>
              <h2 className="text-xl font-semibold text-text-primary mb-4">Contact Information</h2>
              <Card>
                <CardContent className="pt-6">
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <Mail className="h-5 w-5 text-primary" />
                      <div>
                        <p className="text-sm text-text-secondary">Email</p>
                        <p className="text-text-primary">{student.email}</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* Colleges Tab */}
        {activeTab === "colleges" && (
          <div className="p-6">
            <h2 className="text-xl font-semibold text-text-primary mb-4">College Applications</h2>
            <p className="text-text-secondary">College application data will be displayed here.</p>
          </div>
        )}

        {/* Essays Tab */}
        {activeTab === "essays" && (
          <div className="p-6">
            <h2 className="text-xl font-semibold text-text-primary mb-4">Essays & Writing</h2>
            <p className="text-text-secondary">Essay information will be displayed here.</p>
          </div>
        )}

        {/* Notes Tab */}
        {activeTab === "notes" && (
          <div className="p-6">
            <h2 className="text-xl font-semibold text-text-primary mb-4">Counselor Notes</h2>
            <p className="text-text-secondary">Notes will be displayed here.</p>
          </div>
        )}
      </div>
    </div>
  );
}
