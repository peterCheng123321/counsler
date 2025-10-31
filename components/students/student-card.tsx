"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Building2, FileText, UserCheck, Clock } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { AIContextMenu } from "@/components/ai/ai-context-menu";
import { AIConfirmationDialog } from "@/components/ai/ai-confirmation-dialog";
import { format } from "date-fns";
import type { Student } from "@/lib/api/client";
import type { AIAction } from "@/lib/contexts/ai-context";

interface StudentCardProps {
  student: Student;
}

export function StudentCard({ student }: StudentCardProps) {
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
  const initials = `${student.first_name[0]}${student.last_name[0]}`.toUpperCase();
  const fullName = `${student.first_name} ${student.last_name}`;

  // Fetch real data from database
  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        
        // Fetch colleges applied
        const collegesRes = await fetch(`/api/v1/students/${student.id}/colleges`);
        const collegesData = await collegesRes.json();
        const collegesApplied = collegesData.data?.length || 0;

        // Fetch essays
        const essaysRes = await fetch(`/api/v1/students/${student.id}/essays`);
        const essaysData = await essaysRes.json();
        const essaysComplete = essaysData.data?.filter((e: any) => e.status === "completed").length || 0;

        // Fetch LORs
        const lorsRes = await fetch(`/api/v1/students/${student.id}/lors`);
        const lorsData = await lorsRes.json();
        const lorsRequested = lorsData.data?.length || 0;

        // Find next deadline from colleges
        let nextDeadline = null as Date | null;
        if (collegesData.data && collegesData.data.length > 0) {
          const deadlines = collegesData.data
            .filter((c: any) => c.deadline)
            .map((c: any) => new Date(c.deadline))
            .sort((a: Date, b: Date) => a.getTime() - b.getTime());
          nextDeadline = deadlines[0] || null;
        }

        setStats({
          collegesApplied,
          essaysComplete,
          lorsRequested,
          nextDeadline,
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
      <AIContextMenu
        entity={student}
        entityType="student"
        onActionSelect={handleActionSelect}
      >
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
                  <span>Applied: {stats.collegesApplied} colleges</span>
                </div>
                <div className="flex items-center gap-2 text-body-sm text-text-secondary">
                  <FileText className="h-4 w-4 text-primary" />
                  <span>Essays: {stats.essaysComplete} complete</span>
                </div>
                <div className="flex items-center gap-2 text-body-sm text-text-secondary">
                  <UserCheck className="h-4 w-4 text-primary" />
                  <span>LOR: {stats.lorsRequested} requested</span>
                </div>
              </div>

              {/* Next Deadline */}
              {stats.nextDeadline && (
                <div className="rounded-md border border-warning bg-warning-light p-2">
                  <div className="flex items-center gap-2 text-body-sm text-warning">
                    <Clock className="h-4 w-4" />
                    <span>
                      Next: {format(stats.nextDeadline, "MMM d, yyyy")}
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
      </AIContextMenu>

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


