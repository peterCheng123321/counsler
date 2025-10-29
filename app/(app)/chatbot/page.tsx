"use client";

import { useState, useRef, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Search, Send, Paperclip, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ChatMessage } from "@/components/chatbot/chat-message";
import { SuggestionChips } from "@/components/chatbot/suggestion-chips";
import { ChatHistory } from "@/components/chatbot/chat-history";
import { apiClient, type Message as APIMessage } from "@/lib/api/client";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
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

export default function ChatbotPage() {
  const queryClient = useQueryClient();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Load conversation messages when conversation is selected
  const { data: conversationData } = useQuery({
    queryKey: ["conversation", selectedConversation],
    queryFn: () => apiClient.getConversation(selectedConversation!),
    enabled: !!selectedConversation,
  });

  // Update messages when conversation data loads
  useEffect(() => {
    if (conversationData?.data?.messages) {
      const loadedMessages: Message[] = conversationData.data.messages.map(
        (msg: APIMessage) => ({
          id: msg.id,
          role: msg.role,
          content: msg.content,
          timestamp: new Date(msg.created_at),
        })
      );
      setMessages(loadedMessages);
    } else if (!selectedConversation) {
      // Clear messages when no conversation is selected
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
      });

      if (response.stream && response.success) {
        const reader = response.stream.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let conversationId: string | null = null;

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
                  setMessages((prev) =>
                    prev.map((msg) =>
                      msg.id === aiMessageId
                        ? { ...msg, content: msg.content + data.content }
                        : msg
                    )
                  );
                } else if (data.type === "tool_call") {
                  // Tool call indicator - could show loading state
                  console.log("Tool call:", data.toolCall);
                } else if (data.type === "done") {
                  conversationId = data.conversationId || null;
                  setIsTyping(false);
                } else if (data.type === "error") {
                  throw new Error(data.error || "Unknown error");
                }
              } catch (parseError) {
                console.error("Error parsing SSE data:", parseError);
              }
            }
          }
        }

        // Update conversation ID if new conversation was created
        if (conversationId && !selectedConversation) {
          setSelectedConversation(conversationId);
        }

        // Invalidate queries to refresh conversation list
        queryClient.invalidateQueries({ queryKey: ["conversations"] });
        if (selectedConversation || conversationId) {
          queryClient.invalidateQueries({
            queryKey: ["conversation", selectedConversation || conversationId],
          });
        }
      } else {
        // Fallback to non-streaming
        if (response.success && response.data) {
          if (response.data.conversationId && !selectedConversation) {
            setSelectedConversation(response.data.conversationId);
          }

          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === aiMessageId
                ? { ...msg, content: response.data.message || "No response received" }
                : msg
            )
          );

          queryClient.invalidateQueries({ queryKey: ["conversations"] });
          if (selectedConversation || response.data.conversationId) {
            queryClient.invalidateQueries({
              queryKey: ["conversation", selectedConversation || response.data.conversationId],
            });
          }
        } else {
          throw new Error(response.error || "Failed to get response");
        }
      }
    } catch (error) {
      console.error("Chat error:", error);
      let errorMessage = "Sorry, I encountered an error. Please try again.";
      
      if (error instanceof Error) {
        errorMessage = `Sorry, I encountered an error: ${error.message}. Please try again.`;
      } else if (typeof error === "string") {
        errorMessage = `Sorry, I encountered an error: ${error}. Please try again.`;
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
    <div className="flex h-[calc(100vh-8rem)] gap-4 overflow-hidden">
      {/* Chat History Sidebar */}
      <ChatHistory
        selectedConversation={selectedConversation}
        onSelectConversation={setSelectedConversation}
        onNewChat={handleNewChat}
      />

      {/* Chat Area */}
      <div className="flex flex-1 flex-col min-w-0">
        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-6 md:p-8 lg:p-12">
          <div className="mx-auto max-w-4xl space-y-6">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 md:py-24">
                <div className="mb-8 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 p-6 backdrop-blur-sm animate-pulse">
                  <Sparkles className="h-10 w-10 text-primary" />
                </div>
                <h2 className="text-2xl md:text-3xl font-bold mb-3 text-heading-1">
                  How can I help you today?
                </h2>
                <p className="text-base md:text-lg text-text-secondary mb-10 text-center max-w-lg">
                  Ask me about students, deadlines, or generate a Letter of Recommendation.
                </p>
                <SuggestionChips
                  suggestions={welcomeSuggestions}
                  onSuggestionClick={handleSuggestionClick}
                />
              </div>
            ) : (
              <>
                {messages.map((message) => (
                  <ChatMessage key={message.id} message={message} />
                ))}
                {isTyping && (
                  <div className="flex items-center gap-3 text-text-tertiary animate-fade-in">
                    <div className="flex gap-1.5">
                      <div className="h-2.5 w-2.5 animate-bounce rounded-full bg-primary [animation-delay:-0.3s]" />
                      <div className="h-2.5 w-2.5 animate-bounce rounded-full bg-primary [animation-delay:-0.15s]" />
                      <div className="h-2.5 w-2.5 animate-bounce rounded-full bg-primary" />
                    </div>
                    <span className="text-sm font-medium">AI is thinking...</span>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </>
            )}
          </div>
        </div>

        {/* Input Area */}
        <div className="border-t border-border/50 bg-gradient-to-t from-background via-background/95 to-background/80 p-5 md:p-6 backdrop-blur-xl shadow-[0_-4px_24px_rgba(0,0,0,0.04)]">
          <div className="mx-auto max-w-4xl">
            <div className="flex items-end gap-3 rounded-2xl border-2 border-border/50 bg-surface/80 backdrop-blur-sm p-3 shadow-lg transition-all duration-200 hover:shadow-xl focus-within:border-primary focus-within:shadow-2xl focus-within:shadow-primary/10">
              <Button variant="ghost" size="icon" className="shrink-0 hover:bg-primary/10 transition-colors">
                <Paperclip className="h-5 w-5 text-text-secondary" />
              </Button>
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask me anything about students, deadlines, or applications..."
                className="flex-1 resize-none border-0 bg-transparent p-2 text-sm md:text-base outline-none placeholder:text-text-tertiary/60 focus:placeholder:text-text-tertiary/40 transition-colors"
                rows={1}
                style={{ maxHeight: "200px" }}
              />
              <Button
                onClick={(e) => handleSend(e)}
                disabled={!input.trim() || isTyping}
                size="icon"
                className="shrink-0 h-10 w-10 rounded-xl bg-primary hover:bg-primary-hover shadow-md hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                loading={isTyping}
              >
                {!isTyping && <Send className="h-5 w-5" />}
              </Button>
            </div>
            {messages.length > 0 && !isTyping && (
              <div className="mt-5">
                <SuggestionChips
                  suggestions={welcomeSuggestions.slice(0, 3)}
                  onSuggestionClick={handleSuggestionClick}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
