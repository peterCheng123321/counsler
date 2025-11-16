"use client";

import { useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Briefcase,
  GraduationCap,
  BarChart3,
  Edit3,
  Search,
  ChevronDown,
  Sparkles,
} from "lucide-react";
import type { AIMode, UserRole } from "@/lib/ai/tool-categories";
import { MODE_DEFINITIONS, getModesForRole } from "@/lib/ai/tool-categories";

// Icon mapping for modes
const MODE_ICONS = {
  counselor_copilot: Briefcase,
  student_advisor: GraduationCap,
  admin_analytics: BarChart3,
  canvas_editor: Edit3,
  research_assistant: Search,
} as const;

interface ModeSelectorProps {
  selectedMode: AIMode;
  userRole: UserRole;
  onModeChange: (mode: AIMode) => void;
  className?: string;
  compact?: boolean; // For smaller displays
}

export function ModeSelector({
  selectedMode,
  userRole,
  onModeChange,
  className = "",
  compact = false,
}: ModeSelectorProps) {
  const [open, setOpen] = useState(false);

  // Get available modes for the user's role
  const availableModes = getModesForRole(userRole);
  const currentMode = MODE_DEFINITIONS[selectedMode];
  const CurrentIcon = MODE_ICONS[selectedMode];

  // Compact version - Simple dropdown
  if (compact) {
    return (
      <Select value={selectedMode} onValueChange={(value) => onModeChange(value as AIMode)}>
        <SelectTrigger className={`w-[200px] ${className}`}>
          <div className="flex items-center gap-2">
            <CurrentIcon className="h-4 w-4" />
            <SelectValue />
          </div>
        </SelectTrigger>
        <SelectContent>
          {availableModes.map((modeKey) => {
            const mode = MODE_DEFINITIONS[modeKey];
            const Icon = MODE_ICONS[modeKey];
            return (
              <SelectItem key={modeKey} value={modeKey}>
                <div className="flex items-center gap-2">
                  <Icon className="h-4 w-4" />
                  <span>{mode.displayName}</span>
                </div>
              </SelectItem>
            );
          })}
        </SelectContent>
      </Select>
    );
  }

  // Full version - Rich popover with descriptions
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={`justify-between gap-3 min-w-[240px] h-auto py-3 px-4 border-2 hover:border-primary/50 transition-all duration-300 ${className}`}
        >
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center">
              <CurrentIcon className="h-5 w-5 text-primary" />
            </div>
            <div className="flex flex-col items-start gap-0.5">
              <span className="text-sm font-semibold text-left">
                {currentMode.displayName}
              </span>
              <span className="text-xs text-text-secondary font-normal">
                {currentMode.description.split(",")[0]}
              </span>
            </div>
          </div>
          <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[400px] p-0" align="start">
        <div className="p-4 border-b border-border/50 bg-gradient-to-r from-primary/5 to-primary/10">
          <div className="flex items-center gap-2 mb-1">
            <Sparkles className="h-4 w-4 text-primary" />
            <h4 className="font-semibold text-sm">Select AI Mode</h4>
          </div>
          <p className="text-xs text-text-secondary">
            Choose how you want the AI to help you
          </p>
        </div>
        <div className="p-2 space-y-1 max-h-[400px] overflow-y-auto">
          {availableModes.map((modeKey) => {
            const mode = MODE_DEFINITIONS[modeKey];
            const Icon = MODE_ICONS[modeKey];
            const isSelected = selectedMode === modeKey;

            return (
              <button
                key={modeKey}
                onClick={() => {
                  onModeChange(modeKey);
                  setOpen(false);
                }}
                className={`w-full flex items-start gap-3 p-3 rounded-lg transition-all duration-200 ${
                  isSelected
                    ? "bg-primary/10 border-2 border-primary/50 shadow-sm"
                    : "bg-transparent border-2 border-transparent hover:bg-surface/50 hover:border-border/50"
                }`}
              >
                <div
                  className={`h-10 w-10 rounded-lg flex items-center justify-center shrink-0 transition-all duration-200 ${
                    isSelected
                      ? "bg-gradient-to-br from-primary to-primary-hover shadow-md"
                      : "bg-gradient-to-br from-gray-100 to-gray-200"
                  }`}
                >
                  <Icon
                    className={`h-5 w-5 ${
                      isSelected ? "text-white" : "text-gray-600"
                    }`}
                  />
                </div>
                <div className="flex-1 flex flex-col items-start gap-1 min-w-0">
                  <div className="flex items-center gap-2 w-full">
                    <span
                      className={`text-sm font-semibold ${
                        isSelected ? "text-primary" : "text-text-primary"
                      }`}
                    >
                      {mode.displayName}
                    </span>
                    {isSelected && (
                      <Badge
                        variant="default"
                        className="text-[10px] px-1.5 py-0.5 bg-primary text-white"
                      >
                        Active
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-text-secondary text-left leading-relaxed">
                    {mode.description}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
        <div className="p-3 border-t border-border/50 bg-surface/30">
          <p className="text-[11px] text-text-tertiary">
            💡 Each mode provides specialized tools for different tasks
          </p>
        </div>
      </PopoverContent>
    </Popover>
  );
}
