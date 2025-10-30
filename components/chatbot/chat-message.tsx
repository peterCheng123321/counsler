"use client";

import { memo, useEffect, useState } from "react";
import { User, Bot } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { format } from "date-fns";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useTypewriter } from "@/hooks/use-typewriter";
import { InsightsContainer } from "./insights-container";

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
}

export const ChatMessage = memo(function ChatMessage({ message, enableTypewriter = false }: ChatMessageProps) {
  const isUser = message.role === "user";
  const [formattedTime, setFormattedTime] = useState<string>("");

  // Use typewriter effect for assistant messages
  const { displayedText, isComplete } = useTypewriter({
    text: message.content,
    speed: 80, // Characters per second - adjust for desired speed
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
              <>
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={{
                    // Style markdown elements
                    p: ({ children }) => <p className="mb-3 last:mb-0 leading-relaxed text-text-primary">{children}</p>,
                    ul: ({ children }) => (
                      <ul className="mb-3 ml-4 space-y-1.5 list-disc">
                        {children}
                      </ul>
                    ),
                    ol: ({ children }) => (
                      <ol className="mb-3 ml-4 space-y-1.5 list-decimal">
                        {children}
                      </ol>
                    ),
                    li: ({ children }) => (
                      <li className="text-text-primary leading-relaxed">
                        {children}
                      </li>
                    ),
                    h1: ({ children }) => (
                      <h1 className="text-xl font-bold mb-3 mt-4 text-text-primary">
                        {children}
                      </h1>
                    ),
                    h2: ({ children }) => (
                      <h2 className="text-lg font-semibold mb-2 mt-3 text-text-primary">
                        {children}
                      </h2>
                    ),
                    h3: ({ children }) => (
                      <h3 className="text-base font-semibold mb-2 mt-2 text-text-primary">
                        {children}
                      </h3>
                    ),
                  blockquote: ({ children }) => (
                    <blockquote className="border-l-4 border-primary/50 pl-4 py-2 my-3 bg-primary/5 rounded-r text-text-secondary italic">
                      {children}
                    </blockquote>
                  ),
                  code: ({ children, ...props }) => {
                    const isInline = !props.className;
                    return isInline ? (
                      <code className="rounded bg-primary/10 dark:bg-primary/20 px-1.5 py-0.5 text-sm font-mono text-primary-dark">
                        {children}
                      </code>
                    ) : (
                      <code className="block rounded-lg bg-gray-100 dark:bg-gray-800 p-4 text-sm font-mono overflow-x-auto my-3 border border-border">
                        {children}
                      </code>
                    );
                  },
                  pre: ({ children }) => (
                    <pre className="rounded-lg bg-gray-100 dark:bg-gray-800 p-4 overflow-x-auto my-3 border border-border">
                      {children}
                    </pre>
                  ),
                  table: ({ children }) => (
                    <div className="overflow-x-auto my-4 rounded-lg border border-border">
                      <table className="min-w-full divide-y divide-border">
                        {children}
                      </table>
                    </div>
                  ),
                  thead: ({ children }) => (
                    <thead className="bg-surface">
                      {children}
                    </thead>
                  ),
                  tbody: ({ children }) => (
                    <tbody className="divide-y divide-border bg-white dark:bg-gray-900">
                      {children}
                    </tbody>
                  ),
                  tr: ({ children }) => (
                    <tr className="hover:bg-surface/50 transition-colors">
                      {children}
                    </tr>
                  ),
                  th: ({ children }) => (
                    <th className="px-4 py-3 text-left text-xs font-semibold text-text-primary uppercase tracking-wider">
                      {children}
                    </th>
                  ),
                  td: ({ children }) => (
                    <td className="px-4 py-3 text-sm text-text-secondary">
                      {children}
                    </td>
                  ),
                  a: ({ children, href }) => (
                    <a
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:text-primary-hover underline decoration-primary/30 hover:decoration-primary transition-colors font-medium"
                    >
                      {children}
                    </a>
                  ),
                  hr: () => (
                    <hr className="my-4 border-t-2 border-border" />
                  ),
                }}
              >
                {contentToDisplay}
              </ReactMarkdown>
              {enableTypewriter && !isComplete && (
                <span className="inline-block w-1 h-4 bg-primary animate-pulse ml-0.5" />
              )}
              </>
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

