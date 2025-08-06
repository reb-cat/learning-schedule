import { useState, useCallback, useRef } from 'react';
import { Assignment } from './useAssignments';

interface CacheEntry {
  data: Assignment[];
  timestamp: number;
  hash: string;
}

interface CacheOptions {
  ttl?: number; // Time to live in milliseconds
  maxSize?: number; // Maximum number of entries
}

// Simple event emitter for cache invalidation
const cacheInvalidationCallbacks = new Set<(studentName: string) => void>();

export const onCacheInvalidation = (callback: (studentName: string) => void) => {
  cacheInvalidationCallbacks.add(callback);
  return () => cacheInvalidationCallbacks.delete(callback);
};

export const useAssignmentCache = (options: CacheOptions = {}) => {
  const { ttl = 5 * 60 * 1000, maxSize = 10 } = options; // 5 minutes default TTL
  const cache = useRef<Map<string, CacheEntry>>(new Map());
  const [cacheStats, setCacheStats] = useState({ hits: 0, misses: 0 });

  const generateHash = useCallback((data: Assignment[]): string => {
    const hashData = data.map(a => `${a.id}-${a.updated_at}`).join('|');
    return btoa(hashData).slice(0, 16);
  }, []);

  const get = useCallback((studentName: string): Assignment[] | null => {
    const key = studentName;
    const entry = cache.current.get(key);
    
    if (!entry) {
      setCacheStats(prev => ({ ...prev, misses: prev.misses + 1 }));
      return null;
    }

    const isExpired = Date.now() - entry.timestamp > ttl;
    if (isExpired) {
      cache.current.delete(key);
      setCacheStats(prev => ({ ...prev, misses: prev.misses + 1 }));
      return null;
    }

    setCacheStats(prev => ({ ...prev, hits: prev.hits + 1 }));
    return entry.data;
  }, [ttl]);

  const set = useCallback((studentName: string, data: Assignment[]): void => {
    const key = studentName;
    const hash = generateHash(data);
    
    // Check if data has actually changed
    const existingEntry = cache.current.get(key);
    if (existingEntry && existingEntry.hash === hash) {
      // Data hasn't changed, just update timestamp
      existingEntry.timestamp = Date.now();
      return;
    }

    // Enforce cache size limit
    if (cache.current.size >= maxSize) {
      const oldestKey = cache.current.keys().next().value;
      if (oldestKey) cache.current.delete(oldestKey);
    }

    cache.current.set(key, {
      data: [...data], // Create a copy to prevent mutations
      timestamp: Date.now(),
      hash
    });
  }, [generateHash, maxSize]);

  const invalidate = useCallback((studentName?: string): void => {
    if (studentName) {
      const key = studentName;
      cache.current.delete(key);
    } else {
      cache.current.clear();
    }
    
    // Notify all listeners
    const name = studentName || 'all';
    cacheInvalidationCallbacks.forEach(cb => cb(name));
  }, []);

  const getStats = useCallback(() => ({
    ...cacheStats,
    size: cache.current.size,
    hitRate: cacheStats.hits + cacheStats.misses > 0 
      ? (cacheStats.hits / (cacheStats.hits + cacheStats.misses) * 100).toFixed(1) + '%'
      : '0%'
  }), [cacheStats]);

  return {
    get,
    set,
    invalidate,
    getStats
  };
};