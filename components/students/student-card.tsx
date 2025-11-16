"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Building2, FileText, UserCheck, Clock, Mail } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { AIContextMenu } from "@/components/ai/ai-context-menu";
import { AIConfirmationDialog } from "@/components/ai/ai-confirmation-dialog";
import { format } from "date-fns";
import type { Student } from "@/lib/api/client";
import type { AIAction } from "@/lib/contexts/ai-context";
import type { StudentStats } from "@/lib/types/database";

interface StudentCardProps {
  student: Student;
}

export function StudentCard({ student }: StudentCardProps) {
  const router = useRouter();
  const [pendingAction, setPendingAction] = useState<AIAction | null>(null);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [confirmationMessage, setConfirmationMessage] = useState("");
  const [stats, setStats] = useState({
    collegesApplied: 0,
    essaysComplete: 0,
    lorsRequested: 0,
    nextDeadline: null as Date | null,
  });
  const [loading, setLoading] = useState(true);

  const handleActionSelect = (action: AIAction, message: string) => {
    setPendingAction(action);
    setConfirmationMessage(message);
    setShowConfirmation(true);
  };

  const handleGenerateLOR = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    router.push(`/students/${student.id}?tab=letters&action=generate`);
  };

  const initials = `${student.first_name[0]}${student.last_name[0]}`.toUpperCase();
  const fullName = `${student.first_name} ${student.last_name}`;

  // Fetch real data from database using aggregated stats endpoint
  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);

        // Single API call to get all stats (fixes N+1 query problem)
        const statsRes = await fetch(`/api/v1/students/${student.id}/stats`);

        if (!statsRes.ok) {
          throw new Error("Failed to fetch stats");
        }

        const statsData = await statsRes.json();

        setStats({
          collegesApplied: statsData.data.collegesApplied,
          essaysComplete: statsData.data.essaysComplete,
          lorsRequested: statsData.data.lorsRequested,
          nextDeadline: statsData.data.nextDeadline ? new Date(statsData.data.nextDeadline) : null,
        });
      } catch (error) {
        console.error("Failed to fetch student stats:", error);
        // Keep default values on error
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [student.id]);

  return (
    <>
      <Card className="hover:shadow-md transition-shadow">
        <Link href={`/students/${student.id}`}>
          <CardContent className="p-4">
            {/* Header - Simplified */}
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10">
                  <AvatarFallback className="bg-primary/10 text-primary font-medium">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="font-medium text-text-primary">
                    {fullName}
                  </h3>
                  <p className="text-sm text-text-secondary">
                    Class of {student.graduation_year}
                  </p>
                </div>
              </div>

              {/* LOR Quick Action */}
              <Button
                onClick={handleGenerateLOR}
                variant="ghost"
                size="sm"
                className="gap-1"
              >
                <Mail className="h-4 w-4" />
                <span className="hidden sm:inline">LOR</span>
              </Button>
            </div>

            {/* Progress - Simplified */}
            <div className="mb-3">
              <div className="flex justify-between text-xs mb-1">
                <span className="text-text-secondary">Progress</span>
                <span className="font-medium">{student.application_progress}%</span>
              </div>
              <Progress value={student.application_progress} className="h-2" />
            </div>

            {/* Key Stats - More compact */}
            <div className="flex gap-4 text-sm text-text-secondary">
              <div className="flex items-center gap-1">
                <Building2 className="h-3.5 w-3.5" />
                <span>{stats.collegesApplied}</span>
              </div>
              <div className="flex items-center gap-1">
                <FileText className="h-3.5 w-3.5" />
                <span>{stats.essaysComplete}</span>
              </div>
              {stats.nextDeadline && (
                <div className="flex items-center gap-1 text-orange-600">
                  <Clock className="h-3.5 w-3.5" />
                  <span>{format(stats.nextDeadline, "MMM d")}</span>
                </div>
              )}
            </div>
          </CardContent>
        </Link>
      </Card>

      {/* AI Confirmation Dialog */}
      <AIConfirmationDialog
        open={showConfirmation}
        onOpenChange={setShowConfirmation}
        action={pendingAction}
        message={confirmationMessage}
        onSuccess={() => {
          // Refresh will be handled by React Query invalidation in the dialog
        }}
      />
    </>
  );
}





