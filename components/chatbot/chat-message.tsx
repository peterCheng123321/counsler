"use client";

import { memo, useEffect, useState } from "react";
import { User, Bot } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { format } from "date-fns";

interface ChatMessageProps {
  message: {
    id: string;
    role: "user" | "assistant";
    content: string;
    timestamp: Date;
  };
}

export const ChatMessage = memo(function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === "user";
  const [formattedTime, setFormattedTime] = useState<string>("");

  // Format time on client side only to avoid hydration mismatch
  useEffect(() => {
    setFormattedTime(format(message.timestamp, "h:mm a"));
  }, [message.timestamp]);

  return (
    <div
      className={`flex gap-4 ${
        isUser ? "flex-row-reverse" : "flex-row"
      } animate-slide-up group`}
    >
      <Avatar className="h-10 w-10 shrink-0 ring-2 ring-border/50 transition-all group-hover:ring-primary/30">
        <AvatarFallback
          className={
            isUser
              ? "bg-gradient-to-br from-primary to-primary-hover text-white shadow-lg"
              : "bg-gradient-to-br from-surface to-background text-text-secondary border border-border/50 shadow-sm"
          }
        >
          {isUser ? (
            <User className="h-5 w-5" />
          ) : (
            <Bot className="h-5 w-5" />
          )}
        </AvatarFallback>
      </Avatar>
      <div
        className={`flex flex-col gap-2 ${
          isUser ? "items-end" : "items-start"
        } flex-1 min-w-0`}
      >
        <div
          className={`max-w-[80%] rounded-2xl px-5 py-4 shadow-lg transition-all duration-200 hover:shadow-xl ${
            isUser
              ? "bg-gradient-to-br from-primary via-primary to-primary-hover text-white rounded-br-md backdrop-blur-sm"
              : "bg-surface/90 backdrop-blur-sm border border-border/50 text-text-primary rounded-bl-md hover:border-border"
          }`}
        >
          <div className="text-sm md:text-base leading-relaxed whitespace-pre-wrap break-words">
            {message.content}
          </div>
        </div>
        {formattedTime && (
          <span className="text-xs text-text-tertiary/80 px-1">
            {formattedTime}
          </span>
        )}
      </div>
    </div>
  );
});

