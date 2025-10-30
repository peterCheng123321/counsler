"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, AlertTriangle } from "lucide-react";

interface DeadlineItem {
  id: string;
  title: string;
  dueDate: string;
  priority: "high" | "medium" | "low";
  status: string;
  studentName?: string;
  category?: string;
}

interface DeadlineCalendarProps {
  deadlines: DeadlineItem[];
  title?: string;
  description?: string;
  daysAhead?: number;
}

const priorityColors = {
  high: "bg-red-100 text-red-800 border-red-200",
  medium: "bg-amber-100 text-amber-800 border-amber-200",
  low: "bg-blue-100 text-blue-800 border-blue-200",
};

const priorityIcons = {
  high: AlertTriangle,
  medium: Clock,
  low: Calendar,
};

export function DeadlineCalendar({
  deadlines,
  title = "Upcoming Deadlines",
  description = "Next 7 days",
  daysAhead = 7,
}: DeadlineCalendarProps) {
  // Group deadlines by date
  const groupedDeadlines = deadlines.reduce((acc, deadline) => {
    const date = new Date(deadline.dueDate).toLocaleDateString();
    if (!acc[date]) {
      acc[date] = [];
    }
    acc[date].push(deadline);
    return acc;
  }, {} as Record<string, DeadlineItem[]>);

  // Sort dates
  const sortedDates = Object.keys(groupedDeadlines).sort((a, b) => {
    return new Date(a).getTime() - new Date(b).getTime();
  });

  // Calculate urgency for each deadline
  const getUrgency = (dueDate: string) => {
    const now = new Date();
    const due = new Date(dueDate);
    const daysUntil = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    if (daysUntil < 0) return { label: "Overdue", color: "text-red-600" };
    if (daysUntil === 0) return { label: "Today", color: "text-red-600" };
    if (daysUntil === 1) return { label: "Tomorrow", color: "text-amber-600" };
    if (daysUntil <= 3) return { label: `${daysUntil} days`, color: "text-amber-600" };
    return { label: `${daysUntil} days`, color: "text-text-secondary" };
  };

  if (!deadlines || deadlines.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          {description && <CardDescription>{description}</CardDescription>}
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center h-[300px] text-text-secondary">
            <Calendar className="h-12 w-12 mb-4 opacity-50" />
            <p>No upcoming deadlines</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>
        <div className="space-y-6 max-h-[500px] overflow-y-auto">
          {sortedDates.map((date) => {
            const dayDeadlines = groupedDeadlines[date];
            const formattedDate = new Date(date).toLocaleDateString("en-US", {
              weekday: "short",
              month: "short",
              day: "numeric",
            });

            return (
              <div key={date} className="space-y-3">
                <div className="flex items-center gap-2 pb-2 border-b">
                  <Calendar className="h-4 w-4 text-text-secondary" />
                  <span className="font-semibold text-sm">{formattedDate}</span>
                  <Badge variant="outline" className="text-xs">
                    {dayDeadlines.length} {dayDeadlines.length === 1 ? "deadline" : "deadlines"}
                  </Badge>
                </div>

                <div className="space-y-2">
                  {dayDeadlines.map((deadline) => {
                    const urgency = getUrgency(deadline.dueDate);
                    const PriorityIcon = priorityIcons[deadline.priority];

                    return (
                      <div
                        key={deadline.id}
                        className={`p-3 rounded-lg border-l-4 ${
                          deadline.priority === "high"
                            ? "border-l-red-500 bg-red-50"
                            : deadline.priority === "medium"
                            ? "border-l-amber-500 bg-amber-50"
                            : "border-l-blue-500 bg-blue-50"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 space-y-1">
                            <div className="flex items-center gap-2">
                              <PriorityIcon className="h-4 w-4" />
                              <span className="font-medium text-sm">{deadline.title}</span>
                            </div>
                            {deadline.studentName && (
                              <p className="text-xs text-text-secondary">
                                Student: {deadline.studentName}
                              </p>
                            )}
                            {deadline.category && (
                              <Badge variant="secondary" className="text-xs">
                                {deadline.category}
                              </Badge>
                            )}
                          </div>
                          <div className="flex flex-col items-end gap-1">
                            <span className={`text-xs font-medium ${urgency.color}`}>
                              {urgency.label}
                            </span>
                            <Badge
                              variant="outline"
                              className={`text-xs ${priorityColors[deadline.priority]}`}
                            >
                              {deadline.priority}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
