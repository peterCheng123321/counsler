"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Plus, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { format, isToday, isYesterday } from "date-fns";
import { apiClient, type Conversation } from "@/lib/api/client";

interface ChatHistoryProps {
  selectedConversation: string | null;
  onSelectConversation: (id: string | null) => void;
  onNewChat?: () => void;
  isOpen: boolean;
  onClose: () => void;
}

export function ChatHistory({
  selectedConversation,
  onSelectConversation,
  onNewChat,
  isOpen,
  onClose,
}: ChatHistoryProps) {
  const [searchQuery, setSearchQuery] = useState("");

  const { data: conversationsData, isLoading, error } = useQuery({
    queryKey: ["conversations"],
    queryFn: () => apiClient.getConversations(),
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    staleTime: 5 * 60 * 1000, // 5 minutes - don't refetch unless data is stale
    gcTime: 10 * 60 * 1000, // Keep in cache for 10 minutes
    retry: 2,
  });

  const conversations = conversationsData?.data || [];

  const filteredConversations = conversations.filter((conv) =>
    (conv.title || "New conversation")
      .toLowerCase()
      .includes(searchQuery.toLowerCase())
  );

  const groupedConversations = {
    today: filteredConversations.filter((conv) =>
      isToday(new Date(conv.updated_at))
    ),
    yesterday: filteredConversations.filter((conv) =>
      isYesterday(new Date(conv.updated_at))
    ),
    older: filteredConversations.filter(
      (conv) =>
        !isToday(new Date(conv.updated_at)) &&
        !isYesterday(new Date(conv.updated_at))
    ),
  };

  const handleNewChatClick = () => {
    if (onNewChat) {
      onNewChat();
    }
    onSelectConversation(null);
  };

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden transition-opacity duration-300 ease-in-out"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed lg:relative inset-y-0 right-0 z-50 w-80 lg:w-72 flex h-full flex-col border-l border-border/50 bg-surface backdrop-blur-xl shrink-0 shadow-2xl transition-transform duration-300 ease-in-out ${
          isOpen ? "translate-x-0" : "translate-x-full lg:translate-x-0"
        }`}
      >
        {/* Header with Close Button (Mobile Only) */}
        <div className="flex items-center justify-between border-b border-border/50 p-4 lg:hidden shrink-0 bg-gradient-to-r from-primary/10 to-primary/5">
          <h2 className="text-lg font-bold text-text-primary">Chat History</h2>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="hover:bg-primary/10"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* New Chat Button */}
        <div className="border-b border-border/50 p-4 shrink-0 bg-gradient-to-b from-surface/80 to-surface/40">
          <Button
            className="w-full font-semibold shadow-md hover:shadow-lg transition-all duration-300 ease-out group"
            onClick={handleNewChatClick}
            variant={selectedConversation === null ? "default" : "outline"}
          >
            <Plus className="h-4 w-4 mr-2 transition-transform duration-300 ease-out group-hover:rotate-90" />
            New Chat
          </Button>
        </div>

      {/* Search */}
      <div className="border-b border-border/50 p-4 shrink-0 bg-gradient-to-b from-surface/40 to-transparent">
        <div className="relative group">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-tertiary group-focus-within:text-primary transition-colors duration-300" />
          <Input
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-background border-border focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-300 ease-out"
          />
        </div>
      </div>

      {/* Conversations List */}
      <div className="flex-1 overflow-y-auto p-4 min-h-0 transition-all duration-300 ease-in-out">
        {isLoading ? (
          <div className="space-y-3 animate-fade-in">
            {[...Array(5)].map((_, i) => (
              <Skeleton 
                key={i} 
                className="h-20 rounded-xl bg-gradient-to-r from-surface via-surface/50 to-surface transition-all duration-500 ease-in-out animate-pulse"
                style={{ animationDelay: `${i * 0.1}s` }}
              />
            ))}
          </div>
        ) : error ? (
          <div className="py-12 text-center">
            <div className="text-sm text-error mb-2">
              Failed to load conversations
            </div>
            <button
              onClick={() => window.location.reload()}
              className="text-xs text-primary hover:underline"
            >
              Retry
            </button>
          </div>
        ) : (
          <>
            {groupedConversations.today.length > 0 && (
              <div className="mb-6">
                <div className="mb-3 text-xs font-bold uppercase tracking-wider text-text-tertiary px-2">
                  Today
                </div>
                <div className="space-y-1.5">
                  {groupedConversations.today.map((conv) => (
                    <button
                      key={conv.id}
                      onClick={() => onSelectConversation(conv.id)}
                      className={`w-full rounded-xl p-3.5 text-left transition-all duration-300 ease-out ${
                        selectedConversation === conv.id
                          ? "bg-gradient-to-r from-primary-light to-primary/10 border-l-4 border-primary shadow-lg scale-[1.02]"
                          : "hover:bg-background/50 border-l-4 border-transparent hover:border-border hover:scale-[1.01]"
                      }`}
                    >
                      <div className="text-sm font-semibold text-text-primary truncate">
                        {conv.title || "New conversation"}
                      </div>
                      <div className="mt-1 text-xs text-text-tertiary/80">
                        {format(new Date(conv.updated_at), "h:mm a")}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {groupedConversations.yesterday.length > 0 && (
              <div className="mb-6">
                <div className="mb-3 text-xs font-bold uppercase tracking-wider text-text-tertiary px-2">
                  Yesterday
                </div>
                <div className="space-y-1.5">
                  {groupedConversations.yesterday.map((conv) => (
                    <button
                      key={conv.id}
                      onClick={() => onSelectConversation(conv.id)}
                      className={`w-full rounded-xl p-3.5 text-left transition-all duration-300 ease-out ${
                        selectedConversation === conv.id
                          ? "bg-gradient-to-r from-primary-light to-primary/10 border-l-4 border-primary shadow-lg scale-[1.02]"
                          : "hover:bg-background/50 border-l-4 border-transparent hover:border-border hover:scale-[1.01]"
                      }`}
                    >
                      <div className="text-sm font-semibold text-text-primary truncate">
                        {conv.title || "New conversation"}
                      </div>
                      <div className="mt-1 text-xs text-text-tertiary/80">
                        {format(new Date(conv.updated_at), "MMM d, h:mm a")}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {groupedConversations.older.length > 0 && (
              <div className="mb-6">
                <div className="mb-3 text-xs font-bold uppercase tracking-wider text-text-tertiary px-2">
                  Older
                </div>
                <div className="space-y-1.5">
                  {groupedConversations.older.map((conv) => (
                    <button
                      key={conv.id}
                      onClick={() => onSelectConversation(conv.id)}
                      className={`w-full rounded-xl p-3.5 text-left transition-all duration-300 ease-out ${
                        selectedConversation === conv.id
                          ? "bg-gradient-to-r from-primary-light to-primary/10 border-l-4 border-primary shadow-lg scale-[1.02]"
                          : "hover:bg-background/50 border-l-4 border-transparent hover:border-border hover:scale-[1.01]"
                      }`}
                    >
                      <div className="text-sm font-semibold text-text-primary truncate">
                        {conv.title || "New conversation"}
                      </div>
                      <div className="mt-1 text-xs text-text-tertiary/80">
                        {format(new Date(conv.updated_at), "MMM d, yyyy")}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {!isLoading && filteredConversations.length === 0 && (
              <div className="py-12 text-center">
                <div className="text-sm text-text-tertiary/60">
                  No conversations found
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </aside>
    </>
  );
}

