import { useState, useCallback } from 'react';

interface UseRetryOptions {
  maxAttempts?: number;
  delay?: number;
  backoff?: boolean;
}

export function useRetry<T extends (...args: any[]) => Promise<any>>(
  asyncFunction: T,
  options: UseRetryOptions = {}
) {
  const { maxAttempts = 3, delay = 1000, backoff = true } = options;
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [attempt, setAttempt] = useState(0);

  const execute = useCallback(async (...args: Parameters<T>): Promise<ReturnType<T>> => {
    setIsLoading(true);
    setError(null);
    setAttempt(0);

    for (let i = 0; i < maxAttempts; i++) {
      try {
        setAttempt(i + 1);
        const result = await asyncFunction(...args);
        setIsLoading(false);
        return result;
      } catch (err) {
        const currentDelay = backoff ? delay * Math.pow(2, i) : delay;
        
        if (i === maxAttempts - 1) {
          setError(err instanceof Error ? err : new Error('Unknown error'));
          setIsLoading(false);
          throw err;
        }

        if (i < maxAttempts - 1) {
          await new Promise(resolve => setTimeout(resolve, currentDelay));
        }
      }
    }

    throw new Error('Max attempts reached');
  }, [asyncFunction, maxAttempts, delay, backoff]);

  const reset = useCallback(() => {
    setError(null);
    setAttempt(0);
    setIsLoading(false);
  }, []);

  return {
    execute,
    isLoading,
    error,
    attempt,
    reset
  };
}