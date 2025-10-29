"use client";

import { use } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Edit, MoreVertical } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { apiClient } from "@/lib/api/client";

export default function StudentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

  const { data, isLoading, error } = useQuery({
    queryKey: ["student", id],
    queryFn: () => apiClient.getStudent(id),
  });

  const student = data?.data;

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
        {[
          { id: "chatbot", label: "Chatbot", icon: "💬" },
          { id: "colleges", label: "Colleges", icon: "🏛️" },
          { id: "essays", label: "Essays", icon: "📝" },
          { id: "profile", label: "Profile", icon: "👤" },
          { id: "notes", label: "Notes", icon: "📋" },
        ].map((tab) => (
          <button
            key={tab.id}
            className="flex-1 rounded-lg px-4 py-3 text-sm font-semibold text-text-secondary transition-all hover:bg-surface hover:text-primary data-[active=true]:bg-surface data-[active=true]:text-primary data-[active=true]:shadow-sm"
            data-active={tab.id === "chatbot"}
          >
            <span className="mr-2">{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="rounded-lg border border-border bg-surface p-6">
        <p className="text-text-secondary">
          Tab content will be implemented next. Student ID: {id}
        </p>
      </div>
    </div>
  );
}

