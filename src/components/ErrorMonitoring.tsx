import { useEffect, useRef } from 'react';

interface ErrorMonitoringProps {
  studentName: string;
  onError?: (error: string, context: any) => void;
}

export function ErrorMonitoring({ studentName, onError }: ErrorMonitoringProps) {
  const errorLogRef = useRef<string[]>([]);

  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      const errorMessage = `${event.error?.message || event.message} at ${event.filename}:${event.lineno}`;
      
      // Log error with context
      console.error(`🚨 [${studentName}] Error:`, {
        message: errorMessage,
        timestamp: new Date().toISOString(),
        url: window.location.href,
        userAgent: navigator.userAgent
      });
      
      // Store in memory for debugging
      errorLogRef.current.push(errorMessage);
      if (errorLogRef.current.length > 50) {
        errorLogRef.current = errorLogRef.current.slice(-25); // Keep last 25
      }
      
      onError?.(errorMessage, {
        studentName,
        timestamp: new Date().toISOString(),
        url: window.location.href
      });
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const errorMessage = `Unhandled Promise Rejection: ${event.reason}`;
      
      console.error(`🚨 [${studentName}] Promise Rejection:`, {
        reason: event.reason,
        timestamp: new Date().toISOString(),
        url: window.location.href
      });
      
      errorLogRef.current.push(errorMessage);
      if (errorLogRef.current.length > 50) {
        errorLogRef.current = errorLogRef.current.slice(-25);
      }
      
      onError?.(errorMessage, {
        studentName,
        timestamp: new Date().toISOString(),
        url: window.location.href,
        type: 'promise_rejection'
      });
    };

    // Add UUID validation alerts
    const originalConsoleError = console.error;
    console.error = (...args) => {
      const message = args.join(' ');
      if (message.includes('invalid input syntax for type uuid')) {
        console.warn(`🔍 [${studentName}] UUID Validation Failed:`, {
          message,
          timestamp: new Date().toISOString(),
          context: 'database_operation'
        });
        
        onError?.('UUID validation failed - check assignment ID formatting', {
          studentName,
          type: 'uuid_validation',
          originalMessage: message
        });
      }
      
      originalConsoleError.apply(console, args);
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
      console.error = originalConsoleError;
    };
  }, [studentName, onError]);

  // Expose debug info to global scope for development
  useEffect(() => {
    (window as any).getErrorLogs = () => errorLogRef.current;
    (window as any).clearErrorLogs = () => { errorLogRef.current = []; };
  }, []);

  return null; // This component doesn't render anything
}