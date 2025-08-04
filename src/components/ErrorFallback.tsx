import React from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { AlertTriangle, RefreshCcw, Home } from 'lucide-react';

interface ErrorFallbackProps {
  error?: string;
  onRetry?: () => void;
  showHome?: boolean;
}

export const ErrorFallback: React.FC<ErrorFallbackProps> = ({ 
  error, 
  onRetry, 
  showHome = true 
}) => {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="max-w-md w-full p-6">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Something went wrong</AlertTitle>
          <AlertDescription className="mt-2 space-y-4">
            <p>
              {error || 'An unexpected error occurred. This might be due to connection issues or a temporary problem.'}
            </p>
            
            <div className="flex gap-2 flex-wrap">
              {onRetry && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onRetry}
                  className="flex items-center gap-2"
                >
                  <RefreshCcw className="h-3 w-3" />
                  Try Again
                </Button>
              )}
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.location.reload()}
                className="flex items-center gap-2"
              >
                <RefreshCcw className="h-3 w-3" />
                Refresh Page
              </Button>
              
              {showHome && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.location.href = '/'}
                  className="flex items-center gap-2"
                >
                  <Home className="h-3 w-3" />
                  Go Home
                </Button>
              )}
            </div>
            
            <details className="text-xs opacity-70">
              <summary className="cursor-pointer">Technical Details</summary>
              <pre className="mt-2 p-2 bg-muted rounded text-xs overflow-auto">
                {error || 'No additional error information available'}
              </pre>
            </details>
          </AlertDescription>
        </Alert>
      </Card>
    </div>
  );
};