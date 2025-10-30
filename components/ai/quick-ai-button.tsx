"use client";

import { useState } from "react";
import { Sparkles, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { toast } from "sonner";

interface QuickAIButtonProps {
  suggestions: {
    label: string;
    prompt: string;
  }[];
  onSelect?: (prompt: string, response: string) => void;
  variant?: "default" | "outline" | "ghost";
  size?: "default" | "sm" | "lg" | "icon";
}

export function QuickAIButton({
  suggestions,
  onSelect,
  variant = "outline",
  size = "sm",
}: QuickAIButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [open, setOpen] = useState(false);

  const handleSuggestionClick = async (prompt: string) => {
    setOpen(false);
    setIsLoading(true);

    try {
      const response = await fetch("/api/v1/chatbot/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: prompt,
          stream: false,
        }),
      });

      const result = await response.json();

      if (result.success) {
        onSelect?.(prompt, result.response);
        toast.success("AI response generated");
      } else {
        toast.error(result.error || "Failed to get AI response");
      }
    } catch (error) {
      console.error("AI error:", error);
      toast.error("Failed to get AI response");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant={variant} size={size} disabled={isLoading}>
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Processing...
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4 mr-2" />
              Quick AI
            </>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="end">
        <div className="space-y-2">
          <div className="mb-3">
            <h4 className="font-semibold text-sm text-text-primary mb-1">
              Quick AI Actions
            </h4>
            <p className="text-xs text-text-secondary">
              Select an action to get instant AI insights
            </p>
          </div>
          <div className="space-y-1">
            {suggestions.map((suggestion, idx) => (
              <button
                key={idx}
                onClick={() => handleSuggestionClick(suggestion.prompt)}
                className="w-full text-left px-3 py-2 text-sm rounded-md hover:bg-surface transition-colors text-text-primary"
              >
                {suggestion.label}
              </button>
            ))}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
