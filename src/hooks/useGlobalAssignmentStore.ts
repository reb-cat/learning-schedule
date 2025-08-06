import { useRef, useCallback } from 'react';
import { Assignment } from './useAssignments';

interface GlobalStoreEntry {
  data: Assignment[];
  timestamp: number;
  pendingRequest?: Promise<Assignment[]>;
}

// Global store to prevent duplicate requests across multiple hook instances
const globalStore = new Map<string, GlobalStoreEntry>();
const pendingRequests = new Map<string, Promise<Assignment[]>>();

export const useGlobalAssignmentStore = () => {
  const storeRef = useRef(globalStore);

  const get = useCallback((studentName: string): Assignment[] | null => {
    console.log('🌐 Global store get for:', studentName);
    const entry = storeRef.current.get(studentName);
    if (!entry) return null;
    
    // Check if data is fresh (within 30 seconds)
    const isStale = Date.now() - entry.timestamp > 30 * 1000;
    if (isStale) {
      storeRef.current.delete(studentName);
      return null;
    }
    
    return entry.data;
  }, []);

  const set = useCallback((studentName: string, data: Assignment[]): void => {
    console.log('🌐 Global store set for:', studentName, data.length, 'assignments');
    storeRef.current.set(studentName, {
      data: [...data],
      timestamp: Date.now()
    });
  }, []);

  const hasPendingRequest = useCallback((studentName: string): boolean => {
    return pendingRequests.has(studentName);
  }, []);

  const setPendingRequest = useCallback((studentName: string, promise: Promise<Assignment[]>): void => {
    console.log('🌐 Setting pending request for:', studentName);
    pendingRequests.set(studentName, promise);
    
    // Clean up after promise resolves/rejects
    promise.finally(() => {
      pendingRequests.delete(studentName);
      console.log('🌐 Cleared pending request for:', studentName);
    });
  }, []);

  const getPendingRequest = useCallback((studentName: string): Promise<Assignment[]> | null => {
    return pendingRequests.get(studentName) || null;
  }, []);

  const clear = useCallback((studentName?: string): void => {
    if (studentName) {
      storeRef.current.delete(studentName);
      pendingRequests.delete(studentName);
    } else {
      storeRef.current.clear();
      pendingRequests.clear();
    }
  }, []);

  return {
    get,
    set,
    hasPendingRequest,
    setPendingRequest,
    getPendingRequest,
    clear
  };
};