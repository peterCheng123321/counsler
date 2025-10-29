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
    <aside className="w-64 md:w-72 flex h-full flex-col border-r border-border/50 bg-surface/50 backdrop-blur-sm shrink-0 shadow-xl">
      {/* New Chat Button */}
      <div className="border-b border-border/50 p-4 shrink-0 bg-gradient-to-r from-surface to-surface/80">
        <Button
          className="w-full font-semibold shadow-md hover:shadow-lg transition-all duration-200"
          onClick={handleNewChatClick}
          variant={selectedConversation === null ? "default" : "outline"}
        >
          <Plus className="h-4 w-4 mr-2" />
          New Chat
        </Button>
      </div>

      {/* Search */}
      <div className="border-b border-border/50 p-4 shrink-0 bg-gradient-to-r from-surface to-surface/80">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-tertiary" />
          <Input
            placeholder="Search chats..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-background/50 border-border/50 focus:border-primary transition-colors"
          />
        </div>
      </div>

      {/* Conversations List */}
      <div className="flex-1 overflow-y-auto p-4 min-h-0">
        {isLoading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-20 rounded-xl" />
            ))}
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
                      className={`w-full rounded-xl p-3.5 text-left transition-all duration-200 ${
                        selectedConversation === conv.id
                          ? "bg-gradient-to-r from-primary-light to-primary/10 border-l-4 border-primary shadow-lg"
                          : "hover:bg-background/50 border-l-4 border-transparent hover:border-border"
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
                      className={`w-full rounded-xl p-3.5 text-left transition-all duration-200 ${
                        selectedConversation === conv.id
                          ? "bg-gradient-to-r from-primary-light to-primary/10 border-l-4 border-primary shadow-lg"
                          : "hover:bg-background/50 border-l-4 border-transparent hover:border-border"
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
                      className={`w-full rounded-xl p-3.5 text-left transition-all duration-200 ${
                        selectedConversation === conv.id
                          ? "bg-gradient-to-r from-primary-light to-primary/10 border-l-4 border-primary shadow-lg"
                          : "hover:bg-background/50 border-l-4 border-transparent hover:border-border"
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
  );
}

