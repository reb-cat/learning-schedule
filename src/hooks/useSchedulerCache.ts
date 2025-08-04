import { useState, useCallback, useRef } from 'react';
import { SchedulingDecision } from '@/services/blockSharingScheduler';

interface SchedulerCacheEntry {
  decision: SchedulingDecision;
  timestamp: number;
  inputHash: string;
}

export const useSchedulerCache = () => {
  const cache = useRef<Map<string, SchedulerCacheEntry>>(new Map());
  const [stats, setStats] = useState({ hits: 0, misses: 0 });
  
  const TTL = 10 * 60 * 1000; // 10 minutes
  const MAX_ENTRIES = 5;

  const generateInputHash = useCallback((studentName: string, daysAhead: number, startDate?: Date): string => {
    const dateStr = startDate ? startDate.toISOString().split('T')[0] : 'today';
    return btoa(`${studentName}-${daysAhead}-${dateStr}`).slice(0, 16);
  }, []);

  const getCacheKey = useCallback((studentName: string): string => {
    return `scheduler-${studentName}`;
  }, []);

  const get = useCallback((studentName: string, daysAhead: number, startDate?: Date): SchedulingDecision | null => {
    const key = getCacheKey(studentName);
    const entry = cache.current.get(key);
    
    if (!entry) {
      setStats(prev => ({ ...prev, misses: prev.misses + 1 }));
      return null;
    }

    // Check if expired
    const isExpired = Date.now() - entry.timestamp > TTL;
    if (isExpired) {
      cache.current.delete(key);
      setStats(prev => ({ ...prev, misses: prev.misses + 1 }));
      return null;
    }

    // Check if input parameters changed
    const currentHash = generateInputHash(studentName, daysAhead, startDate);
    if (entry.inputHash !== currentHash) {
      setStats(prev => ({ ...prev, misses: prev.misses + 1 }));
      return null;
    }

    setStats(prev => ({ ...prev, hits: prev.hits + 1 }));
    return entry.decision;
  }, [getCacheKey, generateInputHash]);

  const set = useCallback((
    studentName: string, 
    daysAhead: number, 
    decision: SchedulingDecision, 
    startDate?: Date
  ): void => {
    const key = getCacheKey(studentName);
    const inputHash = generateInputHash(studentName, daysAhead, startDate);

    // Enforce cache size limit
    if (cache.current.size >= MAX_ENTRIES) {
      const oldestKey = cache.current.keys().next().value;
      if (oldestKey) cache.current.delete(oldestKey);
    }

    cache.current.set(key, {
      decision: JSON.parse(JSON.stringify(decision)), // Deep copy
      timestamp: Date.now(),
      inputHash
    });
  }, [getCacheKey, generateInputHash]);

  const invalidate = useCallback((studentName?: string): void => {
    if (studentName) {
      const key = getCacheKey(studentName);
      cache.current.delete(key);
    } else {
      cache.current.clear();
    }
  }, [getCacheKey]);

  const getStats = useCallback(() => ({
    ...stats,
    size: cache.current.size,
    hitRate: stats.hits + stats.misses > 0 
      ? (stats.hits / (stats.hits + stats.misses) * 100).toFixed(1) + '%'
      : '0%'
  }), [stats]);

  return {
    get,
    set,
    invalidate,
    getStats
  };
};