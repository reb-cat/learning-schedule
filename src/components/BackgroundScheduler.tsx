import { useEffect } from 'react';
import { blockSharingScheduler } from '@/services/blockSharingScheduler';

interface BackgroundSchedulerProps {
  studentName: string;
  onSchedulingComplete?: () => void;
}

export function BackgroundScheduler({ studentName, onSchedulingComplete }: BackgroundSchedulerProps) {
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    const runScheduler = async () => {
      try {
        console.log(`Background scheduling for ${studentName}...`);
        const result = await blockSharingScheduler.analyzeAndSchedule(studentName, 7);
        await blockSharingScheduler.executeSchedule(result);
        
        // Only trigger update if there were tasks scheduled
        if (result.academic_blocks.some(b => b.tasks.length > 0)) {
          onSchedulingComplete?.();
        }
      } catch (error) {
        console.error('Background scheduling failed:', error);
      }
    };

    // Run immediately
    runScheduler();
    
    // Then run every 15 minutes to reduce load
    interval = setInterval(runScheduler, 15 * 60 * 1000);
    
    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [studentName, onSchedulingComplete]);

  return null; // This component doesn't render anything
}