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

  // Determine card gradient based on progress
  const getProgressGradient = () => {
    const progress = student.application_progress || 0;
    if (progress >= 80) return "from-emerald-50 to-green-50 border-emerald-200";
    if (progress >= 50) return "from-blue-50 to-cyan-50 border-blue-200";
    if (progress >= 25) return "from-amber-50 to-orange-50 border-amber-200";
    return "from-red-50 to-pink-50 border-red-200";
  };

  return (
    <Link href={`/students/${student.id}`}>
      <Card className={`group cursor-pointer transition-all duration-300 hover:shadow-2xl hover:-translate-y-2 border-0 bg-gradient-to-br ${getProgressGradient()} overflow-hidden`}>
        <CardContent className="p-6 relative">
          {/* Decorative Background Element */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/40 rounded-full blur-3xl -mr-16 -mt-16"></div>

          {/* Header */}
          <div className="mb-5 flex items-start gap-4 relative z-10">
            <div className="relative">
              <Avatar className="h-14 w-14 border-3 border-white shadow-lg ring-2 ring-blue-100">
                <AvatarFallback className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white font-bold text-lg">
                  {initials}
                </AvatarFallback>
              </Avatar>
              {/* Online Status Indicator */}
              <div className="absolute bottom-0 right-0 w-4 h-4 bg-green-500 rounded-full border-2 border-white"></div>
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-bold text-text-primary truncate group-hover:text-blue-600 transition-colors">
                {fullName}
              </h3>
              <p className="text-sm text-text-secondary truncate flex items-center gap-1">
                📧 {student.email}
              </p>
            </div>
          </div>

          {/* Progress Bar with Enhanced Design */}
          <div className="mb-5 relative z-10">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm font-bold text-text-primary flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></div>
                Progress
              </span>
              <span className="text-sm font-bold text-blue-600">
                {student.application_progress}%
              </span>
            </div>
            <div className="relative h-2 bg-white/60 rounded-full overflow-hidden">
              <div
                className="absolute inset-y-0 left-0 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full transition-all duration-500 shadow-lg"
                style={{ width: `${student.application_progress}%` }}
              >
                <div className="absolute inset-0 bg-white/20 animate-shimmer"></div>
              </div>
            </div>
          </div>

          {/* Stats with Better Design */}
          <div className="mb-5 grid grid-cols-3 gap-3 relative z-10">
            <div className="flex flex-col items-center p-3 rounded-xl bg-white/80 backdrop-blur-sm border border-blue-100 group-hover:border-blue-300 transition-colors">
              <Building2 className="h-5 w-5 text-blue-600 mb-1" />
              <span className="text-xs font-medium text-text-secondary">Colleges</span>
              <span className="text-sm font-bold text-text-primary">{mockStats.collegesApplied}</span>
            </div>
            <div className="flex flex-col items-center p-3 rounded-xl bg-white/80 backdrop-blur-sm border border-green-100 group-hover:border-green-300 transition-colors">
              <FileText className="h-5 w-5 text-green-600 mb-1" />
              <span className="text-xs font-medium text-text-secondary">Essays</span>
              <span className="text-sm font-bold text-text-primary">{mockStats.essaysComplete}</span>
            </div>
            <div className="flex flex-col items-center p-3 rounded-xl bg-white/80 backdrop-blur-sm border border-purple-100 group-hover:border-purple-300 transition-colors">
              <UserCheck className="h-5 w-5 text-purple-600 mb-1" />
              <span className="text-xs font-medium text-text-secondary">LORs</span>
              <span className="text-sm font-bold text-text-primary">{mockStats.lorsRequested}</span>
            </div>
          </div>

          {/* Next Deadline with Enhanced Design */}
          {mockStats.nextDeadline && (
            <div className="mb-4 rounded-xl border-2 border-amber-300 bg-gradient-to-r from-amber-50 to-orange-50 p-3 relative z-10">
              <div className="flex items-center gap-2 text-sm font-medium text-amber-700">
                <Clock className="h-5 w-5" />
                <span>
                  Next: {format(mockStats.nextDeadline, "MMM d, yyyy")}
                </span>
              </div>
            </div>
          )}

          {/* Graduation Year Badge with Better Design */}
          <div className="mt-4 flex items-center justify-between relative z-10">
            <Badge className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-medium px-4 py-1 border-0">
              🎓 Class of {student.graduation_year}
            </Badge>
            {student.application_progress >= 80 && (
              <Badge className="bg-gradient-to-r from-emerald-500 to-green-600 text-white font-medium px-3 py-1 border-0">
                ⭐ On Track
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}


