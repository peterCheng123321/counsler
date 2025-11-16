"use client";

import { useState } from "react";
import { Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface TaskFiltersProps {
  filters: {
    status?: string;
    priority?: string;
    studentId?: string;
    dueDateFrom?: string;
    dueDateTo?: string;
    urgency?: string;
    sortBy?: string;
    showCompleted?: boolean;
  };
  onFiltersChange: (filters: {
    status?: string;
    priority?: string;
    studentId?: string;
    dueDateFrom?: string;
    dueDateTo?: string;
    urgency?: string;
    sortBy?: string;
    showCompleted?: boolean;
  }) => void;
}

export function TaskFilters({ filters, onFiltersChange }: TaskFiltersProps) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline">
          <Filter className="h-4 w-4 mr-2" />
          Filters
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96 max-h-[80vh] overflow-y-auto" align="end">
        <div className="space-y-4">
          <div>
            <h4 className="text-sm font-semibold mb-1">Filter & Sort Tasks</h4>
            <p className="text-xs text-text-tertiary">Organize and prioritize your tasks</p>
          </div>

          {/* Sort By */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Sort By</Label>
            <Select
              value={filters.sortBy || "due-date"}
              onValueChange={(value) =>
                onFiltersChange({
                  ...filters,
                  sortBy: value === "due-date" ? undefined : value,
                })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Due Date" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="due-date">Due Date (Soonest First)</SelectItem>
                <SelectItem value="due-date-desc">Due Date (Latest First)</SelectItem>
                <SelectItem value="priority-high">Priority (High First)</SelectItem>
                <SelectItem value="priority-low">Priority (Low First)</SelectItem>
                <SelectItem value="title">Title (A-Z)</SelectItem>
                <SelectItem value="created">Recently Created</SelectItem>
                <SelectItem value="updated">Recently Updated</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Urgency Quick Filter */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Urgency</Label>
            <Select
              value={filters.urgency || "all"}
              onValueChange={(value) =>
                onFiltersChange({
                  ...filters,
                  urgency: value === "all" ? undefined : value,
                })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="All tasks" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Tasks</SelectItem>
                <SelectItem value="overdue">Overdue</SelectItem>
                <SelectItem value="today">Due Today</SelectItem>
                <SelectItem value="this-week">Due This Week</SelectItem>
                <SelectItem value="next-week">Due Next Week</SelectItem>
                <SelectItem value="upcoming">Upcoming (Next 30 Days)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="border-t pt-4">
            <Label className="text-sm font-medium mb-3 block">Advanced Filters</Label>

            {/* Status */}
            <div className="space-y-2 mb-4">
              <Label className="text-xs text-text-secondary">Status</Label>
              <Select
                value={filters.status || "all"}
                onValueChange={(value) =>
                  onFiltersChange({
                    ...filters,
                    status: value === "all" ? undefined : value,
                  })
                }
              >
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Priority */}
            <div className="space-y-2 mb-4">
              <Label className="text-xs text-text-secondary">Priority</Label>
              <Select
                value={filters.priority || "all"}
                onValueChange={(value) =>
                  onFiltersChange({
                    ...filters,
                    priority: value === "all" ? undefined : value,
                  })
                }
              >
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="All priorities" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Priorities</SelectItem>
                  <SelectItem value="high">High Priority</SelectItem>
                  <SelectItem value="medium">Medium Priority</SelectItem>
                  <SelectItem value="low">Low Priority</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Date Range */}
            <div className="space-y-2 mb-4">
              <Label className="text-xs text-text-secondary">Due Date Range</Label>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Input
                    type="date"
                    value={filters.dueDateFrom || ""}
                    onChange={(e) =>
                      onFiltersChange({
                        ...filters,
                        dueDateFrom: e.target.value || undefined,
                      })
                    }
                    className="h-9"
                  />
                </div>
                <div className="space-y-1">
                  <Input
                    type="date"
                    value={filters.dueDateTo || ""}
                    onChange={(e) =>
                      onFiltersChange({
                        ...filters,
                        dueDateTo: e.target.value || undefined,
                      })
                    }
                    className="h-9"
                  />
                </div>
              </div>
            </div>

            {/* Show Completed Toggle */}
            <div className="flex items-center justify-between mb-4 p-3 rounded-lg bg-gray-50 border border-gray-200">
              <div>
                <Label className="text-xs font-medium text-gray-700">Show Completed Tasks</Label>
                <p className="text-xs text-gray-500 mt-0.5">Include completed tasks in results</p>
              </div>
              <button
                onClick={() =>
                  onFiltersChange({
                    ...filters,
                    showCompleted: !filters.showCompleted,
                  })
                }
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  filters.showCompleted ? 'bg-primary' : 'bg-gray-300'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    filters.showCompleted ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Clear Filters */}
          {Object.values(filters).some(v => v !== undefined && v !== false) && (
            <Button
              variant="outline"
              className="w-full"
              onClick={() => {
                onFiltersChange({});
              }}
            >
              Clear All Filters
            </Button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}





