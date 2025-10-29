"use client";

import Link from "next/link";
import { Building2, FileText, UserCheck, Clock } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { format } from "date-fns";
import type { Student } from "@/lib/api/client";

interface StudentCardProps {
  student: Student;
}

export function StudentCard({ student }: StudentCardProps) {
  const initials = `${student.first_name[0]}${student.last_name[0]}`.toUpperCase();
  const fullName = `${student.first_name} ${student.last_name}`;

  // Mock data - will be replaced with real data when we add college/essay queries
  const mockStats = {
    collegesApplied: 0,
    essaysComplete: 0,
    lorsRequested: 0,
    nextDeadline: null as Date | null,
  };

  return (
    <Link href={`/students/${student.id}`}>
      <Card className="cursor-pointer transition-all hover:shadow-lg hover:-translate-y-1">
        <CardContent className="p-5">
          {/* Header */}
          <div className="mb-4 flex items-start gap-3">
            <Avatar className="h-12 w-12 border-2 border-primary">
              <AvatarFallback className="bg-primary-light text-primary-dark font-semibold">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-semibold text-text-primary truncate">
                {fullName}
              </h3>
              <p className="text-body-sm text-text-tertiary truncate">
                {student.email}
              </p>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mb-4">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-body-sm font-semibold text-primary">
                Progress
              </span>
              <span className="text-body-sm font-semibold text-text-secondary">
                {student.application_progress}%
              </span>
            </div>
            <Progress value={student.application_progress} />
          </div>

          {/* Stats */}
          <div className="mb-4 space-y-2">
            <div className="flex items-center gap-2 text-body-sm text-text-secondary">
              <Building2 className="h-4 w-4 text-primary" />
              <span>Applied: {mockStats.collegesApplied} colleges</span>
            </div>
            <div className="flex items-center gap-2 text-body-sm text-text-secondary">
              <FileText className="h-4 w-4 text-primary" />
              <span>Essays: {mockStats.essaysComplete} complete</span>
            </div>
            <div className="flex items-center gap-2 text-body-sm text-text-secondary">
              <UserCheck className="h-4 w-4 text-primary" />
              <span>LOR: {mockStats.lorsRequested} requested</span>
            </div>
          </div>

          {/* Next Deadline */}
          {mockStats.nextDeadline && (
            <div className="rounded-md border border-warning bg-warning-light p-2">
              <div className="flex items-center gap-2 text-body-sm text-warning">
                <Clock className="h-4 w-4" />
                <span>
                  Next: {format(mockStats.nextDeadline, "MMM d, yyyy")}
                </span>
              </div>
            </div>
          )}

          {/* Graduation Year Badge */}
          <div className="mt-4">
            <Badge variant="secondary">
              Class of {student.graduation_year}
            </Badge>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}


