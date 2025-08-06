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

export const useAssignmentCache = (options: CacheOptions = {}) => {
  const { ttl = 5 * 60 * 1000, maxSize = 10 } = options; // 5 minutes default TTL
  const cache = useRef<Map<string, CacheEntry>>(new Map());
  const cacheStatsRef = useRef({ hits: 0, misses: 0 });
  
  console.log('🗄️ useAssignmentCache initialized/re-rendered');

  const generateHash = useCallback((data: Assignment[]): string => {
    const hashData = data.map(a => `${a.id}-${a.updated_at}`).join('|');
    return btoa(hashData).slice(0, 16);
  }, []);

  const get = useCallback((studentName: string): Assignment[] | null => {
    const key = studentName;
    const entry = cache.current.get(key);
    
    if (!entry) {
      cacheStatsRef.current.misses++;
      console.log('💔 Cache miss for:', studentName);
      return null;
    }

    const isExpired = Date.now() - entry.timestamp > ttl;
    if (isExpired) {
      cache.current.delete(key);
      cacheStatsRef.current.misses++;
      console.log('⏰ Cache expired for:', studentName);
      return null;
    }

    cacheStatsRef.current.hits++;
    console.log('✅ Cache hit for:', studentName);
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
  }, []);

  const getStats = useCallback(() => {
    const stats = cacheStatsRef.current;
    return {
      hits: stats.hits,
      misses: stats.misses,
      size: cache.current.size,
      hitRate: stats.hits + stats.misses > 0 
        ? (stats.hits / (stats.hits + stats.misses) * 100).toFixed(1) + '%'
        : '0%'
    };
  }, []);

  return {
    get,
    set,
    invalidate,
    getStats
  };
};