/**
 * In-memory TTL Cache for autocomplete and search suggestions.
 * Keeps rapid repeated typing queries fast (<1ms) without taxing SQL Server.
 */

interface CacheEntry<T> {
  value: T
  expiresAt: number
}

export class SuggestionCache {
  private store = new Map<string, CacheEntry<any>>()
  private readonly defaultTtlMs: number
  private readonly maxEntries: number

  constructor(defaultTtlMs = 30_000, maxEntries = 2000) {
    this.defaultTtlMs = defaultTtlMs
    this.maxEntries = maxEntries
  }

  get<T>(key: string): T | null {
    const entry = this.store.get(key)
    if (!entry) return null

    if (Date.now() > entry.expiresAt) {
      this.store.delete(key)
      return null
    }

    return entry.value as T
  }

  set<T>(key: string, data: T, ttlMs = this.defaultTtlMs): void {
    if (this.store.has(key)) {
      this.store.delete(key)
    } else if (this.store.size >= this.maxEntries) {
      this.evict()
    }

    this.store.set(key, {
      value: data,
      expiresAt: Date.now() + ttlMs,
    })
  }

  has(key: string): boolean {
    return this.get(key) !== null
  }

  delete(key: string): boolean {
    return this.store.delete(key)
  }

  clear(): void {
    this.store.clear()
  }

  get size(): number {
    return this.store.size
  }

  private evict(): void {
    const now = Date.now()
    // First, purge expired entries
    for (const [key, entry] of this.store.entries()) {
      if (now > entry.expiresAt) {
        this.store.delete(key)
      }
    }

    // If still at or exceeding max capacity, FIFO evict oldest 20%
    if (this.store.size >= this.maxEntries) {
      const keysToDelete = Array.from(this.store.keys()).slice(0, Math.max(1, Math.floor(this.maxEntries * 0.2)))
      for (const k of keysToDelete) {
        this.store.delete(k)
      }
    }
  }
}

export const suggestionCache = new SuggestionCache(30_000, 2000)
