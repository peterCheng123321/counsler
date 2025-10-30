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
import { executeCommand, type CommandContext, type CommandAction } from "@/lib/ai/command-executor";
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
      const action = await executeCommand(command, context);

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
      <div className="flex items-center border-b px-3">
        <Sparkles className="mr-2 h-4 w-4 shrink-0 text-primary" />
        <input
          className="flex h-11 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
          placeholder="Ask me anything... (e.g., show Sarah's details, filter high priority tasks)"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isProcessing}
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

        {/* Show examples if no input */}
        {!inputValue && !result && recentCommands.length === 0 && (
          <CommandGroup heading="Examples">
            <CommandItem disabled className="text-muted-foreground">
              <Search className="mr-2 h-4 w-4" />
              <span>show Sarah Williams&apos; details</span>
            </CommandItem>
            <CommandItem disabled className="text-muted-foreground">
              <Filter className="mr-2 h-4 w-4" />
              <span>filter high priority tasks</span>
            </CommandItem>
            <CommandItem disabled className="text-muted-foreground">
              <ArrowRight className="mr-2 h-4 w-4" />
              <span>go to students page</span>
            </CommandItem>
            <CommandItem disabled className="text-muted-foreground">
              <Search className="mr-2 h-4 w-4" />
              <span>find students graduating 2025</span>
            </CommandItem>
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
        <span>💡 Tip: Try natural language like &quot;show me high priority tasks&quot; or &quot;open Sarah&apos;s profile&quot;</span>
      </div>
    </CommandDialog>
  );
}

/**
 * Hook to enable keyboard shortcut for command palette
 */
export function useAICommandPalette() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const down = (e: globalThis.KeyboardEvent) => {
      // Cmd+K or Ctrl+K to open command palette
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  return { open, setOpen };
}
