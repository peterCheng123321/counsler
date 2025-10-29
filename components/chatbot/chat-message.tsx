"use client";

import { memo } from "react";
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

  return (
    <div
      className={`flex animate-slide-up group ${
        isUser ? "flex-row-reverse" : "flex-row"
      }`}
      style={{ gap: 'clamp(0.75rem, 2vw, 1rem)' }}
    >
      <Avatar className="shrink-0 ring-2 ring-border/50 transition-all group-hover:ring-primary/30" style={{ width: 'clamp(2rem, 5vw, 2.5rem)', height: 'clamp(2rem, 5vw, 2.5rem)' }}>
        <AvatarFallback
          className={
            isUser
              ? "bg-gradient-to-br from-primary to-primary-hover text-white shadow-lg"
              : "bg-gradient-to-br from-surface to-background text-text-secondary border border-border/50 shadow-sm"
          }
        >
          {isUser ? (
            <User style={{ width: 'clamp(1rem, 2.5vw, 1.25rem)', height: 'clamp(1rem, 2.5vw, 1.25rem)' }} />
          ) : (
            <Bot style={{ width: 'clamp(1rem, 2.5vw, 1.25rem)', height: 'clamp(1rem, 2.5vw, 1.25rem)' }} />
          )}
        </AvatarFallback>
      </Avatar>
      <div
        className={`flex flex-col flex-1 min-w-0 ${
          isUser ? "items-end" : "items-start"
        }`}
        style={{ gap: 'clamp(0.25rem, 1vw, 0.5rem)' }}
      >
        <div
          className={`max-w-[85%] sm:max-w-[80%] md:max-w-[75%] rounded-2xl shadow-lg transition-all duration-200 hover:shadow-xl ${
            isUser
              ? "bg-gradient-to-br from-primary via-primary to-primary-hover text-white rounded-br-md backdrop-blur-sm"
              : "bg-surface/90 backdrop-blur-sm border border-border/50 text-text-primary rounded-bl-md hover:border-border"
          }`}
          style={{ 
            padding: 'clamp(0.5rem, 2vw, 1rem)',
            paddingLeft: 'clamp(0.75rem, 2.5vw, 1.25rem)',
            paddingRight: 'clamp(0.75rem, 2.5vw, 1.25rem)'
          }}
        >
          <p className="leading-relaxed whitespace-pre-wrap break-words" style={{ fontSize: 'clamp(0.875rem, 1.5vw, 1rem)' }}>
            {message.content}
          </p>
        </div>
        <span className="text-text-tertiary/80" style={{ fontSize: 'clamp(0.625rem, 1.2vw, 0.75rem)', paddingLeft: 'clamp(0.125rem, 0.5vw, 0.25rem)', paddingRight: 'clamp(0.125rem, 0.5vw, 0.25rem)' }}>
          {format(message.timestamp, "h:mm a")}
        </span>
      </div>
    </div>
  );
});

