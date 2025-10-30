"use client";

import { useState, useEffect, useRef, KeyboardEvent } from "react";
import { useRouter } from "next/navigation";
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import {
  Sparkles,
  User,
  CheckSquare,
  GraduationCap,
  FileText,
  Plus,
  Edit,
  Trash2,
} from "lucide-react";

interface CommandAction {
  id: string;
  label: string;
  description: string;
  icon: any;
  category: "create" | "query" | "update" | "generate";
  template: string;
}

const commandActions: CommandAction[] = [
  // Create Commands
  {
    id: "create-student",
    label: "Create Student",
    description: "Add a new student to the system",
    icon: User,
    category: "create",
    template: "Create a new student named [name] with email [email] graduating in [year]",
  },
  {
    id: "create-task",
    label: "Create Task",
    description: "Create a new task or deadline",
    icon: CheckSquare,
    category: "create",
    template: "Create a task titled [title] with [priority] priority due on [date]",
  },
  {
    id: "add-college",
    label: "Add College to Student",
    description: "Add a college application to a student's list",
    icon: GraduationCap,
    category: "create",
    template: "Add [college name] to [student name]'s college list as [ED/EA/RD/Rolling]",
  },

  // Query Commands
  {
    id: "query-students",
    label: "Find Students",
    description: "Search for students by various criteria",
    icon: User,
    category: "query",
    template: "Show me all students [filter criteria]",
  },
  {
    id: "query-tasks",
    label: "Find Tasks",
    description: "Search for tasks and deadlines",
    icon: CheckSquare,
    category: "query",
    template: "Show me all tasks [filter criteria]",
  },
  {
    id: "query-deadlines",
    label: "Upcoming Deadlines",
    description: "View upcoming application deadlines",
    icon: CheckSquare,
    category: "query",
    template: "What deadlines are coming up [this week/this month]?",
  },

  // Update Commands
  {
    id: "update-student",
    label: "Update Student",
    description: "Modify student information",
    icon: Edit,
    category: "update",
    template: "Update [student name]'s [field] to [value]",
  },
  {
    id: "update-task",
    label: "Update Task",
    description: "Change task status or details",
    icon: Edit,
    category: "update",
    template: "Update the [task name] status to [completed/in progress/pending]",
  },

  // Generate Commands
  {
    id: "generate-lor",
    label: "Generate Letter of Recommendation",
    description: "Create a recommendation letter for a student",
    icon: FileText,
    category: "generate",
    template: "Generate a letter of recommendation for [student name] for [college name]",
  },

  // Delete Commands
  {
    id: "delete-student",
    label: "Delete Student",
    description: "Remove a student from the system",
    icon: Trash2,
    category: "update",
    template: "Delete student [name]",
  },
  {
    id: "delete-task",
    label: "Delete Task",
    description: "Remove a task",
    icon: Trash2,
    category: "update",
    template: "Delete task [name]",
  },
];

interface AICommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCommandSelect?: (command: string) => void;
}

export function AICommandPalette({
  open,
  onOpenChange,
  onCommandSelect,
}: AICommandPaletteProps) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");

  // Navigate to chatbot with pre-filled command
  const handleCommandSelect = (action: CommandAction) => {
    if (onCommandSelect) {
      // If callback provided, use it (for inline commands on same page)
      onCommandSelect(action.template);
      onOpenChange(false);
    } else {
      // Otherwise, navigate to chatbot with the command
      const encodedCommand = encodeURIComponent(action.template);
      router.push(`/chatbot?q=${encodedCommand}`);
      onOpenChange(false);
    }
  };

  // Filter commands based on search
  const filteredCommands = searchQuery
    ? commandActions.filter(
        (action) =>
          action.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
          action.description.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : commandActions;

  // Group commands by category
  const groupedCommands = {
    create: filteredCommands.filter((a) => a.category === "create"),
    query: filteredCommands.filter((a) => a.category === "query"),
    update: filteredCommands.filter((a) => a.category === "update"),
    generate: filteredCommands.filter((a) => a.category === "generate"),
  };

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput
        placeholder="Type a command or search..."
        value={searchQuery}
        onValueChange={setSearchQuery}
      />
      <CommandList>
        <CommandEmpty>No commands found.</CommandEmpty>

        {groupedCommands.create.length > 0 && (
          <>
            <CommandGroup heading="Create">
              {groupedCommands.create.map((action) => {
                const Icon = action.icon;
                return (
                  <CommandItem
                    key={action.id}
                    onSelect={() => handleCommandSelect(action)}
                    className="cursor-pointer"
                  >
                    <Icon className="mr-2 h-4 w-4" />
                    <div className="flex flex-col">
                      <span className="font-medium">{action.label}</span>
                      <span className="text-xs text-muted-foreground">
                        {action.description}
                      </span>
                    </div>
                  </CommandItem>
                );
              })}
            </CommandGroup>
            <CommandSeparator />
          </>
        )}

        {groupedCommands.query.length > 0 && (
          <>
            <CommandGroup heading="Query">
              {groupedCommands.query.map((action) => {
                const Icon = action.icon;
                return (
                  <CommandItem
                    key={action.id}
                    onSelect={() => handleCommandSelect(action)}
                    className="cursor-pointer"
                  >
                    <Icon className="mr-2 h-4 w-4" />
                    <div className="flex flex-col">
                      <span className="font-medium">{action.label}</span>
                      <span className="text-xs text-muted-foreground">
                        {action.description}
                      </span>
                    </div>
                  </CommandItem>
                );
              })}
            </CommandGroup>
            <CommandSeparator />
          </>
        )}

        {groupedCommands.generate.length > 0 && (
          <>
            <CommandGroup heading="Generate">
              {groupedCommands.generate.map((action) => {
                const Icon = action.icon;
                return (
                  <CommandItem
                    key={action.id}
                    onSelect={() => handleCommandSelect(action)}
                    className="cursor-pointer"
                  >
                    <Icon className="mr-2 h-4 w-4" />
                    <div className="flex flex-col">
                      <span className="font-medium">{action.label}</span>
                      <span className="text-xs text-muted-foreground">
                        {action.description}
                      </span>
                    </div>
                  </CommandItem>
                );
              })}
            </CommandGroup>
            <CommandSeparator />
          </>
        )}

        {groupedCommands.update.length > 0 && (
          <CommandGroup heading="Update & Delete">
            {groupedCommands.update.map((action) => {
              const Icon = action.icon;
              return (
                <CommandItem
                  key={action.id}
                  onSelect={() => handleCommandSelect(action)}
                  className="cursor-pointer"
                >
                  <Icon className="mr-2 h-4 w-4" />
                  <div className="flex flex-col">
                    <span className="font-medium">{action.label}</span>
                    <span className="text-xs text-muted-foreground">
                      {action.description}
                    </span>
                  </div>
                </CommandItem>
              );
            })}
          </CommandGroup>
        )}
      </CommandList>
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
      if ((e.key === "k" && (e.metaKey || e.ctrlKey)) || e.key === "/") {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  return { open, setOpen };
}
