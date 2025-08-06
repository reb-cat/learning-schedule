import React from 'react';
import { UnifiedScheduler } from '@/components/UnifiedScheduler';

interface SharedSchedulerServiceProps {
  studentName: string;
  mode: 'preview' | 'full' | 'today';
  onSchedulingComplete?: () => void;
  title?: string;
  description?: string;
}

export function SharedSchedulerService({ 
  studentName, 
  mode, 
  onSchedulingComplete,
  title,
  description 
}: SharedSchedulerServiceProps) {
  const getDefaultTitle = () => {
    switch (mode) {
      case 'preview':
        return `${studentName} - Quick Schedule`;
      case 'today':
        return `${studentName} - Today's Schedule`;
      case 'full':
        return `${studentName} - Full Scheduler`;
      default:
        return `${studentName} Scheduler`;
    }
  };

  const getDefaultDescription = () => {
    switch (mode) {
      case 'preview':
        return 'Preview and analyze upcoming assignments';
      case 'today':
        return 'Schedule today\'s assignments only';
      case 'full':
        return 'Complete scheduling system with all options';
      default:
        return 'Intelligent assignment scheduling';
    }
  };

  return (
    <div className="space-y-3">
      {(title || description) && (
        <div>
          <h4 className="font-medium text-sm">{title || getDefaultTitle()}</h4>
          {description && (
            <p className="text-xs text-muted-foreground mt-1">
              {description || getDefaultDescription()}
            </p>
          )}
        </div>
      )}
      
      <UnifiedScheduler 
        studentName={studentName}
        mode={mode}
        onSchedulingComplete={onSchedulingComplete}
      />
    </div>
  );
}