"use client";

import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Plus, Search, Filter, Users, GraduationCap, Target, TrendingUp, Upload, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StudentCard } from "@/components/students/student-card";
import { AddStudentModal } from "@/components/students/add-student-modal";
import { BulkUploadModal } from "@/components/students/bulk-upload-modal";
import { AIBulkUploadModal } from "@/components/students/ai-bulk-upload-modal";
import { StudentFilters } from "@/components/students/student-filters";
import { StatsCard } from "@/components/charts/stats-card";
import { ProgressChart, type ProgressData } from "@/components/charts/progress-chart";
import { StudentDistributionChart } from "@/components/charts/student-distribution-chart";
import { QuickAIButton } from "@/components/ai/quick-ai-button";
import { apiClient, type Student } from "@/lib/api/client";
import { toast } from "sonner";

export default function StudentsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [showBulkUploadModal, setShowBulkUploadModal] = useState(false);
  const [showAIBulkUploadModal, setShowAIBulkUploadModal] = useState(false);
  const [filters, setFilters] = useState<{
    graduationYear?: number;
    progressMin?: number;
    progressMax?: number;
  }>({});

  const { data, isLoading, error } = useQuery({
    queryKey: ["students", searchQuery, filters],
    queryFn: () =>
      apiClient.getStudents({
        search: searchQuery || undefined,
        ...filters,
      }),
  });

  const students = data?.data || [];

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

    // Graduation years
    const graduationYears = new Map<number, number>();
    students.forEach((s) => {
      if (s.graduation_year) {
        graduationYears.set(
          s.graduation_year,
          (graduationYears.get(s.graduation_year) || 0) + 1
        );
      }
    });

    const currentYear = new Date().getFullYear();
    const thisYear = graduationYears.get(currentYear) || 0;

    return {
      total,
      avgProgress,
      thisYear,
      progressDistribution: [
        { name: "Low Progress (0-30%)", value: lowProgress, color: "#ef4444" },
        { name: "Medium Progress (30-70%)", value: mediumProgress, color: "#f59e0b" },
        { name: "High Progress (70-100%)", value: highProgress, color: "#10b981" },
      ] as ProgressData[],
    };
  }, [students]);

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
            onClick={() => setShowBulkUploadModal(true)}
          >
            <Upload className="h-4 w-4 mr-2" />
            Bulk Upload
          </Button>
          <Button
            variant="outline"
            onClick={() => setShowAIBulkUploadModal(true)}
            className="border-primary text-primary hover:bg-primary hover:text-white"
          >
            <Sparkles className="h-4 w-4 mr-2" />
            AI Bulk Upload
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
            title="Graduating This Year"
            value={stats.thisYear}
            icon={GraduationCap}
            iconColor="text-green-600"
            description={`Class of ${new Date().getFullYear()}`}
          />
          <StatsCard
            title="High Progress"
            value={stats.progressDistribution[2].value}
            icon={TrendingUp}
            iconColor="text-orange-600"
            description="Students above 70% progress"
          />
        </div>
      )}

      {/* Charts */}
      {!isLoading && !error && students.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="rounded-xl border border-border bg-surface p-6 shadow-sm">
            <ProgressChart
              data={stats.progressDistribution}
              title="Application Progress Distribution"
            />
          </div>
          <StudentDistributionChart
            data={Array.from(
              students.reduce((acc, s) => {
                if (s.graduation_year) {
                  acc.set(s.graduation_year, (acc.get(s.graduation_year) || 0) + 1);
                }
                return acc;
              }, new Map<number, number>())
            )
              .map(([year, count]) => ({ name: year.toString(), count }))
              .sort((a, b) => parseInt(a.name) - parseInt(b.name))}
            title="Students by Graduation Year"
            description="Distribution across graduating classes"
            type="bar"
          />
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
      {(filters.graduationYear ||
        filters.progressMin !== undefined ||
        filters.progressMax !== undefined) && (
        <div className="flex flex-wrap gap-2">
          {filters.graduationYear && (
            <div className="flex items-center gap-2 rounded-full bg-primary-light px-3 py-1 text-sm text-primary-dark">
              Graduation: {filters.graduationYear}
              <button
                onClick={() =>
                  setFilters({ ...filters, graduationYear: undefined })
                }
                className="hover:text-primary"
              >
                ×
              </button>
            </div>
          )}
          {filters.progressMin !== undefined && (
            <div className="flex items-center gap-2 rounded-full bg-primary-light px-3 py-1 text-sm text-primary-dark">
              Progress: {filters.progressMin}%+
              <button
                onClick={() =>
                  setFilters({ ...filters, progressMin: undefined })
                }
                className="hover:text-primary"
              >
                ×
              </button>
            </div>
          )}
          {filters.progressMax !== undefined && (
            <div className="flex items-center gap-2 rounded-full bg-primary-light px-3 py-1 text-sm text-primary-dark">
              Progress: ≤{filters.progressMax}%
              <button
                onClick={() =>
                  setFilters({ ...filters, progressMax: undefined })
                }
                className="hover:text-primary"
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

      {/* Bulk Upload Modal */}
      <BulkUploadModal
        open={showBulkUploadModal}
        onOpenChange={setShowBulkUploadModal}
      />

      {/* AI Bulk Upload Modal */}
      <AIBulkUploadModal
        open={showAIBulkUploadModal}
        onOpenChange={setShowAIBulkUploadModal}
      />
    </div>
  );
}


