"use client";

import { useState, useEffect, KeyboardEvent } from "react";
import { useRouter, usePathname } from "next/navigation";
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Sparkles,
  Loader2,
  ArrowRight,
  Filter,
  Search,
  Eye,
  AlertCircle,
} from "lucide-react";
import { useAI } from "@/lib/contexts/ai-context";
import { type CommandContext, type CommandAction } from "@/lib/ai/command-executor";
import { useQuery } from "@tanstack/react-query";

interface AICommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Recent commands stored in localStorage
const MAX_RECENT_COMMANDS = 5;

function getRecentCommands(): string[] {
  if (typeof window === "undefined") return [];
  const stored = localStorage.getItem("recent_commands");
  return stored ? JSON.parse(stored) : [];
}

function addRecentCommand(command: string) {
  if (typeof window === "undefined") return;
  const recent = getRecentCommands();
  const updated = [command, ...recent.filter((c) => c !== command)].slice(0, MAX_RECENT_COMMANDS);
  localStorage.setItem("recent_commands", JSON.stringify(updated));
}

// Context-aware command suggestions based on current page
function getContextSuggestions(page: CommandContext["currentPage"]): string[] {
  switch (page) {
    case "students":
      return [
        "Show students graduating in 2025",
        "Find students with progress below 50%",
        "List high-achieving students (GPA > 3.8)",
        "Show students who need attention",
        "Display students by graduation year",
      ];
    case "tasks":
      return [
        "Show overdue tasks",
        "Filter high priority tasks",
        "Find tasks due this week",
        "Show completed tasks from today",
        "List pending tasks by priority",
      ];
    case "chatbot":
      return [
        "Analyze student progress trends",
        "Suggest college recommendations",
        "Generate insights about at-risk students",
        "Create task suggestions for students",
      ];
    default:
      return [
        "Go to students page",
        "Show all tasks",
        "Open chatbot",
        "Navigate to agent dashboard",
      ];
  }
}

// Fuzzy search for command matching
function fuzzyMatch(query: string, commands: string[]): string[] {
  if (!query.trim()) return commands;

  const lowerQuery = query.toLowerCase();
  const words = lowerQuery.split(" ").filter(w => w.length > 0);

  return commands
    .map(cmd => {
      const lowerCmd = cmd.toLowerCase();
      let score = 0;

      // Exact match gets highest score
      if (lowerCmd === lowerQuery) score += 100;

      // Starts with query gets high score
      if (lowerCmd.startsWith(lowerQuery)) score += 50;

      // Contains query gets medium score
      if (lowerCmd.includes(lowerQuery)) score += 25;

      // Each word match gets points
      words.forEach(word => {
        if (lowerCmd.includes(word)) score += 10;
      });

      return { cmd, score };
    })
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
    .map(({ cmd }) => cmd);
}

