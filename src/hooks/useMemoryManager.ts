import { useEffect, useRef, useCallback } from 'react';

interface MemoryManagerOptions {
  maxCacheSize?: number;
  cleanupInterval?: number;
  gcThreshold?: number;
}

export function useMemoryManager(options: MemoryManagerOptions = {}) {
  const {
    maxCacheSize = 50,
    cleanupInterval = 5 * 60 * 1000, // 5 minutes
    gcThreshold = 100 // MB
  } = options;

  const memoryStatsRef = useRef({
    cacheSize: 0,
    lastCleanup: Date.now(),
    gcCount: 0
  });

  const trackMemoryUsage = useCallback(() => {
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      return {
        used: Math.round(memory.usedJSHeapSize / 1024 / 1024),
        total: Math.round(memory.totalJSHeapSize / 1024 / 1024),
        limit: Math.round(memory.jsHeapSizeLimit / 1024 / 1024)
      };
    }
    return null;
  }, []);

  const forceGarbageCollection = useCallback(() => {
    // Clear any large objects from memory
    if (typeof window !== 'undefined') {
      // Clear console history if too large
      if (console.clear && memoryStatsRef.current.gcCount % 10 === 0) {
        console.clear();
      }

      // Clear any cached DOM elements
      const caches = document.querySelectorAll('[data-cache]');
      caches.forEach(cache => {
        if (cache.children.length > maxCacheSize) {
          Array.from(cache.children)
            .slice(maxCacheSize)
            .forEach(child => child.remove());
        }
      });

      memoryStatsRef.current.gcCount++;
      console.log('🧹 Memory cleanup performed', {
        gcCount: memoryStatsRef.current.gcCount,
        timestamp: new Date().toISOString()
      });
    }
  }, [maxCacheSize]);

  const checkMemoryPressure = useCallback(() => {
    const memory = trackMemoryUsage();
    if (memory && memory.used > gcThreshold) {
      console.warn('⚠️ High memory usage detected:', memory);
      forceGarbageCollection();
      return true;
    }
    return false;
  }, [gcThreshold, trackMemoryUsage, forceGarbageCollection]);

  useEffect(() => {
    console.log('🔧 useMemoryManager useEffect - DISABLED to debug auth loop');
    // TEMPORARILY DISABLED - DEBUGGING AUTH LOOP
    // const interval = setInterval(() => {
    //   checkMemoryPressure();
    //   memoryStatsRef.current.lastCleanup = Date.now();
    // }, cleanupInterval);

    // Listen for page visibility changes to cleanup when hidden
    const handleVisibilityChange = () => {
      if (document.hidden) {
        forceGarbageCollection();
      }
    };

    // Listen for memory pressure events
    const handleMemoryPressure = () => {
      console.warn('🚨 System memory pressure detected');
      forceGarbageCollection();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    // Modern browsers may support memory pressure events
    if ('memory' in navigator) {
      (navigator as any).memory?.addEventListener?.('pressure', handleMemoryPressure);
    }

    return () => {
      // TEMPORARILY DISABLED - DEBUGGING AUTH LOOP
      // clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if ('memory' in navigator) {
        (navigator as any).memory?.removeEventListener?.('pressure', handleMemoryPressure);
      }
    };
  }, [cleanupInterval, checkMemoryPressure, forceGarbageCollection]);

  return {
    getMemoryStats: trackMemoryUsage,
    forceCleanup: forceGarbageCollection,
    checkPressure: checkMemoryPressure
  };
}