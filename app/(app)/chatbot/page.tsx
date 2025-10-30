"use client";

import { useState, useRef, useEffect, Suspense } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import { Send, Paperclip, Sparkles, Menu, Brain, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ChatMessage } from "@/components/chatbot/chat-message";
import { SuggestionChips } from "@/components/chatbot/suggestion-chips";
import { ChatHistory } from "@/components/chatbot/chat-history";
import { AIConfirmationDialog } from "@/components/ai/ai-confirmation-dialog";
import { apiClient, type Message as APIMessage } from "@/lib/api/client";
import type { AIAction } from "@/lib/contexts/ai-context";

interface Insight {
  category: string;
  priority: "high" | "medium" | "low";
  finding: string;
  recommendation: string;
}

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  insights?: Insight[];
}

const welcomeSuggestions = [
  {
    icon: "🎓",
    text: "Show me students applying Early Decision",
    action: "QUERY_STUDENTS",
  },
  {
    icon: "📝",
    text: "Generate a Letter of Recommendation",
    action: "GENERATE_LOR",
  },
  {
    icon: "⏰",
    text: "What deadlines are coming up this week?",
    action: "QUERY_DEADLINES",
  },
  {
    icon: "📊",
    text: "Show application progress summary",
    action: "SHOW_PROGRESS",
  },
  {
    icon: "🏛️",
    text: "Most popular colleges this year",
    action: "QUERY_COLLEGES",
  },
];