export function AICommandPalette({ open, onOpenChange }: AICommandPaletteProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { currentPage } = useAI();

  const [inputValue, setInputValue] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<CommandAction | null>(null);
  const [recentCommands, setRecentCommands] = useState<string[]>([]);

  // Fetch students for context
  const { data: studentsData } = useQuery({
    queryKey: ["students"],
    queryFn: async () => {
      const response = await fetch("/api/v1/students");
      if (!response.ok) return null;
      const json = await response.json();
      return json.data;
    },
    enabled: open,
  });

  // Fetch tasks for context
  const { data: tasksData } = useQuery({
    queryKey: ["tasks"],
    queryFn: async () => {
      const response = await fetch("/api/v1/tasks");
      if (!response.ok) return null;
      const json = await response.json();
      return json.data;
    },
    enabled: open,
  });

  // Load recent commands on mount
  useEffect(() => {
    if (open) {
      setRecentCommands(getRecentCommands());
      setResult(null);
      setInputValue("");
    }
  }, [open]);

  // Determine current page from pathname
  const getCurrentPage = (): CommandContext["currentPage"] => {
    if (pathname?.includes("/students")) return "students";
    if (pathname?.includes("/tasks")) return "tasks";
    if (pathname?.includes("/chatbot")) return "chatbot";
    return "home";
  };

  // Build command context
  const buildContext = (): CommandContext => {
    const context: CommandContext = {
      currentPage: getCurrentPage(),
    };

    // Add available students/tasks based on current page
    if (studentsData) {
      context.availableStudents = studentsData.slice(0, 20).map((s: any) => ({
        id: s.id,
        name: `${s.first_name} ${s.last_name}`,
      }));
    }

    if (tasksData) {
      context.availableTasks = tasksData.slice(0, 20).map((t: any) => ({
        id: t.id,
        title: t.title,
      }));
    }

    return context;
  };

  // Handle command execution
  const handleExecuteCommand = async (command: string) => {
    if (!command.trim()) return;

    setIsProcessing(true);
    setResult(null);

    try {
      const context = buildContext();

      // Call server-side API to execute command
      const response = await fetch("/api/v1/command/execute", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          command,
          context,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to execute command");
      }

      const json = await response.json();
      const action = json.data as CommandAction;

      setResult(action);
      addRecentCommand(command);
      setRecentCommands(getRecentCommands());

      // Execute action
      await executeAction(action);
    } catch (error) {
      console.error("Command execution error:", error);
      setResult({
        type: "error",
        message: "Failed to process command. Please try again.",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // Execute the parsed action
  const executeAction = async (action: CommandAction) => {
    switch (action.type) {
      case "navigate":
        router.push(action.path);
        setTimeout(() => onOpenChange(false), 300);
        break;

      case "filter":
        // For now, navigate with query params
        // Later can update to use state management
        const params = new URLSearchParams();
        for (const [key, value] of Object.entries(action.filters)) {
          params.set(key, String(value));
        }
        router.push(`/${action.entity}?${params.toString()}`);
        setTimeout(() => onOpenChange(false), 300);
        break;

      case "search":
        router.push(`/${action.entity}?search=${encodeURIComponent(action.query)}`);
        setTimeout(() => onOpenChange(false), 300);
        break;

      case "quick_view":
        router.push(`/${action.entity}s/${action.id}`);
        setTimeout(() => onOpenChange(false), 300);
        break;

      case "error":
        // Keep dialog open to show error
        break;
    }
  };

  // Handle key press
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !isProcessing && inputValue.trim()) {
      e.preventDefault();
      handleExecuteCommand(inputValue);
    }
  };

  // Get icon for action type
  const getActionIcon = (type: CommandAction["type"]) => {
    switch (type) {
      case "navigate":
        return <ArrowRight className="h-4 w-4" />;
      case "filter":
        return <Filter className="h-4 w-4" />;
      case "search":
        return <Search className="h-4 w-4" />;
      case "quick_view":
        return <Eye className="h-4 w-4" />;
      case "error":
        return <AlertCircle className="h-4 w-4" />;
      default:
        return <Sparkles className="h-4 w-4" />;
    }
  };

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      {/* Hidden accessibility title */}
      <div className="sr-only" role="heading" aria-level={1}>
        AI Assistant Command Palette
      </div>
      <div className="sr-only" id="command-description">
        Type natural language commands to navigate, filter, or search. Press Enter to execute.
      </div>

      <div className="flex items-center border-b px-3" aria-describedby="command-description">
        <Search className="mr-2 h-4 w-4 shrink-0 text-text-tertiary" />
        <input
          className="flex h-11 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
          placeholder="Search students, tasks, or ask AI anything..."
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isProcessing}
          aria-label="Search and AI command input"
          autoComplete="off"
          spellCheck="false"
        />
        {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin text-primary" />}
      </div>

      <CommandList>
        {/* Show result if available */}
        {result && (
          <div className="px-3 py-4">
            <div className={`flex items-start gap-3 rounded-lg border p-3 ${
              result.type === "error" ? "border-red-200 bg-red-50" : "border-primary/20 bg-primary/5"
            }`}>
              <div className={result.type === "error" ? "text-red-500" : "text-primary"}>
                {getActionIcon(result.type)}
              </div>
              <div className="flex-1">
                <p className={`text-sm font-medium ${
                  result.type === "error" ? "text-red-900" : "text-foreground"
                }`}>
                  {"description" in result ? result.description : result.message}
                </p>
                {result.type !== "error" && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Action executed
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Show recent commands */}
        {!inputValue && !result && recentCommands.length > 0 && (
          <CommandGroup heading="Recent Commands">
            {recentCommands.map((cmd, index) => (
              <CommandItem
                key={index}
                onSelect={() => {
                  setInputValue(cmd);
                  handleExecuteCommand(cmd);
                }}
                className="cursor-pointer"
              >
                <Sparkles className="mr-2 h-4 w-4 text-muted-foreground" />
                <span>{cmd}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {/* Show context-aware suggestions */}
        {!inputValue && !result && recentCommands.length === 0 && (
          <CommandGroup heading="Try searching for">
            {getContextSuggestions(getCurrentPage()).map((suggestion, index) => (
              <CommandItem
                key={index}
                onSelect={() => {
                  setInputValue(suggestion);
                  handleExecuteCommand(suggestion);
                }}
                className="cursor-pointer"
              >
                <Search className="mr-2 h-4 w-4 text-text-tertiary" />
                <span>{suggestion}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {/* Show fuzzy-matched suggestions while typing */}
        {inputValue && !result && !isProcessing && (
          <CommandGroup heading="Suggestions">
            {fuzzyMatch(
              inputValue,
              [
                ...recentCommands,
                ...getContextSuggestions(getCurrentPage()),
                "Show all students",
                "Filter high priority tasks",
                "Find overdue tasks",
                "Go to chatbot",
                "Open agent dashboard",
                "Show students graduating 2025",
                "Find students with GPA above 3.5",
                "List tasks due this week",
                "Show completed tasks",
              ]
            )
              .slice(0, 5)
              .map((suggestion, index) => (
                <CommandItem
                  key={index}
                  onSelect={() => {
                    setInputValue(suggestion);
                    handleExecuteCommand(suggestion);
                  }}
                  className="cursor-pointer"
                >
                  <Search className="mr-2 h-4 w-4" />
                  <span>{suggestion}</span>
                </CommandItem>
              ))}
          </CommandGroup>
        )}

        <CommandEmpty>
          {isProcessing ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <span className="ml-2 text-sm text-muted-foreground">Processing command...</span>
            </div>
          ) : (
            <div className="py-6 text-center text-sm">
              <p className="text-muted-foreground">Press Enter to execute command</p>
            </div>
          )}
        </CommandEmpty>
      </CommandList>

      <div className="border-t px-3 py-2 text-xs text-muted-foreground">
        <span>💡 Tip: Double-press <kbd className="px-1 py-0.5 mx-1 rounded bg-muted border font-mono text-[10px]">Space</kbd> to search or try natural language like &quot;show me high priority tasks&quot;</span>
      </div>
    </CommandDialog>
  );
}

/**
 * Hook to enable keyboard shortcut for command palette
 * Double-press space bar to open
 */
export function useAICommandPalette() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let lastSpacePress = 0;
    const DOUBLE_PRESS_DELAY = 300; // 300ms window for double press

    const down = (e: globalThis.KeyboardEvent) => {
      // Double space bar press to open command palette (only if not in an input/textarea)
      const target = e.target as HTMLElement;
      const isInputField = target.tagName === "INPUT" ||
                          target.tagName === "TEXTAREA" ||
                          target.isContentEditable;

      if (e.key === " " && !isInputField) {
        const now = Date.now();
        const timeSinceLastPress = now - lastSpacePress;

        if (timeSinceLastPress < DOUBLE_PRESS_DELAY) {
          // Double press detected
          e.preventDefault();
          setOpen((open) => !open);
          lastSpacePress = 0; // Reset after successful double press
        } else {
          // First press
          lastSpacePress = now;
        }
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  return { open, setOpen };
}
