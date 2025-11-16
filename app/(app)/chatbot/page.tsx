"use client";

import { useState, useRef, useEffect, Suspense } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import { Send, Paperclip, Sparkles, Menu, Brain, Zap, X, Image as ImageIcon, PanelRightOpen, PanelRightClose, RefreshCw, PanelLeftOpen, PanelLeftClose, ChevronLeft, ChevronRight } from "lucide-react";
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
import { ToolExecutionList } from "@/components/chatbot/tool-execution-status";
import { ToolsHelpPanel } from "@/components/chatbot/tools-help-panel";
import { SmartSuggestions } from "@/components/chatbot/smart-suggestions";
import { EssayCanvas } from "@/components/chatbot/essay-canvas";
import { StudentCanvas } from "@/components/chatbot/student-canvas";
import { LetterCanvas } from "@/components/chatbot/letter-canvas";
import { AIConfirmationDialog } from "@/components/ai/ai-confirmation-dialog";
import { ModeSelector } from "@/components/chatbot/mode-selector";
import { apiClient, type Message as APIMessage } from "@/lib/api/client";
import type { AIAction } from "@/lib/contexts/ai-context";
import type { AIMode, UserRole } from "@/lib/ai/tool-categories";
import { toast } from "sonner";

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
  const [activeToolExecutions, setActiveToolExecutions] = useState<
    Array<{
      name: string;
      status: "executing" | "completed" | "failed";
      description?: string;
      arguments?: any;
    }>
  >([]);
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<AIAction | null>(null);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [confirmationMessage, setConfirmationMessage] = useState<string>("");
  const [agentMode, setAgentMode] = useState<"langchain" | "langgraph">("langgraph");
  const [selectedMode, setSelectedMode] = useState<AIMode>("counselor_copilot");
  const [userRole, setUserRole] = useState<UserRole>("counselor"); // TODO: Get from auth context
  const [attachedImages, setAttachedImages] = useState<Array<{ url: string; file: File }>>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [canvasEnabled, setCanvasEnabled] = useState(false); // Toggle to show/hide canvas - default OFF
  const [showDebug, setShowDebug] = useState(false); // Debug panel toggle
  const [lastFailedMessage, setLastFailedMessage] = useState<string | null>(null); // Track failed messages for retry
  const [showRetryButton, setShowRetryButton] = useState(false); // Show retry button
  const [reduceMotion, setReduceMotion] = useState(false); // Reduce animations during streaming
  // Sidebar collapse state - persisted in localStorage
  const [isLeftSidebarCollapsed, setIsLeftSidebarCollapsed] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('chatbot-left-sidebar-collapsed');
      return saved === 'true';
    }
    return false;
  });
  const [isRightSidebarCollapsed, setIsRightSidebarCollapsed] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('chatbot-right-sidebar-collapsed');
      return saved === 'true';
    }
    return false;
  });
  // Canvas state - persisted in sessionStorage
  const [canvasData, setCanvasData] = useState<{
    type: "essay" | "student" | "letter" | null;
    essayId: string | null;
    studentId: string | null;
    letterId: string | null;
    isExpanded: boolean;
  }>(() => {
    // Restore canvas state from sessionStorage on mount
    if (typeof window !== 'undefined') {
      const saved = sessionStorage.getItem('chatbot-canvas');
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch (e) {
          return { type: null, essayId: null, studentId: null, letterId: null, isExpanded: false };
        }
      }
    }
    return { type: null, essayId: null, studentId: null, letterId: null, isExpanded: false };
  });

  // Persist canvas state to sessionStorage whenever it changes
  useEffect(() => {
    console.log("[Canvas State]", canvasData);
    if (typeof window !== 'undefined') {
      if (canvasData.type) {
        sessionStorage.setItem('chatbot-canvas', JSON.stringify(canvasData));
        console.log("[Canvas] Saved to sessionStorage:", canvasData);
        // Auto-enable canvas when content is loaded
        if (!canvasEnabled) {
          setCanvasEnabled(true);
          console.log("[Canvas] Auto-enabled canvas");
        }
      } else {
        sessionStorage.removeItem('chatbot-canvas');
        console.log("[Canvas] Removed from sessionStorage");
      }
    }
  }, [canvasData, canvasEnabled]);

  // Persist sidebar collapse state to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('chatbot-left-sidebar-collapsed', String(isLeftSidebarCollapsed));
    }
  }, [isLeftSidebarCollapsed]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('chatbot-right-sidebar-collapsed', String(isRightSidebarCollapsed));
    }
  }, [isRightSidebarCollapsed]);

  // Clear canvas when switching conversations (Option A: Clean separation)
  useEffect(() => {
    if (selectedConversation !== null) {
      console.log("[Canvas] Conversation switched, clearing canvas");
      setCanvasData({
        type: null,
        essayId: null,
        studentId: null,
        letterId: null,
        isExpanded: false,
      });
      // Optionally close the canvas sidebar
      // setCanvasEnabled(false);
    }
  }, [selectedConversation]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isStreamingRef = useRef(false); // Track if actively streaming to prevent query invalidations

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
  // Don't refetch while actively streaming to prevent interruptions
  const { data: conversationData, isLoading: isLoadingConversation } = useQuery({
    queryKey: ["conversation", selectedConversation],
    queryFn: () => apiClient.getConversation(selectedConversation!),
    enabled: !!selectedConversation && !isStreamingRef.current,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    staleTime: 5 * 60 * 1000, // 5 minutes - longer stale time to reduce refetches
    gcTime: 10 * 60 * 1000, // Keep in cache for 10 minutes
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

  // Enhanced auto-resize with smooth transitions
  useEffect(() => {
    if (textareaRef.current) {
      // Reset height to auto to get the correct scrollHeight
      textareaRef.current.style.height = "auto";

      // Calculate new height (min 52px, max 200px)
      const newHeight = Math.max(52, Math.min(textareaRef.current.scrollHeight, 200));
      textareaRef.current.style.height = `${newHeight}px`;
    }
  }, [input]);

  const handleSend = async (e?: React.MouseEvent) => {
    // Prevent default if event is provided
    if (e) {
      e.preventDefault();
    }

    if (!input.trim() && attachedImages.length === 0) return;

    // Prepare message content with image note if images are attached
    let messageContent = input.trim();
    if (attachedImages.length > 0) {
      const imageNote = `[${attachedImages.length} image${attachedImages.length > 1 ? "s" : ""} attached]`;
      messageContent = messageContent ? `${imageNote}\n\n${messageContent}` : imageNote;

      // Note: Vision capabilities will be enabled via GPT-4 Vision or similar model
      toast.info("Image processing with AI vision is coming soon! For now, images are attached to your message.");
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: messageContent,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setAttachedImages([]); // Clear attached images after sending
    setIsTyping(true);
    isStreamingRef.current = true; // Mark streaming as active
    setReduceMotion(true); // Reduce animations during streaming

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
        role: userRole,
        mode: selectedMode,
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
                    // Mark all executing tools as completed when content starts arriving
                    setActiveToolExecutions((prev) =>
                      prev.map((tool) =>
                        tool.status === "executing"
                          ? { ...tool, status: "completed" }
                          : tool
                      )
                    );
                    setIsUsingTools(false); // Clear tool state when content arrives
                    setMessages((prev) =>
                      prev.map((msg) =>
                        msg.id === aiMessageId
                          ? { ...msg, content: (msg.content || "") + data.content }
                          : msg
                      )
                    );
                  } else if (data.type === "tool_call") {
                    // Tool call detected - track execution with details
                    console.log("Tool call:", data.toolCall);
                    const toolName = data.toolCall?.name || data.toolCall?.function?.name || "unknown";
                    const toolArgs = data.toolCall?.args || data.toolCall?.function?.arguments || {};

                    // Create a human-readable description based on tool name and arguments
                    let description = "";
                    try {
                      const args = typeof toolArgs === "string" ? JSON.parse(toolArgs) : toolArgs;

                      // Check if this is a canvas tool call
                      if (toolName === "open_essay_canvas" && args.essay_id) {
                        console.log("[Canvas] Opening essay canvas:", args);
                        setCanvasData({
                          type: "essay",
                          essayId: args.essay_id,
                          studentId: args.student_id || null,
                          letterId: null,
                          isExpanded: false,
                        });
                        description = `Opening essay in canvas`;
                        toast.success("Opening essay in editor...");
                      } else if (toolName === "open_student_canvas" && args.student_id) {
                        console.log("[Canvas] Opening student canvas:", args);
                        setCanvasData({
                          type: "student",
                          essayId: null,
                          studentId: args.student_id,
                          letterId: null,
                          isExpanded: false,
                        });
                        description = `Opening student profile in canvas`;
                        toast.success("Opening student profile...");
                      } else if (toolName === "open_letter_canvas" && (args.letter_id || args.student_id)) {
                        console.log("[Canvas] Opening letter canvas:", args);
                        setCanvasData({
                          type: "letter",
                          essayId: null,
                          studentId: args.student_id || null,
                          letterId: args.letter_id || null,
                          isExpanded: false,
                        });
                        description = `Opening letter of recommendation in canvas`;
                        toast.success("Opening letter in editor...");
                      } else if (toolName === "generate_recommendation_letter") {
                        // Letter generation will auto-open in canvas via the __canvas__ marker in the response
                        description = `Generating letter of recommendation`;
                      }
                      // Generate context-aware descriptions for other tools
                      else if (toolName === "get_students" && args.filters) {
                        const filterDesc: string[] = [];
                        if (args.filters.graduationYear) filterDesc.push(`graduating ${args.filters.graduationYear}`);
                        if (args.filters.gpa_min) filterDesc.push(`GPA ≥ ${args.filters.gpa_min}`);
                        if (args.filters.progress_min) filterDesc.push(`progress ≥ ${args.filters.progress_min}%`);
                        description = filterDesc.length > 0 ? `Finding students ${filterDesc.join(", ")}` : "Fetching all students";
                      } else if (toolName === "get_tasks" && args.filters) {
                        const filterDesc: string[] = [];
                        if (args.filters.status) filterDesc.push(`status: ${args.filters.status}`);
                        if (args.filters.priority) filterDesc.push(`priority: ${args.filters.priority}`);
                        description = filterDesc.length > 0 ? `Loading tasks with ${filterDesc.join(", ")}` : "Fetching all tasks";
                      } else if (toolName === "get_upcoming_deadlines" && args.daysAhead) {
                        description = `Checking deadlines for next ${args.daysAhead} days`;
                      } else if (toolName === "calculate_statistics" && args.metric) {
                        description = `Calculating ${args.metric} statistics`;
                      } else if (toolName === "search_essays") {
                        description = "Searching for essays";
                      } else if (toolName === "update_essay_content") {
                        description = "Updating essay content";
                      }
                    } catch (e) {
                      console.error("Error parsing tool arguments:", e);
                    }

                    setActiveToolExecutions((prev) => {
                      // Check if tool already exists
                      const exists = prev.some((t) => t.name === toolName && t.status === "executing");
                      if (exists) return prev;
                      return [
                        ...prev,
                        {
                          name: toolName,
                          status: "executing",
                          description,
                          arguments: toolArgs,
                        },
                      ];
                    });
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
                    isStreamingRef.current = false; // Mark streaming as complete
                    // Clear tool executions after a delay to let user see completion
                    setTimeout(() => {
                      setActiveToolExecutions([]);
                    }, 2000);

                    // Clean up any placeholder text and check for pending actions
                    setMessages((prev) =>
                      prev.map((msg) => {
                        if (msg.id === aiMessageId) {
                          let cleanedContent = msg.content || "";

                          // Check if content contains __canvas__ marker (for auto-opening canvases)
                          try {
                            // Look for __canvas__ marker in the response
                            const canvasMatch = cleanedContent.match(/"__canvas__":\s*{([^}]+)}/);
                            if (canvasMatch) {
                              try {
                                const canvasData = JSON.parse(`{${canvasMatch[1]}}`);
                                console.log("[Canvas] Found canvas marker:", canvasData);

                                if (canvasData.type === "letter" && canvasData.data) {
                                  setCanvasData({
                                    type: "letter",
                                    essayId: null,
                                    studentId: canvasData.data.student_id || null,
                                    letterId: canvasData.data.letter_id || null,
                                    isExpanded: false,
                                  });
                                  toast.success("Opening letter in canvas...");
                                } else if (canvasData.type === "essay" && canvasData.data) {
                                  setCanvasData({
                                    type: "essay",
                                    essayId: canvasData.data.essay_id || null,
                                    studentId: canvasData.data.student_id || null,
                                    letterId: null,
                                    isExpanded: false,
                                  });
                                  toast.success("Opening essay in canvas...");
                                } else if (canvasData.type === "student" && canvasData.data) {
                                  setCanvasData({
                                    type: "student",
                                    essayId: null,
                                    studentId: canvasData.data.student_id || null,
                                    letterId: null,
                                    isExpanded: false,
                                  });
                                  toast.success("Opening student profile...");
                                }
                              } catch (parseError) {
                                console.error("[Canvas] Error parsing canvas data:", parseError);
                              }
                            }
                          } catch (e) {
                            console.error("Error checking for canvas marker:", e);
                          }

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
                    isStreamingRef.current = false; // Clear streaming flag on error
                    setIsTyping(false);
                    setIsUsingTools(false);
                    // Update message with error
                    setMessages((prev) =>
                      prev.map((msg) =>
                        msg.id === aiMessageId
                          ? { ...msg, content: `Error: ${data.error || "Unknown error occurred"}` }
                          : msg
                      )
                    );
                    return; // Exit early instead of throwing
                  }
                } catch (parseError) {
                  console.error("Error parsing SSE data:", parseError);
                }
              }
            }
          }
        } catch (streamError) {
          console.error("Stream error occurred:", streamError);
          isStreamingRef.current = false; // Clear streaming flag on error
          setIsTyping(false);
          setIsUsingTools(false);

          // If we have partial content, keep it and add error message
          setMessages((prev) =>
            prev.map((msg) => {
              if (msg.id === aiMessageId) {
                const currentContent = msg.content || "";
                const errorMsg = streamError instanceof Error ? streamError.message : "Stream was interrupted";
                // Only append error if we don't already have content
                if (!currentContent.trim()) {
                  return { ...msg, content: `Error: ${errorMsg}` };
                }
                return msg; // Keep partial content if we have it
              }
              return msg;
            })
          );
          // Don't throw - handle gracefully
          return;
        }

        // Update conversation ID and invalidate queries AFTER streaming completes
        if (conversationId && !selectedConversation) {
          setSelectedConversation(conversationId);
          // Delay invalidation to ensure streaming is fully complete
          setTimeout(() => {
            if (!isStreamingRef.current) {
              queryClient.invalidateQueries({ queryKey: ["conversations"] });
            }
          }, 500);
        } else if (selectedConversation) {
          // Delay invalidation to ensure streaming is fully complete
          setTimeout(() => {
            if (!isStreamingRef.current) {
              queryClient.invalidateQueries({ queryKey: ["conversations"] });
            }
          }, 500);
        }
      } else {
        // Fallback to non-streaming
        if (response.success && response.data) {
          if (response.data.conversationId && !selectedConversation) {
            setSelectedConversation(response.data.conversationId);
            // Delay invalidation to prevent immediate refetch
            setTimeout(() => {
              queryClient.invalidateQueries({ queryKey: ["conversations"] });
            }, 500);
          }

          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === aiMessageId
                ? { ...msg, content: response.data.message || "No response received" }
                : msg
            )
          );

          // Delay invalidation to prevent immediate refetch
          if (selectedConversation) {
            setTimeout(() => {
              queryClient.invalidateQueries({ queryKey: ["conversations"] });
            }, 500);
          }
        } else {
          throw new Error(response.error || "Failed to get response");
        }
      }
    } catch (error) {
      console.error("Chat error:", error);
      isStreamingRef.current = false; // Ensure streaming flag is cleared on error
      let errorMessage = "Sorry, I encountered an error. Please try again.";

      if (error instanceof Error) {
        errorMessage = `Error: ${error.message}`;
      } else if (typeof error === "string") {
        errorMessage = `Error: ${error}`;
      } else if (error && typeof error === "object") {
        errorMessage = `Error: ${JSON.stringify(error)}`;
      }

      // Save the failed message for retry
      setLastFailedMessage(messageContent);
      setShowRetryButton(true);

      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === aiMessageId
            ? { ...msg, content: errorMessage }
            : msg
        )
      );
    } finally {
      setIsTyping(false);
      isStreamingRef.current = false; // Always clear streaming flag in finally
      setReduceMotion(false); // Re-enable animations after streaming
    }
  };

  const handleSuggestionClick = (suggestion: typeof welcomeSuggestions[0]) => {
    setInput(suggestion.text);
    setShowSuggestions(false);
  };

  const handleSmartSuggestionSelect = (text: string) => {
    setInput(text);
    setShowSuggestions(false);
    // Focus textarea after selection
    setTimeout(() => textareaRef.current?.focus(), 50);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Close suggestions on Escape
    if (e.key === "Escape") {
      setShowSuggestions(false);
      return;
    }

    // Show suggestions on "/" command
    if (e.key === "/" && !input) {
      e.preventDefault();
      setShowSuggestions(true);
      return;
    }

    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      setShowSuggestions(false);
      handleSend();
    }
  };

  const handleNewChat = () => {
    setMessages([]);
    setSelectedConversation(null);
    setInput("");
    setAttachedImages([]);
    setShowRetryButton(false);
    setLastFailedMessage(null);
    // Clear canvas when starting new chat
    console.log("[Canvas] New chat started, clearing canvas");
    setCanvasData({
      type: null,
      essayId: null,
      studentId: null,
      letterId: null,
      isExpanded: false,
    });
  };

  const handleRetry = () => {
    if (lastFailedMessage) {
      setShowRetryButton(false);
      const messageToRetry = lastFailedMessage;
      setLastFailedMessage(null);
      setInput(messageToRetry);
      // Trigger send with the failed message
      setTimeout(() => handleSend(), 0);
    }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const newImages: Array<{ url: string; file: File }> = [];

    Array.from(files).forEach((file) => {
      if (file.type.startsWith("image/")) {
        const url = URL.createObjectURL(file);
        newImages.push({ url, file });
      } else {
        toast.error("Only image files are supported");
      }
    });

    setAttachedImages((prev) => [...prev, ...newImages]);

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const removeImage = (index: number) => {
    setAttachedImages((prev) => {
      const newImages = [...prev];
      URL.revokeObjectURL(newImages[index].url);
      newImages.splice(index, 1);
      return newImages;
    });
  };

  return (
    <div className="flex h-[calc(100vh-4rem)] overflow-hidden relative bg-background">
      {/* Left Sidebar - Chat History (Desktop) */}
      <div className={`hidden lg:block border-r border-border bg-white transition-all duration-300 ${
        isLeftSidebarCollapsed ? 'w-0 overflow-hidden' : 'w-64'
      }`}>
        <ChatHistory
          selectedConversation={selectedConversation}
          onSelectConversation={(id) => setSelectedConversation(id)}
          onNewChat={handleNewChat}
          isOpen={true}
          onClose={() => {}}
        />
      </div>

      {/* Left Sidebar Toggle Button */}
      {!isLeftSidebarCollapsed && (
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsLeftSidebarCollapsed(true)}
          className="hidden lg:flex absolute left-64 top-4 z-10 h-7 w-7 rounded-md bg-white hover:bg-gray-50 border border-border transition-all duration-200"
          title="Hide chat history"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
      )}
      {isLeftSidebarCollapsed && (
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsLeftSidebarCollapsed(false)}
          className="hidden lg:flex absolute left-2 top-4 z-10 h-8 w-8 rounded-full bg-surface/80 hover:bg-surface border border-border/40 transition-all duration-300"
          title="Show chat history"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      )}

      {/* Center - Chat Area */}
      <div className={`flex flex-1 flex-col min-w-0 transition-all duration-500 ease-out ${
        canvasData.type && !canvasData.isExpanded ? 'lg:mr-0' : ''
      }`}>
        {/* Mobile Header with Menu Button */}
        <div className="lg:hidden flex items-center justify-between gap-3 border-b border-border/40 bg-gradient-to-r from-surface/95 via-surface/90 to-surface/95 backdrop-blur-xl p-4 shrink-0 shadow-sm">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsSidebarOpen(true)}
              className="hover:bg-primary/10 hover:scale-110 transition-transform duration-200"
            >
              <Menu className="h-5 w-5" />
            </Button>
            <h1 className="text-lg font-semibold text-text-primary">
              {selectedConversation ? "Chat" : "New Chat"}
            </h1>
          </div>

          {/* Mobile Canvas Toggle */}
          <Button
            variant={canvasEnabled ? "default" : "ghost"}
            size="icon"
            onClick={() => setCanvasEnabled(!canvasEnabled)}
            className={`transition-all duration-300 ${
              canvasEnabled
                ? "bg-primary hover:bg-primary-hover text-white"
                : "hover:bg-primary/10"
            }`}
            title={canvasEnabled ? "Hide Canvas" : "Show Canvas"}
          >
            {canvasEnabled ? (
              <PanelRightClose className="h-5 w-5" />
            ) : (
              <PanelRightOpen className="h-5 w-5" />
            )}
          </Button>
        </div>
        {/* Header with AI Mode Selector - Redesigned */}
        <div className="hidden lg:block border-b border-border/20 bg-gradient-to-r from-surface/60 via-surface/40 to-surface/60 backdrop-blur-xl shadow-sm">
          <div className="mx-auto max-w-5xl flex items-center justify-between px-6 py-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary via-primary-hover to-primary flex items-center justify-center shadow-lg shadow-primary/20">
                <Sparkles className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-text-primary">AI Assistant</h1>
                <p className="text-xs text-text-secondary">Powered by advanced AI</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Canvas Toggle Button */}
              <Button
                variant={canvasEnabled ? "default" : "outline"}
                size="sm"
                onClick={() => setCanvasEnabled(!canvasEnabled)}
                className={`gap-2 transition-all duration-300 relative ${
                  canvasEnabled
                    ? "bg-primary hover:bg-primary-hover text-white shadow-lg shadow-primary/20"
                    : "hover:bg-primary/5 text-text-secondary"
                }`}
                title={canvasEnabled ? "Hide Canvas" : "Show Canvas"}
              >
                {canvasEnabled ? (
                  <>
                    <PanelRightClose className="h-4 w-4" />
                    <span className="font-semibold">Canvas On</span>
                    {canvasData.type && (
                      <Badge variant="outline" className="ml-1 bg-green-500 text-white border-green-600 text-[10px] px-1">
                        Active
                      </Badge>
                    )}
                  </>
                ) : (
                  <>
                    <PanelRightOpen className="h-4 w-4" />
                    <span className="font-semibold">Canvas Off</span>
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>

        {/* Messages Area - Redesigned with better spacing */}
        <div className="flex-1 overflow-y-auto p-2 md:p-3 lg:p-4 scrollbar-thin scrollbar-thumb-border/40 scrollbar-track-transparent">
          <div className="mx-auto max-w-5xl space-y-4">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 md:py-12">
                {/* Simplified Icon */}
                <div className="mb-6">
                  <div className="rounded-xl bg-blue-50 p-4">
                    <Sparkles className="h-8 w-8 text-blue-600" />
                  </div>
                </div>

                {/* Welcome Text - Cleaner design */}
                <h2 className="text-2xl font-semibold mb-2 text-gray-900 text-center" style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}>
                  How can <span className="text-blue-600">I help you</span> today?
                </h2>
                <p className="text-sm text-gray-600 mb-6 text-center max-w-xl px-4">
                  Ask me anything about students, deadlines, applications, essays, or generate professional letters of recommendation
                </p>

                {/* Suggestion Chips */}
                <div className="w-full max-w-3xl px-4">
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
                        enableTypewriter={false} // Disabled for maximum speed
                        onOpenEssay={(essayId, studentId) => {
                          setCanvasData({
                            type: "essay",
                            essayId,
                            studentId: studentId || null,
                            isExpanded: false,
                          });
                        }}
                        onOpenStudent={(studentId) => {
                          setCanvasData({
                            type: "student",
                            essayId: null,
                            studentId,
                            isExpanded: false,
                          });
                        }}
                      />
                    ))}
                  </>
                )}
                {/* Simplified loading indicator - hide technical tool details */}
                {isTyping && (
                  <div className="flex items-center gap-3 text-text-tertiary animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="flex gap-1.5">
                      <div className="h-3 w-3 animate-bounce rounded-full bg-gradient-to-br from-primary to-primary-hover shadow-md [animation-delay:-0.3s] transition-all duration-500" />
                      <div className="h-3 w-3 animate-bounce rounded-full bg-gradient-to-br from-primary to-primary-hover shadow-md [animation-delay:-0.15s] transition-all duration-500" />
                      <div className="h-3 w-3 animate-bounce rounded-full bg-gradient-to-br from-primary to-primary-hover shadow-md transition-all duration-500" />
                    </div>
                    <span className="text-sm font-medium transition-all duration-500 animate-pulse">
                      {isUsingTools ? "Working on it..." : "AI is thinking..."}
                    </span>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </>
            )}
          </div>
        </div>

        {/* Input Area - Completely Redesigned Floating Design */}
        <div className="border-t border-border/10 bg-gradient-to-t from-surface/50 via-background/95 to-transparent p-2 md:p-3 lg:p-4 backdrop-blur-xl">
          <div className="mx-auto max-w-5xl space-y-4">
            {/* Suggestion Chips - Above Input */}
            {messages.length > 0 && !isTyping && (
              <div className="px-2 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <SuggestionChips
                  suggestions={welcomeSuggestions.slice(0, 3)}
                  onSuggestionClick={handleSuggestionClick}
                />
              </div>
            )}

            {/* Attached Images Preview */}
            {attachedImages.length > 0 && (
              <div className="px-2 flex flex-wrap gap-2 animate-in fade-in slide-in-from-bottom-2 duration-300">
                {attachedImages.map((img, index) => (
                  <div
                    key={index}
                    className="relative group rounded-lg overflow-hidden border border-border/40 shadow-md hover:shadow-lg transition-all duration-300"
                  >
                    <img
                      src={img.url}
                      alt={`Attached image ${index + 1}`}
                      className="h-20 w-20 object-cover"
                    />
                    <button
                      onClick={() => removeImage(index)}
                      className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200 hover:bg-red-600"
                      aria-label="Remove image"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Input Box - Completely Redesigned with Premium Look */}
            <div className="group relative">
              {/* Smart Suggestions */}
              <SmartSuggestions
                input={input}
                onSuggestionSelect={handleSmartSuggestionSelect}
                isVisible={showSuggestions || (isFocused && input.length >= 2)}
              />

              {/* Glowing background effect when focused */}
              <div className="absolute -inset-4 bg-gradient-to-r from-primary/10 via-primary/5 to-primary/10 rounded-3xl opacity-0 group-focus-within:opacity-100 blur-2xl transition-all duration-700 ease-out" />

              {/* Active typing glow */}
              {isFocused && input.length > 0 && (
                <div className="absolute -inset-1 bg-gradient-to-r from-primary/40 via-primary-hover/40 to-primary/40 rounded-[1.75rem] opacity-75 blur-md animate-pulse" />
              )}

              <div className={`relative flex items-end gap-3 rounded-3xl border-2 bg-gradient-to-br from-surface/90 via-surface/80 to-surface/90 backdrop-blur-xl p-4 md:p-5 shadow-2xl transition-all duration-500 ease-out ${
                isFocused
                  ? 'border-primary/60 shadow-[0_0_50px_rgba(var(--primary-rgb),0.15)] scale-[1.02] translate-y-[-2px]'
                  : 'border-border/30 hover:border-border/50 hover:shadow-[0_8px_30px_rgb(0,0,0,0.12)]'
              }`}>
                {/* Hidden File Input */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleImageSelect}
                  className="hidden"
                />

                {/* Mode Selector - Compact */}
                <div className="shrink-0">
                  <ModeSelector
                    selectedMode={selectedMode}
                    userRole={userRole}
                    onModeChange={setSelectedMode}
                    compact={true}
                  />
                </div>

                {/* Attachment Button - Redesigned */}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => fileInputRef.current?.click()}
                  className="shrink-0 h-10 w-10 rounded-xl hover:bg-primary/10 text-text-secondary/70 hover:text-primary transition-all duration-300 ease-out hover:scale-110 active:scale-95 hover:rotate-6 group/btn"
                  title="Attach images"
                  aria-label="Attach images to message"
                >
                  <Paperclip className="h-5 w-5 transition-all duration-300 group-hover/btn:scale-110" />
                </Button>

                {/* Textarea - Enhanced */}
                <textarea
                  ref={textareaRef}
                  value={input}
                  onChange={(e) => {
                    setInput(e.target.value);
                    // Hide retry button when user starts typing
                    if (e.target.value && showRetryButton) {
                      setShowRetryButton(false);
                      setLastFailedMessage(null);
                    }
                  }}
                  onKeyDown={handleKeyDown}
                  onFocus={() => setIsFocused(true)}
                  onBlur={() => setTimeout(() => setIsFocused(false), 200)}
                  placeholder="Type your message... (Press / for quick commands)"
                  className="flex-1 resize-none border-0 bg-transparent px-2 py-1 text-base md:text-lg outline-none placeholder:text-text-tertiary/40 focus:placeholder:text-text-tertiary/25 transition-all duration-500 ease-out text-text-primary leading-relaxed"
                  rows={1}
                  style={{ maxHeight: "200px" }}
                  aria-label="Chat message input"
                />

                {/* Retry Button - Shows when error occurs */}
                {showRetryButton && lastFailedMessage && (
                  <Button
                    onClick={handleRetry}
                    size="icon"
                    variant="outline"
                    className="shrink-0 h-11 w-11 rounded-xl border-2 border-amber-500 bg-amber-50 hover:bg-amber-100 text-amber-700 hover:text-amber-800 hover:scale-110 active:scale-95 transition-all duration-300 ease-out shadow-md hover:shadow-lg animate-pulse"
                    title="Retry failed message"
                    aria-label="Retry failed message"
                  >
                    <RefreshCw className="h-5 w-5" />
                  </Button>
                )}

                {/* Send Button - Premium Design */}
                <Button
                  onClick={(e) => handleSend(e)}
                  disabled={(!input.trim() && attachedImages.length === 0) || isTyping}
                  size="icon"
                  className="shrink-0 h-11 w-11 rounded-xl bg-gradient-to-br from-primary via-primary to-primary-hover hover:from-primary-hover hover:via-primary hover:to-primary shadow-lg shadow-primary/30 hover:shadow-xl hover:shadow-primary/40 hover:scale-110 active:scale-95 transition-all duration-300 ease-out disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:shadow-none text-white font-bold group/send"
                  aria-label={isTyping ? "Sending message" : "Send message"}
                >
                  {isTyping ? (
                    <div className="flex gap-0.5 items-center justify-center">
                      <div className="h-2 w-2 animate-bounce rounded-full bg-white shadow-sm [animation-delay:-0.3s]" />
                      <div className="h-2 w-2 animate-bounce rounded-full bg-white shadow-sm [animation-delay:-0.15s]" />
                      <div className="h-2 w-2 animate-bounce rounded-full bg-white shadow-sm" />
                    </div>
                  ) : (
                    <Send className="h-5 w-5 transition-all duration-300 group-hover/send:translate-x-0.5 group-hover/send:-translate-y-0.5 group-hover/send:scale-110" />
                  )}
                </Button>
              </div>
            </div>

            {/* Helper Text with Character Count - Redesigned */}
            <div className="px-4 text-xs text-text-tertiary/60 flex items-center justify-between gap-3 transition-all duration-300 animate-in fade-in slide-in-from-bottom-2 duration-500">
              <div className="flex items-center gap-2 flex-wrap">
                <div className="flex items-center gap-1.5">
                  <kbd className="px-2.5 py-1.5 rounded-lg bg-surface/90 border border-border/40 font-mono text-[10px] font-bold shadow-sm">Enter</kbd>
                  <span className="text-[11px]">send</span>
                </div>
                <span className="text-text-tertiary/30">•</span>
                <div className="flex items-center gap-1.5">
                  <kbd className="px-2.5 py-1.5 rounded-lg bg-surface/90 border border-border/40 font-mono text-[10px] font-bold shadow-sm">Shift + Enter</kbd>
                  <span className="text-[11px]">new line</span>
                </div>
                <span className="text-text-tertiary/30">•</span>
                <div className="flex items-center gap-1.5">
                  <kbd className="px-2.5 py-1.5 rounded-lg bg-surface/90 border border-border/40 font-mono text-[10px] font-bold shadow-sm">/</kbd>
                  <span className="text-[11px]">commands</span>
                </div>
              </div>
              {input.length > 0 && (
                <div className={`flex items-center gap-2 font-mono transition-all duration-300 px-3 py-1.5 rounded-lg backdrop-blur-sm ${
                  input.length > 9000
                    ? 'text-red-500 bg-red-500/10 border border-red-500/20'
                    : input.length > 7000
                    ? 'text-yellow-500 bg-yellow-500/10 border border-yellow-500/20'
                    : 'text-text-tertiary/60 bg-surface/50 border border-border/30'
                }`}>
                  <span className="text-[11px] font-semibold">{input.length.toLocaleString()}</span>
                  <span className="text-[10px] opacity-60">/</span>
                  <span className="text-[10px] opacity-60">10,000</span>
                  {input.length > 7000 && (
                    <span className="inline-flex h-1.5 w-1.5 rounded-full bg-current animate-pulse ml-1" />
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Right Sidebar - Canvas (when enabled) - Shows even when empty */}
      {canvasEnabled && (
        <>
          {/* Desktop Canvas - Sidebar with smooth slide animation */}
          {!canvasData.isExpanded && (
            <div className={`hidden lg:flex flex-col h-full border-l border-border/30 bg-white shadow-2xl transition-all duration-500 ease-in-out ${
              isRightSidebarCollapsed ? 'w-0 opacity-0 translate-x-full' : 'w-[520px] opacity-100 translate-x-0'
            }`}>
              {/* Show content if available, otherwise show empty state */}
              {canvasData.type === "essay" && canvasData.essayId ? (
                <EssayCanvas
                  essayId={canvasData.essayId}
                  studentId={canvasData.studentId || undefined}
                  onClose={() =>
                    setCanvasData({ type: null, essayId: null, studentId: null, letterId: null, isExpanded: false })
                  }
                  isExpanded={false}
                  onToggleExpand={() =>
                    setCanvasData((prev) => ({ ...prev, isExpanded: true }))
                  }
                />
              ) : canvasData.type === "student" && canvasData.studentId ? (
                <StudentCanvas
                  studentId={canvasData.studentId}
                  onClose={() =>
                    setCanvasData({ type: null, essayId: null, studentId: null, letterId: null, isExpanded: false })
                  }
                  isExpanded={false}
                  onToggleExpand={() =>
                    setCanvasData((prev) => ({ ...prev, isExpanded: true }))
                  }
                />
              ) : canvasData.type === "letter" && canvasData.letterId && canvasData.studentId ? (
                <LetterCanvas
                  letterId={canvasData.letterId}
                  studentId={canvasData.studentId}
                  onClose={() =>
                    setCanvasData({ type: null, essayId: null, studentId: null, letterId: null, isExpanded: false })
                  }
                  isExpanded={false}
                  onToggleExpand={() =>
                    setCanvasData((prev) => ({ ...prev, isExpanded: true }))
                  }
                />
              ) : (
                /* Empty Canvas State - Full Height Window Design */
                <div className="h-full flex flex-col bg-gradient-to-b from-gray-50 to-white">
                  {/* Canvas Header */}
                  <div className="flex-none border-b border-gray-200 bg-white px-6 py-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-sm">
                          <PanelRightOpen className="h-5 w-5 text-white" />
                        </div>
                        <div>
                          <h3 className="text-base font-semibold text-gray-900">Canvas</h3>
                          <p className="text-xs text-gray-500">No content loaded</p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setCanvasEnabled(false)}
                        className="h-8 w-8 rounded-lg hover:bg-gray-100"
                      >
                        <X className="h-4 w-4 text-gray-500" />
                      </Button>
                    </div>
                  </div>

                  {/* Canvas Content - Centered Empty State */}
                  <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
                    <div className="mb-6">
                      <div className="rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-50 p-8 inline-block">
                        <Sparkles className="h-16 w-16 text-blue-600" />
                      </div>
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-3">Canvas Ready</h3>
                    <p className="text-sm text-gray-600 max-w-md mb-6 leading-relaxed">
                      Ask the AI to open an essay, student profile, or generate content, and it will appear here in an interactive editor.
                    </p>
                    <div className="w-full max-w-sm bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
                      <p className="text-xs font-semibold text-gray-700 mb-3">Try asking:</p>
                      <ul className="space-y-2 text-left">
                        <li className="flex items-start gap-2 text-sm">
                          <span className="text-blue-500 font-bold">→</span>
                          <span className="text-gray-700">&quot;Show me John&apos;s essay&quot;</span>
                        </li>
                        <li className="flex items-start gap-2 text-sm">
                          <span className="text-blue-500 font-bold">→</span>
                          <span className="text-gray-700">&quot;Open Sarah&apos;s profile&quot;</span>
                        </li>
                        <li className="flex items-start gap-2 text-sm">
                          <span className="text-blue-500 font-bold">→</span>
                          <span className="text-gray-700">&quot;Generate a letter for Marcus&quot;</span>
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Mobile Canvas - Auto-expand to full screen */}
          <div className="lg:hidden">
            {canvasData.type === "essay" && canvasData.essayId && (
              <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md p-4 animate-in fade-in duration-300">
                <div className="h-full">
                  <EssayCanvas
                    essayId={canvasData.essayId}
                    studentId={canvasData.studentId || undefined}
                    onClose={() =>
                      setCanvasData({ type: null, essayId: null, studentId: null, isExpanded: false })
                    }
                    isExpanded={true}
                    onToggleExpand={() =>
                      setCanvasData((prev) => ({ ...prev, isExpanded: false }))
                    }
                  />
                </div>
              </div>
            )}
            {canvasData.type === "student" && canvasData.studentId && (
              <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md p-4 animate-in fade-in duration-300">
                <div className="h-full">
                  <StudentCanvas
                    studentId={canvasData.studentId}
                    onClose={() =>
                      setCanvasData({ type: null, essayId: null, studentId: null, isExpanded: false })
                    }
                    isExpanded={true}
                    onToggleExpand={() =>
                      setCanvasData((prev) => ({ ...prev, isExpanded: false }))
                    }
                  />
                </div>
              </div>
            )}
          </div>

          {/* Right Sidebar Toggle Button */}
          {!canvasData.isExpanded && !isRightSidebarCollapsed && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsRightSidebarCollapsed(true)}
              className="hidden lg:flex absolute right-[480px] top-4 z-10 h-8 w-8 rounded-full bg-surface/80 hover:bg-surface border border-border/40 transition-all duration-300"
              title="Hide canvas"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          )}
          {!canvasData.isExpanded && isRightSidebarCollapsed && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsRightSidebarCollapsed(false)}
              className="hidden lg:flex absolute right-2 top-4 z-10 h-8 w-8 rounded-full bg-surface/80 hover:bg-surface border border-border/40 transition-all duration-300"
              title="Show canvas"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
          )}
        </>
      )}

      {/* Mobile Chat History Sidebar */}
      <div className="lg:hidden">
        <ChatHistory
          selectedConversation={selectedConversation}
          onSelectConversation={(id) => {
            setSelectedConversation(id);
            setIsSidebarOpen(false);
          }}
          onNewChat={() => {
            handleNewChat();
            setIsSidebarOpen(false);
          }}
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
        />
      </div>

      {/* AI Confirmation Dialog */}
      <AIConfirmationDialog
        open={showConfirmation}
        onOpenChange={setShowConfirmation}
        action={pendingAction}
        message={confirmationMessage}
        onSuccess={() => {
          // Only invalidate relevant queries, not all at once
          // Delay to prevent immediate refetch during user interaction
          setTimeout(() => {
            queryClient.invalidateQueries({ queryKey: ["students"] });
            queryClient.invalidateQueries({ queryKey: ["tasks"] });
          }, 300);
        }}
      />

      {/* Debug Panel - Shows Canvas State */}
      {showDebug && (
        <div className="fixed bottom-4 right-4 z-[100] bg-black/90 text-white text-xs p-4 rounded-lg max-w-sm border border-green-500">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-bold text-green-400">Canvas Debug</h3>
            <button onClick={() => setShowDebug(false)} className="text-gray-400 hover:text-white">✕</button>
          </div>
          <div className="space-y-1 font-mono">
            <div>canvasEnabled: <span className={canvasEnabled ? "text-green-400" : "text-red-400"}>{String(canvasEnabled)}</span></div>
            <div>canvasData.type: <span className="text-yellow-400">{canvasData.type || "null"}</span></div>
            <div>canvasData.studentId: <span className="text-blue-400">{canvasData.studentId || "null"}</span></div>
            <div>canvasData.essayId: <span className="text-purple-400">{canvasData.essayId || "null"}</span></div>
            <div>canvasData.isExpanded: <span className={canvasData.isExpanded ? "text-green-400" : "text-red-400"}>{String(canvasData.isExpanded)}</span></div>
            <div>Screen width: <span className="text-cyan-400">{typeof window !== 'undefined' ? window.innerWidth : 0}px</span></div>
            <div>Should render: <span className={canvasData.type && canvasEnabled ? "text-green-400" : "text-red-400"}>{String(Boolean(canvasData.type && canvasEnabled))}</span></div>
          </div>
        </div>
      )}

      {/* Debug Toggle Button */}
      <div
        className="fixed bottom-4 left-4 z-[99] bg-gray-800 text-white text-xs px-2 py-1 rounded cursor-pointer hover:bg-gray-700"
        onClick={() => setShowDebug(!showDebug)}
        title="Toggle Debug Panel"
      >
        Debug {showDebug ? '✓' : ''}
      </div>

      {/* Expanded Canvas Overlay (Full Screen) */}
      {canvasData.type && canvasData.isExpanded && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md p-4 md:p-6 lg:p-8 animate-in fade-in duration-300"
          onClick={(e) => {
            // Close when clicking backdrop
            if (e.target === e.currentTarget) {
              setCanvasData((prev) => ({ ...prev, isExpanded: false }));
            }
          }}
        >
          <div className="h-full max-w-6xl mx-auto">
            {canvasData.type === "essay" && canvasData.essayId && (
              <EssayCanvas
                essayId={canvasData.essayId}
                studentId={canvasData.studentId || undefined}
                onClose={() =>
                  setCanvasData({ type: null, essayId: null, studentId: null, isExpanded: false })
                }
                isExpanded={true}
                onToggleExpand={() =>
                  setCanvasData((prev) => ({ ...prev, isExpanded: false }))
                }
              />
            )}
            {canvasData.type === "student" && canvasData.studentId && (
              <StudentCanvas
                studentId={canvasData.studentId}
                onClose={() =>
                  setCanvasData({ type: null, essayId: null, studentId: null, isExpanded: false })
                }
                isExpanded={true}
                onToggleExpand={() =>
                  setCanvasData((prev) => ({ ...prev, isExpanded: false }))
                }
              />
            )}
          </div>
        </div>
      )}
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
