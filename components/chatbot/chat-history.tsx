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

      {/* Sidebar - Cleaner Design */}
      <aside
        className={`fixed lg:relative inset-y-0 left-0 z-50 w-64 flex h-full flex-col bg-white shrink-0 transition-transform duration-200 ${
          isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        {/* Header with Close Button (Mobile Only) */}
        <div className="flex items-center justify-between border-b border-border p-3 lg:hidden shrink-0">
          <h2 className="text-sm font-semibold text-gray-900">Chat History</h2>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-7 w-7"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* New Chat Button */}
        <div className="p-3 shrink-0">
          <Button
            className="w-full text-sm"
            onClick={handleNewChatClick}
            variant={selectedConversation === null ? "default" : "outline"}
            size="sm"
          >
            <Plus className="h-4 w-4 mr-2" />
            New Chat
          </Button>
        </div>

      {/* Search */}
      <div className="px-3 pb-3 shrink-0">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
          <Input
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 h-8 text-sm"
          />
        </div>
      </div>

      {/* Conversations List */}
      <div className="flex-1 overflow-y-auto px-3 min-h-0">
        {isLoading ? (
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => (
              <Skeleton
                key={i}
                className="h-12 rounded-lg"
              />
            ))}
          </div>
        ) : error ? (
          <div className="py-8 text-center">
            <div className="text-xs text-error mb-2">
              Failed to load
            </div>
            <button
              onClick={() => window.location.reload()}
              className="text-xs text-blue-600 hover:underline"
            >
              Retry
            </button>
          </div>
        ) : (
          <>
            {groupedConversations.today.length > 0 && (
              <div className="mb-4">
                <div className="mb-2 text-xs font-medium text-gray-500 px-2">
                  Today
                </div>
                <div className="space-y-1">
                  {groupedConversations.today.map((conv) => (
                    <button
                      key={conv.id}
                      onClick={() => onSelectConversation(conv.id)}
                      className={`w-full rounded-lg px-3 py-2 text-left transition-colors ${
                        selectedConversation === conv.id
                          ? "bg-blue-50 text-blue-900"
                          : "hover:bg-gray-50 text-gray-700"
                      }`}
                    >
                      <div className="text-sm font-medium truncate">
                        {conv.title || "New conversation"}
                      </div>
                      <div className="mt-0.5 text-xs text-gray-500">
                        {format(new Date(conv.updated_at), "h:mm a")}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {groupedConversations.yesterday.length > 0 && (
              <div className="mb-4">
                <div className="mb-2 text-xs font-medium text-gray-500 px-2">
                  Yesterday
                </div>
                <div className="space-y-1">
                  {groupedConversations.yesterday.map((conv) => (
                    <button
                      key={conv.id}
                      onClick={() => onSelectConversation(conv.id)}
                      className={`w-full rounded-lg px-3 py-2 text-left transition-colors ${
                        selectedConversation === conv.id
                          ? "bg-blue-50 text-blue-900"
                          : "hover:bg-gray-50 text-gray-700"
                      }`}
                    >
                      <div className="text-sm font-medium truncate">
                        {conv.title || "New conversation"}
                      </div>
                      <div className="mt-0.5 text-xs text-gray-500">
                        {format(new Date(conv.updated_at), "h:mm a")}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {groupedConversations.older.length > 0 && (
              <div className="mb-4">
                <div className="mb-2 text-xs font-medium text-gray-500 px-2">
                  Older
                </div>
                <div className="space-y-1">
                  {groupedConversations.older.map((conv) => (
                    <button
                      key={conv.id}
                      onClick={() => onSelectConversation(conv.id)}
                      className={`w-full rounded-lg px-3 py-2 text-left transition-colors ${
                        selectedConversation === conv.id
                          ? "bg-blue-50 text-blue-900"
                          : "hover:bg-gray-50 text-gray-700"
                      }`}
                    >
                      <div className="text-sm font-medium truncate">
                        {conv.title || "New conversation"}
                      </div>
                      <div className="mt-0.5 text-xs text-gray-500">
                        {format(new Date(conv.updated_at), "MMM d")}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {!isLoading && filteredConversations.length === 0 && (
              <div className="py-8 text-center">
                <div className="text-xs text-gray-500">
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

