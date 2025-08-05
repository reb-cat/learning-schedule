import React, { memo } from 'react';
import { StudentBlockDisplay } from './StudentBlockDisplay';

interface OptimizedStudentBlockDisplayProps {
  block: {
    start: string;
    end: string;
    subject: string;
    block?: number;
    isAssignmentBlock: boolean;
  };
  assignment?: any;
  studentName: string;
  onAssignmentUpdate?: () => void;
  isLoading?: boolean;
}

// Memoized component with deep equality check for assignment
const OptimizedStudentBlockDisplay = memo(({ 
  block, 
  assignment, 
  studentName,
  onAssignmentUpdate,
  isLoading 
}: OptimizedStudentBlockDisplayProps) => {
  return (
    <StudentBlockDisplay
      block={block}
      assignment={assignment}
      studentName={studentName}
      onAssignmentUpdate={onAssignmentUpdate}
      isLoading={isLoading}
    />
  );
}, (prevProps, nextProps) => {
  // Custom comparison function
  const blockEqual = JSON.stringify(prevProps.block) === JSON.stringify(nextProps.block);
  const assignmentEqual = JSON.stringify(prevProps.assignment) === JSON.stringify(nextProps.assignment);
  const studentNameEqual = prevProps.studentName === nextProps.studentName;
  const loadingEqual = prevProps.isLoading === nextProps.isLoading;
  
  return blockEqual && assignmentEqual && studentNameEqual && loadingEqual;
});

OptimizedStudentBlockDisplay.displayName = 'OptimizedStudentBlockDisplay';

export { OptimizedStudentBlockDisplay };