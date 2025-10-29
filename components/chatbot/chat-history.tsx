"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { format, isToday, isYesterday } from "date-fns";
import { apiClient, type Conversation } from "@/lib/api/client";

interface ChatHistoryProps {
  selectedConversation: string | null;
  onSelectConversation: (id: string | null) => void;
  onNewChat?: () => void;
}

export function ChatHistory({
  selectedConversation,
  onSelectConversation,
  onNewChat,
}: ChatHistoryProps) {
  const [searchQuery, setSearchQuery] = useState("");

  const { data: conversationsData, isLoading } = useQuery({
    queryKey: ["conversations"],
    queryFn: () => apiClient.getConversations(),
    refetchOnMount: true,
    staleTime: 30000, // Consider data stale after 30 seconds
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
    <aside className="w-56 sm:w-64 md:w-72 lg:w-80 flex h-full flex-col border-r border-border/50 bg-surface/50 backdrop-blur-sm shrink-0 shadow-xl">
      {/* New Chat Button */}
      <div className="border-b border-border/50 shrink-0 bg-gradient-to-r from-surface to-surface/80" style={{ padding: 'clamp(0.75rem, 2vw, 1rem)' }}>
        <Button
          className="w-full font-semibold shadow-md hover:shadow-lg transition-all duration-200"
          onClick={handleNewChatClick}
          variant={selectedConversation === null ? "default" : "outline"}
        >
          <Plus className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5 sm:mr-2" />
          <span className="text-xs sm:text-sm">New Chat</span>
        </Button>
      </div>

      {/* Search */}
      <div className="border-b border-border/50 shrink-0 bg-gradient-to-r from-surface to-surface/80" style={{ padding: 'clamp(0.75rem, 2vw, 1rem)' }}>
        <div className="relative">
          <Search className="absolute left-2 sm:left-3 top-1/2 h-3.5 w-3.5 sm:h-4 sm:w-4 -translate-y-1/2 text-text-tertiary" />
          <Input
            placeholder="Search chats..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-7 sm:pl-10 bg-background/50 border-border/50 focus:border-primary transition-colors text-xs sm:text-sm"
          />
        </div>
      </div>

      {/* Conversations List */}
      <div className="flex-1 overflow-y-auto min-h-0" style={{ padding: 'clamp(0.75rem, 2vw, 1rem)' }}>
        {isLoading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-20 rounded-xl" />
            ))}
          </div>
        ) : (
          <>
            {groupedConversations.today.length > 0 && (
              <div style={{ marginBottom: 'clamp(1rem, 3vw, 1.5rem)' }}>
                <div className="text-xs font-bold uppercase tracking-wider text-text-tertiary" style={{ marginBottom: 'clamp(0.5rem, 1.5vw, 0.75rem)', paddingLeft: 'clamp(0.25rem, 1vw, 0.5rem)' }}>
                  Today
                </div>
                <div className="space-y-1 sm:space-y-1.5 md:space-y-2">
                  {groupedConversations.today.map((conv) => (
                    <button
                      key={conv.id}
                      onClick={() => onSelectConversation(conv.id)}
                      className={`w-full rounded-xl text-left transition-all duration-200 ${
                        selectedConversation === conv.id
                          ? "bg-gradient-to-r from-primary-light to-primary/10 border-l-4 border-primary shadow-lg"
                          : "hover:bg-background/50 border-l-4 border-transparent hover:border-border"
                      }`}
                      style={{ padding: 'clamp(0.5rem, 1.5vw, 0.875rem)' }}
                    >
                      <div className="font-semibold text-text-primary truncate" style={{ fontSize: 'clamp(0.75rem, 1.5vw, 0.875rem)' }}>
                        {conv.title || "New conversation"}
                      </div>
                      <div className="text-text-tertiary/80" style={{ marginTop: 'clamp(0.125rem, 0.5vw, 0.25rem)', fontSize: 'clamp(0.625rem, 1.2vw, 0.75rem)' }}>
                        {format(new Date(conv.updated_at), "h:mm a")}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {groupedConversations.yesterday.length > 0 && (
              <div style={{ marginBottom: 'clamp(1rem, 3vw, 1.5rem)' }}>
                <div className="text-xs font-bold uppercase tracking-wider text-text-tertiary" style={{ marginBottom: 'clamp(0.5rem, 1.5vw, 0.75rem)', paddingLeft: 'clamp(0.25rem, 1vw, 0.5rem)' }}>
                  Yesterday
                </div>
                <div className="space-y-1 sm:space-y-1.5 md:space-y-2">
                  {groupedConversations.yesterday.map((conv) => (
                    <button
                      key={conv.id}
                      onClick={() => onSelectConversation(conv.id)}
                      className={`w-full rounded-xl text-left transition-all duration-200 ${
                        selectedConversation === conv.id
                          ? "bg-gradient-to-r from-primary-light to-primary/10 border-l-4 border-primary shadow-lg"
                          : "hover:bg-background/50 border-l-4 border-transparent hover:border-border"
                      }`}
                      style={{ padding: 'clamp(0.5rem, 1.5vw, 0.875rem)' }}
                    >
                      <div className="font-semibold text-text-primary truncate" style={{ fontSize: 'clamp(0.75rem, 1.5vw, 0.875rem)' }}>
                        {conv.title || "New conversation"}
                      </div>
                      <div className="text-text-tertiary/80" style={{ marginTop: 'clamp(0.125rem, 0.5vw, 0.25rem)', fontSize: 'clamp(0.625rem, 1.2vw, 0.75rem)' }}>
                        {format(new Date(conv.updated_at), "MMM d, h:mm a")}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {groupedConversations.older.length > 0 && (
              <div style={{ marginBottom: 'clamp(1rem, 3vw, 1.5rem)' }}>
                <div className="text-xs font-bold uppercase tracking-wider text-text-tertiary" style={{ marginBottom: 'clamp(0.5rem, 1.5vw, 0.75rem)', paddingLeft: 'clamp(0.25rem, 1vw, 0.5rem)' }}>
                  Older
                </div>
                <div className="space-y-1 sm:space-y-1.5 md:space-y-2">
                  {groupedConversations.older.map((conv) => (
                    <button
                      key={conv.id}
                      onClick={() => onSelectConversation(conv.id)}
                      className={`w-full rounded-xl text-left transition-all duration-200 ${
                        selectedConversation === conv.id
                          ? "bg-gradient-to-r from-primary-light to-primary/10 border-l-4 border-primary shadow-lg"
                          : "hover:bg-background/50 border-l-4 border-transparent hover:border-border"
                      }`}
                      style={{ padding: 'clamp(0.5rem, 1.5vw, 0.875rem)' }}
                    >
                      <div className="font-semibold text-text-primary truncate" style={{ fontSize: 'clamp(0.75rem, 1.5vw, 0.875rem)' }}>
                        {conv.title || "New conversation"}
                      </div>
                      <div className="text-text-tertiary/80" style={{ marginTop: 'clamp(0.125rem, 0.5vw, 0.25rem)', fontSize: 'clamp(0.625rem, 1.2vw, 0.75rem)' }}>
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
  );
}

