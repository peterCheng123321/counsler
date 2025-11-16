"use client";

import { useState, useMemo, useEffect, Suspense } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import { Plus, Search, Filter, Users, Clock, Target, TrendingUp, Upload, Sparkles, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StudentCard } from "@/components/students/student-card";
import { AddStudentModal } from "@/components/students/add-student-modal";
import { AIBulkUploadModal } from "@/components/students/ai-bulk-upload-modal";
import { StudentFilters } from "@/components/students/student-filters";
import { StatsCard } from "@/components/charts/stats-card";
import { ProgressChart, type ProgressData } from "@/components/charts/progress-chart";
import { StudentDistributionChart } from "@/components/charts/student-distribution-chart";
import { QuickAIButton } from "@/components/ai/quick-ai-button";
import { apiClient, type Student } from "@/lib/api/client";
import { toast } from "sonner";

function StudentsPageContent() {
  const searchParams = useSearchParams();
  const [searchQuery, setSearchQuery] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [showUnifiedUploadModal, setShowUnifiedUploadModal] = useState(false);
  const [uploadMode, setUploadMode] = useState<"ai" | "csv">("ai");
  const [filters, setFilters] = useState<{
    graduationYear?: number;
    progressMin?: number;
    progressMax?: number;
    gpaMin?: number;
    gpaMax?: number;
    satMin?: number;
    satMax?: number;
    actMin?: number;
    actMax?: number;
    riskLevel?: string;
    sortBy?: string;
  }>({});

  // Read URL parameters and apply filters
  useEffect(() => {
    const urlFilters: {
      graduationYear?: number;
      progressMin?: number;
      progressMax?: number;
    } = {};

    const graduationYear = searchParams.get("graduationYear");
    const progressMin = searchParams.get("progressMin");
    const progressMax = searchParams.get("progressMax");

    if (graduationYear) {
      urlFilters.graduationYear = parseInt(graduationYear);
    }
    if (progressMin) {
      urlFilters.progressMin = parseInt(progressMin);
    }
    if (progressMax) {
      urlFilters.progressMax = parseInt(progressMax);
    }

    // Only update if there are URL parameters
    if (Object.keys(urlFilters).length > 0) {
      setFilters(urlFilters);
    }
  }, [searchParams]);

  const { data, isLoading, error } = useQuery({
    queryKey: ["students", searchQuery, filters],
    queryFn: () =>
      apiClient.getStudents({
        search: searchQuery || undefined,
        ...filters,
      }),
  });

  const rawStudents = data?.data || [];

  // Client-side filtering and sorting
  const students = useMemo(() => {
    let filtered = [...rawStudents];

    // Apply GPA filters
    if (filters.gpaMin !== undefined) {
      filtered = filtered.filter(s => (s.gpa || 0) >= filters.gpaMin!);
    }
    if (filters.gpaMax !== undefined) {
      filtered = filtered.filter(s => (s.gpa || 0) <= filters.gpaMax!);
    }

    // Apply SAT filters
    if (filters.satMin !== undefined) {
      filtered = filtered.filter(s => (s.sat_score || 0) >= filters.satMin!);
    }
    if (filters.satMax !== undefined) {
      filtered = filtered.filter(s => (s.sat_score || 0) <= filters.satMax!);
    }

    // Apply ACT filters
    if (filters.actMin !== undefined) {
      filtered = filtered.filter(s => (s.act_score || 0) >= filters.actMin!);
    }
    if (filters.actMax !== undefined) {
      filtered = filtered.filter(s => (s.act_score || 0) <= filters.actMax!);
    }

    // Apply risk level filter
    if (filters.riskLevel) {
      const progress = (s: Student) => s.application_progress || 0;
      switch (filters.riskLevel) {
        case 'at-risk':
          filtered = filtered.filter(s => progress(s) < 30);
          break;
        case 'on-track':
          filtered = filtered.filter(s => progress(s) >= 30 && progress(s) < 70);
          break;
        case 'ahead':
          filtered = filtered.filter(s => progress(s) >= 70);
          break;
      }
    }

    // Apply sorting
    const sortBy = filters.sortBy || 'name';
    switch (sortBy) {
      case 'progress-desc':
        filtered.sort((a, b) => (b.application_progress || 0) - (a.application_progress || 0));
        break;
      case 'progress-asc':
        filtered.sort((a, b) => (a.application_progress || 0) - (b.application_progress || 0));
        break;
      case 'gpa-desc':
        filtered.sort((a, b) => (b.gpa || 0) - (a.gpa || 0));
        break;
      case 'gpa-asc':
        filtered.sort((a, b) => (a.gpa || 0) - (b.gpa || 0));
        break;
      case 'sat-desc':
        filtered.sort((a, b) => (b.sat_score || 0) - (a.sat_score || 0));
        break;
      case 'act-desc':
        filtered.sort((a, b) => (b.act_score || 0) - (a.act_score || 0));
        break;
      case 'year':
        filtered.sort((a, b) => (a.graduation_year || 0) - (b.graduation_year || 0));
        break;
      case 'name':
      default:
        filtered.sort((a, b) =>
          `${a.first_name} ${a.last_name}`.localeCompare(`${b.first_name} ${b.last_name}`)
        );
        break;
    }

    return filtered;
  }, [rawStudents, filters]);

  // Fetch tasks for upcoming deadlines calculation
  const { data: tasksData } = useQuery({
    queryKey: ["tasks", "upcoming"],
    queryFn: () => apiClient.getTasks({}),
  });

  const tasks = tasksData?.data || [];

  // Calculate statistics
  const stats = useMemo(() => {
    const total = students.length;
    const avgProgress =
      students.length > 0
        ? Math.round(
            students.reduce((sum, s) => sum + (s.application_progress || 0), 0) /
              students.length
          )
        : 0;

    // Progress distribution
    const lowProgress = students.filter((s) => (s.application_progress || 0) < 30).length;
    const mediumProgress = students.filter(
      (s) => (s.application_progress || 0) >= 30 && (s.application_progress || 0) < 70
    ).length;
    const highProgress = students.filter((s) => (s.application_progress || 0) >= 70).length;

    // Calculate upcoming deadlines (next 7 days)
    const today = new Date();
    const nextWeek = new Date(today);
    nextWeek.setDate(today.getDate() + 7);

    const upcomingDeadlines = tasks.filter((task) => {
      if (!task.due_date || task.status === 'completed') return false;
      const dueDate = new Date(task.due_date);
      return dueDate >= today && dueDate <= nextWeek;
    }).length;

    // Calculate at-risk students (< 30% progress)
    const atRiskStudents = students.filter(
      (s) => (s.application_progress || 0) < 30
    ).length;

    return {
      total,
      avgProgress,
      upcomingDeadlines,
      atRiskStudents,
      progressDistribution: [
        { name: "Low Progress (0-30%)", value: lowProgress, color: "#ef4444" },
        { name: "Medium Progress (30-70%)", value: mediumProgress, color: "#f59e0b" },
        { name: "High Progress (70-100%)", value: highProgress, color: "#10b981" },
      ] as ProgressData[],
    };
  }, [students, tasks]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-heading-1 font-bold text-text-primary">
            Students
          </h1>
          <p className="text-body text-text-secondary mt-1">
            Manage your students and track their application progress
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <QuickAIButton
            suggestions={[
              {
                label: "Find high-achieving students",
                prompt: "Show me students with GPA above 3.8 or SAT scores above 1400",
              },
              {
                label: "Students needing attention",
                prompt: "Which students have application progress below 50%?",
              },
              {
                label: "Graduation year summary",
                prompt: "Give me a summary of students grouped by graduation year",
              },
              {
                label: "Suggest college matches",
                prompt: "Based on the current student data, suggest colleges that would be good matches",
              },
            ]}
            onSelect={(prompt, response) => {
              toast.info("AI Response", { description: response });
            }}
          />
          <Button
            variant="outline"
            onClick={() => {
              setUploadMode("ai");
              setShowUnifiedUploadModal(true);
            }}
            className="border-primary text-primary hover:bg-primary hover:text-white"
          >
            <Sparkles className="h-4 w-4 mr-2" />
            Upload Students
          </Button>
          <Button onClick={() => setShowAddModal(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Student
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      {!isLoading && !error && students.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatsCard
            title="Total Students"
            value={stats.total}
            icon={Users}
            iconColor="text-blue-600"
            description="Active students in system"
          />
          <StatsCard
            title="Average Progress"
            value={`${stats.avgProgress}%`}
            icon={Target}
            iconColor="text-purple-600"
            description="Overall application progress"
          />
          <StatsCard
            title="Upcoming Deadlines"
            value={stats.upcomingDeadlines}
            icon={Clock}
            iconColor="text-amber-600"
            description="Due in the next 7 days"
          />
          <StatsCard
            title="At Risk Students"
            value={stats.atRiskStudents}
            icon={AlertCircle}
            iconColor="text-red-600"
            description="Below 30% progress"
          />
        </div>
      )}

      {/* Charts */}
      {!isLoading && !error && students.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-1 gap-4">
          <div className="rounded-xl border border-border bg-surface p-6 shadow-sm">
            <ProgressChart
              data={stats.progressDistribution}
              title="Application Progress Distribution"
            />
          </div>
        </div>
      )}

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-tertiary" />
          <Input
            placeholder="Search students, tasks, colleges..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <StudentFilters filters={filters} onFiltersChange={setFilters} />
      </div>

      {/* Active Filters */}
      {Object.values(filters).some(v => v !== undefined) && (
        <div className="flex flex-wrap gap-2">
          {filters.sortBy && filters.sortBy !== 'name' && (
            <div className="flex items-center gap-2 rounded-full bg-blue-50 border border-blue-200 px-3 py-1 text-sm text-blue-700">
              <span className="text-xs font-medium">Sort:</span> {
                filters.sortBy === 'progress-desc' ? 'Progress (High-Low)' :
                filters.sortBy === 'progress-asc' ? 'Progress (Low-High)' :
                filters.sortBy === 'gpa-desc' ? 'GPA (High-Low)' :
                filters.sortBy === 'gpa-asc' ? 'GPA (Low-High)' :
                filters.sortBy === 'sat-desc' ? 'SAT (High-Low)' :
                filters.sortBy === 'act-desc' ? 'ACT (High-Low)' :
                filters.sortBy === 'year' ? 'Graduation Year' :
                filters.sortBy
              }
              <button
                onClick={() => setFilters({ ...filters, sortBy: undefined })}
                className="hover:text-blue-900"
              >
                ×
              </button>
            </div>
          )}
          {filters.riskLevel && (
            <div className="flex items-center gap-2 rounded-full bg-purple-50 border border-purple-200 px-3 py-1 text-sm text-purple-700">
              <span className="text-xs font-medium">Status:</span> {
                filters.riskLevel === 'at-risk' ? 'At Risk' :
                filters.riskLevel === 'on-track' ? 'On Track' :
                'Ahead'
              }
              <button
                onClick={() => setFilters({ ...filters, riskLevel: undefined })}
                className="hover:text-purple-900"
              >
                ×
              </button>
            </div>
          )}
          {filters.graduationYear && (
            <div className="flex items-center gap-2 rounded-full bg-primary-light px-3 py-1 text-sm text-primary-dark">
              Class of {filters.graduationYear}
              <button
                onClick={() => setFilters({ ...filters, graduationYear: undefined })}
                className="hover:text-primary"
              >
                ×
              </button>
            </div>
          )}
          {(filters.gpaMin !== undefined || filters.gpaMax !== undefined) && (
            <div className="flex items-center gap-2 rounded-full bg-green-50 border border-green-200 px-3 py-1 text-sm text-green-700">
              <span className="text-xs font-medium">GPA:</span> {filters.gpaMin || 0} - {filters.gpaMax || 5.0}
              <button
                onClick={() => setFilters({ ...filters, gpaMin: undefined, gpaMax: undefined })}
                className="hover:text-green-900"
              >
                ×
              </button>
            </div>
          )}
          {(filters.satMin !== undefined || filters.satMax !== undefined) && (
            <div className="flex items-center gap-2 rounded-full bg-amber-50 border border-amber-200 px-3 py-1 text-sm text-amber-700">
              <span className="text-xs font-medium">SAT:</span> {filters.satMin || 400} - {filters.satMax || 1600}
              <button
                onClick={() => setFilters({ ...filters, satMin: undefined, satMax: undefined })}
                className="hover:text-amber-900"
              >
                ×
              </button>
            </div>
          )}
          {(filters.actMin !== undefined || filters.actMax !== undefined) && (
            <div className="flex items-center gap-2 rounded-full bg-indigo-50 border border-indigo-200 px-3 py-1 text-sm text-indigo-700">
              <span className="text-xs font-medium">ACT:</span> {filters.actMin || 1} - {filters.actMax || 36}
              <button
                onClick={() => setFilters({ ...filters, actMin: undefined, actMax: undefined })}
                className="hover:text-indigo-900"
              >
                ×
              </button>
            </div>
          )}
          {(filters.progressMin !== undefined || filters.progressMax !== undefined) && (
            <div className="flex items-center gap-2 rounded-full bg-rose-50 border border-rose-200 px-3 py-1 text-sm text-rose-700">
              <span className="text-xs font-medium">Progress:</span> {filters.progressMin || 0}% - {filters.progressMax || 100}%
              <button
                onClick={() => setFilters({ ...filters, progressMin: undefined, progressMax: undefined })}
                className="hover:text-rose-900"
              >
                ×
              </button>
            </div>
          )}
        </div>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {[...Array(8)].map((_, i) => (
            <div
              key={i}
              className="h-64 animate-pulse rounded-lg bg-surface border border-border"
            />
          ))}
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="rounded-lg border border-error bg-error-light p-4 text-error">
          Failed to load students. Please try again.
        </div>
      )}

      {/* Students Grid */}
      {!isLoading && !error && (
        <>
          {students.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-lg border border-border bg-surface p-12">
              <div className="text-text-tertiary mb-4">
                <Search className="h-12 w-12 mx-auto" />
              </div>
              <h3 className="text-heading-3 mb-2 text-text-primary">
                No students found
              </h3>
              <p className="text-body text-text-secondary mb-6 text-center">
                Try adjusting your search or filters, or add a new student to
                get started.
              </p>
              <Button onClick={() => setShowAddModal(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Student
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
              {students.map((student) => (
                <StudentCard key={student.id} student={student} />
              ))}
            </div>
          )}
        </>
      )}

      {/* Add Student Modal */}
      <AddStudentModal
        open={showAddModal}
        onOpenChange={setShowAddModal}
      />

      {/* Upload Students Modal (AI-powered) */}
      <AIBulkUploadModal
        open={showUnifiedUploadModal}
        onOpenChange={setShowUnifiedUploadModal}
      />
    </div>
  );
}

export default function StudentsPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>}>
      <StudentsPageContent />
    </Suspense>
  );
}


