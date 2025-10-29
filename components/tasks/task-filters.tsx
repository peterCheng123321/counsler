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
  };
  onFiltersChange: (filters: {
    status?: string;
    priority?: string;
    studentId?: string;
    dueDateFrom?: string;
    dueDateTo?: string;
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
      <PopoverContent className="w-80" align="end">
        <div className="space-y-4">
          <div>
            <h4 className="text-sm font-semibold mb-3">Filters</h4>
          </div>

          {/* Status */}
          <div className="space-y-2">
            <Label>Status</Label>
            <Select
              value={filters.status || ""}
              onValueChange={(value) =>
                onFiltersChange({
                  ...filters,
                  status: value || undefined,
                })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="All statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All statuses</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Priority */}
          <div className="space-y-2">
            <Label>Priority</Label>
            <Select
              value={filters.priority || ""}
              onValueChange={(value) =>
                onFiltersChange({
                  ...filters,
                  priority: value || undefined,
                })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="All priorities" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All priorities</SelectItem>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Date Range */}
          <div className="space-y-2">
            <Label>Due Date Range</Label>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs text-text-tertiary">From</Label>
                <Input
                  type="date"
                  value={filters.dueDateFrom || ""}
                  onChange={(e) =>
                    onFiltersChange({
                      ...filters,
                      dueDateFrom: e.target.value || undefined,
                    })
                  }
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-text-tertiary">To</Label>
                <Input
                  type="date"
                  value={filters.dueDateTo || ""}
                  onChange={(e) =>
                    onFiltersChange({
                      ...filters,
                      dueDateTo: e.target.value || undefined,
                    })
                  }
                />
              </div>
            </div>
          </div>

          {/* Clear Filters */}
          {(filters.status ||
            filters.priority ||
            filters.studentId ||
            filters.dueDateFrom ||
            filters.dueDateTo) && (
            <Button
              variant="ghost"
              className="w-full"
              onClick={() => {
                onFiltersChange({});
                setOpen(false);
              }}
            >
              Clear Filters
            </Button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}


