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
  };
  onFiltersChange: (filters: {
    graduationYear?: number;
    progressMin?: number;
    progressMax?: number;
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
      <PopoverContent className="w-80" align="end">
        <div className="space-y-4">
          <div>
            <h4 className="text-sm font-semibold mb-3">Filters</h4>
          </div>

          {/* Graduation Year */}
          <div className="space-y-2">
            <Label>Graduation Year</Label>
            <Select
              value={filters.graduationYear?.toString() || "all"}
              onValueChange={(value) =>
                onFiltersChange({
                  ...filters,
                  graduationYear: value === "all" ? undefined : parseInt(value),
                })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="All years" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All years</SelectItem>
                {[...Array(6)].map((_, i) => {
                  const year = currentYear + i;
                  return (
                    <SelectItem key={year} value={year.toString()}>
                      {year}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          {/* Progress Range */}
          <div className="space-y-2">
            <Label>Application Progress</Label>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs text-text-tertiary">Min %</Label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  placeholder="0"
                  value={filters.progressMin || ""}
                  onChange={(e) =>
                    onFiltersChange({
                      ...filters,
                      progressMin: e.target.value
                        ? parseInt(e.target.value)
                        : undefined,
                    })
                  }
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-text-tertiary">Max %</Label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  placeholder="100"
                  value={filters.progressMax || ""}
                  onChange={(e) =>
                    onFiltersChange({
                      ...filters,
                      progressMax: e.target.value
                        ? parseInt(e.target.value)
                        : undefined,
                    })
                  }
                />
              </div>
            </div>
          </div>

          {/* Clear Filters */}
          {(filters.graduationYear ||
            filters.progressMin !== undefined ||
            filters.progressMax !== undefined) && (
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


