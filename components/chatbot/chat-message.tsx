"use client";

import { memo, useEffect, useState } from "react";
import { User, Bot } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { format } from "date-fns";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useTypewriter } from "@/hooks/use-typewriter";
import { InsightsContainer } from "./insights-container";
import { InteractiveMessage } from "./interactive-message";

export interface Insight {
  category: string;
  priority: "high" | "medium" | "low";
  finding: string;
  recommendation: string;
}

interface ChatMessageProps {
  message: {
    id: string;
    role: "user" | "assistant";
    content: string;
    timestamp: Date;
    insights?: Insight[];
  };
  enableTypewriter?: boolean;
  onOpenEssay?: (essayId: string, studentId?: string) => void;
  onOpenStudent?: (studentId: string) => void;
}

export const ChatMessage = memo(function ChatMessage({ message, enableTypewriter = false, onOpenEssay, onOpenStudent }: ChatMessageProps) {
  const isUser = message.role === "user";
  const [formattedTime, setFormattedTime] = useState<string>("");

  // Use typewriter effect for assistant messages
  const { displayedText, isComplete } = useTypewriter({
    text: message.content,
    speed: 50, // Ultra-fast typing for instant feel
    enabled: !isUser && enableTypewriter,
  });

  const contentToDisplay = (!isUser && enableTypewriter) ? displayedText : message.content;

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
          <div className="text-sm md:text-base leading-relaxed prose prose-sm max-w-none dark:prose-invert">
            {isUser ? (
              <div className="whitespace-pre-wrap break-words text-white">
                {message.content}
              </div>
            ) : (
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  // Enhanced markdown components with better styling
                  p: ({ children }) => <p className="mb-4 last:mb-0 leading-relaxed text-text-primary">{children}</p>,
                  ul: ({ children }) => <ul className="mb-4 ml-5 space-y-2 list-disc marker:text-primary">{children}</ul>,
                  ol: ({ children }) => <ol className="mb-4 ml-5 space-y-2 list-decimal marker:text-primary">{children}</ol>,
                  li: ({ children }) => <li className="text-text-primary leading-relaxed pl-1">{children}</li>,
                  h2: ({ children }) => (
                    <h2 className="text-xl font-bold mb-3 mt-5 text-text-primary flex items-center gap-2">
                      <span className="w-1 h-5 bg-primary rounded"></span>
                      {children}
                    </h2>
                  ),
                  h3: ({ children }) => <h3 className="text-lg font-semibold mb-3 mt-4 text-text-primary">{children}</h3>,
                  code: ({ children, ...props }) => {
                    const isInline = !props.className;
                    return isInline ? (
                      <code className="rounded bg-primary/15 px-2 py-1 text-sm font-mono text-primary-dark font-semibold">{children}</code>
                    ) : (
                      <code className="block rounded-xl bg-gray-900 p-5 text-sm font-mono overflow-x-auto my-4 border-2 border-gray-700 text-gray-100 shadow-lg">{children}</code>
                    );
                  },
                  strong: ({ children }) => <strong className="font-bold text-primary">{children}</strong>,
                  table: ({ children }) => (
                    <div className="overflow-x-auto my-5 rounded-xl border-2 border-border/50 shadow-sm">
                      <table className="min-w-full divide-y-2 divide-border/50">{children}</table>
                    </div>
                  ),
                  thead: ({ children }) => <thead className="bg-gradient-to-r from-primary/5 to-primary/10">{children}</thead>,
                  th: ({ children }) => <th className="px-5 py-4 text-left text-sm font-bold text-text-primary uppercase">{children}</th>,
                  td: ({ children }) => <td className="px-5 py-4 text-sm text-text-primary font-medium">{children}</td>,
                }}
              >
                {contentToDisplay}
              </ReactMarkdown>
            )}
          </div>
        </div>

        {/* Display insights if available */}
        {!isUser && message.insights && message.insights.length > 0 && (
          <div className="max-w-[80%]">
            <InsightsContainer insights={message.insights} />
          </div>
        )}

        {formattedTime && (
          <span className="text-xs text-text-tertiary/80 px-1">
            {formattedTime}
          </span>
        )}
      </div>
    </div>
  );
});

