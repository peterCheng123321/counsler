/**
 * Simple in-memory response cache for agent queries
 * Caches read-only queries to improve performance
 */

interface CacheEntry {
  response: string;
  timestamp: number;
  expiresAt: number;
}

class ResponseCache {
  private cache: Map<string, CacheEntry> = new Map();
  private readonly TTL = 5 * 60 * 1000; // 5 minutes
  private readonly MAX_ENTRIES = 100;

  /**
   * Generate cache key from message and context
   */
  private getCacheKey(message: string, conversationId?: string): string {
    // Only cache if message looks like a read-only query
    if (!this.isReadOnlyQuery(message)) {
      return "";
    }

    // Simple key - just the message content (normalized)
    return message.toLowerCase().trim().replace(/\s+/g, " ");
  }

  /**
   * Check if message is a read-only query (safe to cache)
   */
  private isReadOnlyQuery(message: string): boolean {
    const lowerMsg = message.toLowerCase();

    // Keywords that indicate write operations (DON'T cache)
    const writeKeywords = [
      "create",
      "add",
      "update",
      "edit",
      "modify",
      "delete",
      "remove",
      "change",
      "set",
      "generate",
    ];

    if (writeKeywords.some((keyword) => lowerMsg.includes(keyword))) {
      return false;
    }

    // Keywords that indicate read operations (DO cache)
    const readKeywords = [
      "show",
      "list",
      "get",
      "find",
      "search",
      "tell me",
      "what",
      "who",
      "when",
      "where",
      "how many",
    ];

    return readKeywords.some((keyword) => lowerMsg.includes(keyword));
  }

  /**
   * Get cached response if available and not expired
   */
  get(message: string, conversationId?: string): string | null {
    const key = this.getCacheKey(message, conversationId);
    if (!key) return null;

    const entry = this.cache.get(key);
    if (!entry) return null;

    // Check if expired
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    console.log(`[Response Cache] Cache HIT for: ${message.substring(0, 50)}...`);
    return entry.response;
  }

  /**
   * Store response in cache
   */
  set(message: string, response: string, conversationId?: string): void {
    const key = this.getCacheKey(message, conversationId);
    if (!key) return;

    // Evict oldest entry if cache is full
    if (this.cache.size >= this.MAX_ENTRIES) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey) {
        this.cache.delete(oldestKey);
      }
    }

    this.cache.set(key, {
      response,
      timestamp: Date.now(),
      expiresAt: Date.now() + this.TTL,
    });

    console.log(`[Response Cache] Cached response for: ${message.substring(0, 50)}...`);
  }

  /**
   * Clear all cached responses
   */
  clear(): void {
    this.cache.clear();
    console.log("[Response Cache] Cache cleared");
  }

  /**
   * Remove expired entries
   */
  cleanup(): void {
    const now = Date.now();
    let removed = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
        removed++;
      }
    }

    if (removed > 0) {
      console.log(`[Response Cache] Cleaned up ${removed} expired entries`);
    }
  }

  /**
   * Get cache stats
   */
  getStats(): { size: number; maxSize: number; ttl: number } {
    return {
      size: this.cache.size,
      maxSize: this.MAX_ENTRIES,
      ttl: this.TTL,
    };
  }
}

// Export singleton instance
export const responseCache = new ResponseCache();

// Run cleanup every minute
if (typeof setInterval !== "undefined") {
  setInterval(() => responseCache.cleanup(), 60 * 1000);
}