function ChatbotContent() {
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [isUsingTools, setIsUsingTools] = useState(false);
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<AIAction | null>(null);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [confirmationMessage, setConfirmationMessage] = useState<string>("");
  const [agentMode, setAgentMode] = useState<"langchain" | "langgraph">("langgraph");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Pre-fill input from URL query parameter
  useEffect(() => {
    const command = searchParams?.get("q");
    if (command) {
      setInput(decodeURIComponent(command));
      // Focus the textarea after a short delay
      setTimeout(() => {
        textareaRef.current?.focus();
      }, 100);
    }
  }, [searchParams]);

  // Load conversation messages when conversation is selected
  const { data: conversationData, isLoading: isLoadingConversation } = useQuery({
    queryKey: ["conversation", selectedConversation],
    queryFn: () => apiClient.getConversation(selectedConversation!),
    enabled: !!selectedConversation,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    staleTime: 2 * 60 * 1000, // 2 minutes - conversation data doesn't change often
    gcTime: 5 * 60 * 1000, // Keep in cache for 5 minutes
  });

  // Update messages when conversation data loads
  useEffect(() => {
    if (conversationData?.success && conversationData?.data?.messages) {
      const loadedMessages: Message[] = conversationData.data.messages
        .filter((msg: APIMessage) => msg.role === "user" || msg.role === "assistant")
        .map((msg: APIMessage) => ({
          id: msg.id,
          role: msg.role as "user" | "assistant",
          content: msg.content || "",
          timestamp: new Date(msg.created_at),
        }));
      setMessages(loadedMessages);
    } else if (conversationData?.success && Array.isArray(conversationData?.data?.messages) && conversationData.data.messages.length === 0) {
      setMessages([]);
    } else if (!selectedConversation) {
      setMessages([]);
    }
  }, [conversationData, selectedConversation]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "52px";
      if (input) {
        textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
      }
    }
  }, [input]);

  const handleSend = async (e?: React.MouseEvent) => {
    // Prevent default if event is provided
    if (e) {
      e.preventDefault();
    }

    if (!input.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    const messageContent = input;
    setInput("");
    setIsTyping(true);

    // Create placeholder for streaming message
    const aiMessageId = (Date.now() + 1).toString();
    const aiMessage: Message = {
      id: aiMessageId,
      role: "assistant",
      content: "",
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, aiMessage]);

    try {
      const response = await apiClient.sendChatMessage({
        conversationId: selectedConversation || undefined,
        message: messageContent,
        stream: true,
        agentMode: agentMode,
      });

      if (response.stream && response.success) {
        const reader = response.stream.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let conversationId: string | null = null;

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n");
            buffer = lines.pop() || "";

            for (const line of lines) {
              if (line.startsWith("data: ")) {
                try {
                  const data = JSON.parse(line.slice(6));

                  if (data.type === "token" && data.content) {
                    setIsUsingTools(false); // Clear tool state when content arrives
                    setMessages((prev) =>
                      prev.map((msg) =>
                        msg.id === aiMessageId
                          ? { ...msg, content: (msg.content || "") + data.content }
                          : msg
                      )
                    );
                  } else if (data.type === "tool_call") {
                    // Tool call detected - show loading animation
                    console.log("Tool call:", data.toolCall);
                    setIsUsingTools(true);
                    setIsTyping(true);
                  } else if (data.type === "insight" && data.insight) {
                    // Insight received from LangGraph agent
                    console.log("Insight received:", data.insight);
                    setMessages((prev) =>
                      prev.map((msg) => {
                        if (msg.id === aiMessageId) {
                          const currentInsights = msg.insights || [];
                          return {
                            ...msg,
                            insights: [...currentInsights, data.insight],
                          };
                        }
                        return msg;
                      })
                    );
                  } else if (data.type === "done") {
                    conversationId = data.conversationId || null;
                    setIsTyping(false);
                    setIsUsingTools(false);

                    // Clean up any placeholder text and check for pending actions
                    setMessages((prev) =>
                      prev.map((msg) => {
                        if (msg.id === aiMessageId) {
                          let cleanedContent = msg.content || "";

                          // Check if content contains pending_confirmation action
                          try {
                            const pendingMatch = cleanedContent.match(/(?<={\\\"status\\\":\\\"pending_confirmation\\\"})[^\\}]+/);
                            if (pendingMatch) {
                              const actionData = JSON.parse(`{${pendingMatch[0]}}`);
                              setPendingAction({
                                type: actionData.action?.split('_')[0] as "create" | "update" | "delete" | "generate" | "add",
                                entity: actionData.entity,
                                data: actionData.data,
                                id: actionData.id,
                              });
                              setConfirmationMessage(actionData.message || "");
                              setShowConfirmation(true);

                              // Remove JSON from content, keep the message
                              cleanedContent = actionData.message || cleanedContent.replace(`{${pendingMatch[0]}}`, "");
                            }
                          } catch (e) {
                            console.error("Error parsing pending action:", e);
                          }

                          // Remove any placeholder patterns
                          cleanedContent = cleanedContent.replace(/\n\n_Using tools\.\.\._\n\n/g, "");
                          cleanedContent = cleanedContent.replace(/\n\n_Processing\.\.\._\n\n/g, "");
                          cleanedContent = cleanedContent.replace(/I've processed your request using the available tools\. The results have been retrieved\./g, "");

                          // Only show fallback if truly empty
                          if (!cleanedContent.trim()) {
                            cleanedContent = "I've processed your request, but no response was generated. Please try again.";
                          }

                          return { ...msg, content: cleanedContent };
                        }
                        return msg;
                      })
                    );
                  } else if (data.type === "error") {
                    throw new Error(data.error || "Unknown error");
                  }
                } catch (parseError) {
                  console.error("Error parsing SSE data:", parseError);
                }
              }
            }
          }
        } catch (streamError) {
          console.error("Stream error occurred:", streamError);
          throw new Error(streamError instanceof Error ? streamError.message : "Stream error occurred");
        }

        // Update conversation ID if new conversation was created
        if (conversationId && !selectedConversation) {
          setSelectedConversation(conversationId);
          // Invalidate conversations list when new conversation is created
          queryClient.invalidateQueries({ queryKey: ["conversations"] });
          // Also invalidate the new conversation to ensure it's fresh
          queryClient.invalidateQueries({ queryKey: ["conversation", conversationId] });
        } else if (selectedConversation) {
          // Invalidate current conversation after message is sent to ensure sync
          queryClient.invalidateQueries({ queryKey: ["conversation", selectedConversation] });
        }
      } else {
        // Fallback to non-streaming
        if (response.success && response.data) {
          if (response.data.conversationId && !selectedConversation) {
            setSelectedConversation(response.data.conversationId);
            // Only invalidate conversations list when new conversation is created
            queryClient.invalidateQueries({ queryKey: ["conversations"] });
          }

          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === aiMessageId
                ? { ...msg, content: response.data.message || "No response received" }
                : msg
            )
          );

          // Invalidate current conversation to ensure database sync
          if (selectedConversation) {
            queryClient.invalidateQueries({ queryKey: ["conversation", selectedConversation] });
          }
        } else {
          throw new Error(response.error || "Failed to get response");
        }
      }
    } catch (error) {
      console.error("Chat error:", error);
      let errorMessage = "Sorry, I encountered an error. Please try again.";

      if (error instanceof Error) {
        errorMessage = `Error: ${error.message}`;
      } else if (typeof error === "string") {
        errorMessage = `Error: ${error}`;
      } else if (error && typeof error === "object") {
        errorMessage = `Error: ${JSON.stringify(error)}`;
      }

      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === aiMessageId
            ? { ...msg, content: errorMessage }
            : msg
        )
      );
    } finally {
      setIsTyping(false);
    }
  };

  const handleSuggestionClick = (suggestion: typeof welcomeSuggestions[0]) => {
    setInput(suggestion.text);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleNewChat = () => {
    setMessages([]);
    setSelectedConversation(null);
    setInput("");
  };

  return (
    <div className="flex h-[calc(100vh-8rem)] overflow-hidden relative">
      {/* Chat Area */}
      <div className="flex flex-1 flex-col min-w-0">
        {/* Mobile Header with Menu Button */}
        <div className="lg:hidden flex items-center gap-3 border-b border-border/50 bg-surface/80 backdrop-blur-sm p-4 shrink-0">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsSidebarOpen(true)}
            className="hover:bg-primary/10"
          >
            <Menu className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-semibold text-text-primary">
            {selectedConversation ? "Chat" : "New Chat"}
          </h1>
        </div>
        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-6 md:p-8 lg:p-12">
          <div className="mx-auto max-w-4xl space-y-6">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 md:py-24 transition-all duration-500 ease-in-out">
                <div className="mb-8 rounded-full bg-gradient-to-br from-primary/30 via-primary/20 to-primary/10 p-8 backdrop-blur-sm animate-pulse shadow-lg shadow-primary/10 transition-all duration-500 ease-in-out hover:scale-110 hover:shadow-xl hover:shadow-primary/20">
                  <Sparkles className="h-12 w-12 text-primary transition-all duration-500 ease-in-out" />
                </div>
                <h2 className="text-4xl md:text-5xl font-bold mb-4 text-heading-1 transition-all duration-500 ease-in-out animate-fade-in text-center">
                  How can I help you today?
                </h2>
                <p className="text-lg md:text-xl text-text-secondary mb-12 text-center max-w-2xl transition-all duration-500 ease-in-out animate-fade-in font-medium" style={{ animationDelay: '0.1s' }}>
                  Ask me about students, deadlines, applications, or generate a Letter of Recommendation
                </p>
                <div className="transition-all duration-500 ease-in-out animate-fade-in w-full max-w-4xl px-4" style={{ animationDelay: '0.2s' }}>
                  <SuggestionChips
                    suggestions={welcomeSuggestions}
                    onSuggestionClick={handleSuggestionClick}
                  />
                </div>
              </div>
            ) : (
              <>
                {isLoadingConversation ? (
                  <div className="flex flex-col items-center justify-center py-12 space-y-4 animate-fade-in">
                    <div className="flex gap-2">
                      <div className="h-3 w-3 animate-bounce rounded-full bg-primary/60 transition-all duration-300 [animation-delay:-0.3s]" />
                      <div className="h-3 w-3 animate-bounce rounded-full bg-primary transition-all duration-300 [animation-delay:-0.15s]" />
                      <div className="h-3 w-3 animate-bounce rounded-full bg-primary/60 transition-all duration-300" />
                    </div>
                    <p className="text-sm text-text-tertiary transition-opacity duration-300">Loading conversation...</p>
                  </div>
                ) : (
                  <>
                    {messages.map((message, index) => (
                      <ChatMessage
                        key={message.id}
                        message={message}
                        enableTypewriter={index === messages.length - 1 && message.role === "assistant" && !isTyping}
                      />
                    ))}
                  </>
                )}
                {isTyping && (
                  <div className="flex items-center gap-3 text-text-tertiary animate-fade-in transition-all duration-300 ease-in-out">
                    {isUsingTools ? (
                      <>
                        <div className="flex gap-1.5">
                          <div className="h-2.5 w-2.5 animate-bounce rounded-full bg-primary/80 transition-all duration-300 [animation-delay:-0.3s]" />
                          <div className="h-2.5 w-2.5 animate-bounce rounded-full bg-primary transition-all duration-300 [animation-delay:-0.15s]" />
                          <div className="h-2.5 w-2.5 animate-bounce rounded-full bg-primary/80 transition-all duration-300" />
                        </div>
                        <span className="text-sm font-medium transition-opacity duration-300 flex items-center gap-2">
                          <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Using tools...
                        </span>
                      </>
                    ) : (
                      <>
                        <div className="flex gap-1.5">
                          <div className="h-2.5 w-2.5 animate-bounce rounded-full bg-primary/80 transition-all duration-300 [animation-delay:-0.3s]" />
                          <div className="h-2.5 w-2.5 animate-bounce rounded-full bg-primary transition-all duration-300 [animation-delay:-0.15s]" />
                          <div className="h-2.5 w-2.5 animate-bounce rounded-full bg-primary/80 transition-all duration-300" />
                        </div>
                        <span className="text-sm font-medium transition-opacity duration-300">AI is thinking...</span>
                      </>
                    )}
                  </div>
                )}
                <div ref={messagesEndRef} />
              </>
            )}
          </div>
        </div>

        {/* Input Area - Modern Floating Design */}
        <div className="border-t border-border/30 bg-gradient-to-t from-background via-background/98 to-transparent p-4 md:p-6 backdrop-blur-sm transition-all duration-500 ease-in-out">
          <div className="mx-auto max-w-4xl space-y-3">
            {/* Suggestion Chips - Above Input */}
            {messages.length > 0 && !isTyping && (
              <div className="px-2 animate-fade-in transition-all duration-300">
                <SuggestionChips
                  suggestions={welcomeSuggestions.slice(0, 3)}
                  onSuggestionClick={handleSuggestionClick}
                />
              </div>
            )}

            {/* Agent Mode Selector */}
            <div className="px-2 flex items-center gap-3">
              <div className="flex items-center gap-2">
                <Brain className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium text-text-secondary">Agent Mode:</span>
              </div>
              <Select
                value={agentMode}
                onValueChange={(value) => setAgentMode(value as "langchain" | "langgraph")}
              >
                <SelectTrigger className="w-40 h-8 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="langgraph">
                    <div className="flex items-center gap-2">
                      <Zap className="h-3 w-3" />
                      <span>LangGraph</span>
                      <Badge variant="outline" className="text-xs ml-1">Recommended</Badge>
                    </div>
                  </SelectItem>
                  <SelectItem value="langchain">
                    <div className="flex items-center gap-2">
                      <Brain className="h-3 w-3" />
                      <span>LangChain</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Input Box - Modern Floating Style */}
            <div className="group relative">
              <div className="absolute inset-0 bg-gradient-to-r from-primary/20 via-primary/10 to-transparent rounded-2xl opacity-0 group-focus-within:opacity-100 blur-xl transition-all duration-300 ease-out" />
              <div className="relative flex items-end gap-2.5 rounded-2xl border border-border/40 bg-surface/60 backdrop-blur-md p-3 md:p-4 shadow-lg hover:shadow-xl hover:border-border/60 group-focus-within:border-primary/50 group-focus-within:shadow-2xl group-focus-within:shadow-primary/10 transition-all duration-300 ease-out">
                {/* Attachment Button */}
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="shrink-0 h-9 w-9 rounded-lg hover:bg-primary/10 text-text-secondary hover:text-primary transition-all duration-300 ease-out hover:scale-110 active:scale-95"
                >
                  <Paperclip className="h-4 w-4" />
                </Button>

                {/* Textarea */}
                <textarea
                  ref={textareaRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask anything about students, deadlines, or applications..."
                  className="flex-1 resize-none border-0 bg-transparent p-2 text-sm md:text-base outline-none placeholder:text-text-tertiary/50 focus:placeholder:text-text-tertiary/30 transition-all duration-300 ease-out font-medium"
                  rows={1}
                  style={{ maxHeight: "120px" }}
                />

                {/* Send Button - Modern Design */}
                <Button
                  onClick={(e) => handleSend(e)}
                  disabled={!input.trim() || isTyping}
                  size="icon"
                  className="shrink-0 h-9 w-9 rounded-lg bg-gradient-to-br from-primary to-primary-hover hover:shadow-lg hover:scale-110 active:scale-95 transition-all duration-300 ease-out disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100 text-white shadow-md"
                >
                  {isTyping ? (
                    <div className="flex gap-0.5 items-center justify-center">
                      <div className="h-1 w-1 animate-bounce rounded-full bg-white [animation-delay:-0.3s]" />
                      <div className="h-1 w-1 animate-bounce rounded-full bg-white [animation-delay:-0.15s]" />
                      <div className="h-1 w-1 animate-bounce rounded-full bg-white" />
                    </div>
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            {/* Helper Text */}
            <div className="px-2 text-xs text-text-tertiary/50 flex items-center gap-2 transition-all duration-300">
              <span>Press</span>
              <kbd className="px-2 py-1 rounded bg-surface/80 border border-border/30 font-mono text-[10px] font-semibold">Enter</kbd>
              <span>to send,</span>
              <kbd className="px-2 py-1 rounded bg-surface/80 border border-border/30 font-mono text-[10px] font-semibold">Shift+Enter</kbd>
              <span>for new line</span>
            </div>
          </div>
        </div>
      </div>

      {/* Chat History Sidebar */}
      <ChatHistory
        selectedConversation={selectedConversation}
        onSelectConversation={(id) => {
          setSelectedConversation(id);
          setIsSidebarOpen(false); // Close sidebar on mobile when conversation selected
        }}
        onNewChat={() => {
          handleNewChat();
          setIsSidebarOpen(false); // Close sidebar on mobile when new chat
        }}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />

      {/* AI Confirmation Dialog */}
      <AIConfirmationDialog
        open={showConfirmation}
        onOpenChange={setShowConfirmation}
        action={pendingAction}
        message={confirmationMessage}
        onSuccess={() => {
          // Refresh the conversation to show the updated data
          if (selectedConversation) {
            queryClient.invalidateQueries({ queryKey: ["conversation", selectedConversation] });
          }
          queryClient.invalidateQueries({ queryKey: ["students"] });
          queryClient.invalidateQueries({ queryKey: ["tasks"] });
        }}
      />
    </div>
  );
}

export default function ChatbotPage() {
  return (
    <Suspense fallback={
      <div className="flex h-[calc(100vh-8rem)] items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
          <p className="text-sm text-muted-foreground">Loading chatbot...</p>
        </div>
      </div>
    }>
      <ChatbotContent />
    </Suspense>
  );
}
