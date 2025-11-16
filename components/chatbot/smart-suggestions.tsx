"use client";

import { useState, useEffect } from "react";
import { Command, CommandEmpty, CommandGroup, CommandItem, CommandList } from "@/components/ui/command";
import { Search, Users, Calendar, FileText, TrendingUp, AlertCircle } from "lucide-react";

interface SmartSuggestion {
  id: string;
  text: string;
  icon: React.ComponentType<{ className?: string }>;
  category: "query" | "action" | "analysis";
  keywords: string[];
}

const SMART_SUGGESTIONS: SmartSuggestion[] = [
  // Student queries
  {
    id: "students-all",
    text: "Show all students",
    icon: Users,
    category: "query",
    keywords: ["student", "show", "list", "all"],
  },
  {
    id: "students-progress",
    text: "Students with low progress",
    icon: TrendingUp,
    category: "query",
    keywords: ["student", "progress", "low", "behind"],
  },
  {
    id: "students-deadlines",
    text: "Students with upcoming deadlines",
    icon: AlertCircle,
    category: "query",
    keywords: ["student", "deadline", "upcoming", "soon"],
  },

  // Deadline queries
  {
    id: "deadlines-week",
    text: "Deadlines this week",
    icon: Calendar,
    category: "query",
    keywords: ["deadline", "week", "upcoming", "this"],
  },
  {
    id: "deadlines-urgent",
    text: "Urgent deadlines (next 3 days)",
    icon: AlertCircle,
    category: "query",
    keywords: ["deadline", "urgent", "soon", "emergency"],
  },

  // Essay queries
  {
    id: "essays-pending",
    text: "Essays pending review",
    icon: FileText,
    category: "query",
    keywords: ["essay", "pending", "review", "draft"],
  },
  {
    id: "essays-complete",
    text: "Show completed essays",
    icon: FileText,
    category: "query",
    keywords: ["essay", "complete", "finished", "done"],
  },

  // Analysis queries
  {
    id: "analyze-progress",
    text: "Analyze overall application progress",
    icon: TrendingUp,
    category: "analysis",
    keywords: ["analyze", "progress", "overall", "statistics", "stats"],
  },
  {
    id: "analyze-deadlines",
    text: "Analyze deadline distribution",
    icon: Calendar,
    category: "analysis",
    keywords: ["analyze", "deadline", "distribution", "overview"],
  },
];

interface SmartSuggestionsProps {
  input: string;
  onSuggestionSelect: (text: string) => void;
  isVisible: boolean;
}

export function SmartSuggestions({ input, onSuggestionSelect, isVisible }: SmartSuggestionsProps) {
  const [filteredSuggestions, setFilteredSuggestions] = useState<SmartSuggestion[]>([]);

  useEffect(() => {
    if (!input.trim() || input.length < 2) {
      setFilteredSuggestions([]);
      return;
    }

    const inputLower = input.toLowerCase();
    const words = inputLower.split(/\s+/);

    // Score each suggestion based on keyword matches
    const scored = SMART_SUGGESTIONS.map((suggestion) => {
      let score = 0;

      // Check for exact phrase match
      if (suggestion.text.toLowerCase().includes(inputLower)) {
        score += 50;
      }

      // Check for keyword matches
      words.forEach((word) => {
        if (suggestion.keywords.some((keyword) => keyword.includes(word))) {
          score += 10;
        }
        if (suggestion.text.toLowerCase().includes(word)) {
          score += 5;
        }
      });

      return { suggestion, score };
    });

    // Filter and sort by score
    const filtered = scored
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 5)
      .map((item) => item.suggestion);

    setFilteredSuggestions(filtered);
  }, [input]);

  if (!isVisible || filteredSuggestions.length === 0) {
    return null;
  }

  return (
    <div className="absolute bottom-full left-0 right-0 mb-2 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="bg-surface/95 backdrop-blur-xl border border-border/50 rounded-xl shadow-2xl overflow-hidden">
        <Command className="bg-transparent">
          <CommandList className="max-h-[300px]">
            <CommandEmpty className="py-6 text-center text-sm text-text-tertiary">
              No suggestions found
            </CommandEmpty>
            <CommandGroup heading="Suggestions" className="p-2">
              {filteredSuggestions.map((suggestion) => {
                const Icon = suggestion.icon;
                return (
                  <CommandItem
                    key={suggestion.id}
                    onSelect={() => onSuggestionSelect(suggestion.text)}
                    className="flex items-center gap-3 px-4 py-3 cursor-pointer rounded-lg hover:bg-primary/10 transition-colors group"
                  >
                    <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-primary/10 text-primary group-hover:bg-primary group-hover:text-white transition-colors">
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-text-primary group-hover:text-primary transition-colors">
                        {suggestion.text}
                      </p>
                      <p className="text-xs text-text-tertiary capitalize">
                        {suggestion.category}
                      </p>
                    </div>
                    <kbd className="hidden md:inline-flex px-2 py-1 rounded bg-surface/80 border border-border/30 font-mono text-[10px] font-semibold text-text-tertiary">
                      ↵
                    </kbd>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </div>
    </div>
  );
}
