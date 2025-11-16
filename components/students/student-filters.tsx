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

interface StudentFiltersProps {
  filters: {
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
  };
  onFiltersChange: (filters: {
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
  }) => void;
}

export function StudentFilters({
  filters,
  onFiltersChange,
}: StudentFiltersProps) {
  const [open, setOpen] = useState(false);
  const currentYear = new Date().getFullYear();

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
            <h4 className="text-sm font-semibold mb-1">Filter & Sort Students</h4>
            <p className="text-xs text-text-tertiary">Refine your student list</p>
          </div>

          {/* Sort By */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Sort By</Label>
            <Select
              value={filters.sortBy || "name"}
              onValueChange={(value) =>
                onFiltersChange({
                  ...filters,
                  sortBy: value === "name" ? undefined : value,
                })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Name (A-Z)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="name">Name (A-Z)</SelectItem>
                <SelectItem value="progress-desc">Progress (High to Low)</SelectItem>
                <SelectItem value="progress-asc">Progress (Low to High)</SelectItem>
                <SelectItem value="gpa-desc">GPA (High to Low)</SelectItem>
                <SelectItem value="gpa-asc">GPA (Low to High)</SelectItem>
                <SelectItem value="sat-desc">SAT (High to Low)</SelectItem>
                <SelectItem value="act-desc">ACT (High to Low)</SelectItem>
                <SelectItem value="year">Graduation Year</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Risk Level Quick Filter */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Progress Status</Label>
            <Select
              value={filters.riskLevel || "all"}
              onValueChange={(value) =>
                onFiltersChange({
                  ...filters,
                  riskLevel: value === "all" ? undefined : value,
                })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="All students" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Students</SelectItem>
                <SelectItem value="at-risk">At Risk (&lt;30%)</SelectItem>
                <SelectItem value="on-track">On Track (30-70%)</SelectItem>
                <SelectItem value="ahead">Ahead (70%+)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="border-t pt-4">
            <Label className="text-sm font-medium mb-3 block">Advanced Filters</Label>

            {/* Graduation Year */}
            <div className="space-y-2 mb-4">
              <Label className="text-xs text-text-secondary">Graduation Year</Label>
              <Select
                value={filters.graduationYear?.toString() || "all"}
                onValueChange={(value) =>
                  onFiltersChange({
                    ...filters,
                    graduationYear: value === "all" ? undefined : parseInt(value),
                  })
                }
              >
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="All years" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All years</SelectItem>
                  {[...Array(6)].map((_, i) => {
                    const year = currentYear + i;
                    return (
                      <SelectItem key={year} value={year.toString()}>
                        Class of {year}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            {/* GPA Range */}
            <div className="space-y-2 mb-4">
              <Label className="text-xs text-text-secondary">GPA Range</Label>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Input
                    type="number"
                    min="0"
                    max="5"
                    step="0.1"
                    placeholder="Min (e.g. 3.0)"
                    value={filters.gpaMin || ""}
                    onChange={(e) =>
                      onFiltersChange({
                        ...filters,
                        gpaMin: e.target.value ? parseFloat(e.target.value) : undefined,
                      })
                    }
                    className="h-9"
                  />
                </div>
                <div className="space-y-1">
                  <Input
                    type="number"
                    min="0"
                    max="5"
                    step="0.1"
                    placeholder="Max (e.g. 4.0)"
                    value={filters.gpaMax || ""}
                    onChange={(e) =>
                      onFiltersChange({
                        ...filters,
                        gpaMax: e.target.value ? parseFloat(e.target.value) : undefined,
                      })
                    }
                    className="h-9"
                  />
                </div>
              </div>
            </div>

            {/* SAT Score Range */}
            <div className="space-y-2 mb-4">
              <Label className="text-xs text-text-secondary">SAT Score Range</Label>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Input
                    type="number"
                    min="400"
                    max="1600"
                    step="10"
                    placeholder="Min (e.g. 1200)"
                    value={filters.satMin || ""}
                    onChange={(e) =>
                      onFiltersChange({
                        ...filters,
                        satMin: e.target.value ? parseInt(e.target.value) : undefined,
                      })
                    }
                    className="h-9"
                  />
                </div>
                <div className="space-y-1">
                  <Input
                    type="number"
                    min="400"
                    max="1600"
                    step="10"
                    placeholder="Max (e.g. 1600)"
                    value={filters.satMax || ""}
                    onChange={(e) =>
                      onFiltersChange({
                        ...filters,
                        satMax: e.target.value ? parseInt(e.target.value) : undefined,
                      })
                    }
                    className="h-9"
                  />
                </div>
              </div>
            </div>

            {/* ACT Score Range */}
            <div className="space-y-2 mb-4">
              <Label className="text-xs text-text-secondary">ACT Score Range</Label>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Input
                    type="number"
                    min="1"
                    max="36"
                    placeholder="Min (e.g. 24)"
                    value={filters.actMin || ""}
                    onChange={(e) =>
                      onFiltersChange({
                        ...filters,
                        actMin: e.target.value ? parseInt(e.target.value) : undefined,
                      })
                    }
                    className="h-9"
                  />
                </div>
                <div className="space-y-1">
                  <Input
                    type="number"
                    min="1"
                    max="36"
                    placeholder="Max (e.g. 36)"
                    value={filters.actMax || ""}
                    onChange={(e) =>
                      onFiltersChange({
                        ...filters,
                        actMax: e.target.value ? parseInt(e.target.value) : undefined,
                      })
                    }
                    className="h-9"
                  />
                </div>
              </div>
            </div>

            {/* Progress Range */}
            <div className="space-y-2 mb-4">
              <Label className="text-xs text-text-secondary">Application Progress (%)</Label>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    placeholder="Min %"
                    value={filters.progressMin || ""}
                    onChange={(e) =>
                      onFiltersChange({
                        ...filters,
                        progressMin: e.target.value ? parseInt(e.target.value) : undefined,
                      })
                    }
                    className="h-9"
                  />
                </div>
                <div className="space-y-1">
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    placeholder="Max %"
                    value={filters.progressMax || ""}
                    onChange={(e) =>
                      onFiltersChange({
                        ...filters,
                        progressMax: e.target.value ? parseInt(e.target.value) : undefined,
                      })
                    }
                    className="h-9"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Clear Filters */}
          {Object.values(filters).some(v => v !== undefined) && (
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





