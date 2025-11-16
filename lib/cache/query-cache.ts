/**
 * Query Cache Implementation
 * In-memory cache for database queries with TTL
 */

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

export class QueryCache {
  private cache: Map<string, CacheEntry<any>> = new Map();
  private defaultTTL: number = 120000; // 2 minutes for better speed

  constructor(defaultTTL?: number) {
    if (defaultTTL) {
      this.defaultTTL = defaultTTL;
    }
  }

  /**
   * Generate cache key from user ID, query type, and parameters
   */
  private generateKey(userId: string, queryType: string, params?: Record<string, any>): string {
    const paramsStr = params ? JSON.stringify(params) : "";
    return `${userId}:${queryType}:${paramsStr}`;
  }

  /**
   * Get cached data if available and not expired
   */
  get<T>(userId: string, queryType: string, params?: Record<string, any>): T | null {
    const key = this.generateKey(userId, queryType, params);
    const entry = this.cache.get(key);

    if (!entry) {
      return null;
    }

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return entry.data as T;
  }

  /**
   * Set cache entry with optional custom TTL
   */
  set<T>(
    userId: string,
    queryType: string,
    data: T,
    params?: Record<string, any>,
    ttl?: number
  ): void {
    const key = this.generateKey(userId, queryType, params);
    const ttlMs = ttl || this.defaultTTL;

    this.cache.set(key, {
      data,
      expiresAt: Date.now() + ttlMs,
    });
  }

  /**
   * Invalidate cache for a specific query type and user
   */
  invalidate(userId: string, queryType: string, params?: Record<string, any>): void {
    const key = this.generateKey(userId, queryType, params);
    this.cache.delete(key);
  }

  /**
   * Invalidate all cache entries for a user
   */
  invalidateUser(userId: string): void {
    for (const [key] of this.cache) {
      if (key.startsWith(`${userId}:`)) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Invalidate all cache entries for a query type
   */
  invalidateQueryType(queryType: string): void {
    for (const [key] of this.cache) {
      if (key.includes(`:${queryType}:`)) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Get cache size
   */
  size(): number {
    return this.cache.size;
  }

  /**
   * Clean up expired entries
   */
  cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
      }
    }
  }
}

export const queryCache = new QueryCache(120000); // 2 minute default TTL for speed

